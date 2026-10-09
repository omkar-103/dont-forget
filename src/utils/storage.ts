import { AppData, ChecklistItem, Task, Assignment, EventItem } from '../types';
import { getTodayLocal } from './date';

export const STORAGE_KEY = 'dont_forget_v2_data';

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

export function generateInitialSeedData(baselineDate: string): AppData {
  return {
    schemaVersion: 2,
    tasks: [],
    assignments: [],
    events: [],
    checklists: generateDefaultChecklists(),
    dailyStates: {
      [baselineDate]: {
        completedTasks: [],
        completedChecklistItems: {
          college: [],
          events: [],
          travel: [],
        },
      },
    },
    settings: {
      schemaVersion: 2,
      theme: 'system',
      baselineDate,
      lastActiveDate: baselineDate,
    },
  };
}

/**
 * Checks for legacy Version 1 keys in localStorage and migrates them safely.
 */
export function tryMigrateFromV1(baselineDate: string): AppData | null {
  try {
    const v1College = localStorage.getItem('collegeItems');
    const v1Events = localStorage.getItem('eventItems');
    const v1Travel = localStorage.getItem('travelItems');
    const v1General = localStorage.getItem('dont_forget_items');

    if (!v1College && !v1Events && !v1Travel && !v1General) {
      return null;
    }

    const checklists: ChecklistItem[] = [];
    let order = 1;

    if (v1College) {
      try {
        const parsed = JSON.parse(v1College);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            const name = typeof item === 'string' ? item : item?.name || String(item);
            checklists.push({
              id: `college_migrated_${order}`,
              name,
              checklistId: 'college',
              order: order++,
              createdAt: new Date().toISOString(),
            });
          });
        }
      } catch {
        // ignore
      }
    }

    if (v1Events) {
      try {
        const parsed = JSON.parse(v1Events);
        if (Array.isArray(parsed)) {
          order = 1;
          parsed.forEach((item) => {
            const name = typeof item === 'string' ? item : item?.name || String(item);
            const section = item?.section || 'MUST HAVE';
            checklists.push({
              id: `event_migrated_${order}`,
              name,
              section,
              checklistId: 'events',
              order: order++,
              createdAt: new Date().toISOString(),
            });
          });
        }
      } catch {
        // ignore
      }
    }

    if (v1Travel) {
      try {
        const parsed = JSON.parse(v1Travel);
        if (Array.isArray(parsed)) {
          order = 1;
          parsed.forEach((item) => {
            const name = typeof item === 'string' ? item : item?.name || String(item);
            checklists.push({
              id: `travel_migrated_${order}`,
              name,
              checklistId: 'travel',
              order: order++,
              createdAt: new Date().toISOString(),
            });
          });
        }
      } catch {
        // ignore
      }
    }

    const finalChecklists = checklists.length > 0 ? checklists : generateDefaultChecklists();
    const seeded = generateInitialSeedData(baselineDate);
    seeded.checklists = finalChecklists;
    return seeded;
  } catch {
    return null;
  }
}

/**
 * Detects any legacy local records that need migration to MongoDB Atlas.
 */
export function detectLocalLegacyData(): AppData | null {
  try {
    const migratedFlag = localStorage.getItem('dont_forget_migrated_v3');
    if (migratedFlag) return null; // already safely migrated

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as AppData;
      if (
        data &&
        data.schemaVersion === 2 &&
        (data.tasks?.length > 0 ||
          data.assignments?.length > 0 ||
          data.events?.length > 0 ||
          Object.keys(data.dailyStates || {}).length > 0)
      ) {
        return data;
      }
    }

    return tryMigrateFromV1(getTodayLocal());
  } catch {
    return null;
  }
}

/**
 * Marks migration complete and creates a secure backup while freeing primary local storage.
 */
export function markMigrationComplete(dataToBackup?: AppData): void {
  try {
    if (dataToBackup) {
      localStorage.setItem('dont_forget_local_backup', JSON.stringify(dataToBackup));
    }
    localStorage.setItem('dont_forget_migrated_v3', new Date().toISOString());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('collegeItems');
    localStorage.removeItem('eventItems');
    localStorage.removeItem('travelItems');
    localStorage.removeItem('dont_forget_items');
  } catch {
    // ignore
  }
}

export function exportDataAsJson(
  data: AppData,
  attendanceData?: {
    subjects?: any[];
    attendanceRecords?: any[];
    attendanceSettings?: any;
  }
): void {
  const dateStr = data.settings.lastActiveDate || getTodayLocal();
  const filename = `dont-forget-backup-${dateStr}.json`;
  const exportPayload = {
    ...data,
    schemaVersion: 3,
    subjects: attendanceData?.subjects || [],
    attendanceRecords: attendanceData?.attendanceRecords || [],
    attendanceSettings: attendanceData?.attendanceSettings || { requiredAttendance: 75 },
  };
  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateImportedJson(jsonObj: unknown): {
  valid: boolean;
  error?: string;
  data?: AppData;
  attendanceData?: {
    subjects?: any[];
    attendanceRecords?: any[];
    attendanceSettings?: any;
  };
} {
  if (!jsonObj || typeof jsonObj !== 'object') {
    return { valid: false, error: 'File is not a valid JSON object.' };
  }
  const obj = jsonObj as any;
  if (!Array.isArray(obj.tasks) || !Array.isArray(obj.checklists)) {
    return { valid: false, error: 'Missing tasks or checklists arrays in backup.' };
  }

  const validData: AppData = {
    schemaVersion: 2,
    tasks: obj.tasks || [],
    assignments: Array.isArray(obj.assignments) ? obj.assignments : [],
    events: Array.isArray(obj.events) ? obj.events : [],
    checklists: obj.checklists || generateDefaultChecklists(),
    dailyStates: obj.dailyStates && typeof obj.dailyStates === 'object' ? obj.dailyStates : {},
    settings: {
      schemaVersion: 2,
      theme: obj.settings?.theme || 'system',
      baselineDate: obj.settings?.baselineDate || getTodayLocal(),
      lastActiveDate: getTodayLocal(),
    },
  };

  const attendanceData = {
    subjects: Array.isArray(obj.subjects) ? obj.subjects : undefined,
    attendanceRecords: Array.isArray(obj.attendanceRecords) ? obj.attendanceRecords : undefined,
    attendanceSettings: obj.attendanceSettings || undefined,
  };

  return { valid: true, data: validData, attendanceData };
}
