export type TaskCategory = 'College' | 'Home' | 'Personal' | 'Online' | 'Event' | 'Other';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Major' | 'Minor';
export type TaskStatus = 'Pending' | 'Completed';
export type RecurringFrequency = 'None' | 'Daily' | 'Weekly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string; // YYYY-MM-DD or time string
  location?: string;
  estimatedTime?: string;
  recurring: RecurringFrequency;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description?: string;
  assignedDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  status: AssignmentStatus;
  priority: TaskPriority;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType =
  | 'Hackathon'
  | 'Meetup'
  | 'Conference'
  | 'Workshop'
  | 'Tech Fest'
  | 'Competition'
  | 'Other';

export type EventMode = 'Online' | 'Offline' | 'Hybrid';

export type EventStatus =
  | 'Interested'
  | 'Registered'
  | 'Attending'
  | 'Completed'
  | 'Not Attending';

export interface EventItem {
  id: string;
  name: string;
  type: EventType;
  organizer?: string;
  date?: string; // Single date or primary display date
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  location?: string;
  mode: EventMode;
  registrationDeadline?: string; // YYYY-MM-DD
  submissionDeadline?: string; // YYYY-MM-DD
  registrationLink?: string;
  description?: string;
  status: EventStatus;
  priority: TaskPriority;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChecklistType = 'college' | 'events' | 'travel';

export interface ChecklistItem {
  id: string;
  name: string;
  checklistId: ChecklistType;
  section?: string; // e.g. "MUST HAVE" | "TECH" | "EVENT"
  order: number;
  createdAt: string;
}

export interface DailyState {
  completedTasks: string[]; // task IDs completed on this date
  completedChecklistItems: Record<string, string[]>; // checklistId -> array of item IDs checked
}

export interface AppSettings {
  schemaVersion: number;
  theme: 'system' | 'light' | 'dark';
  baselineDate: string; // Initial baseline '2026-10-09'
  activeDateOverride?: string; // For testing or simulated navigation
  lastActiveDate: string;
}

export interface AppData {
  schemaVersion: number;
  tasks: Task[];
  assignments: Assignment[];
  events: EventItem[];
  checklists: ChecklistItem[];
  dailyStates: Record<string, DailyState>;
  settings: AppSettings;
}

export type NavigationTab =
  | 'today'
  | 'tasks'
  | 'assignments'
  | 'events'
  | 'calendar'
  | 'checklists'
  | 'attendance';

export type AttendanceType = 'theory' | 'practical';
export type AttendanceStatus = 'attended' | 'missed';

export interface Subject {
  id: string;
  userId?: string;
  name: string;
  code?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  subjectId: string;
  type: AttendanceType;
  status: AttendanceStatus;
  date: string; // YYYY-MM-DD local date
  time?: string; // Optional HH:mm or HH:mm AM/PM
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSettings {
  requiredAttendance: number; // default 75
}

export interface SubjectAttendanceSummary {
  subjectId: string;
  name: string;
  code?: string;
  active: boolean;
  theory: {
    attended: number;
    missed: number;
    total: number;
    percentage: number | null;
  };
  practical: {
    attended: number;
    missed: number;
    total: number;
    percentage: number | null;
  };
  overall: {
    attended: number;
    missed: number;
    total: number;
    percentage: number | null;
  };
  requiredPercentage: number;
  status: 'Safe' | 'At Risk' | 'Critical' | 'Excellent' | 'No Data';
  classesNeeded: number;
  nextAttendedProjection: number;
  nextMissedProjection: number;
}

export interface GlobalAttendanceSummary {
  overall: {
    attended: number;
    total: number;
    percentage: number | null;
  };
  theory: {
    attended: number;
    total: number;
    percentage: number | null;
  };
  practical: {
    attended: number;
    total: number;
    percentage: number | null;
  };
  lowestOverall: {
    subjectId: string;
    name: string;
    percentage: number;
  } | null;
  lowestTheory: {
    subjectId: string;
    name: string;
    percentage: number;
  } | null;
  lowestPractical: {
    subjectId: string;
    name: string;
    percentage: number;
  } | null;
  atRiskSubjects: SubjectAttendanceSummary[];
  subjects: SubjectAttendanceSummary[];
  requiredAttendance: number;
}
