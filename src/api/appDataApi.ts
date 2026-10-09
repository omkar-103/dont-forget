import {
  AppData,
  Task,
  Assignment,
  EventItem,
  ChecklistItem,
} from '../types';
import { authStorage } from './authApi';

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = authStorage.getToken();
  return {
    ...extra,
    ...(token ? { 'x-session-token': token } : {}),
  };
}

export const appDataApi = {
  async getAppData(): Promise<AppData> {
    const res = await fetch('/api/app-data', {
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch app data (${res.status})`);
    }
    return res.json();
  },

  async saveAppData(data: AppData): Promise<AppData> {
    const res = await fetch('/api/app-data', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to save app data (${res.status})`);
    }
    return res.json();
  },

  // Granular Task endpoints
  async createTask(task: Task): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(task),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create task');
    }
    return res.json();
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update task');
    }
    return res.json();
  },

  async deleteTask(id: string): Promise<boolean> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return true;
  },

  // Granular Assignment endpoints
  async createAssignment(assignment: Assignment): Promise<Assignment> {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(assignment),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create assignment');
    }
    return res.json();
  },

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment> {
    const res = await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update assignment');
    }
    return res.json();
  },

  async deleteAssignment(id: string): Promise<boolean> {
    const res = await fetch(`/api/assignments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete assignment');
    return true;
  },

  // Granular Event endpoints
  async createEvent(event: EventItem): Promise<EventItem> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(event),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create event');
    }
    return res.json();
  },

  async updateEvent(id: string, updates: Partial<EventItem>): Promise<EventItem> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update event');
    }
    return res.json();
  },

  async deleteEvent(id: string): Promise<boolean> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete event');
    return true;
  },

  // Granular Checklist endpoints
  async createChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
    const res = await fetch('/api/checklists', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(item),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create checklist item');
    }
    return res.json();
  },

  async updateChecklistItem(id: string, updates: Partial<ChecklistItem>): Promise<ChecklistItem> {
    const res = await fetch(`/api/checklists/${id}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update checklist item');
    }
    return res.json();
  },

  async deleteChecklistItem(id: string): Promise<boolean> {
    const res = await fetch(`/api/checklists/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete checklist item');
    return true;
  },

  async restoreDefaultChecklists(): Promise<ChecklistItem[]> {
    const res = await fetch('/api/checklists/restore-defaults', {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to restore checklist defaults');
    return res.json();
  },

  // Migration API
  async uploadMigrationData(payload: any): Promise<{
    success: boolean;
    counts: {
      tasksAdded: number;
      assignmentsAdded: number;
      eventsAdded: number;
      checklistsSynced: number;
    };
    appData: AppData;
  }> {
    const res = await fetch('/api/migration/upload', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Migration reconciliation failed');
    }
    return res.json();
  },

  async getMigrationStatus(): Promise<{
    tasksCount: number;
    assignmentsCount: number;
    eventsCount: number;
    checklistsCount: number;
  }> {
    const res = await fetch('/api/migration/status', {
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to query migration status');
    return res.json();
  },
};
