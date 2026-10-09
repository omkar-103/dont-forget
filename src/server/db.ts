import { MongoClient, Db, ObjectId } from 'mongodb';
import {
  Subject,
  AttendanceRecord,
  AttendanceSettings,
  Task,
  Assignment,
  EventItem,
  ChecklistItem,
  DailyState,
  AppSettings,
  AppData,
} from '../types';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let isAttemptingConnection = false;
let connectionError: string | null = null;

export const DEFAULT_COLLEGE_ITEMS = [
  'iw wi College ID',
  'Chalo Bus Card',
  'Money',
  'Subject Books',
  'Pen',
  'Bottles ×2',
  'Tiffin',
  'Earphones',
  'Napkin',
  'Perfume',
  'Clock',
];

export const DEFAULT_EVENT_ITEMS = [
  { name: 'Laptop', section: 'MUST HAVE' },
  { name: 'Phone', section: 'MUST HAVE' },
  { name: 'Laptop Charger', section: 'MUST HAVE' },
  { name: 'College ID / ID Card', section: 'MUST HAVE' },
  { name: 'Wallet', section: 'MUST HAVE' },
  { name: 'Earphones', section: 'MUST HAVE' },
  { name: 'Water Bottle', section: 'MUST HAVE' },
  { name: 'Mouse', section: 'TECH' },
  { name: 'Power Bank', section: 'TECH' },
  { name: 'Extension Board', section: 'TECH' },
  { name: 'USB Drive', section: 'TECH' },
  { name: 'HDMI Adapter', section: 'TECH' },
  { name: 'Charging Cable', section: 'TECH' },
  { name: 'Registration QR', section: 'EVENT' },
  { name: 'Event Ticket', section: 'EVENT' },
  { name: 'Presentation', section: 'EVENT' },
  { name: 'Demo Ready', section: 'EVENT' },
  { name: 'GitHub Repository Working', section: 'EVENT' },
  { name: 'Project Deployed', section: 'EVENT' },
  { name: 'Project Backup', section: 'EVENT' },
  { name: 'Team Contact Numbers', section: 'EVENT' },
];

export const DEFAULT_TRAVEL_ITEMS = [
  'Phone',
  'Wallet',
  'ID',
  'Charger',
  'Power Bank',
  'Earphones',
  'Keys',
  'Water Bottle',
  'Tickets',
  'Booking Confirmation',
  'Clothes',
  'Toiletries',
  'Medicines',
  'Important Documents',
];

export function generateDefaultChecklists(): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  let order = 1;

  DEFAULT_COLLEGE_ITEMS.forEach((name) => {
    items.push({
      id: `college_${order}`,
      name,
      checklistId: 'college',
      order: order++,
      createdAt: new Date().toISOString(),
    });
  });

  order = 1;
  DEFAULT_EVENT_ITEMS.forEach((item) => {
    items.push({
      id: `event_${order}`,
      name: item.name,
      section: item.section,
      checklistId: 'events',
      order: order++,
      createdAt: new Date().toISOString(),
    });
  });

  order = 1;
  DEFAULT_TRAVEL_ITEMS.forEach((name) => {
    items.push({
      id: `travel_${order}`,
      name,
      checklistId: 'travel',
      order: order++,
      createdAt: new Date().toISOString(),
    });
  });

  return items;
}

// Resilient in-memory fallback store if MongoDB Atlas is temporarily offline
const inMemoryStore = {
  subjects: [] as Subject[],
  records: [] as AttendanceRecord[],
  settings: {
    requiredAttendance: 75,
  } as AttendanceSettings,
  tasks: [] as Task[],
  assignments: [] as Assignment[],
  events: [] as EventItem[],
  checklists: generateDefaultChecklists(),
  dailyStates: {} as Record<string, DailyState>,
  userSettings: {
    schemaVersion: 2,
    theme: 'system' as const,
    baselineDate: new Date().toISOString().split('T')[0],
    lastActiveDate: new Date().toISOString().split('T')[0],
  } as AppSettings,
  sessions: new Map<string, { token: string; userId: string; expiresAt: Date; userAgent?: string; ip?: string }>(),
  authConfig: null as any,
  appData: null as any,
};

export async function getMongoDb(): Promise<{ db: Db | null; isUsingAtlas: boolean; error: string | null }> {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb+srv://omkarparelkarwebsite:WJSuKGC97RC6LH4Z@cluster0.tbhl9le.mongodb.net/omkarparelkarwebsite?retryWrites=true&w=majority&appName=Cluster0';
  const dbName = process.env.MONGODB_DB_NAME || 'omkarparelkarwebsite';

  if (cachedDb && cachedClient) {
    return { db: cachedDb, isUsingAtlas: true, error: null };
  }

  if (isAttemptingConnection) {
    return { db: null, isUsingAtlas: false, error: 'Connection in progress...' };
  }

  try {
    isAttemptingConnection = true;
    const client = new MongoClient(uri, {
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
    });

    await client.connect();
    const db = client.db(dbName);

    // Create recommended MongoDB indexes per specification
    try {
      await Promise.allSettled([
        db.collection('sessions').createIndex({ token: 1 }, { unique: true }),
        db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection('sessions').createIndex({ userId: 1 }),
        db.collection('authConfig').createIndex({ userId: 1 }, { unique: true }),
        db.collection('tasks').createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection('tasks').createIndex({ userId: 1, date: 1 }),
        db.collection('tasks').createIndex({ userId: 1, status: 1 }),
        db.collection('assignments').createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection('assignments').createIndex({ userId: 1, deadline: 1 }),
        db.collection('assignments').createIndex({ userId: 1, status: 1 }),
        db.collection('events').createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection('events').createIndex({ userId: 1, startDate: 1 }),
        db.collection('checklists').createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection('checklists').createIndex({ userId: 1, checklistId: 1, order: 1 }),
        db.collection('dailyStates').createIndex({ userId: 1, date: 1 }, { unique: true }),
        db.collection('userSettings').createIndex({ userId: 1 }, { unique: true }),
        db.collection('subjects').createIndex({ userId: 1, active: 1 }),
        db.collection('attendanceRecords').createIndex({ userId: 1, subjectId: 1, date: -1 }),
        db.collection('attendanceRecords').createIndex({ userId: 1, subjectId: 1, type: 1, date: -1 }),
        db.collection('attendanceSettings').createIndex({ userId: 1 }, { unique: true }),
        db.collection('appData').createIndex({ userId: 1 }, { unique: true }),
      ]);
    } catch (idxErr) {
      console.warn('Index initialization notice:', idxErr);
    }

    // Bootstrap data integrity: check if appData doc exists and migrate to collections if collections are empty
    try {
      const taskCount = await db.collection('tasks').countDocuments({ userId: 'default_user' });
      if (taskCount === 0) {
        const appDataDoc = await db.collection('appData').findOne({ userId: 'default_user' });
        if (appDataDoc) {
          if (Array.isArray(appDataDoc.tasks) && appDataDoc.tasks.length > 0) {
            const taskDocs = appDataDoc.tasks.map((t: any) => ({ ...t, userId: 'default_user' }));
            await db.collection('tasks').insertMany(taskDocs).catch(() => {});
          }
          if (Array.isArray(appDataDoc.assignments) && appDataDoc.assignments.length > 0) {
            const asgDocs = appDataDoc.assignments.map((a: any) => ({ ...a, userId: 'default_user' }));
            await db.collection('assignments').insertMany(asgDocs).catch(() => {});
          }
          if (Array.isArray(appDataDoc.events) && appDataDoc.events.length > 0) {
            const evtDocs = appDataDoc.events.map((e: any) => ({ ...e, userId: 'default_user' }));
            await db.collection('events').insertMany(evtDocs).catch(() => {});
          }
          if (Array.isArray(appDataDoc.checklists) && appDataDoc.checklists.length > 0) {
            const checkDocs = appDataDoc.checklists.map((c: any) => ({ ...c, userId: 'default_user' }));
            await db.collection('checklists').insertMany(checkDocs).catch(() => {});
          }
          if (appDataDoc.dailyStates && typeof appDataDoc.dailyStates === 'object') {
            for (const [date, state] of Object.entries(appDataDoc.dailyStates)) {
              await db.collection('dailyStates').updateOne(
                { userId: 'default_user', date },
                { $set: { userId: 'default_user', date, state } },
                { upsert: true }
              );
            }
          }
          if (appDataDoc.settings) {
            await db.collection('userSettings').updateOne(
              { userId: 'default_user' },
              { $set: { userId: 'default_user', ...appDataDoc.settings } },
              { upsert: true }
            );
          }
        }
      }
    } catch (bootstrapErr) {
      console.warn('Bootstrap collection check notice:', bootstrapErr);
    }

    cachedClient = client;
    cachedDb = db;
    connectionError = null;
    isAttemptingConnection = false;
    return { db, isUsingAtlas: true, error: null };
  } catch (err) {
    isAttemptingConnection = false;
    const msg = err instanceof Error ? err.message : String(err);
    connectionError = msg;
    console.error('MongoDB Atlas connection failed, maintaining failure isolation:', msg);
    return { db: null, isUsingAtlas: false, error: msg };
  }
}

// Data Access Layer with automatic Atlas / fallback routing
export const dbService = {
  async getStatus() {
    const { isUsingAtlas, error } = await getMongoDb();
    return {
      isUsingAtlas,
      error,
      database: process.env.MONGODB_DB_NAME || 'omkarparelkarwebsite',
    };
  },

  // ==========================================
  // Session Management (Multi-device support)
  // ==========================================
  async createSession(session: {
    token: string;
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<void> {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('sessions').updateOne(
        { token: session.token },
        {
          $set: {
            token: session.token,
            userId: session.userId,
            expiresAt: session.expiresAt,
            userAgent: session.userAgent || 'Unknown Device',
            ip: session.ip || 'unknown',
            createdAt: new Date(),
            lastActiveAt: new Date(),
          },
        },
        { upsert: true }
      );
      return;
    }

    inMemoryStore.sessions.set(session.token, {
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
      ip: session.ip,
    });
  },

  async validateSession(token: string): Promise<{ valid: boolean; userId?: string }> {
    if (!token) return { valid: false };
    const { db } = await getMongoDb();
    const now = new Date();

    if (db) {
      const doc = await db.collection('sessions').findOne({
        token,
        expiresAt: { $gt: now },
      });
      if (doc) {
        // update last active asynchronously
        db.collection('sessions')
          .updateOne({ token }, { $set: { lastActiveAt: now } })
          .catch(() => {});
        return { valid: true, userId: doc.userId || 'default_user' };
      }
      return { valid: false };
    }

    const memSession = inMemoryStore.sessions.get(token);
    if (memSession && memSession.expiresAt > now) {
      return { valid: true, userId: memSession.userId };
    }
    return { valid: false };
  },

  async deleteSession(token: string): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection('sessions').deleteOne({ token });
      return res.deletedCount > 0;
    }
    return inMemoryStore.sessions.delete(token);
  },

  async deleteAllSessions(userId = 'default_user'): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection('sessions').deleteMany({ userId });
      return res.deletedCount > 0;
    }
    for (const [token, s] of inMemoryStore.sessions.entries()) {
      if (s.userId === userId) {
        inMemoryStore.sessions.delete(token);
      }
    }
    return true;
  },

  // ==========================================
  // Auth Config (PBKDF2 Password & Lockout)
  // ==========================================
  async getAuthConfig(userId = 'default_user'): Promise<any> {
    const { db } = await getMongoDb();
    if (db) {
      const doc = await db.collection('authConfig').findOne({ userId });
      if (doc) return doc;
    }
    return inMemoryStore.authConfig;
  },

  async saveAuthConfig(config: any, userId = 'default_user'): Promise<void> {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('authConfig').updateOne(
        { userId },
        {
          $set: {
            userId,
            ...config,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }
    inMemoryStore.authConfig = { userId, ...config };
  },

  // ==========================================
  // Tasks CRUD
  // ==========================================
  async getTasks(userId = 'default_user'): Promise<Task[]> {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection('tasks').find({ userId }).toArray();
      return docs.map((d) => ({
        id: d.id || d._id.toString(),
        title: d.title,
        description: d.description,
        date: d.date,
        category: d.category,
        priority: d.priority,
        status: d.status,
        deadline: d.deadline,
        location: d.location,
        estimatedTime: d.estimatedTime,
        recurring: d.recurring,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    }
    return inMemoryStore.tasks;
  },

  async createTask(task: Task, userId = 'default_user'): Promise<Task> {
    const now = new Date().toISOString();
    const doc: Task & { userId: string } = {
      ...task,
      userId,
      createdAt: task.createdAt || now,
      updatedAt: now,
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('tasks').updateOne({ userId, id: task.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) inMemoryStore.tasks[idx] = doc;
    else inMemoryStore.tasks.push(doc);
    return doc;
  },

  async updateTask(id: string, updates: Partial<Task>, userId = 'default_user'): Promise<Task | null> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('tasks').updateOne({ userId, id }, { $set: { ...updates, updatedAt: now } });
      const doc = await db.collection('tasks').findOne({ userId, id });
      if (!doc) return null;
      return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        date: doc.date,
        category: doc.category,
        priority: doc.priority,
        status: doc.status,
        deadline: doc.deadline,
        location: doc.location,
        estimatedTime: doc.estimatedTime,
        recurring: doc.recurring,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
    const idx = inMemoryStore.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    inMemoryStore.tasks[idx] = { ...inMemoryStore.tasks[idx], ...updates, updatedAt: now };
    return inMemoryStore.tasks[idx];
  },

  async deleteTask(id: string, userId = 'default_user'): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection('tasks').deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.tasks.length;
    inMemoryStore.tasks = inMemoryStore.tasks.filter((t) => t.id !== id);
    return inMemoryStore.tasks.length < initial;
  },

  // ==========================================
  // Assignments CRUD
  // ==========================================
  async getAssignments(userId = 'default_user'): Promise<Assignment[]> {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection('assignments').find({ userId }).toArray();
      return docs.map((d) => ({
        id: d.id || d._id.toString(),
        title: d.title,
        subject: d.subject,
        description: d.description,
        assignedDate: d.assignedDate,
        deadline: d.deadline,
        status: d.status,
        priority: d.priority,
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    }
    return inMemoryStore.assignments;
  },

  async createAssignment(asg: Assignment, userId = 'default_user'): Promise<Assignment> {
    const now = new Date().toISOString();
    const doc: Assignment & { userId: string } = {
      ...asg,
      userId,
      createdAt: asg.createdAt || now,
      updatedAt: now,
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('assignments').updateOne({ userId, id: asg.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.assignments.findIndex((a) => a.id === asg.id);
    if (idx >= 0) inMemoryStore.assignments[idx] = doc;
    else inMemoryStore.assignments.push(doc);
    return doc;
  },

  async updateAssignment(id: string, updates: Partial<Assignment>, userId = 'default_user'): Promise<Assignment | null> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('assignments').updateOne({ userId, id }, { $set: { ...updates, updatedAt: now } });
      const doc = await db.collection('assignments').findOne({ userId, id });
      if (!doc) return null;
      return {
        id: doc.id,
        title: doc.title,
        subject: doc.subject,
        description: doc.description,
        assignedDate: doc.assignedDate,
        deadline: doc.deadline,
        status: doc.status,
        priority: doc.priority,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
    const idx = inMemoryStore.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    inMemoryStore.assignments[idx] = { ...inMemoryStore.assignments[idx], ...updates, updatedAt: now };
    return inMemoryStore.assignments[idx];
  },

  async deleteAssignment(id: string, userId = 'default_user'): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection('assignments').deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.assignments.length;
    inMemoryStore.assignments = inMemoryStore.assignments.filter((a) => a.id !== id);
    return inMemoryStore.assignments.length < initial;
  },

  // ==========================================
  // Events CRUD
  // ==========================================
  async getEvents(userId = 'default_user'): Promise<EventItem[]> {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection('events').find({ userId }).toArray();
      return docs.map((d) => ({
        id: d.id || d._id.toString(),
        name: d.name,
        type: d.type,
        organizer: d.organizer,
        date: d.date,
        startDate: d.startDate,
        endDate: d.endDate,
        location: d.location,
        mode: d.mode,
        registrationDeadline: d.registrationDeadline,
        submissionDeadline: d.submissionDeadline,
        registrationLink: d.registrationLink,
        description: d.description,
        status: d.status,
        priority: d.priority,
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    }
    return inMemoryStore.events;
  },

  async createEvent(evt: EventItem, userId = 'default_user'): Promise<EventItem> {
    const now = new Date().toISOString();
    const doc: EventItem & { userId: string } = {
      ...evt,
      userId,
      createdAt: evt.createdAt || now,
      updatedAt: now,
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('events').updateOne({ userId, id: evt.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.events.findIndex((e) => e.id === evt.id);
    if (idx >= 0) inMemoryStore.events[idx] = doc;
    else inMemoryStore.events.push(doc);
    return doc;
  },

  async updateEvent(id: string, updates: Partial<EventItem>, userId = 'default_user'): Promise<EventItem | null> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('events').updateOne({ userId, id }, { $set: { ...updates, updatedAt: now } });
      const doc = await db.collection('events').findOne({ userId, id });
      if (!doc) return null;
      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        organizer: doc.organizer,
        date: doc.date,
        startDate: doc.startDate,
        endDate: doc.endDate,
        location: doc.location,
        mode: doc.mode,
        registrationDeadline: doc.registrationDeadline,
        submissionDeadline: doc.submissionDeadline,
        registrationLink: doc.registrationLink,
        description: doc.description,
        status: doc.status,
        priority: doc.priority,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
    const idx = inMemoryStore.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    inMemoryStore.events[idx] = { ...inMemoryStore.events[idx], ...updates, updatedAt: now };
    return inMemoryStore.events[idx];
  },

  async deleteEvent(id: string, userId = 'default_user'): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection('events').deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.events.length;
    inMemoryStore.events = inMemoryStore.events.filter((e) => e.id !== id);
    return inMemoryStore.events.length < initial;
  },

  // ==========================================
  // Checklists CRUD
  // ==========================================
  async getChecklists(userId = 'default_user'): Promise<ChecklistItem[]> {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection('checklists').find({ userId }).sort({ checklistId: 1, order: 1 }).toArray();
      if (docs.length > 0) {
        return docs.map((d) => ({
          id: d.id,
          name: d.name,
          checklistId: d.checklistId,
          section: d.section,
          order: d.order,
          createdAt: d.createdAt,
        }));
      }
    }
    return inMemoryStore.checklists;
  },

  async createChecklistItem(item: ChecklistItem, userId = 'default_user'): Promise<ChecklistItem> {
    const doc = { ...item, userId };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('checklists').updateOne({ userId, id: item.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.checklists.findIndex((c) => c.id === item.id);
    if (idx >= 0) inMemoryStore.checklists[idx] = item;
    else inMemoryStore.checklists.push(item);
    return item;
  },

  async updateChecklistItem(id: string, updates: Partial<ChecklistItem>, userId = 'default_user'): Promise<ChecklistItem | null> {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('checklists').updateOne({ userId, id }, { $set: updates });
      const doc = await db.collection('checklists').findOne({ userId, id });
      if (!doc) return null;
      return {
        id: doc.id,
        name: doc.name,
        checklistId: doc.checklistId,
        section: doc.section,
        order: doc.order,
        createdAt: doc.createdAt,
      };
    }
    const idx = inMemoryStore.checklists.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    inMemoryStore.checklists[idx] = { ...inMemoryStore.checklists[idx], ...updates };
    return inMemoryStore.checklists[idx];
  },

  async deleteChecklistItem(id: string, userId = 'default_user'): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection('checklists').deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.checklists.length;
    inMemoryStore.checklists = inMemoryStore.checklists.filter((c) => c.id !== id);
    return inMemoryStore.checklists.length < initial;
  },

  async restoreDefaultChecklists(userId = 'default_user'): Promise<ChecklistItem[]> {
    const defaults = generateDefaultChecklists();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('checklists').deleteMany({ userId });
      const docs = defaults.map((item) => ({ ...item, userId }));
      await db.collection('checklists').insertMany(docs);
    }
    inMemoryStore.checklists = defaults;
    return defaults;
  },

  // ==========================================
  // Daily States & Settings
  // ==========================================
  async getDailyStates(userId = 'default_user'): Promise<Record<string, DailyState>> {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection('dailyStates').find({ userId }).toArray();
      const result: Record<string, DailyState> = {};
      docs.forEach((d) => {
        if (d.date && d.state) {
          result[d.date] = d.state;
        }
      });
      return result;
    }
    return inMemoryStore.dailyStates;
  },

  async saveDailyState(date: string, state: DailyState, userId = 'default_user'): Promise<DailyState> {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('dailyStates').updateOne(
        { userId, date },
        { $set: { userId, date, state, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
    inMemoryStore.dailyStates[date] = state;
    return state;
  },

  async getUserSettings(userId = 'default_user'): Promise<AppSettings> {
    const { db } = await getMongoDb();
    if (db) {
      const doc = await db.collection('userSettings').findOne({ userId });
      if (doc) {
        return {
          schemaVersion: doc.schemaVersion || 2,
          theme: doc.theme || 'system',
          baselineDate: doc.baselineDate || new Date().toISOString().split('T')[0],
          activeDateOverride: doc.activeDateOverride,
          lastActiveDate: doc.lastActiveDate || new Date().toISOString().split('T')[0],
        };
      }
    }
    return inMemoryStore.userSettings;
  },

  async saveUserSettings(settings: Partial<AppSettings>, userId = 'default_user'): Promise<AppSettings> {
    const now = new Date().toISOString().split('T')[0];
    const updated: AppSettings = {
      schemaVersion: 2,
      theme: settings.theme || 'system',
      baselineDate: settings.baselineDate || now,
      activeDateOverride: settings.activeDateOverride,
      lastActiveDate: settings.lastActiveDate || now,
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('userSettings').updateOne(
        { userId },
        { $set: { userId, ...updated, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
    inMemoryStore.userSettings = updated;
    return updated;
  },

  // ==========================================
  // Consolidated AppData Single Source of Truth
  // ==========================================
  async getAppData(userId = 'default_user'): Promise<AppData> {
    const [tasks, assignments, events, checklists, dailyStates, settings] = await Promise.all([
      this.getTasks(userId),
      this.getAssignments(userId),
      this.getEvents(userId),
      this.getChecklists(userId),
      this.getDailyStates(userId),
      this.getUserSettings(userId),
    ]);

    const finalChecklists = checklists.length > 0 ? checklists : generateDefaultChecklists();
    const today = new Date().toISOString().split('T')[0];
    const states = { ...dailyStates };
    if (!states[today]) {
      states[today] = {
        completedTasks: [],
        completedChecklistItems: {
          college: [],
          events: [],
          travel: [],
        },
      };
    }

    return {
      schemaVersion: 2,
      tasks,
      assignments,
      events,
      checklists: finalChecklists,
      dailyStates: states,
      settings,
    };
  },

  async saveAppData(data: AppData, userId = 'default_user'): Promise<AppData> {
    const { db } = await getMongoDb();
    const now = new Date().toISOString();

    // Persist to granular collections in parallel
    const operations: Promise<any>[] = [];

    if (Array.isArray(data.tasks)) {
      if (db) {
        operations.push(
          (async () => {
            await db.collection('tasks').deleteMany({ userId });
            if (data.tasks.length > 0) {
              const taskDocs = data.tasks.map((t) => ({ ...t, userId, updatedAt: t.updatedAt || now }));
              await db.collection('tasks').insertMany(taskDocs);
            }
          })()
        );
      }
      inMemoryStore.tasks = [...data.tasks];
    }

    if (Array.isArray(data.assignments)) {
      if (db) {
        operations.push(
          (async () => {
            await db.collection('assignments').deleteMany({ userId });
            if (data.assignments.length > 0) {
              const asgDocs = data.assignments.map((a) => ({ ...a, userId, updatedAt: a.updatedAt || now }));
              await db.collection('assignments').insertMany(asgDocs);
            }
          })()
        );
      }
      inMemoryStore.assignments = [...data.assignments];
    }

    if (Array.isArray(data.events)) {
      if (db) {
        operations.push(
          (async () => {
            await db.collection('events').deleteMany({ userId });
            if (data.events.length > 0) {
              const evtDocs = data.events.map((e) => ({ ...e, userId, updatedAt: e.updatedAt || now }));
              await db.collection('events').insertMany(evtDocs);
            }
          })()
        );
      }
      inMemoryStore.events = [...data.events];
    }

    if (Array.isArray(data.checklists) && data.checklists.length > 0) {
      if (db) {
        operations.push(
          (async () => {
            await db.collection('checklists').deleteMany({ userId });
            const checkDocs = data.checklists.map((c) => ({ ...c, userId }));
            await db.collection('checklists').insertMany(checkDocs);
          })()
        );
      }
      inMemoryStore.checklists = [...data.checklists];
    }

    if (data.dailyStates && typeof data.dailyStates === 'object') {
      if (db) {
        operations.push(
          (async () => {
            for (const [date, state] of Object.entries(data.dailyStates)) {
              await db.collection('dailyStates').updateOne(
                { userId, date },
                { $set: { userId, date, state, updatedAt: now } },
                { upsert: true }
              );
            }
          })()
        );
      }
      inMemoryStore.dailyStates = { ...data.dailyStates };
    }

    if (data.settings) {
      operations.push(this.saveUserSettings(data.settings, userId));
    }

    // Keep appData single document synchronized for dual redundancy
    if (db) {
      operations.push(
        db.collection('appData').updateOne(
          { userId },
          {
            $set: {
              userId,
              schemaVersion: data.schemaVersion || 2,
              tasks: data.tasks || [],
              assignments: data.assignments || [],
              events: data.events || [],
              checklists: data.checklists || [],
              dailyStates: data.dailyStates || {},
              settings: data.settings || {},
              updatedAt: now,
            },
          },
          { upsert: true }
        )
      );
    }

    await Promise.all(operations);
    inMemoryStore.appData = data;
    return data;
  },

  // ==========================================
  // Safe Idempotent Data Migration Reconciler
  // ==========================================
  async reconcileMigrationData(
    userId = 'default_user',
    payload: any
  ): Promise<{
    success: boolean;
    counts: {
      tasksAdded: number;
      assignmentsAdded: number;
      eventsAdded: number;
      checklistsSynced: number;
    };
    appData: AppData;
  }> {
    const currentData = await this.getAppData(userId);
    const existingTaskIds = new Set(currentData.tasks.map((t) => t.id));
    const existingAsgIds = new Set(currentData.assignments.map((a) => a.id));
    const existingEvtIds = new Set(currentData.events.map((e) => e.id));
    const existingChecklistIds = new Set(currentData.checklists.map((c) => c.id));

    let tasksAdded = 0;
    let assignmentsAdded = 0;
    let eventsAdded = 0;
    let checklistsSynced = 0;

    const updatedTasks = [...currentData.tasks];
    if (Array.isArray(payload.tasks)) {
      for (const t of payload.tasks) {
        if (!t || !t.id) continue;
        if (!existingTaskIds.has(t.id)) {
          updatedTasks.push(t);
          existingTaskIds.add(t.id);
          tasksAdded++;
        }
      }
    }

    const updatedAssignments = [...currentData.assignments];
    if (Array.isArray(payload.assignments)) {
      for (const a of payload.assignments) {
        if (!a || !a.id) continue;
        if (!existingAsgIds.has(a.id)) {
          updatedAssignments.push(a);
          existingAsgIds.add(a.id);
          assignmentsAdded++;
        }
      }
    }

    const updatedEvents = [...currentData.events];
    if (Array.isArray(payload.events)) {
      for (const e of payload.events) {
        if (!e || !e.id) continue;
        if (!existingEvtIds.has(e.id)) {
          updatedEvents.push(e);
          existingEvtIds.add(e.id);
          eventsAdded++;
        }
      }
    }

    const updatedChecklists = [...currentData.checklists];
    if (Array.isArray(payload.checklists)) {
      for (const c of payload.checklists) {
        if (!c || !c.id) continue;
        if (!existingChecklistIds.has(c.id)) {
          updatedChecklists.push(c);
          existingChecklistIds.add(c.id);
          checklistsSynced++;
        }
      }
    }

    // Merge dailyStates
    const mergedDailyStates = { ...currentData.dailyStates };
    if (payload.dailyStates && typeof payload.dailyStates === 'object') {
      for (const [date, state] of Object.entries(payload.dailyStates as Record<string, DailyState>)) {
        if (!mergedDailyStates[date]) {
          mergedDailyStates[date] = state;
        } else {
          // Merge completed tasks
          const existingTasks = new Set(mergedDailyStates[date].completedTasks || []);
          (state.completedTasks || []).forEach((tid) => existingTasks.add(tid));

          // Merge completed checklist items
          const mergedChecks = { ...mergedDailyStates[date].completedChecklistItems };
          for (const [chId, items] of Object.entries(state.completedChecklistItems || {})) {
            const set = new Set(mergedChecks[chId] || []);
            items.forEach((it) => set.add(it));
            mergedChecks[chId] = Array.from(set);
          }

          mergedDailyStates[date] = {
            completedTasks: Array.from(existingTasks),
            completedChecklistItems: mergedChecks,
          };
        }
      }
    }

    // Settings
    const mergedSettings: AppSettings = {
      ...currentData.settings,
      ...(payload.settings?.theme ? { theme: payload.settings.theme } : {}),
    };

    const mergedAppData: AppData = {
      schemaVersion: 2,
      tasks: updatedTasks,
      assignments: updatedAssignments,
      events: updatedEvents,
      checklists: updatedChecklists,
      dailyStates: mergedDailyStates,
      settings: mergedSettings,
    };

    await this.saveAppData(mergedAppData, userId);

    return {
      success: true,
      counts: {
        tasksAdded,
        assignmentsAdded,
        eventsAdded,
        checklistsSynced,
      },
      appData: mergedAppData,
    };
  },

  // ==========================================
  // Attendance & Subjects
  // ==========================================
  async getSubjects(userId = 'default_user'): Promise<Subject[]> {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection('subjects').find({ userId }).toArray();
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId || userId,
        name: d.name,
        code: d.code,
        active: d.active ?? true,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
      }));
    }
    return inMemoryStore.subjects;
  },

  async createSubject(data: { name: string; code?: string }, userId = 'default_user'): Promise<Subject> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();

    if (db) {
      const doc = {
        userId,
        name: data.name.trim(),
        code: data.code?.trim() || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection('subjects').insertOne(doc);
      return {
        id: result.insertedId.toString(),
        userId,
        name: doc.name,
        code: doc.code,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    const newSub: Subject = {
      id: `sub_${Date.now()}`,
      userId,
      name: data.name.trim(),
      code: data.code?.trim() || undefined,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryStore.subjects.push(newSub);
    return newSub;
  },

  async batchCreateSubjects(subjects: Array<{ name: string; code?: string }>, userId = 'default_user'): Promise<Subject[]> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();

    if (db) {
      const docs = subjects.map((s) => ({
        userId,
        name: s.name.trim(),
        code: s.code?.trim() || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      }));
      const result = await db.collection('subjects').insertMany(docs);
      const insertedIds = Object.values(result.insertedIds);
      return docs.map((d, i) => ({
        id: insertedIds[i].toString(),
        userId,
        name: d.name,
        code: d.code,
        active: true,
        createdAt: now,
        updatedAt: now,
      }));
    }

    const created: Subject[] = [];
    subjects.forEach((s, idx) => {
      const newSub: Subject = {
        id: `sub_${Date.now()}_${idx}`,
        userId,
        name: s.name.trim(),
        code: s.code?.trim() || undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryStore.subjects.push(newSub);
      created.push(newSub);
    });
    return created;
  },

  async updateSubject(id: string, updates: Partial<Subject>, userId = 'default_user'): Promise<Subject | null> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();

    if (db) {
      let query: any = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }

      await db.collection('subjects').updateOne(query, {
        $set: { ...updates, updatedAt: now },
      });
      const updated = await db.collection('subjects').findOne(query);
      if (!updated) return null;
      return {
        id: updated._id.toString(),
        userId: updated.userId,
        name: updated.name,
        code: updated.code,
        active: updated.active,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    const index = inMemoryStore.subjects.findIndex((s) => s.id === id);
    if (index === -1) return null;
    inMemoryStore.subjects[index] = {
      ...inMemoryStore.subjects[index],
      ...updates,
      updatedAt: now,
    };
    return inMemoryStore.subjects[index];
  },

  async deleteSubject(id: string, userId = 'default_user'): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      let query: any = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }
      const res = await db.collection('subjects').deleteOne(query);
      return res.deletedCount > 0;
    }

    const initialLength = inMemoryStore.subjects.length;
    inMemoryStore.subjects = inMemoryStore.subjects.filter((s) => s.id !== id);
    return inMemoryStore.subjects.length < initialLength;
  },

  async getAttendanceRecords(filter?: { subjectId?: string; type?: string; status?: string }, userId = 'default_user'): Promise<AttendanceRecord[]> {
    const { db } = await getMongoDb();
    if (db) {
      const query: any = { userId };
      if (filter?.subjectId) query.subjectId = filter.subjectId;
      if (filter?.type) query.type = filter.type;
      if (filter?.status) query.status = filter.status;

      const docs = await db.collection('attendanceRecords').find(query).sort({ date: -1, time: -1, createdAt: -1 }).toArray();
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId,
        subjectId: d.subjectId,
        type: d.type,
        status: d.status,
        date: d.date,
        time: d.time,
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    }

    let records = [...inMemoryStore.records];
    if (filter?.subjectId) records = records.filter((r) => r.subjectId === filter.subjectId);
    if (filter?.type) records = records.filter((r) => r.type === filter.type);
    if (filter?.status) records = records.filter((r) => r.status === filter.status);

    return records.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      if (a.time && b.time) return b.time.localeCompare(a.time);
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  async createAttendanceRecord(data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>, userId = 'default_user'): Promise<AttendanceRecord> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();

    if (db) {
      const doc = {
        userId,
        subjectId: data.subjectId,
        type: data.type,
        status: data.status,
        date: data.date,
        time: data.time?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection('attendanceRecords').insertOne(doc);
      return {
        id: result.insertedId.toString(),
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
    }

    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}`,
      userId,
      ...data,
      time: data.time?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryStore.records.unshift(newRecord);
    return newRecord;
  },

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>, userId = 'default_user'): Promise<AttendanceRecord | null> {
    const now = new Date().toISOString();
    const { db } = await getMongoDb();

    if (db) {
      let query: any = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }
      await db.collection('attendanceRecords').updateOne(query, {
        $set: { ...updates, updatedAt: now },
      });
      const updated = await db.collection('attendanceRecords').findOne(query);
      if (!updated) return null;
      return {
        id: updated._id.toString(),
        userId: updated.userId,
        subjectId: updated.subjectId,
        type: updated.type,
        status: updated.status,
        date: updated.date,
        time: updated.time,
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    const index = inMemoryStore.records.findIndex((r) => r.id === id);
    if (index === -1) return null;
    inMemoryStore.records[index] = {
      ...inMemoryStore.records[index],
      ...updates,
      updatedAt: now,
    };
    return inMemoryStore.records[index];
  },

  async deleteAttendanceRecord(id: string, userId = 'default_user'): Promise<boolean> {
    const { db } = await getMongoDb();
    if (db) {
      let query: any = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }
      const res = await db.collection('attendanceRecords').deleteOne(query);
      return res.deletedCount > 0;
    }

    const initialLength = inMemoryStore.records.length;
    inMemoryStore.records = inMemoryStore.records.filter((r) => r.id !== id);
    return inMemoryStore.records.length < initialLength;
  },

  async getSettings(userId = 'default_user'): Promise<AttendanceSettings> {
    const { db } = await getMongoDb();
    if (db) {
      const doc = await db.collection('attendanceSettings').findOne({ userId });
      if (doc && typeof doc.requiredAttendance === 'number') {
        return { requiredAttendance: doc.requiredAttendance };
      }
    }
    return inMemoryStore.settings;
  },

  async updateSettings(settings: AttendanceSettings, userId = 'default_user'): Promise<AttendanceSettings> {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('attendanceSettings').updateOne(
        { userId },
        { $set: { userId, requiredAttendance: settings.requiredAttendance, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
    inMemoryStore.settings = settings;
    return settings;
  },
};
