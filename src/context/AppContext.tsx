import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  AppData,
  Task,
  Assignment,
  EventItem,
  ChecklistItem,
  ChecklistType,
  NavigationTab,
  TaskStatus,
} from '../types';
import {
  exportDataAsJson,
  generateDefaultChecklists,
  generateInitialSeedData,
  detectLocalLegacyData,
  markMigrationComplete,
} from '../utils/storage';
import { appDataApi } from '../api/appDataApi';
import { getTodayLocal } from '../utils/date';

export type SyncStatus = 'synced' | 'saving' | 'error';

interface AppContextValue {
  data: AppData;
  activeDate: string;
  setActiveDate: (date: string) => void;
  resetActiveDateToToday: () => void;
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  filterContext?: string;
  setFilterContext: (ctx: string | undefined) => void;

  // Cloud Sync & Migration
  syncStatus: SyncStatus;
  syncError: string | null;
  migrationNotice: string | null;
  dismissMigrationNotice: () => void;
  isInitialLoading: boolean;
  refreshData: () => Promise<void>;

  // Modals
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  defaultAddType: 'task' | 'assignment' | 'event' | 'checklist';
  openQuickAdd: (type?: 'task' | 'assignment' | 'event' | 'checklist') => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  isTaskCompletedOnDate: (task: Task, date: string) => boolean;
  rescheduleTask: (id: string, newDate: string) => Promise<void>;

  // Assignment actions
  addAssignment: (asg: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  toggleAssignmentStatus: (id: string) => Promise<void>;
  rescheduleAssignment: (id: string, newDeadline: string) => Promise<void>;

  // Event actions
  addEvent: (evt: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<EventItem>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Checklist actions
  addChecklistItem: (name: string, checklistId: ChecklistType, section?: string) => Promise<void>;
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => Promise<void>;
  deleteChecklistItem: (id: string) => Promise<void>;
  toggleChecklistItem: (id: string, checklistId: ChecklistType) => Promise<void>;
  isChecklistItemChecked: (id: string, checklistId: ChecklistType, date?: string) => boolean;
  getChecklistProgress: (checklistId: ChecklistType, date?: string) => { total: number; checked: number; isComplete: boolean };
  moveChecklistItem: (id: string, direction: 'up' | 'down') => Promise<void>;
  resetTodayChecklist: (checklistId?: ChecklistType) => Promise<void>;
  restoreDefaultChecklists: () => Promise<void>;

  // Settings & Theme
  theme: 'system' | 'light' | 'dark' | 'orange-pink';
  isDarkMode: boolean;
  isOrangePink: boolean;
  setTheme: (theme: 'system' | 'light' | 'dark' | 'orange-pink') => void;
  toggleTheme: () => void;
  exportBackup: () => void;
  importBackup: (newData: AppData) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialToday = getTodayLocal();
  const [data, setData] = useState<AppData>(() => generateInitialSeedData(initialToday));
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [migrationNotice, setMigrationNotice] = useState<string | null>(null);

  // Active viewing date: starts on local device date
  const [activeDate, setActiveDateState] = useState<string>(() => initialToday);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('today');
  const [filterContext, setFilterContext] = useState<string | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [defaultAddType, setDefaultAddType] = useState<'task' | 'assignment' | 'event' | 'checklist'>('task');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Reference to track in-flight mutations to prevent race conditions during background sync
  const isMutatingRef = useRef(false);
  const currentDataRef = useRef(data);
  currentDataRef.current = data;

  // Persist updated state directly to MongoDB Atlas
  const persistToDatabase = useCallback(async (nextData: AppData) => {
    try {
      setSyncStatus('saving');
      setSyncError(null);
      isMutatingRef.current = true;
      const saved = await appDataApi.saveAppData(nextData);
      setData(saved);
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Error persisting to central database:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Failed to save to central database');
    } finally {
      isMutatingRef.current = false;
    }
  }, []);

  // Fetch latest authoritative data from MongoDB Atlas
  const refreshData = useCallback(async () => {
    if (isMutatingRef.current) return;
    try {
      const serverData = await appDataApi.getAppData();
      if (serverData && !isMutatingRef.current) {
        setData((prev) => {
          // If server data is identical or matches, avoid unnecessary re-render
          const prevStr = JSON.stringify(prev);
          const nextStr = JSON.stringify(serverData);
          if (prevStr === nextStr) return prev;
          return serverData;
        });
        setSyncStatus('synced');
        setSyncError(null);
      }
    } catch (err: any) {
      console.warn('Background sync warning:', err);
      // Only set error if we don't have data yet
      if (isInitialLoading) {
        setSyncStatus('error');
        setSyncError(err.message || 'Unable to connect to central database');
      }
    }
  }, [isInitialLoading]);

  // Initial Boot: fetch server data and safely migrate any legacy local records
  useEffect(() => {
    let isCancelled = false;

    async function initializeAppData() {
      setIsInitialLoading(true);
      try {
        // 1. Fetch cloud data from MongoDB Atlas
        let cloudData: AppData;
        try {
          cloudData = await appDataApi.getAppData();
        } catch (fetchErr) {
          console.warn('Could not reach server initially, retrying...', fetchErr);
          cloudData = generateInitialSeedData(getTodayLocal());
        }

        // 2. Check if local legacy data exists and needs migration
        const legacyLocal = detectLocalLegacyData();
        if (legacyLocal) {
          try {
            const migrationResult = await appDataApi.uploadMigrationData(legacyLocal);
            if (migrationResult.success && migrationResult.appData) {
              cloudData = migrationResult.appData;
              markMigrationComplete(legacyLocal);
              const counts = migrationResult.counts;
              const totalMigrated = counts.tasksAdded + counts.assignmentsAdded + counts.eventsAdded;
              if (totalMigrated > 0) {
                setMigrationNotice(
                  `Successfully migrated ${totalMigrated} local records (${counts.tasksAdded} tasks, ${counts.assignmentsAdded} assignments, ${counts.eventsAdded} events) to Central Database!`
                );
              } else {
                markMigrationComplete();
              }
            }
          } catch (migErr) {
            console.error('Data migration notice:', migErr);
          }
        }

        if (!isCancelled) {
          setData(cloudData);
          setSyncStatus('synced');
          setSyncError(null);
        }
      } catch (err: any) {
        console.error('Failed to initialize app data:', err);
        if (!isCancelled) {
          setSyncStatus('error');
          setSyncError(err.message || 'Failed to initialize database connection');
        }
      } finally {
        if (!isCancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    initializeAppData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Cross-device continuous synchronization (polling every 10s + visibilitychange + focus)
  useEffect(() => {
    if (isInitialLoading) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    }, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refreshData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refreshData);
    };
  }, [isInitialLoading, refreshData]);

  // Handle theme changes
  const [theme, setThemeState] = useState<'system' | 'light' | 'dark' | 'orange-pink'>(
    () => (data.settings?.theme as 'system' | 'light' | 'dark' | 'orange-pink') || 'system'
  );

  const isOrangePink = theme === 'orange-pink';

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const initialTheme = data.settings?.theme || 'system';
    if (initialTheme === 'dark') return true;
    if (initialTheme === 'light' || initialTheme === 'orange-pink') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (theme === 'orange-pink') {
        const prefDark = media.matches;
        root.classList.remove('dark');
        body.classList.remove('dark');
        root.setAttribute('data-theme', prefDark ? 'orange-pink-dark' : 'orange-pink');
        root.style.colorScheme = prefDark ? 'dark' : 'light';
        setIsDarkMode(false);
      } else {
        const dark = theme === 'dark' || (theme === 'system' && media.matches);
        setIsDarkMode(dark);
        if (dark) {
          root.classList.add('dark');
          body.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          body.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
          root.style.colorScheme = 'light';
        }
      }
    };

    applyTheme();

    const listener = () => {
      if (theme === 'system' || theme === 'orange-pink') applyTheme();
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: 'system' | 'light' | 'dark' | 'orange-pink') => {
      setThemeState(newTheme);
      const nextData: AppData = {
        ...currentDataRef.current,
        settings: {
          ...currentDataRef.current.settings,
          theme: newTheme,
        },
      };
      setData(nextData);
      persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const toggleTheme = useCallback(() => {
    if (theme === 'orange-pink') {
      setTheme('system');
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const currentlyDark = theme === 'dark' || (theme === 'system' && media.matches);
    const nextTheme: 'light' | 'dark' = currentlyDark ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const setActiveDate = useCallback((newDate: string) => {
    setActiveDateState(newDate);
  }, []);

  const resetActiveDateToToday = useCallback(() => {
    const today = getTodayLocal();
    setActiveDateState(today);
  }, []);

  const openQuickAdd = useCallback((type: 'task' | 'assignment' | 'event' | 'checklist' = 'task') => {
    setDefaultAddType(type);
    setIsAddOpen(true);
  }, []);

  const dismissMigrationNotice = useCallback(() => {
    setMigrationNotice(null);
  }, []);

  // Check if a task is completed on a specific date
  const isTaskCompletedOnDate = useCallback(
    (task: Task, date: string): boolean => {
      if (task.recurring === 'Daily' || task.recurring === 'Weekly') {
        const dayState = data.dailyStates[date];
        return Boolean(dayState?.completedTasks?.includes(task.id));
      }
      return task.status === 'Completed';
    },
    [data.dailyStates]
  );

  // ==========================================
  // Task Actions (Central Database Authoritative)
  // ==========================================
  const addTask = useCallback(
    async (taskInput: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const newTask: Task = {
        ...taskInput,
        id,
        createdAt: now,
        updatedAt: now,
      };

      const nextData: AppData = {
        ...currentDataRef.current,
        tasks: [newTask, ...currentDataRef.current.tasks],
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const now = new Date().toISOString();
      const nextData: AppData = {
        ...currentDataRef.current,
        tasks: currentDataRef.current.tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: now } : t
        ),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const nextData: AppData = {
        ...currentDataRef.current,
        tasks: currentDataRef.current.tasks.filter((t) => t.id !== id),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const toggleTaskComplete = useCallback(
    async (id: string) => {
      const prev = currentDataRef.current;
      const task = prev.tasks.find((t) => t.id === id);
      if (!task) return;

      const dateKey = activeDate;
      const dayState = prev.dailyStates[dateKey] || {
        completedTasks: [],
        completedChecklistItems: { college: [], events: [], travel: [] },
      };

      let nextData: AppData;

      if (task.recurring === 'Daily' || task.recurring === 'Weekly') {
        const isDone = dayState.completedTasks.includes(id);
        const updatedCompletedTasks = isDone
          ? dayState.completedTasks.filter((taskId) => taskId !== id)
          : [...dayState.completedTasks, id];

        nextData = {
          ...prev,
          dailyStates: {
            ...prev.dailyStates,
            [dateKey]: {
              ...dayState,
              completedTasks: updatedCompletedTasks,
            },
          },
        };
      } else {
        const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        const now = new Date().toISOString();
        nextData = {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status: nextStatus, updatedAt: now } : t)),
        };
      }

      setData(nextData);
      await persistToDatabase(nextData);
    },
    [activeDate, persistToDatabase]
  );

  const rescheduleTask = useCallback(
    async (id: string, newDate: string) => {
      const now = new Date().toISOString();
      const nextData: AppData = {
        ...currentDataRef.current,
        tasks: currentDataRef.current.tasks.map((t) =>
          t.id === id ? { ...t, date: newDate, updatedAt: now } : t
        ),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  // ==========================================
  // Assignment Actions (Central Database Authoritative)
  // ==========================================
  const addAssignment = useCallback(
    async (asgInput: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `asg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const newAsg: Assignment = {
        ...asgInput,
        id,
        createdAt: now,
        updatedAt: now,
      };

      const nextData: AppData = {
        ...currentDataRef.current,
        assignments: [newAsg, ...currentDataRef.current.assignments],
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const updateAssignment = useCallback(
    async (id: string, updates: Partial<Assignment>) => {
      const now = new Date().toISOString();
      const nextData: AppData = {
        ...currentDataRef.current,
        assignments: currentDataRef.current.assignments.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: now } : a
        ),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const deleteAssignment = useCallback(
    async (id: string) => {
      const nextData: AppData = {
        ...currentDataRef.current,
        assignments: currentDataRef.current.assignments.filter((a) => a.id !== id),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const toggleAssignmentStatus = useCallback(
    async (id: string) => {
      const prev = currentDataRef.current;
      const asg = prev.assignments.find((a) => a.id === id);
      if (!asg) return;
      const nextStatus = asg.status === 'Completed' ? 'Not Started' : 'Completed';
      const now = new Date().toISOString();
      const nextData: AppData = {
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === id ? { ...a, status: nextStatus, updatedAt: now } : a
        ),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const rescheduleAssignment = useCallback(
    async (id: string, newDeadline: string) => {
      const now = new Date().toISOString();
      const nextData: AppData = {
        ...currentDataRef.current,
        assignments: currentDataRef.current.assignments.map((a) =>
          a.id === id ? { ...a, deadline: newDeadline, updatedAt: now } : a
        ),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  // ==========================================
  // Event Actions (Central Database Authoritative)
  // ==========================================
  const addEvent = useCallback(
    async (evtInput: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const newEvt: EventItem = {
        ...evtInput,
        id,
        createdAt: now,
        updatedAt: now,
      };

      const nextData: AppData = {
        ...currentDataRef.current,
        events: [newEvt, ...currentDataRef.current.events],
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<EventItem>) => {
      const now = new Date().toISOString();
      const nextData: AppData = {
        ...currentDataRef.current,
        events: currentDataRef.current.events.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: now } : e
        ),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const nextData: AppData = {
        ...currentDataRef.current,
        events: currentDataRef.current.events.filter((e) => e.id !== id),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  // ==========================================
  // Checklist Actions (Central Database Authoritative)
  // ==========================================
  const addChecklistItem = useCallback(
    async (name: string, checklistId: ChecklistType, section?: string) => {
      const id = `${checklistId}_${Date.now()}`;
      const prev = currentDataRef.current;
      const existingInList = prev.checklists.filter((c) => c.checklistId === checklistId);
      const maxOrder = existingInList.reduce((max, item) => Math.max(max, item.order || 0), 0);
      const newItem: ChecklistItem = {
        id,
        name: name.trim(),
        checklistId,
        section,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      };

      const nextData: AppData = {
        ...prev,
        checklists: [...prev.checklists, newItem],
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const updateChecklistItem = useCallback(
    async (id: string, updates: Partial<ChecklistItem>) => {
      const nextData: AppData = {
        ...currentDataRef.current,
        checklists: currentDataRef.current.checklists.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      const nextData: AppData = {
        ...currentDataRef.current,
        checklists: currentDataRef.current.checklists.filter((c) => c.id !== id),
      };
      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const toggleChecklistItem = useCallback(
    async (id: string, checklistId: ChecklistType) => {
      const prev = currentDataRef.current;
      const dateKey = activeDate;
      const currentDay = prev.dailyStates[dateKey] || {
        completedTasks: [],
        completedChecklistItems: { college: [], events: [], travel: [] },
      };

      const currentChecked = currentDay.completedChecklistItems[checklistId] || [];
      const isChecked = currentChecked.includes(id);
      const nextChecked = isChecked
        ? currentChecked.filter((itemId) => itemId !== id)
        : [...currentChecked, id];

      const nextData: AppData = {
        ...prev,
        dailyStates: {
          ...prev.dailyStates,
          [dateKey]: {
            ...currentDay,
            completedChecklistItems: {
              ...currentDay.completedChecklistItems,
              [checklistId]: nextChecked,
            },
          },
        },
      };

      setData(nextData);
      await persistToDatabase(nextData);
    },
    [activeDate, persistToDatabase]
  );

  const isChecklistItemChecked = useCallback(
    (id: string, checklistId: ChecklistType, date?: string): boolean => {
      const dateKey = date || activeDate;
      const currentDay = data.dailyStates[dateKey];
      if (!currentDay || !currentDay.completedChecklistItems) return false;
      return Boolean(currentDay.completedChecklistItems[checklistId]?.includes(id));
    },
    [data.dailyStates, activeDate]
  );

  const getChecklistProgress = useCallback(
    (checklistId: ChecklistType, date?: string) => {
      const items = data.checklists.filter((c) => c.checklistId === checklistId);
      const total = items.length;
      if (total === 0) return { total: 0, checked: 0, isComplete: false };

      const dateKey = date || activeDate;
      const currentDay = data.dailyStates[dateKey];
      const checkedList = currentDay?.completedChecklistItems?.[checklistId] || [];
      const validChecked = checkedList.filter((id) => items.some((item) => item.id === id)).length;

      return {
        total,
        checked: validChecked,
        isComplete: total > 0 && validChecked === total,
      };
    },
    [data.checklists, data.dailyStates, activeDate]
  );

  const moveChecklistItem = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      const prev = currentDataRef.current;
      const item = prev.checklists.find((c) => c.id === id);
      if (!item) return;
      const list = prev.checklists
        .filter((c) => c.checklistId === item.checklistId)
        .sort((a, b) => a.order - b.order);

      const index = list.findIndex((c) => c.id === id);
      if (index === -1) return;
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === list.length - 1) return;

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const currentOrder = list[index].order;
      const swapOrder = list[swapIndex].order;

      const nextData: AppData = {
        ...prev,
        checklists: prev.checklists.map((c) => {
          if (c.id === list[index].id) return { ...c, order: swapOrder };
          if (c.id === list[swapIndex].id) return { ...c, order: currentOrder };
          return c;
        }),
      };

      setData(nextData);
      await persistToDatabase(nextData);
    },
    [persistToDatabase]
  );

  const resetTodayChecklist = useCallback(
    async (checklistId?: ChecklistType) => {
      const prev = currentDataRef.current;
      const dateKey = activeDate;
      const currentDay = prev.dailyStates[dateKey] || {
        completedTasks: [],
        completedChecklistItems: { college: [], events: [], travel: [] },
      };

      let newChecklistStates = { ...currentDay.completedChecklistItems };
      if (checklistId) {
        newChecklistStates[checklistId] = [];
      } else {
        newChecklistStates = { college: [], events: [], travel: [] };
      }

      const nextData: AppData = {
        ...prev,
        dailyStates: {
          ...prev.dailyStates,
          [dateKey]: {
            ...currentDay,
            completedChecklistItems: newChecklistStates,
          },
        },
      };

      setData(nextData);
      await persistToDatabase(nextData);
    },
    [activeDate, persistToDatabase]
  );

  const restoreDefaultChecklists = useCallback(async () => {
    try {
      const defaults = await appDataApi.restoreDefaultChecklists();
      const nextData: AppData = {
        ...currentDataRef.current,
        checklists: defaults,
      };
      setData(nextData);
    } catch {
      const defaults = generateDefaultChecklists();
      const nextData: AppData = {
        ...currentDataRef.current,
        checklists: defaults,
      };
      setData(nextData);
      await persistToDatabase(nextData);
    }
  }, [persistToDatabase]);

  const exportBackup = useCallback(() => {
    exportDataAsJson(data);
  }, [data]);

  const importBackup = useCallback(
    async (newData: AppData) => {
      setData(newData);
      await persistToDatabase(newData);
    },
    [persistToDatabase]
  );

  const clearAllData = useCallback(async () => {
    const today = getTodayLocal();
    const fresh = generateInitialSeedData(today);
    fresh.tasks = [];
    fresh.assignments = [];
    fresh.events = [];
    setData(fresh);
    await persistToDatabase(fresh);
  }, [persistToDatabase]);

  const value = useMemo(
    () => ({
      data,
      activeDate,
      setActiveDate,
      resetActiveDateToToday,
      currentTab,
      setCurrentTab,
      filterContext,
      setFilterContext,
      syncStatus,
      syncError,
      migrationNotice,
      dismissMigrationNotice,
      isInitialLoading,
      refreshData,
      isSearchOpen,
      setIsSearchOpen,
      isAddOpen,
      setIsAddOpen,
      defaultAddType,
      openQuickAdd,
      isSettingsOpen,
      setIsSettingsOpen,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskComplete,
      isTaskCompletedOnDate,
      rescheduleTask,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      toggleAssignmentStatus,
      rescheduleAssignment,
      addEvent,
      updateEvent,
      deleteEvent,
      addChecklistItem,
      updateChecklistItem,
      deleteChecklistItem,
      toggleChecklistItem,
      isChecklistItemChecked,
      getChecklistProgress,
      moveChecklistItem,
      resetTodayChecklist,
      restoreDefaultChecklists,
      theme,
      isDarkMode,
      isOrangePink,
      setTheme,
      toggleTheme,
      exportBackup,
      importBackup,
      clearAllData,
    }),
    [
      data,
      activeDate,
      setActiveDate,
      resetActiveDateToToday,
      currentTab,
      filterContext,
      syncStatus,
      syncError,
      migrationNotice,
      dismissMigrationNotice,
      isInitialLoading,
      refreshData,
      isSearchOpen,
      isAddOpen,
      defaultAddType,
      openQuickAdd,
      isSettingsOpen,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskComplete,
      isTaskCompletedOnDate,
      rescheduleTask,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      toggleAssignmentStatus,
      rescheduleAssignment,
      addEvent,
      updateEvent,
      deleteEvent,
      addChecklistItem,
      updateChecklistItem,
      deleteChecklistItem,
      toggleChecklistItem,
      isChecklistItemChecked,
      getChecklistProgress,
      moveChecklistItem,
      resetTodayChecklist,
      restoreDefaultChecklists,
      theme,
      isDarkMode,
      isOrangePink,
      setTheme,
      toggleTheme,
      exportBackup,
      importBackup,
      clearAllData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
