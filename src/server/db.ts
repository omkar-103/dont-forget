import { MongoClient, Db, ObjectId } from 'mongodb';
import { Subject, AttendanceRecord, AttendanceSettings } from '../types';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let isAttemptingConnection = false;
let connectionError: string | null = null;

// Resilient in-memory fallback store if MongoDB Atlas is temporarily offline
const inMemoryStore = {
  subjects: [] as Subject[],
  records: [] as AttendanceRecord[],
  settings: {
    requiredAttendance: 75,
  } as AttendanceSettings,
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
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(dbName);

    // Create recommended MongoDB indexes per specification
    try {
      await db.collection('subjects').createIndex({ userId: 1, active: 1 });
      await db.collection('attendanceRecords').createIndex({ userId: 1, subjectId: 1, date: -1 });
      await db.collection('attendanceRecords').createIndex({ userId: 1, subjectId: 1, type: 1, date: -1 });
      await db.collection('attendanceSettings').createIndex({ userId: 1 });
    } catch (idxErr) {
      console.warn('Index initialization notice:', idxErr);
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
      database: process.env.MONGODB_DB_NAME || 'dont-forget',
    };
  },

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

    const created: Subject[] = [];
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

  async getAppData(userId = 'default_user'): Promise<any> {
    const { db } = await getMongoDb();
    if (db) {
      const doc = await db.collection('appData').findOne({ userId });
      if (doc) {
        return {
          schemaVersion: doc.schemaVersion || 2,
          tasks: doc.tasks || [],
          assignments: doc.assignments || [],
          events: doc.events || [],
          checklists: doc.checklists || [],
          dailyStates: doc.dailyStates || {},
          settings: doc.settings || {
            schemaVersion: 2,
            theme: 'system',
            baselineDate: new Date().toISOString().split('T')[0],
            lastActiveDate: new Date().toISOString().split('T')[0],
          },
        };
      }
    }
    return inMemoryStore.appData;
  },

  async saveAppData(data: any, userId = 'default_user'): Promise<any> {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection('appData').updateOne(
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
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }
    inMemoryStore.appData = data;
    return data;
  },
};
