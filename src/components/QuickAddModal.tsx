import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  TaskCategory,
  TaskPriority,
  RecurringFrequency,
  EventType,
  EventMode,
  EventStatus,
  ChecklistType,
  AttendanceType,
  AttendanceStatus,
} from '../types';
import { useAttendance } from '../context/AttendanceContext';
import { X, Check, CheckSquare, BookOpen, Trophy, CheckCircle2, GraduationCap } from 'lucide-react';

export const QuickAddModal: React.FC = () => {
  const {
    isAddOpen,
    setIsAddOpen,
    defaultAddType,
    activeDate,
    addTask,
    addAssignment,
    addEvent,
    addChecklistItem,
  } = useApp();

  const { subjects, recordAttendance } = useAttendance();

  const [activeTab, setActiveTab] = useState<'task' | 'assignment' | 'event' | 'checklist' | 'attendance'>('task');

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDate, setTaskDate] = useState(activeDate);
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('College');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Medium');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskEstTime, setTaskEstTime] = useState('');
  const [taskRecurring, setTaskRecurring] = useState<RecurringFrequency>('None');

  // Assignment form state
  const [asgTitle, setAsgTitle] = useState('');
  const [asgSubject, setAsgSubject] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgDeadline, setAsgDeadline] = useState(activeDate);
  const [asgPriority, setAsgPriority] = useState<TaskPriority>('Major');

  // Event form state
  const [evtName, setEvtName] = useState('');
  const [evtType, setEvtType] = useState<EventType>('Hackathon');
  const [evtOrganizer, setEvtOrganizer] = useState('');
  const [evtStartDate, setEvtStartDate] = useState(activeDate);
  const [evtEndDate, setEvtEndDate] = useState(activeDate);
  const [evtMode, setEvtMode] = useState<EventMode>('Offline');
  const [evtLocation, setEvtLocation] = useState('');
  const [evtRegDeadline, setEvtRegDeadline] = useState('');
  const [evtSubDeadline, setEvtSubDeadline] = useState('');
  const [evtRegLink, setEvtRegLink] = useState('');
  const [evtNotes, setEvtNotes] = useState('');
  const [evtStatus, setEvtStatus] = useState<EventStatus>('Interested');

  // Checklist item form state
  const [checkName, setCheckName] = useState('');
  const [checkList, setCheckList] = useState<ChecklistType>('college');
  const [checkSection, setCheckSection] = useState('MUST HAVE');

  // Attendance form state
  const [attSubjectId, setAttSubjectId] = useState('');
  const [attType, setAttType] = useState<AttendanceType>('theory');
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('attended');
  const [attDate, setAttDate] = useState(activeDate);
  const [attTime, setAttTime] = useState('');
  const [attNotes, setAttNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  // Prevent duplicate form submissions
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FIX: Only reset form dates when the modal OPENS (isAddOpen changes true).
  // Removing 'subjects', 'attSubjectId', and 'activeDate' from deps
  // prevented the form from resetting mid-entry when background polls updated
  // attendance subjects or the date changed.
  const prevOpenRef = React.useRef(false);
  useEffect(() => {
    if (isAddOpen && !prevOpenRef.current) {
      // Modal just opened — reset to defaults
      setActiveTab(defaultAddType);
      setTaskDate(activeDate);
      setAsgDeadline(activeDate);
      setEvtStartDate(activeDate);
      setEvtEndDate(activeDate);
      setAttDate(activeDate);
      if (subjects.length > 0 && !attSubjectId) {
        setAttSubjectId(subjects[0].id);
      }
      setError(null);
      setIsSubmitting(false);
    }
    prevOpenRef.current = isAddOpen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddOpen]); // INTENTIONALLY only re-run when modal open state changes

  if (!isAddOpen) return null;

  const handleClose = () => {
    setIsAddOpen(false);
    setError(null);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError('Please provide a task title.');
      return;
    }
    addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      date: taskDate || activeDate,
      category: taskCategory,
      priority: taskPriority,
      status: 'Pending',
      deadline: taskDeadline.trim() || undefined,
      estimatedTime: taskEstTime.trim() || undefined,
      recurring: taskRecurring,
    });
    setTaskTitle('');
    setTaskDesc('');
    handleClose();
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!asgTitle.trim()) {
      setError('Please provide an assignment title.');
      return;
    }
    if (!asgSubject.trim()) {
      setError('Please provide a subject/course name.');
      return;
    }
    if (!asgDeadline) {
      setError('Please provide a deadline date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addAssignment({
        title: asgTitle.trim(),
        subject: asgSubject.trim(),
        description: asgDesc.trim() || undefined,
        assignedDate: activeDate,
        deadline: asgDeadline,
        status: 'Not Started',
        priority: asgPriority,
        notes: asgDesc.trim() || undefined,
      });
      // Only clear form after successful save
      setAsgTitle('');
      setAsgSubject('');
      setAsgDesc('');
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save assignment. Please try again.');
      // Preserve form values on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtName.trim()) {
      setError('Please provide an event name.');
      return;
    }
    if (!evtStartDate) {
      setError('Please select a start date.');
      return;
    }

    addEvent({
      name: evtName.trim(),
      type: evtType,
      organizer: evtOrganizer.trim() || undefined,
      startDate: evtStartDate,
      endDate: evtEndDate || evtStartDate,
      mode: evtMode,
      location: evtLocation.trim() || undefined,
      registrationDeadline: evtRegDeadline || undefined,
      submissionDeadline: evtSubDeadline || undefined,
      registrationLink: evtRegLink.trim() || undefined,
      notes: evtNotes.trim() || undefined,
      status: evtStatus,
      priority: 'Major',
    });
    setEvtName('');
    setEvtOrganizer('');
    setEvtLocation('');
    setEvtNotes('');
    setEvtRegLink('');
    handleClose();
  };

  const handleChecklistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkName.trim()) {
      setError('Please provide item name.');
      return;
    }
    addChecklistItem(
      checkName.trim(),
      checkList,
      checkList === 'events' ? checkSection : undefined
    );
    setCheckName('');
    handleClose();
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attSubjectId) {
      setError('Please select a subject.');
      return;
    }
    try {
      await recordAttendance({
        subjectId: attSubjectId,
        type: attType,
        status: attStatus,
        date: attDate || activeDate,
        time: attTime.trim() || undefined,
        notes: attNotes.trim() || undefined,
      });
      setAttTime('');
      setAttNotes('');
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record attendance');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity">
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 id="add-modal-title" className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
            Quick Add
          </h2>
          <button
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-lg cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-4 sm:px-5 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveTab('task');
                setError(null);
              }}
              className={`flex-1 min-w-[70px] py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'task'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Task</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('assignment');
                setError(null);
              }}
              className={`flex-1 min-w-[90px] py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'assignment'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Assignment</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('event');
                setError(null);
              }}
              className={`flex-1 min-w-[70px] py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'event'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Event</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('checklist');
                setError(null);
              }}
              className={`flex-1 min-w-[80px] py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'checklist'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Checklist</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('attendance');
                setError(null);
              }}
              className={`flex-1 min-w-[90px] py-1.5 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span>Attendance</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-lg border border-rose-200 dark:border-rose-900/50">
            {error}
          </div>
        )}

        {/* Body forms */}
        <div className="p-5 overflow-y-auto flex-1 text-slate-900 dark:text-slate-100">
          {/* TASK FORM */}
          {activeTab === 'task' && (
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finish lecture notes, charge laptop"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer font-medium"
                  >
                    <option value="High">🔥 High (Urgent &amp; Important)</option>
                    <option value="Medium">⚡ Medium (Standard)</option>
                    <option value="Low">🌱 Low (Nice to have)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Context
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="College">College</option>
                    <option value="Home">Home</option>
                    <option value="Personal">Personal</option>
                    <option value="Online">Online</option>
                    <option value="Event">Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recurring
                  </label>
                  <select
                    value={taskRecurring}
                    onChange={(e) => setTaskRecurring(e.target.value as RecurringFrequency)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="None">None (One-time)</option>
                    <option value="Daily">Daily (Resets each day)</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deadline / Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5:00 PM or 2026-10-10"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 45 mins"
                    value={taskEstTime}
                    onChange={(e) => setTaskEstTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
          )}

          {/* ASSIGNMENT FORM */}
          {activeTab === 'assignment' && (
            <form onSubmit={handleAssignmentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures Problem Set 3"
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Course *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Networks, Machine Learning"
                  value={asgSubject}
                  onChange={(e) => setAsgSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deadline Date *
                  </label>
                  <input
                    type="date"
                    value={asgDeadline}
                    onChange={(e) => setAsgDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={asgPriority}
                    onChange={(e) => setAsgPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Submission instructions, portal link, rubric..."
                  value={asgDesc}
                  onChange={(e) => setAsgDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Add Assignment'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* EVENT FORM */}
          {activeTab === 'event' && (
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. ETHGlobal Hackathon, ACM Workshop"
                  value={evtName}
                  onChange={(e) => setEvtName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={evtType}
                    onChange={(e) => setEvtType(e.target.value as EventType)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Meetup">Meetup</option>
                    <option value="Conference">Conference</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Tech Fest">Tech Fest</option>
                    <option value="Competition">Competition</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mode
                  </label>
                  <select
                    value={evtMode}
                    onChange={(e) => setEvtMode(e.target.value as EventMode)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="Offline">Offline (In-person)</option>
                    <option value="Online">Online</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={evtStartDate}
                    onChange={(e) => setEvtStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={evtEndDate}
                    onChange={(e) => setEvtEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="date"
                    value={evtRegDeadline}
                    onChange={(e) => setEvtRegDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={evtStatus}
                    onChange={(e) => setEvtStatus(e.target.value as EventStatus)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="Interested">Interested</option>
                    <option value="Registered">Registered</option>
                    <option value="Attending">Attending</option>
                    <option value="Completed">Completed</option>
                    <option value="Not Attending">Not Attending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Auditorium Hall"
                    value={evtLocation}
                    onChange={(e) => setEvtLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registration Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={evtRegLink}
                    onChange={(e) => setEvtRegLink(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Team details, prep checklist..."
                  value={evtNotes}
                  onChange={(e) => setEvtNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Add Event
                </button>
              </div>
            </form>
          )}

          {/* CHECKLIST FORM */}
          {activeTab === 'checklist' && (
            <form onSubmit={handleChecklistSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  What don&apos;t you want to forget? *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Calculator, Project Dongle, Keycard"
                  value={checkName}
                  onChange={(e) => setCheckName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Checklist
                </label>
                <select
                  value={checkList}
                  onChange={(e) => setCheckList(e.target.value as ChecklistType)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                >
                  <option value="college">College (Daily bag)</option>
                  <option value="events">Events (Hackathons, Fests)</option>
                  <option value="travel">Travel</option>
                </select>
              </div>

              {checkList === 'events' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={checkSection}
                    onChange={(e) => setCheckSection(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="MUST HAVE">MUST HAVE</option>
                    <option value="TECH">TECH</option>
                    <option value="EVENT">EVENT</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Add Item
                </button>
              </div>
            </form>
          )}

          {/* ATTENDANCE FORM */}
          {activeTab === 'attendance' && (
            <form onSubmit={handleAttendanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <select
                  value={attSubjectId}
                  onChange={(e) => setAttSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer font-medium"
                >
                  {subjects.filter((s) => s.active).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class Type *
                  </label>
                  <select
                    value={attType}
                    onChange={(e) => setAttType(e.target.value as AttendanceType)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status *
                  </label>
                  <select
                    value={attStatus}
                    onChange={(e) => setAttStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                  >
                    <option value="attended">Attended</option>
                    <option value="missed">Not Attended (Missed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={attTime}
                    onChange={(e) => setAttTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hackathon, Batch B"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
