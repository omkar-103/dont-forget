import express from 'express';
import dotenv from 'dotenv';
import { dbService } from './db.ts';
import { serverAuth } from './auth.ts';
import { calculateGlobalSummary } from '../utils/attendanceCalculations.ts';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '10mb' }));

// Helper to extract session token from cookies or headers
function extractSessionToken(req: express.Request): string | null {
  // 1. Check custom header
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 3. Check Cookie header
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, ...val] = cookie.trim().split('=');
      if (name === 'session_token') {
        return decodeURIComponent(val.join('='));
      }
    }
  }

  return null;
}

// Helper to set session cookie
function setSessionCookie(res: express.Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `session_token=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`, // 30 days
  ];
  if (isProd) {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

// Helper to clear session cookie
function clearSessionCookie(res: express.Response) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieParts = [
    'session_token=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isProd) {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

// Create dedicated API router
const apiRouter = express.Router();

// ==========================================
// Public Auth Endpoints
// ==========================================

// Check auth status & validate session
apiRouter.get('/auth/status', async (req, res) => {
  try {
    const token = extractSessionToken(req);
    const status = await serverAuth.getStatus(token);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify auth status' });
  }
});

// Unlock with 8-digit password
apiRouter.post('/auth/unlock', async (req, res) => {
  try {
    const { pin } = req.body;
    const userAgent = req.headers['user-agent'] as string;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    const result = await serverAuth.unlock(pin, userAgent, ip);
    if (!result.success || !result.token) {
      return res.status(401).json(result);
    }

    // Set secure HTTP-only cookie
    setSessionCookie(res, result.token);

    res.json(result);
  } catch (err: any) {
    console.error('CRITICAL Auth error during unlock:', err);
    res.status(500).json({ success: false, error: 'Authentication service error', details: err?.message || String(err) });
  }
});

// Explicit session lock / logout (single device logout)
apiRouter.post('/auth/lock', async (req, res) => {
  try {
    const token = extractSessionToken(req);
    if (token) {
      await serverAuth.lockSession(token);
    }
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to lock session' });
  }
});

// Revoke all active sessions across all devices
apiRouter.post('/auth/revoke-all', async (req, res) => {
  try {
    const token = extractSessionToken(req);
    const validation = await serverAuth.validateSession(token);
    if (!validation.valid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await serverAuth.revokeAllSessions('default_user');
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
  }
});

// Change 8-digit password
apiRouter.post('/auth/change-pin', async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const result = await serverAuth.changePin(currentPin, newPin);
    if (!result.success) {
      return res.status(400).json(result);
    }
    if (result.token) {
      setSessionCookie(res, result.token);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// Health check endpoint
apiRouter.get('/health', async (_req, res) => {
  try {
    const status = await dbService.getStatus();
    res.json({ status: 'ok', database: status });
  } catch (err: any) {
    res.json({ status: 'ok', database: { isUsingAtlas: false, error: err.message } });
  }
});

// ==========================================
// Mandatory Session Protection Middleware
// ==========================================
const requireValidSession: express.RequestHandler = async (req, res, next) => {
  // Allow health check without token
  if (req.path === '/health' || req.originalUrl.includes('health')) {
    return next();
  }

  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Security Lock Active: Please enter the 8-digit password to unlock.',
      sessionInvalidated: true,
    });
  }

  const validation = await serverAuth.validateSession(token);
  if (validation.isError) {
    return res.status(503).json({
      error: 'Security service temporarily unavailable. Reconnecting...',
      retryable: true,
    });
  }
  if (!validation.valid) {
    clearSessionCookie(res);
    return res.status(401).json({
      error: 'Session Expired or Revoked: Please enter the 8-digit password to unlock.',
      sessionInvalidated: true,
    });
  }

  (req as any).userId = 'default_user';
  next();
};

// Protect all private API routes
apiRouter.use('/app-data', requireValidSession);
apiRouter.use('/tasks', requireValidSession);
apiRouter.use('/assignments', requireValidSession);
apiRouter.use('/events', requireValidSession);
apiRouter.use('/checklists', requireValidSession);
apiRouter.use('/daily-states', requireValidSession);
apiRouter.use('/settings', requireValidSession);
apiRouter.use('/migration', requireValidSession);
apiRouter.use('/subjects', requireValidSession);
apiRouter.use('/attendance', requireValidSession);

// ==========================================
// Data Migration & Reconciliation
// ==========================================
apiRouter.post('/migration/upload', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid migration payload' });
    }
    const result = await dbService.reconcileMigrationData('default_user', payload);
    res.json(result);
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ error: 'Failed to reconcile migration data' });
  }
});

apiRouter.get('/migration/status', async (_req, res) => {
  try {
    const data = await dbService.getAppData('default_user');
    res.json({
      tasksCount: data.tasks.length,
      assignmentsCount: data.assignments.length,
      eventsCount: data.events.length,
      checklistsCount: data.checklists.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve migration status' });
  }
});

// ==========================================
// Central App Data Endpoints (Single Source of Truth)
// ==========================================
apiRouter.get('/app-data', async (_req, res) => {
  try {
    const data = await dbService.getAppData('default_user');
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch central app data' });
  }
});

apiRouter.post('/app-data', async (req, res) => {
  try {
    const saved = await dbService.saveAppData(req.body, 'default_user');
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save central app data' });
  }
});

// ==========================================
// Granular Tasks API
// ==========================================
apiRouter.get('/tasks', async (_req, res) => {
  try {
    const tasks = await dbService.getTasks('default_user');
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

apiRouter.post('/tasks', async (req, res) => {
  try {
    const created = await dbService.createTask(req.body, 'default_user');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

apiRouter.patch('/tasks/:id', async (req, res) => {
  try {
    const updated = await dbService.updateTask(req.params.id, req.body, 'default_user');
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

apiRouter.delete('/tasks/:id', async (req, res) => {
  try {
    const success = await dbService.deleteTask(req.params.id, 'default_user');
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ==========================================
// Granular Assignments API
// ==========================================
apiRouter.get('/assignments', async (_req, res) => {
  try {
    const assignments = await dbService.getAssignments('default_user');
    res.json(assignments);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

apiRouter.post('/assignments', async (req, res) => {
  try {
    const created = await dbService.createAssignment(req.body, 'default_user');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

apiRouter.patch('/assignments/:id', async (req, res) => {
  try {
    const updated = await dbService.updateAssignment(req.params.id, req.body, 'default_user');
    if (!updated) return res.status(404).json({ error: 'Assignment not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

apiRouter.delete('/assignments/:id', async (req, res) => {
  try {
    const success = await dbService.deleteAssignment(req.params.id, 'default_user');
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// ==========================================
// Granular Events API
// ==========================================
apiRouter.get('/events', async (_req, res) => {
  try {
    const events = await dbService.getEvents('default_user');
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

apiRouter.post('/events', async (req, res) => {
  try {
    const created = await dbService.createEvent(req.body, 'default_user');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

apiRouter.patch('/events/:id', async (req, res) => {
  try {
    const updated = await dbService.updateEvent(req.params.id, req.body, 'default_user');
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

apiRouter.delete('/events/:id', async (req, res) => {
  try {
    const success = await dbService.deleteEvent(req.params.id, 'default_user');
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ==========================================
// Granular Checklists API
// ==========================================
apiRouter.get('/checklists', async (_req, res) => {
  try {
    const checklists = await dbService.getChecklists('default_user');
    res.json(checklists);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
});

apiRouter.post('/checklists', async (req, res) => {
  try {
    const created = await dbService.createChecklistItem(req.body, 'default_user');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
});

apiRouter.patch('/checklists/:id', async (req, res) => {
  try {
    const updated = await dbService.updateChecklistItem(req.params.id, req.body, 'default_user');
    if (!updated) return res.status(404).json({ error: 'Checklist item not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

apiRouter.delete('/checklists/:id', async (req, res) => {
  try {
    const success = await dbService.deleteChecklistItem(req.params.id, 'default_user');
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});

apiRouter.post('/checklists/restore-defaults', async (_req, res) => {
  try {
    const items = await dbService.restoreDefaultChecklists('default_user');
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore default checklists' });
  }
});

// ==========================================
// Attendance & Subjects API (MongoDB Atlas)
// ==========================================

// Health and DB status
apiRouter.get('/attendance/health', async (_req, res) => {
  try {
    const status = await dbService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ isUsingAtlas: false, error: err.message });
  }
});

// Aggregated Summary
apiRouter.get('/attendance/summary', async (_req, res) => {
  try {
    const [subjects, records, settings] = await Promise.all([
      dbService.getSubjects('default_user'),
      dbService.getAttendanceRecords(undefined, 'default_user'),
      dbService.getSettings('default_user'),
    ]);

    const summary = calculateGlobalSummary(subjects, records, settings);
    res.json(summary);
  } catch (err: any) {
    console.error('Error fetching attendance summary:', err);
    res.status(500).json({ error: 'Failed to compute attendance summary' });
  }
});

// Subjects endpoints
apiRouter.get('/subjects', async (_req, res) => {
  try {
    const subjects = await dbService.getSubjects('default_user');
    res.json(subjects);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

apiRouter.post('/subjects', async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    const created = await dbService.createSubject({ name, code }, 'default_user');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

apiRouter.post('/subjects/batch', async (req, res) => {
  try {
    const { subjects } = req.body;
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'Subjects array is required' });
    }
    const valid = subjects.filter((s: any) => s && s.name && typeof s.name === 'string');
    const created = await dbService.batchCreateSubjects(valid, 'default_user');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to batch create subjects' });
  }
});

apiRouter.patch('/subjects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await dbService.updateSubject(id, updates, 'default_user');
    if (!updated) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

apiRouter.delete('/subjects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const records = await dbService.getAttendanceRecords({ subjectId: id }, 'default_user');
    if (records.length > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        error: 'Subject has existing attendance records. Deactivate instead or use force=true.',
        recordCount: records.length,
      });
    }
    const success = await dbService.deleteSubject(id, 'default_user');
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Attendance records endpoints
apiRouter.get('/attendance', async (req, res) => {
  try {
    const { subjectId, type, status } = req.query as {
      subjectId?: string;
      type?: string;
      status?: string;
    };
    const records = await dbService.getAttendanceRecords({ subjectId, type, status }, 'default_user');
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

apiRouter.post('/attendance', async (req, res) => {
  try {
    const { subjectId, type, status, date, time, notes } = req.body;

    if (!subjectId) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!['theory', 'practical'].includes(type)) {
      return res.status(400).json({ error: 'Type must be theory or practical' });
    }
    if (!['attended', 'missed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be attended or missed' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const existing = await dbService.getAttendanceRecords({ subjectId, type, status }, 'default_user');
    const isDuplicate = existing.some((r) => r.date === date && (!time || r.time === time));

    const record = await dbService.createAttendanceRecord(
      {
        subjectId,
        type,
        status,
        date,
        time,
        notes,
      },
      'default_user'
    );

    res.status(201).json({ record, duplicateWarning: isDuplicate });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save attendance record' });
  }
});

apiRouter.patch('/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await dbService.updateAttendanceRecord(id, updates, 'default_user');
    if (!updated) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

apiRouter.delete('/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteAttendanceRecord(id, 'default_user');
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

// Settings endpoints
apiRouter.get('/attendance/settings', async (_req, res) => {
  try {
    const settings = await dbService.getSettings('default_user');
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch attendance settings' });
  }
});

apiRouter.post('/attendance/settings', async (req, res) => {
  try {
    const { requiredAttendance } = req.body;
    if (typeof requiredAttendance !== 'number' || requiredAttendance < 0 || requiredAttendance > 100) {
      return res.status(400).json({ error: 'Required attendance must be between 0 and 100' });
    }
    const settings = await dbService.updateSettings({ requiredAttendance }, 'default_user');
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Mount the apiRouter at both '/api' and '/' for complete Vercel & local compatibility
app.use('/api', apiRouter);
app.use(apiRouter);

export default app;
