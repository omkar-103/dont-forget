// src/server/app.ts
import express from "express";
import dotenv from "dotenv";

// src/server/db.ts
import { MongoClient, ObjectId } from "mongodb";
var cachedClient = null;
var cachedDb = null;
var isAttemptingConnection = false;
var connectionError = null;
var DEFAULT_COLLEGE_ITEMS = [
  "iw wi College ID",
  "Chalo Bus Card",
  "Money",
  "Subject Books",
  "Pen",
  "Bottles \xD72",
  "Tiffin",
  "Earphones",
  "Napkin",
  "Perfume",
  "Clock"
];
var DEFAULT_EVENT_ITEMS = [
  { name: "Laptop", section: "MUST HAVE" },
  { name: "Phone", section: "MUST HAVE" },
  { name: "Laptop Charger", section: "MUST HAVE" },
  { name: "College ID / ID Card", section: "MUST HAVE" },
  { name: "Wallet", section: "MUST HAVE" },
  { name: "Earphones", section: "MUST HAVE" },
  { name: "Water Bottle", section: "MUST HAVE" },
  { name: "Mouse", section: "TECH" },
  { name: "Power Bank", section: "TECH" },
  { name: "Extension Board", section: "TECH" },
  { name: "USB Drive", section: "TECH" },
  { name: "HDMI Adapter", section: "TECH" },
  { name: "Charging Cable", section: "TECH" },
  { name: "Registration QR", section: "EVENT" },
  { name: "Event Ticket", section: "EVENT" },
  { name: "Presentation", section: "EVENT" },
  { name: "Demo Ready", section: "EVENT" },
  { name: "GitHub Repository Working", section: "EVENT" },
  { name: "Project Deployed", section: "EVENT" },
  { name: "Project Backup", section: "EVENT" },
  { name: "Team Contact Numbers", section: "EVENT" }
];
var DEFAULT_TRAVEL_ITEMS = [
  "Phone",
  "Wallet",
  "ID",
  "Charger",
  "Power Bank",
  "Earphones",
  "Keys",
  "Water Bottle",
  "Tickets",
  "Booking Confirmation",
  "Clothes",
  "Toiletries",
  "Medicines",
  "Important Documents"
];
function generateDefaultChecklists() {
  const items = [];
  let order = 1;
  DEFAULT_COLLEGE_ITEMS.forEach((name) => {
    items.push({
      id: `college_${order}`,
      name,
      checklistId: "college",
      order: order++,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  order = 1;
  DEFAULT_EVENT_ITEMS.forEach((item) => {
    items.push({
      id: `event_${order}`,
      name: item.name,
      section: item.section,
      checklistId: "events",
      order: order++,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  order = 1;
  DEFAULT_TRAVEL_ITEMS.forEach((name) => {
    items.push({
      id: `travel_${order}`,
      name,
      checklistId: "travel",
      order: order++,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  return items;
}
var inMemoryStore = {
  subjects: [],
  records: [],
  settings: {
    requiredAttendance: 75
  },
  tasks: [],
  assignments: [],
  events: [],
  checklists: generateDefaultChecklists(),
  dailyStates: {},
  userSettings: {
    schemaVersion: 2,
    theme: "system",
    baselineDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    lastActiveDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  sessions: /* @__PURE__ */ new Map(),
  authConfig: null,
  appData: null
};
async function getMongoDb() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://omkarparelkarwebsite:WJSuKGC97RC6LH4Z@cluster0.tbhl9le.mongodb.net/omkarparelkarwebsite?retryWrites=true&w=majority&appName=Cluster0";
  const dbName = process.env.MONGODB_DB_NAME || "omkarparelkarwebsite";
  if (cachedDb && cachedClient) {
    return { db: cachedDb, isUsingAtlas: true, error: null };
  }
  if (isAttemptingConnection) {
    return { db: null, isUsingAtlas: false, error: "Connection in progress..." };
  }
  try {
    isAttemptingConnection = true;
    const client = new MongoClient(uri, {
      connectTimeoutMS: 8e3,
      serverSelectionTimeoutMS: 8e3
    });
    await client.connect();
    const db = client.db(dbName);
    try {
      await Promise.allSettled([
        db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
        db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("sessions").createIndex({ userId: 1 }),
        db.collection("authConfig").createIndex({ userId: 1 }, { unique: true }),
        db.collection("tasks").createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection("tasks").createIndex({ userId: 1, date: 1 }),
        db.collection("tasks").createIndex({ userId: 1, status: 1 }),
        db.collection("assignments").createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection("assignments").createIndex({ userId: 1, deadline: 1 }),
        db.collection("assignments").createIndex({ userId: 1, status: 1 }),
        db.collection("events").createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection("events").createIndex({ userId: 1, startDate: 1 }),
        db.collection("checklists").createIndex({ userId: 1, id: 1 }, { unique: true }),
        db.collection("checklists").createIndex({ userId: 1, checklistId: 1, order: 1 }),
        db.collection("dailyStates").createIndex({ userId: 1, date: 1 }, { unique: true }),
        db.collection("userSettings").createIndex({ userId: 1 }, { unique: true }),
        db.collection("subjects").createIndex({ userId: 1, active: 1 }),
        db.collection("attendanceRecords").createIndex({ userId: 1, subjectId: 1, date: -1 }),
        db.collection("attendanceRecords").createIndex({ userId: 1, subjectId: 1, type: 1, date: -1 }),
        db.collection("attendanceSettings").createIndex({ userId: 1 }, { unique: true }),
        db.collection("appData").createIndex({ userId: 1 }, { unique: true })
      ]);
    } catch (idxErr) {
      console.warn("Index initialization notice:", idxErr);
    }
    try {
      const taskCount = await db.collection("tasks").countDocuments({ userId: "default_user" });
      if (taskCount === 0) {
        const appDataDoc = await db.collection("appData").findOne({ userId: "default_user" });
        if (appDataDoc) {
          if (Array.isArray(appDataDoc.tasks) && appDataDoc.tasks.length > 0) {
            const taskDocs = appDataDoc.tasks.map((t) => ({ ...t, userId: "default_user" }));
            await db.collection("tasks").insertMany(taskDocs).catch(() => {
            });
          }
          if (Array.isArray(appDataDoc.assignments) && appDataDoc.assignments.length > 0) {
            const asgDocs = appDataDoc.assignments.map((a) => ({ ...a, userId: "default_user" }));
            await db.collection("assignments").insertMany(asgDocs).catch(() => {
            });
          }
          if (Array.isArray(appDataDoc.events) && appDataDoc.events.length > 0) {
            const evtDocs = appDataDoc.events.map((e) => ({ ...e, userId: "default_user" }));
            await db.collection("events").insertMany(evtDocs).catch(() => {
            });
          }
          if (Array.isArray(appDataDoc.checklists) && appDataDoc.checklists.length > 0) {
            const checkDocs = appDataDoc.checklists.map((c) => ({ ...c, userId: "default_user" }));
            await db.collection("checklists").insertMany(checkDocs).catch(() => {
            });
          }
          if (appDataDoc.dailyStates && typeof appDataDoc.dailyStates === "object") {
            for (const [date, state] of Object.entries(appDataDoc.dailyStates)) {
              await db.collection("dailyStates").updateOne(
                { userId: "default_user", date },
                { $set: { userId: "default_user", date, state } },
                { upsert: true }
              );
            }
          }
          if (appDataDoc.settings) {
            await db.collection("userSettings").updateOne(
              { userId: "default_user" },
              { $set: { userId: "default_user", ...appDataDoc.settings } },
              { upsert: true }
            );
          }
        }
      }
    } catch (bootstrapErr) {
      console.warn("Bootstrap collection check notice:", bootstrapErr);
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
    console.error("MongoDB Atlas connection failed, maintaining failure isolation:", msg);
    return { db: null, isUsingAtlas: false, error: msg };
  }
}
var dbService = {
  async getStatus() {
    const { isUsingAtlas, error } = await getMongoDb();
    return {
      isUsingAtlas,
      error,
      database: process.env.MONGODB_DB_NAME || "omkarparelkarwebsite"
    };
  },
  // ==========================================
  // Session Management (Multi-device support)
  // ==========================================
  async createSession(session) {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("sessions").updateOne(
        { token: session.token },
        {
          $set: {
            token: session.token,
            userId: session.userId,
            expiresAt: session.expiresAt,
            userAgent: session.userAgent || "Unknown Device",
            ip: session.ip || "unknown",
            createdAt: /* @__PURE__ */ new Date(),
            lastActiveAt: /* @__PURE__ */ new Date()
          }
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
      ip: session.ip
    });
  },
  async validateSession(token) {
    if (!token) return { valid: false };
    const { db } = await getMongoDb();
    const now = /* @__PURE__ */ new Date();
    if (db) {
      const doc = await db.collection("sessions").findOne({
        token,
        expiresAt: { $gt: now }
      });
      if (doc) {
        db.collection("sessions").updateOne({ token }, { $set: { lastActiveAt: now } }).catch(() => {
        });
        return { valid: true, userId: doc.userId || "default_user" };
      }
      return { valid: false };
    }
    const memSession = inMemoryStore.sessions.get(token);
    if (memSession && memSession.expiresAt > now) {
      return { valid: true, userId: memSession.userId };
    }
    return { valid: false };
  },
  async deleteSession(token) {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection("sessions").deleteOne({ token });
      return res.deletedCount > 0;
    }
    return inMemoryStore.sessions.delete(token);
  },
  async deleteAllSessions(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection("sessions").deleteMany({ userId });
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
  async getAuthConfig(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const doc = await db.collection("authConfig").findOne({ userId });
      if (doc) return doc;
    }
    return inMemoryStore.authConfig;
  },
  async saveAuthConfig(config, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("authConfig").updateOne(
        { userId },
        {
          $set: {
            userId,
            ...config,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        { upsert: true }
      );
    }
    inMemoryStore.authConfig = { userId, ...config };
  },
  // ==========================================
  // Tasks CRUD
  // ==========================================
  async getTasks(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection("tasks").find({ userId }).toArray();
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
        updatedAt: d.updatedAt
      }));
    }
    return inMemoryStore.tasks;
  },
  async createTask(task, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = {
      ...task,
      userId,
      createdAt: task.createdAt || now,
      updatedAt: now
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("tasks").updateOne({ userId, id: task.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) inMemoryStore.tasks[idx] = doc;
    else inMemoryStore.tasks.push(doc);
    return doc;
  },
  async updateTask(id, updates, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("tasks").updateOne({ userId, id }, { $set: { ...updates, updatedAt: now } });
      const doc = await db.collection("tasks").findOne({ userId, id });
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
        updatedAt: doc.updatedAt
      };
    }
    const idx = inMemoryStore.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    inMemoryStore.tasks[idx] = { ...inMemoryStore.tasks[idx], ...updates, updatedAt: now };
    return inMemoryStore.tasks[idx];
  },
  async deleteTask(id, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection("tasks").deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.tasks.length;
    inMemoryStore.tasks = inMemoryStore.tasks.filter((t) => t.id !== id);
    return inMemoryStore.tasks.length < initial;
  },
  // ==========================================
  // Assignments CRUD
  // ==========================================
  async getAssignments(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection("assignments").find({ userId }).toArray();
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
        updatedAt: d.updatedAt
      }));
    }
    return inMemoryStore.assignments;
  },
  async createAssignment(asg, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = {
      ...asg,
      userId,
      createdAt: asg.createdAt || now,
      updatedAt: now
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("assignments").updateOne({ userId, id: asg.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.assignments.findIndex((a) => a.id === asg.id);
    if (idx >= 0) inMemoryStore.assignments[idx] = doc;
    else inMemoryStore.assignments.push(doc);
    return doc;
  },
  async updateAssignment(id, updates, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("assignments").updateOne({ userId, id }, { $set: { ...updates, updatedAt: now } });
      const doc = await db.collection("assignments").findOne({ userId, id });
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
        updatedAt: doc.updatedAt
      };
    }
    const idx = inMemoryStore.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    inMemoryStore.assignments[idx] = { ...inMemoryStore.assignments[idx], ...updates, updatedAt: now };
    return inMemoryStore.assignments[idx];
  },
  async deleteAssignment(id, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection("assignments").deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.assignments.length;
    inMemoryStore.assignments = inMemoryStore.assignments.filter((a) => a.id !== id);
    return inMemoryStore.assignments.length < initial;
  },
  // ==========================================
  // Events CRUD
  // ==========================================
  async getEvents(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection("events").find({ userId }).toArray();
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
        updatedAt: d.updatedAt
      }));
    }
    return inMemoryStore.events;
  },
  async createEvent(evt, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const doc = {
      ...evt,
      userId,
      createdAt: evt.createdAt || now,
      updatedAt: now
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("events").updateOne({ userId, id: evt.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.events.findIndex((e) => e.id === evt.id);
    if (idx >= 0) inMemoryStore.events[idx] = doc;
    else inMemoryStore.events.push(doc);
    return doc;
  },
  async updateEvent(id, updates, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("events").updateOne({ userId, id }, { $set: { ...updates, updatedAt: now } });
      const doc = await db.collection("events").findOne({ userId, id });
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
        updatedAt: doc.updatedAt
      };
    }
    const idx = inMemoryStore.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    inMemoryStore.events[idx] = { ...inMemoryStore.events[idx], ...updates, updatedAt: now };
    return inMemoryStore.events[idx];
  },
  async deleteEvent(id, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection("events").deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.events.length;
    inMemoryStore.events = inMemoryStore.events.filter((e) => e.id !== id);
    return inMemoryStore.events.length < initial;
  },
  // ==========================================
  // Checklists CRUD
  // ==========================================
  async getChecklists(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection("checklists").find({ userId }).sort({ checklistId: 1, order: 1 }).toArray();
      if (docs.length > 0) {
        return docs.map((d) => ({
          id: d.id,
          name: d.name,
          checklistId: d.checklistId,
          section: d.section,
          order: d.order,
          createdAt: d.createdAt
        }));
      }
    }
    return inMemoryStore.checklists;
  },
  async createChecklistItem(item, userId = "default_user") {
    const doc = { ...item, userId };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("checklists").updateOne({ userId, id: item.id }, { $set: doc }, { upsert: true });
    }
    const idx = inMemoryStore.checklists.findIndex((c) => c.id === item.id);
    if (idx >= 0) inMemoryStore.checklists[idx] = item;
    else inMemoryStore.checklists.push(item);
    return item;
  },
  async updateChecklistItem(id, updates, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("checklists").updateOne({ userId, id }, { $set: updates });
      const doc = await db.collection("checklists").findOne({ userId, id });
      if (!doc) return null;
      return {
        id: doc.id,
        name: doc.name,
        checklistId: doc.checklistId,
        section: doc.section,
        order: doc.order,
        createdAt: doc.createdAt
      };
    }
    const idx = inMemoryStore.checklists.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    inMemoryStore.checklists[idx] = { ...inMemoryStore.checklists[idx], ...updates };
    return inMemoryStore.checklists[idx];
  },
  async deleteChecklistItem(id, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const res = await db.collection("checklists").deleteOne({ userId, id });
      return res.deletedCount > 0;
    }
    const initial = inMemoryStore.checklists.length;
    inMemoryStore.checklists = inMemoryStore.checklists.filter((c) => c.id !== id);
    return inMemoryStore.checklists.length < initial;
  },
  async restoreDefaultChecklists(userId = "default_user") {
    const defaults = generateDefaultChecklists();
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("checklists").deleteMany({ userId });
      const docs = defaults.map((item) => ({ ...item, userId }));
      await db.collection("checklists").insertMany(docs);
    }
    inMemoryStore.checklists = defaults;
    return defaults;
  },
  // ==========================================
  // Daily States & Settings
  // ==========================================
  async getDailyStates(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection("dailyStates").find({ userId }).toArray();
      const result = {};
      docs.forEach((d) => {
        if (d.date && d.state) {
          result[d.date] = d.state;
        }
      });
      return result;
    }
    return inMemoryStore.dailyStates;
  },
  async saveDailyState(date, state, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("dailyStates").updateOne(
        { userId, date },
        { $set: { userId, date, state, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
        { upsert: true }
      );
    }
    inMemoryStore.dailyStates[date] = state;
    return state;
  },
  async getUserSettings(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const doc = await db.collection("userSettings").findOne({ userId });
      if (doc) {
        return {
          schemaVersion: doc.schemaVersion || 2,
          theme: doc.theme || "system",
          baselineDate: doc.baselineDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          activeDateOverride: doc.activeDateOverride,
          lastActiveDate: doc.lastActiveDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
        };
      }
    }
    return inMemoryStore.userSettings;
  },
  async saveUserSettings(settings, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const updated = {
      schemaVersion: 2,
      theme: settings.theme || "system",
      baselineDate: settings.baselineDate || now,
      activeDateOverride: settings.activeDateOverride,
      lastActiveDate: settings.lastActiveDate || now
    };
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("userSettings").updateOne(
        { userId },
        { $set: { userId, ...updated, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
        { upsert: true }
      );
    }
    inMemoryStore.userSettings = updated;
    return updated;
  },
  // ==========================================
  // Consolidated AppData Single Source of Truth
  // ==========================================
  async getAppData(userId = "default_user") {
    const [tasks, assignments, events, checklists, dailyStates, settings] = await Promise.all([
      this.getTasks(userId),
      this.getAssignments(userId),
      this.getEvents(userId),
      this.getChecklists(userId),
      this.getDailyStates(userId),
      this.getUserSettings(userId)
    ]);
    const finalChecklists = checklists.length > 0 ? checklists : generateDefaultChecklists();
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const states = { ...dailyStates };
    if (!states[today]) {
      states[today] = {
        completedTasks: [],
        completedChecklistItems: {
          college: [],
          events: [],
          travel: []
        }
      };
    }
    return {
      schemaVersion: 2,
      tasks,
      assignments,
      events,
      checklists: finalChecklists,
      dailyStates: states,
      settings
    };
  },
  async saveAppData(data, userId = "default_user") {
    const { db } = await getMongoDb();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const operations = [];
    if (Array.isArray(data.tasks)) {
      if (db) {
        operations.push(
          (async () => {
            await db.collection("tasks").deleteMany({ userId });
            if (data.tasks.length > 0) {
              const taskDocs = data.tasks.map((t) => ({ ...t, userId, updatedAt: t.updatedAt || now }));
              await db.collection("tasks").insertMany(taskDocs);
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
            await db.collection("assignments").deleteMany({ userId });
            if (data.assignments.length > 0) {
              const asgDocs = data.assignments.map((a) => ({ ...a, userId, updatedAt: a.updatedAt || now }));
              await db.collection("assignments").insertMany(asgDocs);
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
            await db.collection("events").deleteMany({ userId });
            if (data.events.length > 0) {
              const evtDocs = data.events.map((e) => ({ ...e, userId, updatedAt: e.updatedAt || now }));
              await db.collection("events").insertMany(evtDocs);
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
            await db.collection("checklists").deleteMany({ userId });
            const checkDocs = data.checklists.map((c) => ({ ...c, userId }));
            await db.collection("checklists").insertMany(checkDocs);
          })()
        );
      }
      inMemoryStore.checklists = [...data.checklists];
    }
    if (data.dailyStates && typeof data.dailyStates === "object") {
      if (db) {
        operations.push(
          (async () => {
            for (const [date, state] of Object.entries(data.dailyStates)) {
              await db.collection("dailyStates").updateOne(
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
    if (db) {
      operations.push(
        db.collection("appData").updateOne(
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
              updatedAt: now
            }
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
  async reconcileMigrationData(userId = "default_user", payload) {
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
    const mergedDailyStates = { ...currentData.dailyStates };
    if (payload.dailyStates && typeof payload.dailyStates === "object") {
      for (const [date, state] of Object.entries(payload.dailyStates)) {
        if (!mergedDailyStates[date]) {
          mergedDailyStates[date] = state;
        } else {
          const existingTasks = new Set(mergedDailyStates[date].completedTasks || []);
          (state.completedTasks || []).forEach((tid) => existingTasks.add(tid));
          const mergedChecks = { ...mergedDailyStates[date].completedChecklistItems };
          for (const [chId, items] of Object.entries(state.completedChecklistItems || {})) {
            const set = new Set(mergedChecks[chId] || []);
            items.forEach((it) => set.add(it));
            mergedChecks[chId] = Array.from(set);
          }
          mergedDailyStates[date] = {
            completedTasks: Array.from(existingTasks),
            completedChecklistItems: mergedChecks
          };
        }
      }
    }
    const mergedSettings = {
      ...currentData.settings,
      ...payload.settings?.theme ? { theme: payload.settings.theme } : {}
    };
    const mergedAppData = {
      schemaVersion: 2,
      tasks: updatedTasks,
      assignments: updatedAssignments,
      events: updatedEvents,
      checklists: updatedChecklists,
      dailyStates: mergedDailyStates,
      settings: mergedSettings
    };
    await this.saveAppData(mergedAppData, userId);
    return {
      success: true,
      counts: {
        tasksAdded,
        assignmentsAdded,
        eventsAdded,
        checklistsSynced
      },
      appData: mergedAppData
    };
  },
  // ==========================================
  // Attendance & Subjects
  // ==========================================
  async getSubjects(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const docs = await db.collection("subjects").find({ userId }).toArray();
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId || userId,
        name: d.name,
        code: d.code,
        active: d.active ?? true,
        createdAt: d.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: d.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
      }));
    }
    return inMemoryStore.subjects;
  },
  async createSubject(data, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      const doc = {
        userId,
        name: data.name.trim(),
        code: data.code?.trim() || void 0,
        active: true,
        createdAt: now,
        updatedAt: now
      };
      const result = await db.collection("subjects").insertOne(doc);
      return {
        id: result.insertedId.toString(),
        userId,
        name: doc.name,
        code: doc.code,
        active: true,
        createdAt: now,
        updatedAt: now
      };
    }
    const newSub = {
      id: `sub_${Date.now()}`,
      userId,
      name: data.name.trim(),
      code: data.code?.trim() || void 0,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    inMemoryStore.subjects.push(newSub);
    return newSub;
  },
  async batchCreateSubjects(subjects, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      const docs = subjects.map((s) => ({
        userId,
        name: s.name.trim(),
        code: s.code?.trim() || void 0,
        active: true,
        createdAt: now,
        updatedAt: now
      }));
      const result = await db.collection("subjects").insertMany(docs);
      const insertedIds = Object.values(result.insertedIds);
      return docs.map((d, i) => ({
        id: insertedIds[i].toString(),
        userId,
        name: d.name,
        code: d.code,
        active: true,
        createdAt: now,
        updatedAt: now
      }));
    }
    const created = [];
    subjects.forEach((s, idx) => {
      const newSub = {
        id: `sub_${Date.now()}_${idx}`,
        userId,
        name: s.name.trim(),
        code: s.code?.trim() || void 0,
        active: true,
        createdAt: now,
        updatedAt: now
      };
      inMemoryStore.subjects.push(newSub);
      created.push(newSub);
    });
    return created;
  },
  async updateSubject(id, updates, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      let query = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }
      await db.collection("subjects").updateOne(query, {
        $set: { ...updates, updatedAt: now }
      });
      const updated = await db.collection("subjects").findOne(query);
      if (!updated) return null;
      return {
        id: updated._id.toString(),
        userId: updated.userId,
        name: updated.name,
        code: updated.code,
        active: updated.active,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      };
    }
    const index = inMemoryStore.subjects.findIndex((s) => s.id === id);
    if (index === -1) return null;
    inMemoryStore.subjects[index] = {
      ...inMemoryStore.subjects[index],
      ...updates,
      updatedAt: now
    };
    return inMemoryStore.subjects[index];
  },
  async deleteSubject(id, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      let query = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }
      const res = await db.collection("subjects").deleteOne(query);
      return res.deletedCount > 0;
    }
    const initialLength = inMemoryStore.subjects.length;
    inMemoryStore.subjects = inMemoryStore.subjects.filter((s) => s.id !== id);
    return inMemoryStore.subjects.length < initialLength;
  },
  async getAttendanceRecords(filter, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const query = { userId };
      if (filter?.subjectId) query.subjectId = filter.subjectId;
      if (filter?.type) query.type = filter.type;
      if (filter?.status) query.status = filter.status;
      const docs = await db.collection("attendanceRecords").find(query).sort({ date: -1, time: -1, createdAt: -1 }).toArray();
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
        updatedAt: d.updatedAt
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
  async createAttendanceRecord(data, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      const doc = {
        userId,
        subjectId: data.subjectId,
        type: data.type,
        status: data.status,
        date: data.date,
        time: data.time?.trim() || void 0,
        notes: data.notes?.trim() || void 0,
        createdAt: now,
        updatedAt: now
      };
      const result = await db.collection("attendanceRecords").insertOne(doc);
      return {
        id: result.insertedId.toString(),
        userId,
        ...data,
        createdAt: now,
        updatedAt: now
      };
    }
    const newRecord = {
      id: `rec_${Date.now()}`,
      userId,
      ...data,
      time: data.time?.trim() || void 0,
      notes: data.notes?.trim() || void 0,
      createdAt: now,
      updatedAt: now
    };
    inMemoryStore.records.unshift(newRecord);
    return newRecord;
  },
  async updateAttendanceRecord(id, updates, userId = "default_user") {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { db } = await getMongoDb();
    if (db) {
      let query = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }
      await db.collection("attendanceRecords").updateOne(query, {
        $set: { ...updates, updatedAt: now }
      });
      const updated = await db.collection("attendanceRecords").findOne(query);
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
        updatedAt: updated.updatedAt
      };
    }
    const index = inMemoryStore.records.findIndex((r) => r.id === id);
    if (index === -1) return null;
    inMemoryStore.records[index] = {
      ...inMemoryStore.records[index],
      ...updates,
      updatedAt: now
    };
    return inMemoryStore.records[index];
  },
  async deleteAttendanceRecord(id, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      let query = { userId };
      try {
        query._id = new ObjectId(id);
      } catch {
        query.id = id;
      }
      const res = await db.collection("attendanceRecords").deleteOne(query);
      return res.deletedCount > 0;
    }
    const initialLength = inMemoryStore.records.length;
    inMemoryStore.records = inMemoryStore.records.filter((r) => r.id !== id);
    return inMemoryStore.records.length < initialLength;
  },
  async getSettings(userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      const doc = await db.collection("attendanceSettings").findOne({ userId });
      if (doc && typeof doc.requiredAttendance === "number") {
        return { requiredAttendance: doc.requiredAttendance };
      }
    }
    return inMemoryStore.settings;
  },
  async updateSettings(settings, userId = "default_user") {
    const { db } = await getMongoDb();
    if (db) {
      await db.collection("attendanceSettings").updateOne(
        { userId },
        { $set: { userId, requiredAttendance: settings.requiredAttendance, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
        { upsert: true }
      );
    }
    inMemoryStore.settings = settings;
    return settings;
  }
};

// src/server/auth.ts
import crypto from "crypto";
var DEFAULT_PIN = process.env.APP_SECURITY_PIN || "12345678";
function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, 1e5, 64, "sha256").toString("hex");
}
var ServerAuthManager = class {
  constructor() {
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.memoryConfig = null;
    this.ensureInitialized();
  }
  async ensureInitialized() {
    try {
      const existing = await dbService.getAuthConfig("default_user");
      if (existing && existing.hash && existing.salt) {
        this.memoryConfig = {
          hash: existing.hash,
          salt: existing.salt,
          isCustomized: existing.isCustomized ?? false,
          updatedAt: existing.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
        return;
      }
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = hashPin(DEFAULT_PIN, salt);
      const config = {
        hash,
        salt,
        isCustomized: false,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.memoryConfig = config;
      await dbService.saveAuthConfig(config, "default_user");
    } catch (err) {
      console.warn("Auth manager initialization notice (using memory fallback):", err);
      if (!this.memoryConfig) {
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = hashPin(DEFAULT_PIN, salt);
        this.memoryConfig = {
          hash,
          salt,
          isCustomized: false,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
  }
  async getConfig() {
    try {
      const dbConfig = await dbService.getAuthConfig("default_user");
      if (dbConfig && dbConfig.hash && dbConfig.salt) {
        this.memoryConfig = {
          hash: dbConfig.hash,
          salt: dbConfig.salt,
          isCustomized: dbConfig.isCustomized ?? false,
          updatedAt: dbConfig.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
        return this.memoryConfig;
      }
    } catch {
    }
    if (this.memoryConfig) return this.memoryConfig;
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPin(DEFAULT_PIN, salt);
    this.memoryConfig = {
      hash,
      salt,
      isCustomized: false,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.memoryConfig;
  }
  getLockoutRemainingSeconds() {
    const now = Date.now();
    if (this.lockoutUntil > now) {
      return Math.ceil((this.lockoutUntil - now) / 1e3);
    }
    return 0;
  }
  async getStatus(clientToken) {
    const lockoutSeconds = this.getLockoutRemainingSeconds();
    const config = await this.getConfig();
    let isValid = false;
    if (clientToken) {
      const validation = await dbService.validateSession(clientToken);
      isValid = validation.valid;
    }
    return {
      authenticated: isValid,
      sessionInvalidated: false,
      isLockedOut: lockoutSeconds > 0,
      lockoutSeconds,
      attemptsRemaining: Math.max(0, 5 - this.failedAttempts),
      isDefaultPin: !config.isCustomized,
      activeSessionExists: isValid
    };
  }
  async unlock(pin, userAgent, ip) {
    const lockoutSec = this.getLockoutRemainingSeconds();
    if (lockoutSec > 0) {
      return {
        success: false,
        error: `Too many failed attempts. Security cooldown active for ${lockoutSec}s.`,
        lockoutSeconds: lockoutSec,
        attemptsRemaining: 0
      };
    }
    if (!pin || !/^\d{8}$/.test(pin.trim())) {
      return {
        success: false,
        error: "Password must be exactly 8 numeric digits (0-9).",
        attemptsRemaining: Math.max(0, 5 - this.failedAttempts)
      };
    }
    const config = await this.getConfig();
    const candidateHash = hashPin(pin.trim(), config.salt);
    const hashBufferA = Buffer.from(candidateHash, "hex");
    const hashBufferB = Buffer.from(config.hash, "hex");
    const isMatch = hashBufferA.length === hashBufferB.length && crypto.timingSafeEqual(hashBufferA, hashBufferB);
    if (!isMatch) {
      this.failedAttempts += 1;
      if (this.failedAttempts >= 5) {
        this.lockoutUntil = Date.now() + 30 * 1e3;
        this.failedAttempts = 0;
        return {
          success: false,
          error: "Incorrect 8-digit password. Rate limit reached: Locked out for 30 seconds.",
          lockoutSeconds: 30,
          attemptsRemaining: 0
        };
      }
      return {
        success: false,
        error: `Incorrect 8-digit password. ${5 - this.failedAttempts} attempt(s) remaining.`,
        attemptsRemaining: 5 - this.failedAttempts
      };
    }
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    const tokenBytes = crypto.randomBytes(32).toString("hex");
    const newSessionToken = `sec_sess_${tokenBytes}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    await dbService.createSession({
      token: newSessionToken,
      userId: "default_user",
      expiresAt,
      userAgent: userAgent || "Unknown Device",
      ip: ip || "unknown"
    });
    return {
      success: true,
      token: newSessionToken
    };
  }
  async validateSession(clientToken) {
    if (!clientToken) return false;
    const result = await dbService.validateSession(clientToken);
    return result.valid;
  }
  async lockSession(clientToken) {
    if (!clientToken) return false;
    return await dbService.deleteSession(clientToken);
  }
  async revokeAllSessions(userId = "default_user") {
    return await dbService.deleteAllSessions(userId);
  }
  async changePin(currentPin, newPin) {
    if (!currentPin || !/^\d{8}$/.test(currentPin.trim())) {
      return { success: false, error: "Current password must be 8 digits." };
    }
    if (!newPin || !/^\d{8}$/.test(newPin.trim())) {
      return { success: false, error: "New password must be exactly 8 digits (0-9)." };
    }
    const config = await this.getConfig();
    const candidateHash = hashPin(currentPin.trim(), config.salt);
    const hashBufferA = Buffer.from(candidateHash, "hex");
    const hashBufferB = Buffer.from(config.hash, "hex");
    const isMatch = hashBufferA.length === hashBufferB.length && crypto.timingSafeEqual(hashBufferA, hashBufferB);
    if (!isMatch) {
      return { success: false, error: "Current 8-digit password is incorrect." };
    }
    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = hashPin(newPin.trim(), newSalt);
    const updatedConfig = {
      hash: newHash,
      salt: newSalt,
      isCustomized: true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.memoryConfig = updatedConfig;
    await dbService.saveAuthConfig(updatedConfig, "default_user");
    await dbService.deleteAllSessions("default_user");
    const tokenBytes = crypto.randomBytes(32).toString("hex");
    const newSessionToken = `sec_sess_${tokenBytes}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    await dbService.createSession({
      token: newSessionToken,
      userId: "default_user",
      expiresAt
    });
    return {
      success: true,
      token: newSessionToken
    };
  }
};
var serverAuth = new ServerAuthManager();

// src/utils/attendanceCalculations.ts
function calculateTheoryAttendance(records) {
  const theory = records.filter((r) => r.type === "theory");
  const attended = theory.filter((r) => r.status === "attended").length;
  const missed = theory.filter((r) => r.status === "missed").length;
  const total = attended + missed;
  const percentage = total > 0 ? attended / total * 100 : null;
  return { attended, missed, total, percentage };
}
function calculatePracticalAttendance(records) {
  const practical = records.filter((r) => r.type === "practical");
  const attended = practical.filter((r) => r.status === "attended").length;
  const missed = practical.filter((r) => r.status === "missed").length;
  const total = attended + missed;
  const percentage = total > 0 ? attended / total * 100 : null;
  return { attended, missed, total, percentage };
}
function calculateSubjectAttendance(subject, records, requiredAttendance = 75) {
  const subjectRecords = records.filter((r) => r.subjectId === subject.id);
  const theory = calculateTheoryAttendance(subjectRecords);
  const practical = calculatePracticalAttendance(subjectRecords);
  const attended = theory.attended + practical.attended;
  const missed = theory.missed + practical.missed;
  const total = attended + missed;
  const percentage = total > 0 ? attended / total * 100 : null;
  let status = "No Data";
  if (percentage !== null) {
    if (percentage >= 90) status = "Excellent";
    else if (percentage >= requiredAttendance) status = "Safe";
    else if (percentage < 65) status = "Critical";
    else status = "At Risk";
  }
  const classesNeeded = percentage !== null ? calculateClassesNeededToReachTarget(attended, total, requiredAttendance) : 0;
  const nextAttendedProjection = total > 0 ? (attended + 1) / (total + 1) * 100 : 100;
  const nextMissedProjection = total > 0 ? attended / (total + 1) * 100 : 0;
  return {
    subjectId: subject.id,
    name: subject.name,
    code: subject.code,
    active: subject.active,
    theory,
    practical,
    overall: {
      attended,
      missed,
      total,
      percentage
    },
    requiredPercentage: requiredAttendance,
    status,
    classesNeeded,
    nextAttendedProjection,
    nextMissedProjection
  };
}
function calculateClassesNeededToReachTarget(attended, total, targetPct) {
  if (total === 0) return 0;
  const p = targetPct / 100;
  const currentRatio = attended / total;
  if (currentRatio >= p) return 0;
  if (p >= 1) {
    return Infinity;
  }
  const numerator = p * total - attended;
  const denominator = 1 - p;
  const x = Math.ceil(numerator / denominator);
  return Math.max(0, x);
}
function calculateGlobalSummary(subjects, records, settings) {
  const activeSubjects = subjects.filter((s) => s.active);
  const activeSubjectIds = new Set(activeSubjects.map((s) => s.id));
  const activeRecords = records.filter((r) => activeSubjectIds.has(r.subjectId));
  const theoryRecords = activeRecords.filter((r) => r.type === "theory");
  const theoryAttended = theoryRecords.filter((r) => r.status === "attended").length;
  const theoryTotal = theoryRecords.length;
  const theoryPercentage = theoryTotal > 0 ? theoryAttended / theoryTotal * 100 : null;
  const practicalRecords = activeRecords.filter((r) => r.type === "practical");
  const practicalAttended = practicalRecords.filter((r) => r.status === "attended").length;
  const practicalTotal = practicalRecords.length;
  const practicalPercentage = practicalTotal > 0 ? practicalAttended / practicalTotal * 100 : null;
  const totalAttended = theoryAttended + practicalAttended;
  const totalClasses = theoryTotal + practicalTotal;
  const overallPercentage = totalClasses > 0 ? totalAttended / totalClasses * 100 : null;
  const subjectSummaries = activeSubjects.map(
    (s) => calculateSubjectAttendance(s, activeRecords, settings.requiredAttendance)
  );
  const subjectsWithData = subjectSummaries.filter(
    (s) => s.overall.percentage !== null
  );
  let lowestOverall = null;
  if (subjectsWithData.length > 0) {
    const minSub = [...subjectsWithData].sort(
      (a, b) => (a.overall.percentage ?? 0) - (b.overall.percentage ?? 0)
    )[0];
    if (minSub && minSub.overall.percentage !== null) {
      lowestOverall = {
        subjectId: minSub.subjectId,
        name: minSub.name,
        percentage: minSub.overall.percentage
      };
    }
  }
  const subjectsWithTheory = subjectSummaries.filter((s) => s.theory.percentage !== null);
  let lowestTheory = null;
  if (subjectsWithTheory.length > 0) {
    const minSub = [...subjectsWithTheory].sort(
      (a, b) => (a.theory.percentage ?? 0) - (b.theory.percentage ?? 0)
    )[0];
    if (minSub && minSub.theory.percentage !== null) {
      lowestTheory = {
        subjectId: minSub.subjectId,
        name: minSub.name,
        percentage: minSub.theory.percentage
      };
    }
  }
  const subjectsWithPractical = subjectSummaries.filter((s) => s.practical.percentage !== null);
  let lowestPractical = null;
  if (subjectsWithPractical.length > 0) {
    const minSub = [...subjectsWithPractical].sort(
      (a, b) => (a.practical.percentage ?? 0) - (b.practical.percentage ?? 0)
    )[0];
    if (minSub && minSub.practical.percentage !== null) {
      lowestPractical = {
        subjectId: minSub.subjectId,
        name: minSub.name,
        percentage: minSub.practical.percentage
      };
    }
  }
  const atRiskSubjects = subjectSummaries.filter(
    (s) => s.overall.percentage !== null && s.overall.percentage < settings.requiredAttendance
  );
  return {
    overall: {
      attended: totalAttended,
      total: totalClasses,
      percentage: overallPercentage
    },
    theory: {
      attended: theoryAttended,
      total: theoryTotal,
      percentage: theoryPercentage
    },
    practical: {
      attended: practicalAttended,
      total: practicalTotal,
      percentage: practicalPercentage
    },
    lowestOverall,
    lowestTheory,
    lowestPractical,
    atRiskSubjects,
    subjects: subjectSummaries,
    requiredAttendance: settings.requiredAttendance
  };
}

// src/server/app.ts
dotenv.config();
var app = express();
app.use(express.json({ limit: "10mb" }));
function extractSessionToken(req) {
  const customHeader = req.headers["x-session-token"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return customHeader.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [name, ...val] = cookie.trim().split("=");
      if (name === "session_token") {
        return decodeURIComponent(val.join("="));
      }
    }
  }
  return null;
}
function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieParts = [
    `session_token=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${30 * 24 * 60 * 60}`
    // 30 days
  ];
  if (isProd) {
    cookieParts.push("Secure");
  }
  res.setHeader("Set-Cookie", cookieParts.join("; "));
}
function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieParts = [
    "session_token=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (isProd) {
    cookieParts.push("Secure");
  }
  res.setHeader("Set-Cookie", cookieParts.join("; "));
}
var apiRouter = express.Router();
apiRouter.get("/auth/status", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    const status = await serverAuth.getStatus(token);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Failed to verify auth status" });
  }
});
apiRouter.post("/auth/unlock", async (req, res) => {
  try {
    const { pin } = req.body;
    const userAgent = req.headers["user-agent"];
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const result = await serverAuth.unlock(pin, userAgent, ip);
    if (!result.success || !result.token) {
      return res.status(401).json(result);
    }
    setSessionCookie(res, result.token);
    res.json(result);
  } catch (err) {
    console.error("CRITICAL Auth error during unlock:", err);
    res.status(500).json({ success: false, error: "Authentication service error", details: err?.message || String(err) });
  }
});
apiRouter.post("/auth/lock", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    if (token) {
      await serverAuth.lockSession(token);
    }
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to lock session" });
  }
});
apiRouter.post("/auth/revoke-all", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    const isValid = await serverAuth.validateSession(token);
    if (!isValid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await serverAuth.revokeAllSessions("default_user");
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to revoke sessions" });
  }
});
apiRouter.post("/auth/change-pin", async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update password" });
  }
});
apiRouter.get("/health", async (_req, res) => {
  try {
    const status = await dbService.getStatus();
    res.json({ status: "ok", database: status });
  } catch (err) {
    res.json({ status: "ok", database: { isUsingAtlas: false, error: err.message } });
  }
});
var requireValidSession = async (req, res, next) => {
  if (req.path === "/health" || req.originalUrl.includes("health")) {
    return next();
  }
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({
      error: "Security Lock Active: Please enter the 8-digit password to unlock.",
      sessionInvalidated: true
    });
  }
  const isValid = await serverAuth.validateSession(token);
  if (!isValid) {
    clearSessionCookie(res);
    return res.status(401).json({
      error: "Session Expired or Revoked: Please enter the 8-digit password to unlock.",
      sessionInvalidated: true
    });
  }
  req.userId = "default_user";
  next();
};
apiRouter.use("/app-data", requireValidSession);
apiRouter.use("/tasks", requireValidSession);
apiRouter.use("/assignments", requireValidSession);
apiRouter.use("/events", requireValidSession);
apiRouter.use("/checklists", requireValidSession);
apiRouter.use("/daily-states", requireValidSession);
apiRouter.use("/settings", requireValidSession);
apiRouter.use("/migration", requireValidSession);
apiRouter.use("/subjects", requireValidSession);
apiRouter.use("/attendance", requireValidSession);
apiRouter.post("/migration/upload", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid migration payload" });
    }
    const result = await dbService.reconcileMigrationData("default_user", payload);
    res.json(result);
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: "Failed to reconcile migration data" });
  }
});
apiRouter.get("/migration/status", async (_req, res) => {
  try {
    const data = await dbService.getAppData("default_user");
    res.json({
      tasksCount: data.tasks.length,
      assignmentsCount: data.assignments.length,
      eventsCount: data.events.length,
      checklistsCount: data.checklists.length
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve migration status" });
  }
});
apiRouter.get("/app-data", async (_req, res) => {
  try {
    const data = await dbService.getAppData("default_user");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch central app data" });
  }
});
apiRouter.post("/app-data", async (req, res) => {
  try {
    const saved = await dbService.saveAppData(req.body, "default_user");
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to save central app data" });
  }
});
apiRouter.get("/tasks", async (_req, res) => {
  try {
    const tasks = await dbService.getTasks("default_user");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});
apiRouter.post("/tasks", async (req, res) => {
  try {
    const created = await dbService.createTask(req.body, "default_user");
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
});
apiRouter.patch("/tasks/:id", async (req, res) => {
  try {
    const updated = await dbService.updateTask(req.params.id, req.body, "default_user");
    if (!updated) return res.status(404).json({ error: "Task not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});
apiRouter.delete("/tasks/:id", async (req, res) => {
  try {
    const success = await dbService.deleteTask(req.params.id, "default_user");
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});
apiRouter.get("/assignments", async (_req, res) => {
  try {
    const assignments = await dbService.getAssignments("default_user");
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});
apiRouter.post("/assignments", async (req, res) => {
  try {
    const created = await dbService.createAssignment(req.body, "default_user");
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create assignment" });
  }
});
apiRouter.patch("/assignments/:id", async (req, res) => {
  try {
    const updated = await dbService.updateAssignment(req.params.id, req.body, "default_user");
    if (!updated) return res.status(404).json({ error: "Assignment not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update assignment" });
  }
});
apiRouter.delete("/assignments/:id", async (req, res) => {
  try {
    const success = await dbService.deleteAssignment(req.params.id, "default_user");
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});
apiRouter.get("/events", async (_req, res) => {
  try {
    const events = await dbService.getEvents("default_user");
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});
apiRouter.post("/events", async (req, res) => {
  try {
    const created = await dbService.createEvent(req.body, "default_user");
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create event" });
  }
});
apiRouter.patch("/events/:id", async (req, res) => {
  try {
    const updated = await dbService.updateEvent(req.params.id, req.body, "default_user");
    if (!updated) return res.status(404).json({ error: "Event not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update event" });
  }
});
apiRouter.delete("/events/:id", async (req, res) => {
  try {
    const success = await dbService.deleteEvent(req.params.id, "default_user");
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});
apiRouter.get("/checklists", async (_req, res) => {
  try {
    const checklists = await dbService.getChecklists("default_user");
    res.json(checklists);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch checklists" });
  }
});
apiRouter.post("/checklists", async (req, res) => {
  try {
    const created = await dbService.createChecklistItem(req.body, "default_user");
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create checklist item" });
  }
});
apiRouter.patch("/checklists/:id", async (req, res) => {
  try {
    const updated = await dbService.updateChecklistItem(req.params.id, req.body, "default_user");
    if (!updated) return res.status(404).json({ error: "Checklist item not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update checklist item" });
  }
});
apiRouter.delete("/checklists/:id", async (req, res) => {
  try {
    const success = await dbService.deleteChecklistItem(req.params.id, "default_user");
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete checklist item" });
  }
});
apiRouter.post("/checklists/restore-defaults", async (_req, res) => {
  try {
    const items = await dbService.restoreDefaultChecklists("default_user");
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to restore default checklists" });
  }
});
apiRouter.get("/attendance/health", async (_req, res) => {
  try {
    const status = await dbService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ isUsingAtlas: false, error: err.message });
  }
});
apiRouter.get("/attendance/summary", async (_req, res) => {
  try {
    const [subjects, records, settings] = await Promise.all([
      dbService.getSubjects("default_user"),
      dbService.getAttendanceRecords(void 0, "default_user"),
      dbService.getSettings("default_user")
    ]);
    const summary = calculateGlobalSummary(subjects, records, settings);
    res.json(summary);
  } catch (err) {
    console.error("Error fetching attendance summary:", err);
    res.status(500).json({ error: "Failed to compute attendance summary" });
  }
});
apiRouter.get("/subjects", async (_req, res) => {
  try {
    const subjects = await dbService.getSubjects("default_user");
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});
apiRouter.post("/subjects", async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Subject name is required" });
    }
    const created = await dbService.createSubject({ name, code }, "default_user");
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create subject" });
  }
});
apiRouter.post("/subjects/batch", async (req, res) => {
  try {
    const { subjects } = req.body;
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "Subjects array is required" });
    }
    const valid = subjects.filter((s) => s && s.name && typeof s.name === "string");
    const created = await dbService.batchCreateSubjects(valid, "default_user");
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to batch create subjects" });
  }
});
apiRouter.patch("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await dbService.updateSubject(id, updates, "default_user");
    if (!updated) {
      return res.status(404).json({ error: "Subject not found" });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update subject" });
  }
});
apiRouter.delete("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const records = await dbService.getAttendanceRecords({ subjectId: id }, "default_user");
    if (records.length > 0 && req.query.force !== "true") {
      return res.status(400).json({
        error: "Subject has existing attendance records. Deactivate instead or use force=true.",
        recordCount: records.length
      });
    }
    const success = await dbService.deleteSubject(id, "default_user");
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete subject" });
  }
});
apiRouter.get("/attendance", async (req, res) => {
  try {
    const { subjectId, type, status } = req.query;
    const records = await dbService.getAttendanceRecords({ subjectId, type, status }, "default_user");
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});
apiRouter.post("/attendance", async (req, res) => {
  try {
    const { subjectId, type, status, date, time, notes } = req.body;
    if (!subjectId) {
      return res.status(400).json({ error: "Subject is required" });
    }
    if (!["theory", "practical"].includes(type)) {
      return res.status(400).json({ error: "Type must be theory or practical" });
    }
    if (!["attended", "missed"].includes(status)) {
      return res.status(400).json({ error: "Status must be attended or missed" });
    }
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    const existing = await dbService.getAttendanceRecords({ subjectId, type, status }, "default_user");
    const isDuplicate = existing.some((r) => r.date === date && (!time || r.time === time));
    const record = await dbService.createAttendanceRecord(
      {
        subjectId,
        type,
        status,
        date,
        time,
        notes
      },
      "default_user"
    );
    res.status(201).json({ record, duplicateWarning: isDuplicate });
  } catch (err) {
    res.status(500).json({ error: "Failed to save attendance record" });
  }
});
apiRouter.patch("/attendance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await dbService.updateAttendanceRecord(id, updates, "default_user");
    if (!updated) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update attendance record" });
  }
});
apiRouter.delete("/attendance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteAttendanceRecord(id, "default_user");
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete attendance record" });
  }
});
apiRouter.get("/attendance/settings", async (_req, res) => {
  try {
    const settings = await dbService.getSettings("default_user");
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance settings" });
  }
});
apiRouter.post("/attendance/settings", async (req, res) => {
  try {
    const { requiredAttendance } = req.body;
    if (typeof requiredAttendance !== "number" || requiredAttendance < 0 || requiredAttendance > 100) {
      return res.status(400).json({ error: "Required attendance must be between 0 and 100" });
    }
    const settings = await dbService.updateSettings({ requiredAttendance }, "default_user");
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});
app.use("/api", apiRouter);
app.use(apiRouter);
var app_default = app;

// src/server/api-handler.ts
async function handler(req, res) {
  try {
    const forwardedUri = req.headers["x-forwarded-uri"] || req.headers["x-matched-path"] || req.headers["x-invoke-path"];
    if (forwardedUri && typeof forwardedUri === "string" && (req.url === "/" || req.url === "/api" || !req.url.startsWith("/api/"))) {
      req.url = forwardedUri;
    }
    return app_default(req, res);
  } catch (err) {
    return res.status(500).json({ error: "Serverless invocation error", message: err?.message || String(err) });
  }
}
export {
  handler as default
};
