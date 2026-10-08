import {
  Subject,
  AttendanceRecord,
  AttendanceSettings,
  GlobalAttendanceSummary,
  AttendanceType,
  AttendanceStatus,
} from '../types';
import { authStorage } from './authApi';

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = authStorage.getToken();
  return {
    ...extra,
    ...(token ? { 'x-session-token': token } : {}),
  };
}

export const attendanceApi = {
  async getHealth(): Promise<{ isUsingAtlas: boolean; error: string | null; database: string }> {
    const res = await fetch('/api/attendance/health');
    if (!res.ok) throw new Error('Failed to query database health');
    return res.json();
  },

  async getSummary(): Promise<GlobalAttendanceSummary> {
    const res = await fetch('/api/attendance/summary', {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch attendance summary');
    return res.json();
  },

  async getSubjects(): Promise<Subject[]> {
    const res = await fetch('/api/subjects', {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  },

  async createSubject(data: { name: string; code?: string }): Promise<Subject> {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create subject');
    }
    return res.json();
  },

  async batchCreateSubjects(subjects: Array<{ name: string; code?: string }>): Promise<Subject[]> {
    const res = await fetch('/api/subjects/batch', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ subjects }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to setup subjects');
    }
    return res.json();
  },

  async updateSubject(id: string, updates: Partial<Subject>): Promise<Subject> {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update subject');
    }
    return res.json();
  },

  async deleteSubject(id: string, force = false): Promise<{ success: boolean; error?: string; recordCount?: number }> {
    const res = await fetch(`/api/subjects/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error, recordCount: data.recordCount };
    }
    return { success: true };
  },

  async getRecords(filter?: { subjectId?: string; type?: string; status?: string }): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filter?.subjectId) params.append('subjectId', filter.subjectId);
    if (filter?.type) params.append('type', filter.type);
    if (filter?.status) params.append('status', filter.status);

    const res = await fetch(`/api/attendance?${params.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch attendance history');
    return res.json();
  },

  async recordAttendance(data: {
    subjectId: string;
    type: AttendanceType;
    status: AttendanceStatus;
    date: string;
    time?: string;
    notes?: string;
  }): Promise<{ record: AttendanceRecord; duplicateWarning?: boolean }> {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record attendance');
    }
    return res.json();
  },

  async updateRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update record');
    }
    return res.json();
  },

  async deleteRecord(id: string): Promise<boolean> {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete attendance record');
    return true;
  },

  async getSettings(): Promise<AttendanceSettings> {
    const res = await fetch('/api/attendance/settings', {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: AttendanceSettings): Promise<AttendanceSettings> {
    const res = await fetch('/api/attendance/settings', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },
};
