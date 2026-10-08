import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { useApp } from '../../context/AppContext';
import { Subject, AttendanceRecord, AttendanceType, AttendanceStatus } from '../../types';
import { formatShortDate } from '../../utils/date';
import { AttendanceSettingsModal } from './AttendanceSettingsModal';
import {
  Plus,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  Database,
  ArrowLeft,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const {
    summary,
    subjects,
    records,
    settings,
    dbStatus,
    isLoading,
    openRecordModal,
    setIsSetupModalOpen,
    selectedSubjectId,
    setSelectedSubjectId,
    deleteAttendance,
    updateAttendance,
  } = useAttendance();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'All' | 'theory' | 'practical' | 'attended' | 'missed'>('All');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // If a subject is selected, get its summary and records
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedSummary = summary?.subjects.find((s) => s.subjectId === selectedSubjectId);

  const subjectRecords = selectedSubjectId
    ? records.filter((r) => r.subjectId === selectedSubjectId)
    : [];

  const filteredHistory = subjectRecords.filter((r) => {
    if (historyFilter === 'theory') return r.type === 'theory';
    if (historyFilter === 'practical') return r.type === 'practical';
    if (historyFilter === 'attended') return r.status === 'attended';
    if (historyFilter === 'missed') return r.status === 'missed';
    return true;
  });

  const handleEditRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      await updateAttendance(editingRecord.id, {
        type: editingRecord.type,
        status: editingRecord.status,
        date: editingRecord.date,
        time: editingRecord.time?.trim() || undefined,
        notes: editingRecord.notes?.trim() || undefined,
      });
      setEditingRecord(null);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Delete this attendance record? All percentages will be recalculated.')) {
      await deleteAttendance(id);
    }
  };

  // If initial state has 0 subjects
  if (subjects.length === 0 && !isLoading) {
    return (
      <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 max-w-xl mx-auto space-y-4">
        <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
          Set Up Your Subjects
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Configure your college subjects to track Theory and Practical attendance separately, calculate risk percentages, and determine classes needed for your target.
        </p>
        <button
          type="button"
          onClick={() => setIsSetupModalOpen(true)}
          className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Set Up 5 Subjects
        </button>
      </div>
    );
  }

  // --- SUBJECT DETAIL VIEW ---
  if (selectedSubject && selectedSummary) {
    return (
      <div className="space-y-6 pb-20 md:pb-8">
        {/* Back and Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSubjectId(null)}
              className="min-h-[44px] min-w-[44px] p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Back to all subjects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {selectedSubject.code ? `${selectedSubject.code} · ` : ''}Subject Attendance
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {selectedSubject.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openRecordModal({ subjectId: selectedSubject.id })}
            className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] inline-block mr-1.5" />
            <span>Record Attendance</span>
          </button>
        </div>

        {/* Stats Grid: Overall, Theory, Practical */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Overall Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Overall Attendance
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              {selectedSummary.overall.percentage !== null
                ? `${selectedSummary.overall.percentage.toFixed(1)}%`
                : 'No data'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {selectedSummary.overall.attended} / {selectedSummary.overall.total} attended
              {selectedSummary.overall.total > 0 && ` · ${selectedSummary.overall.missed} missed`}
            </div>
            <div className="mt-2 text-[11px] font-semibold">
              <span
                className={
                  selectedSummary.status === 'At Risk' || selectedSummary.status === 'Critical'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                Status: {selectedSummary.status} (Target: {selectedSummary.requiredPercentage}%)
              </span>
            </div>
          </div>

          {/* Theory Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Theory Classes
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              {selectedSummary.theory.percentage !== null
                ? `${selectedSummary.theory.percentage.toFixed(1)}%`
                : 'No theory data'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {selectedSummary.theory.attended} / {selectedSummary.theory.total} attended
            </div>
            <button
              type="button"
              onClick={() =>
                openRecordModal({
                  subjectId: selectedSubject.id,
                  type: 'theory',
                  status: 'missed',
                })
              }
              className="mt-3 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              + Quick Missed Theory
            </button>
          </div>

          {/* Practical Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Practical Labs
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              {selectedSummary.practical.percentage !== null
                ? `${selectedSummary.practical.percentage.toFixed(1)}%`
                : 'No practical data'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {selectedSummary.practical.attended} / {selectedSummary.practical.total} attended
            </div>
            <button
              type="button"
              onClick={() =>
                openRecordModal({
                  subjectId: selectedSubject.id,
                  type: 'practical',
                  status: 'missed',
                })
              }
              className="mt-3 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              + Quick Missed Practical
            </button>
          </div>
        </div>

        {/* Target & Projections Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Attendance Analytics &amp; Projections
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Classes needed */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Target Requirement ({settings.requiredAttendance}%)
              </div>
              <div className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-white">
                {selectedSummary.classesNeeded > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Attend next {selectedSummary.classesNeeded} class{selectedSummary.classesNeeded === 1 ? '' : 'es'} consecutively
                  </span>
                ) : selectedSummary.overall.total > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Above required attendance target
                  </span>
                ) : (
                  'No classes recorded yet'
                )}
              </div>
            </div>

            {/* Next class projection */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Next Class Projection
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs font-mono tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400">
                  If Attended: {selectedSummary.nextAttendedProjection.toFixed(1)}%
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  If Missed: {selectedSummary.nextMissedProjection.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Attendance History ({subjectRecords.length})
            </h3>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-x-auto no-scrollbar">
              {(['All', 'theory', 'practical', 'attended', 'missed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`min-h-[30px] px-2.5 text-[11px] font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                    historyFilter === f
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
              No attendance records match this filter.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        rec.status === 'attended'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {rec.status === 'attended' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="capitalize">{rec.type}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            rec.status === 'attended'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {rec.status === 'attended' ? 'Attended' : 'Missed'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-mono tabular-nums">
                        <span>{formatShortDate(rec.date)}</span>
                        {rec.time && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{rec.time}</span>
                          </>
                        )}
                        {rec.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans italic">{rec.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingRecord(rec)}
                      className="min-h-[38px] min-w-[38px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg flex items-center justify-center cursor-pointer"
                      aria-label="Edit record"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="min-h-[38px] min-w-[38px] text-slate-400 hover:text-rose-600 rounded-lg flex items-center justify-center cursor-pointer"
                      aria-label="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Record Modal */}
        {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <form
              onSubmit={handleEditRecordSubmit}
              className="w-full max-w-sm bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Edit Attendance Record
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={editingRecord.type}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        type: e.target.value as AttendanceType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editingRecord.status}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        status: e.target.value as AttendanceStatus,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                  >
                    <option value="attended">Attended</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editingRecord.date}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, date: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Time (Optional)
                </label>
                <input
                  type="text"
                  value={editingRecord.time || ''}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, time: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={editingRecord.notes || ''}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, notes: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="min-h-[40px] px-3 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN ATTENDANCE DASHBOARD VIEW ---
  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
              Attendance
            </h2>
            {/* MongoDB status indicator */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              title="MongoDB Atlas Backend Settings"
            >
              <Database
                className={`w-3 h-3 ${
                  dbStatus?.isUsingAtlas ? 'text-emerald-500' : 'text-amber-500'
                }`}
              />
              <span>{dbStatus?.isUsingAtlas ? 'Atlas Synced' : 'MongoDB Storage'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theory &amp; practical tracking across all {subjects.length} college subjects
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="min-h-[44px] min-w-[44px] p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Attendance Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => openRecordModal()}
            className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] inline-block mr-1.5" />
            <span>Record Attendance</span>
          </button>
        </div>
      </div>

      {/* Top 3 Metric Cards: Overall, Theory, Practical */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Overall */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Overall Attendance
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {summary?.overall.percentage !== null
              ? `${summary?.overall.percentage.toFixed(1)}%`
              : 'No data'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {summary?.overall.attended} / {summary?.overall.total} total classes
          </div>
        </div>

        {/* Theory */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Overall Theory
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {summary?.theory.percentage !== null
              ? `${summary?.theory.percentage.toFixed(1)}%`
              : 'No theory data'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {summary?.theory.attended} / {summary?.theory.total} theory classes
          </div>
        </div>

        {/* Practical */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Overall Practical
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {summary?.practical.percentage !== null
              ? `${summary?.practical.percentage.toFixed(1)}%`
              : 'No practical data'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {summary?.practical.attended} / {summary?.practical.total} practical labs
          </div>
        </div>
      </div>

      {/* Analytical Callouts: Lowest Attendance & At Risk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Lowest Attendance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
            <span>Lowest Attendance</span>
          </div>

          {summary?.lowestOverall ? (
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {summary.lowestOverall.name}
              </div>
              <div className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {summary.lowestOverall.percentage.toFixed(2)}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                {summary.lowestTheory && (
                  <div>Lowest Theory: {summary.lowestTheory.name} ({summary.lowestTheory.percentage.toFixed(1)}%)</div>
                )}
                {summary.lowestPractical && (
                  <div>Lowest Practical: {summary.lowestPractical.name} ({summary.lowestPractical.percentage.toFixed(1)}%)</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">No attendance recorded yet.</p>
          )}
        </div>

        {/* At Risk Subjects */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>At Risk (Below {settings.requiredAttendance}%)</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {summary?.atRiskSubjects.length || 0} subject{(summary?.atRiskSubjects.length || 0) === 1 ? '' : 's'}
            </span>
          </div>

          {summary?.atRiskSubjects && summary.atRiskSubjects.length > 0 ? (
            <div className="space-y-1.5">
              {summary.atRiskSubjects.map((sub) => (
                <div
                  key={sub.subjectId}
                  onClick={() => setSelectedSubjectId(sub.subjectId)}
                  className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between cursor-pointer hover:border-rose-300"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {sub.name}
                    </div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                      Overall: {sub.overall.percentage?.toFixed(1)}% · Target: {sub.requiredPercentage}%
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                    Needs +{sub.classesNeeded}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">
              All subjects with records are currently at or above {settings.requiredAttendance}%.
            </p>
          )}
        </div>
      </div>

      {/* Subject Comparison Horizontal Bar Chart */}
      {summary?.subjects && summary.subjects.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Attendance Comparison
            </h3>
            <span className="text-[11px] text-slate-500">Target: {settings.requiredAttendance}%</span>
          </div>

          <div className="space-y-3">
            {summary.subjects.map((sub) => {
              const pct = sub.overall.percentage;
              return (
                <div key={sub.subjectId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {sub.name}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {pct !== null ? `${pct.toFixed(1)}%` : 'No data'}
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct === null
                          ? 'bg-slate-200 dark:bg-slate-700'
                          : pct < settings.requiredAttendance
                          ? 'bg-rose-500'
                          : pct >= 90
                          ? 'bg-emerald-500'
                          : 'bg-slate-900 dark:bg-white'
                      }`}
                      style={{ width: `${pct !== null ? Math.min(pct, 100) : 0}%` }}
                    />
                  </div>

                  {/* Micro Theory vs Practical indicator */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono tabular-nums">
                    <span>Theory: {sub.theory.percentage !== null ? `${sub.theory.percentage.toFixed(0)}%` : '—'}</span>
                    <span>Practical: {sub.practical.percentage !== null ? `${sub.practical.percentage.toFixed(0)}%` : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YOUR SUBJECTS CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Your Subjects ({subjects.length})
          </h3>
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            + Add / Edit Subjects
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {summary?.subjects.map((sub) => {
            return (
              <div
                key={sub.subjectId}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {sub.code || 'Subject'}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {sub.name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {sub.overall.percentage !== null
                          ? `${sub.overall.percentage.toFixed(1)}%`
                          : 'No data'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {sub.overall.attended} / {sub.overall.total}
                      </div>
                    </div>
                  </div>

                  {/* Theory & Practical breakdown */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Theory</span>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {sub.theory.percentage !== null
                          ? `${sub.theory.percentage.toFixed(1)}%`
                          : 'No data'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {sub.theory.attended}/{sub.theory.total}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Practical</span>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {sub.practical.percentage !== null
                          ? `${sub.practical.percentage.toFixed(1)}%`
                          : 'No data'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {sub.practical.attended}/{sub.practical.total}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        openRecordModal({
                          subjectId: sub.subjectId,
                          type: 'theory',
                          status: 'missed',
                        })
                      }
                      className="min-h-[36px] px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Quick record missed theory"
                    >
                      Missed Theory
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openRecordModal({
                          subjectId: sub.subjectId,
                          type: 'practical',
                          status: 'missed',
                        })
                      }
                      className="min-h-[36px] px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Quick record missed practical"
                    >
                      Missed Practical
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSubjectId(sub.subjectId)}
                    className="min-h-[36px] px-3 py-1 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AttendanceSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
