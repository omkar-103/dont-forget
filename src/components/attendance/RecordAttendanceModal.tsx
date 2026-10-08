import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { useApp } from '../../context/AppContext';
import { AttendanceType, AttendanceStatus } from '../../types';
import { X, Check, AlertCircle, Clock, Calendar, FileText } from 'lucide-react';
import { getTodayLocal } from '../../utils/date';

export const RecordAttendanceModal: React.FC = () => {
  const {
    isRecordModalOpen,
    setIsRecordModalOpen,
    quickRecordPreselect,
    subjects,
    recordAttendance,
  } = useAttendance();
  const { activeDate } = useApp();

  const [subjectId, setSubjectId] = useState<string>('');
  const [type, setType] = useState<AttendanceType>('theory');
  const [status, setStatus] = useState<AttendanceStatus>('attended');
  const [date, setDate] = useState<string>(activeDate);
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realToday = getTodayLocal();
  const isFutureDate = date > realToday;

  useEffect(() => {
    if (isRecordModalOpen) {
      setError(null);
      setDuplicateWarning(false);
      setDate(activeDate || realToday);
      setTime('');
      setNotes('');

      if (quickRecordPreselect) {
        if (quickRecordPreselect.subjectId) setSubjectId(quickRecordPreselect.subjectId);
        if (quickRecordPreselect.type) setType(quickRecordPreselect.type);
        if (quickRecordPreselect.status) setStatus(quickRecordPreselect.status);
      } else if (subjects.length > 0 && !subjectId) {
        setSubjectId(subjects[0].id);
      }
    }
  }, [isRecordModalOpen, quickRecordPreselect, subjects, activeDate, realToday]);

  if (!isRecordModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await recordAttendance({
        subjectId,
        type,
        status,
        date,
        time: time.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.duplicateWarning && !duplicateWarning) {
        setDuplicateWarning(true);
      }

      setIsRecordModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSubjects = subjects.filter((s) => s.active);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity">
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in slide-in-from-bottom duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-attendance-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id="record-attendance-title" className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
              Record Attendance
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Synced with MongoDB Atlas
            </p>
          </div>
          <button
            onClick={() => setIsRecordModalOpen(false)}
            className="min-h-[44px] min-w-[44px] -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning messages */}
        {isFutureDate && (
          <div className="mx-5 mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>You are recording attendance for a future date ({date}).</span>
          </div>
        )}

        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Subject *
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white cursor-pointer font-medium"
            >
              {activeSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Type: Theory vs Practical */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Class Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('theory')}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  type === 'theory'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Theory
              </button>
              <button
                type="button"
                onClick={() => setType('practical')}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  type === 'practical'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Practical
              </button>
            </div>
          </div>

          {/* Status: Attended vs Missed */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Attendance Status *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('attended')}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  status === 'attended'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Attended
              </button>
              <button
                type="button"
                onClick={() => setStatus('missed')}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  status === 'missed'
                    ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Not Attended (Missed)
              </button>
            </div>
          </div>

          {/* Date & Optional Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Time (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Missed due to hackathon, Batch B"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
