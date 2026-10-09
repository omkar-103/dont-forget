import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  GlobalAttendanceSummary,
  Subject,
  AttendanceRecord,
  AttendanceSettings,
  AttendanceType,
  AttendanceStatus,
} from '../types';
import { attendanceApi } from '../api/attendanceApi';

interface AttendanceContextValue {
  summary: GlobalAttendanceSummary | null;
  subjects: Subject[];
  records: AttendanceRecord[];
  settings: AttendanceSettings;
  dbStatus: { isUsingAtlas: boolean; error: string | null; database: string } | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;

  // Actions
  recordAttendance: (data: {
    subjectId: string;
    type: AttendanceType;
    status: AttendanceStatus;
    date: string;
    time?: string;
    notes?: string;
  }) => Promise<{ duplicateWarning?: boolean }>;
  updateAttendance: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;

  // Subject management
  createSubject: (name: string, code?: string) => Promise<void>;
  batchSetupSubjects: (subjects: Array<{ name: string; code?: string }>) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string, force?: boolean) => Promise<{ success: boolean; error?: string; recordCount?: number }>;

  // Settings
  updateRequiredAttendance: (requiredAttendance: number) => Promise<void>;

  // UI state
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  isRecordModalOpen: boolean;
  setIsRecordModalOpen: (open: boolean) => void;
  quickRecordPreselect: { subjectId?: string; type?: AttendanceType; status?: AttendanceStatus } | null;
  openRecordModal: (preselect?: { subjectId?: string; type?: AttendanceType; status?: AttendanceStatus }) => void;
  isSetupModalOpen: boolean;
  setIsSetupModalOpen: (open: boolean) => void;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [summary, setSummary] = useState<GlobalAttendanceSummary | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings>({ requiredAttendance: 75 });
  const [dbStatus, setDbStatus] = useState<{ isUsingAtlas: boolean; error: string | null; database: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [quickRecordPreselect, setQuickRecordPreselect] = useState<{
    subjectId?: string;
    type?: AttendanceType;
    status?: AttendanceStatus;
  } | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      const [sumRes, subsRes, recsRes, healthRes] = await Promise.all([
        attendanceApi.getSummary().catch((e) => {
          console.error(e);
          return null;
        }),
        attendanceApi.getSubjects().catch((e) => {
          console.error(e);
          return [];
        }),
        attendanceApi.getRecords().catch((e) => {
          console.error(e);
          return [];
        }),
        attendanceApi.getHealth().catch((e) => {
          console.error(e);
          return null;
        }),
      ]);

      if (sumRes) setSummary(sumRes);
      if (subsRes) setSubjects(subsRes);
      if (recsRes) setRecords(recsRes);
      if (healthRes) setDbStatus(healthRes);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with MongoDB');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    }, 12000);

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
  }, [refreshData]);

  const openRecordModal = useCallback(
    (preselect?: { subjectId?: string; type?: AttendanceType; status?: AttendanceStatus }) => {
      setQuickRecordPreselect(preselect || null);
      setIsRecordModalOpen(true);
    },
    []
  );

  const recordAttendance = useCallback(
    async (data: {
      subjectId: string;
      type: AttendanceType;
      status: AttendanceStatus;
      date: string;
      time?: string;
      notes?: string;
    }) => {
      const result = await attendanceApi.recordAttendance(data);
      await refreshData();
      return { duplicateWarning: result.duplicateWarning };
    },
    [refreshData]
  );

  const updateAttendance = useCallback(
    async (id: string, updates: Partial<AttendanceRecord>) => {
      await attendanceApi.updateRecord(id, updates);
      await refreshData();
    },
    [refreshData]
  );

  const deleteAttendance = useCallback(
    async (id: string) => {
      await attendanceApi.deleteRecord(id);
      await refreshData();
    },
    [refreshData]
  );

  const createSubject = useCallback(
    async (name: string, code?: string) => {
      await attendanceApi.createSubject({ name, code });
      await refreshData();
    },
    [refreshData]
  );

  const batchSetupSubjects = useCallback(
    async (subList: Array<{ name: string; code?: string }>) => {
      await attendanceApi.batchCreateSubjects(subList);
      await refreshData();
    },
    [refreshData]
  );

  const updateSubject = useCallback(
    async (id: string, updates: Partial<Subject>) => {
      await attendanceApi.updateSubject(id, updates);
      await refreshData();
    },
    [refreshData]
  );

  const deleteSubject = useCallback(
    async (id: string, force = false) => {
      const res = await attendanceApi.deleteSubject(id, force);
      if (res.success) {
        if (selectedSubjectId === id) setSelectedSubjectId(null);
        await refreshData();
      }
      return res;
    },
    [refreshData, selectedSubjectId]
  );

  const updateRequiredAttendance = useCallback(
    async (requiredAttendance: number) => {
      const updated = await attendanceApi.updateSettings({ requiredAttendance });
      setSettings(updated);
      await refreshData();
    },
    [refreshData]
  );

  const value = useMemo(
    () => ({
      summary,
      subjects,
      records,
      settings,
      dbStatus,
      isLoading,
      error,
      refreshData,
      recordAttendance,
      updateAttendance,
      deleteAttendance,
      createSubject,
      batchSetupSubjects,
      updateSubject,
      deleteSubject,
      updateRequiredAttendance,
      selectedSubjectId,
      setSelectedSubjectId,
      isRecordModalOpen,
      setIsRecordModalOpen,
      quickRecordPreselect,
      openRecordModal,
      isSetupModalOpen,
      setIsSetupModalOpen,
    }),
    [
      summary,
      subjects,
      records,
      settings,
      dbStatus,
      isLoading,
      error,
      refreshData,
      recordAttendance,
      updateAttendance,
      deleteAttendance,
      createSubject,
      batchSetupSubjects,
      updateSubject,
      deleteSubject,
      updateRequiredAttendance,
      selectedSubjectId,
      isRecordModalOpen,
      quickRecordPreselect,
      openRecordModal,
      isSetupModalOpen,
    ]
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
};

export const useAttendance = () => {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return ctx;
};
