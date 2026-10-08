import express from 'express';
import dotenv from 'dotenv';
import { dbService } from './db';
import { serverAuth } from './auth';
import { calculateGlobalSummary } from '../utils/attendanceCalculations';

dotenv.config();

export const app = express();

app.use(express.json());

// ==========================================
// 8-Digit Password & Single-Active-Session API
// ==========================================

// Check auth status & validate session
app.get('/api/auth/status', (req, res) => {
  const token = (req.headers['x-session-token'] as string) || (req.headers.authorization?.replace('Bearer ', '') as string);
  const status = serverAuth.getStatus(token);
  res.json(status);
});

// Unlock with 8-digit password
app.post('/api/auth/unlock', (req, res) => {
  const { pin } = req.body;
  const userAgent = req.headers['user-agent'] as string;
  const result = serverAuth.unlock(pin, userAgent);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

// Manually lock current session
app.post('/api/auth/lock', (req, res) => {
  const token = (req.headers['x-session-token'] as string) || (req.headers.authorization?.replace('Bearer ', '') as string);
  const success = serverAuth.lockSession(token);
  res.json({ success });
});

// Change 8-digit password
app.post('/api/auth/change-pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  const result = serverAuth.changePin(currentPin, newPin);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Session protection middleware for sensitive attendance/subjects API
const requireValidSession: express.RequestHandler = (req, res, next) => {
  // Allow health check without token
  if (req.path === '/health' || req.originalUrl.includes('/api/attendance/health')) {
    return next();
  }
  const token = (req.headers['x-session-token'] as string) || (req.headers.authorization?.replace('Bearer ', '') as string);
  if (!serverAuth.validateSession(token)) {
    return res.status(401).json({
      error: 'Security Lock Active: Please enter the 8-digit password to unlock.',
      sessionInvalidated: true,
    });
  }
  next();
};

app.use('/api/attendance', requireValidSession);
app.use('/api/subjects', requireValidSession);
app.use('/api/app-data', requireValidSession);

// App Data endpoints (Tasks, Assignments, Events, Checklists backed by MongoDB Atlas)
app.get('/api/app-data', async (req, res) => {
  try {
    const data = await dbService.getAppData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch app data' });
  }
});

app.post('/api/app-data', async (req, res) => {
  try {
    const saved = await dbService.saveAppData(req.body);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save app data' });
  }
});

// API Layer for Attendance & Subjects (MongoDB Atlas source of truth)

// Health and DB status
app.get('/api/attendance/health', async (req, res) => {
  try {
    const status = await dbService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ isUsingAtlas: false, error: err.message });
  }
});

// Full Aggregated Summary (Single roundtrip for dashboard)
app.get('/api/attendance/summary', async (req, res) => {
  try {
    const [subjects, records, settings] = await Promise.all([
      dbService.getSubjects(),
      dbService.getAttendanceRecords(),
      dbService.getSettings(),
    ]);

    const summary = calculateGlobalSummary(subjects, records, settings);
    res.json(summary);
  } catch (err: any) {
    console.error('Error fetching attendance summary:', err);
    res.status(500).json({ error: 'Failed to compute attendance summary' });
  }
});

// Subjects endpoints
app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await dbService.getSubjects();
    res.json(subjects);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    const created = await dbService.createSubject({ name, code });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

app.post('/api/subjects/batch', async (req, res) => {
  try {
    const { subjects } = req.body;
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'Subjects array is required' });
    }
    const valid = subjects.filter((s: any) => s && s.name && typeof s.name === 'string');
    const created = await dbService.batchCreateSubjects(valid);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to batch create subjects' });
  }
});

app.patch('/api/subjects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await dbService.updateSubject(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const records = await dbService.getAttendanceRecords({ subjectId: id });
    if (records.length > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        error: 'Subject has existing attendance records. Deactivate instead or use force=true.',
        recordCount: records.length,
      });
    }
    const success = await dbService.deleteSubject(id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Attendance records endpoints
app.get('/api/attendance', async (req, res) => {
  try {
    const { subjectId, type, status } = req.query as {
      subjectId?: string;
      type?: string;
      status?: string;
    };
    const records = await dbService.getAttendanceRecords({ subjectId, type, status });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

app.post('/api/attendance', async (req, res) => {
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

    const existing = await dbService.getAttendanceRecords({ subjectId, type, status });
    const isDuplicate = existing.some((r) => r.date === date && (!time || r.time === time));

    const record = await dbService.createAttendanceRecord({
      subjectId,
      type,
      status,
      date,
      time,
      notes,
    });

    res.status(201).json({ record, duplicateWarning: isDuplicate });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save attendance record' });
  }
});

app.patch('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await dbService.updateAttendanceRecord(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteAttendanceRecord(id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

// Settings endpoints
app.get('/api/attendance/settings', async (req, res) => {
  try {
    const settings = await dbService.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/attendance/settings', async (req, res) => {
  try {
    const { requiredAttendance } = req.body;
    if (typeof requiredAttendance !== 'number' || requiredAttendance < 0 || requiredAttendance > 100) {
      return res.status(400).json({ error: 'Required attendance must be between 0 and 100' });
    }
    const settings = await dbService.updateSettings({ requiredAttendance });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default app;
