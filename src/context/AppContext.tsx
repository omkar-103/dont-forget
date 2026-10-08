import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
  loadAppData,
  saveAppData,
  exportDataAsJson,
  generateDefaultChecklists,
  generateInitialSeedData,
} from '../utils/storage';
import { getTodayLocal, addDays } from '../utils/date';

interface AppContextValue {
  data: AppData;
  activeDate: string;
  setActiveDate: (date: string) => void;
  resetActiveDateToToday: () => void;
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  filterContext?: string;
  setFilterContext: (ctx: string | undefined) => void;

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
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  isTaskCompletedOnDate: (task: Task, date: string) => boolean;
  rescheduleTask: (id: string, newDate: string) => void;

  // Assignment actions
  addAssignment: (asg: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  toggleAssignmentStatus: (id: string) => void;
  rescheduleAssignment: (id: string, newDeadline: string) => void;

  // Event actions
  addEvent: (evt: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;

  // Checklist actions
  addChecklistItem: (name: string, checklistId: ChecklistType, section?: string) => void;
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => void;
  deleteChecklistItem: (id: string) => void;
  toggleChecklistItem: (id: string, checklistId: ChecklistType) => void;
  isChecklistItemChecked: (id: string, checklistId: ChecklistType, date?: string) => boolean;
  getChecklistProgress: (checklistId: ChecklistType, date?: string) => { total: number; checked: number; isComplete: boolean };
  moveChecklistItem: (id: string, direction: 'up' | 'down') => void;
  resetTodayChecklist: (checklistId?: ChecklistType) => void;
  restoreDefaultChecklists: () => void;

  // Settings & Theme
  theme: 'system' | 'light' | 'dark';
  isDarkMode: boolean;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  toggleTheme: () => void;
  exportBackup: () => void;
  importBackup: (newData: AppData) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => loadAppData());
  
  // Active viewing date: starts on local device date
  const [activeDate, setActiveDateState] = useState<string>(() => getTodayLocal());

  const [currentTab, setCurrentTab] = useState<NavigationTab>('today');
  const [filterContext, setFilterContext] = useState<string | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [defaultAddType, setDefaultAddType] = useState<'task' | 'assignment' | 'event' | 'checklist'>('task');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load latest data from MongoDB Atlas on mount
  useEffect(() => {
    let mounted = true;
    async function syncWithServer() {
      try {
        const token = localStorage.getItem('dont_forget_session_token');
        const res = await fetch('/api/app-data', {
          headers: token ? { 'x-session-token': token } : {},
        });
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData && mounted) {
            setData((prev) => {
              const merged = { ...prev, ...cloudData };
              saveAppData(merged);
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync with MongoDB Atlas yet:', err);
      }
    }
    syncWithServer();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync data to localStorage and MongoDB Atlas whenever it changes
  useEffect(() => {
    saveAppData(data);
    const token = localStorage.getItem('dont_forget_session_token');
    const timer = setTimeout(() => {
      fetch('/api/app-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify(data),
      }).catch((e) => console.warn('Atlas autosave notice:', e));
    }, 400);
    return () => clearTimeout(timer);
  }, [data]);

  // Handle theme changes
  const [theme, setThemeState] = useState<'system' | 'light' | 'dark'>(() => data.settings?.theme || 'system');
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const initialTheme = data.settings?.theme || 'system';
    if (initialTheme === 'dark') return true;
    if (initialTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
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
    };

    applyTheme();

    const listener = () => {
      if (theme === 'system') applyTheme();
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = useCallback((newTheme: 'system' | 'light' | 'dark') => {
    setThemeState(newTheme);
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: newTheme,
      },
    }));
  }, []);

  const toggleTheme = useCallback(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const currentlyDark = theme === 'dark' || (theme === 'system' && media.matches);
    const nextTheme: 'system' | 'light' | 'dark' = currentlyDark ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  const setActiveDate = useCallback((newDate: string) => {
    setActiveDateState(newDate);
  }, []);

  const resetActiveDateToToday = useCallback(() => {
    const today = getTodayLocal();
    const base = today < '2026-10-09' ? '2026-10-09' : today;
    setActiveDateState(base);
  }, []);

  const openQuickAdd = useCallback((type: 'task' | 'assignment' | 'event' | 'checklist' = 'task') => {
    setDefaultAddType(type);
    setIsAddOpen(true);
  }, []);

  // Helper to ensure dailyState entry exists for a date
  const getEnsureDailyState = useCallback((targetDate: string, currentData: AppData) => {
    if (currentData.dailyStates[targetDate]) {
      return currentData.dailyStates[targetDate];
    }
    return {
      completedTasks: [],
      completedChecklistItems: {
        college: [],
        events: [],
        travel: [],
      },
    };
  }, []);

  // Check if a task is completed on a specific date
  const isTaskCompletedOnDate = useCallback((task: Task, date: string): boolean => {
    if (task.recurring === 'Daily' || task.recurring === 'Weekly') {
      const dayState = data.dailyStates[date];
      return Boolean(dayState?.completedTasks?.includes(task.id));
    }
    return task.status === 'Completed';
  }, [data.dailyStates]);

  // Task actions
  const addTask = useCallback((taskInput: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskInput,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setData((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: now } : t)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  }, []);

  const toggleTaskComplete = useCallback((id: string) => {
    setData((prev) => {
      const task = prev.tasks.find((t) => t.id === id);
      if (!task) return prev;

      const dateKey = activeDate;
      const dayState = prev.dailyStates[dateKey] || {
        completedTasks: [],
        completedChecklistItems: { college: [], events: [], travel: [] },
      };

      if (task.recurring === 'Daily' || task.recurring === 'Weekly') {
        const isDone = dayState.completedTasks.includes(id);
        const updatedCompletedTasks = isDone
          ? dayState.completedTasks.filter((taskId) => taskId !== id)
          : [...dayState.completedTasks, id];

        return {
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
        // Non-recurring task
        const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        const now = new Date().toISOString();

        return {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status: nextStatus, updatedAt: now } : t)),
        };
      }
    });
  }, [activeDate]);

  const rescheduleTask = useCallback((id: string, newDate: string) => {
    setData((prev) => {
      const now = new Date().toISOString();
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, date: newDate, updatedAt: now } : t)),
      };
    });
  }, []);

  // Assignment actions
  const addAssignment = useCallback((asgInput: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `asg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newAsg: Assignment = {
      ...asgInput,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setData((prev) => ({
      ...prev,
      assignments: [newAsg, ...prev.assignments],
    }));
  }, []);

  const updateAssignment = useCallback((id: string, updates: Partial<Assignment>) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a)),
    }));
  }, []);

  const deleteAssignment = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((a) => a.id !== id),
    }));
  }, []);

  const toggleAssignmentStatus = useCallback((id: string) => {
    setData((prev) => {
      const asg = prev.assignments.find((a) => a.id === id);
      if (!asg) return prev;
      const nextStatus = asg.status === 'Completed' ? 'Not Started' : 'Completed';
      const now = new Date().toISOString();
      return {
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === id ? { ...a, status: nextStatus, updatedAt: now } : a
        ),
      };
    });
  }, []);

  const rescheduleAssignment = useCallback((id: string, newDeadline: string) => {
    setData((prev) => {
      const now = new Date().toISOString();
      return {
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === id ? { ...a, deadline: newDeadline, updatedAt: now } : a
        ),
      };
    });
  }, []);

  // Event actions
  const addEvent = useCallback((evtInput: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newEvt: EventItem = {
      ...evtInput,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setData((prev) => ({
      ...prev,
      events: [newEvt, ...prev.events],
    }));
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<EventItem>) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: now } : e)),
    }));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }));
  }, []);

  // Checklist actions (Version 1 & Version 2)
  const addChecklistItem = useCallback((name: string, checklistId: ChecklistType, section?: string) => {
    const id = `${checklistId}_${Date.now()}`;
    setData((prev) => {
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
      return {
        ...prev,
        checklists: [...prev.checklists, newItem],
      };
    });
  }, []);

  const updateChecklistItem = useCallback((id: string, updates: Partial<ChecklistItem>) => {
    setData((prev) => ({
      ...prev,
      checklists: prev.checklists.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const deleteChecklistItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      checklists: prev.checklists.filter((c) => c.id !== id),
    }));
  }, []);

  const toggleChecklistItem = useCallback((id: string, checklistId: ChecklistType) => {
    setData((prev) => {
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

      return {
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
    });
  }, [activeDate]);

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
      // count valid checked items
      const validChecked = checkedList.filter((id) => items.some((item) => item.id === id)).length;

      return {
        total,
        checked: validChecked,
        isComplete: total > 0 && validChecked === total,
      };
    },
    [data.checklists, data.dailyStates, activeDate]
  );

  const moveChecklistItem = useCallback((id: string, direction: 'up' | 'down') => {
    setData((prev) => {
      const item = prev.checklists.find((c) => c.id === id);
      if (!item) return prev;
      const list = prev.checklists
        .filter((c) => c.checklistId === item.checklistId)
        .sort((a, b) => a.order - b.order);

      const index = list.findIndex((c) => c.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === list.length - 1) return prev;

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const currentOrder = list[index].order;
      const swapOrder = list[swapIndex].order;

      return {
        ...prev,
        checklists: prev.checklists.map((c) => {
          if (c.id === list[index].id) return { ...c, order: swapOrder };
          if (c.id === list[swapIndex].id) return { ...c, order: currentOrder };
          return c;
        }),
      };
    });
  }, []);

  const resetTodayChecklist = useCallback((checklistId?: ChecklistType) => {
    setData((prev) => {
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

      return {
        ...prev,
        dailyStates: {
          ...prev.dailyStates,
          [dateKey]: {
            ...currentDay,
            completedChecklistItems: newChecklistStates,
          },
        },
      };
    });
  }, [activeDate]);

  const restoreDefaultChecklists = useCallback(() => {
    setData((prev) => ({
      ...prev,
      checklists: generateDefaultChecklists(),
    }));
  }, []);

  const exportBackup = useCallback(() => {
    exportDataAsJson(data);
  }, [data]);

  const importBackup = useCallback((newData: AppData) => {
    setData(newData);
    saveAppData(newData);
  }, []);

  const clearAllData = useCallback(() => {
    const today = getTodayLocal();
    const baseline = today < '2026-10-09' ? '2026-10-09' : today;
    const fresh = generateInitialSeedData(baseline);
    fresh.tasks = [];
    fresh.assignments = [];
    fresh.events = [];
    setData(fresh);
    saveAppData(fresh);
  }, []);

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
