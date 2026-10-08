import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Assignment, AssignmentStatus, TaskPriority } from '../../types';
import { getDeadlineInfo, formatShortDate, addDays } from '../../utils/date';
import {
  Plus,
  BookOpen,
  Calendar,
  CheckCircle,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

export const AssignmentsView: React.FC = () => {
  const {
    data,
    activeDate,
    toggleAssignmentStatus,
    updateAssignment,
    deleteAssignment,
    rescheduleAssignment,
    openQuickAdd,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed'>('Active');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingAsg, setEditingAsg] = useState<Assignment | null>(null);

  // Group and sort assignments
  const sortedAssignments = useMemo(() => {
    let list = [...data.assignments];

    if (statusFilter === 'Active') {
      list = list.filter((a) => a.status !== 'Completed');
    } else if (statusFilter === 'Completed') {
      list = list.filter((a) => a.status === 'Completed');
    }

    // Sort order:
    // 1. Overdue (days < 0)
    // 2. Due today (0)
    // 3. Due tomorrow (1)
    // 4. Due soon (2-3)
    // 5. Later (> 3)
    // 6. Completed
    return list.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;

      const aInfo = getDeadlineInfo(a.deadline, activeDate);
      const bInfo = getDeadlineInfo(b.deadline, activeDate);

      return aInfo.days - bInfo.days;
    });
  }, [data.assignments, activeDate, statusFilter]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsg && editingAsg.title.trim() && editingAsg.subject.trim()) {
      updateAssignment(editingAsg.id, {
        title: editingAsg.title.trim(),
        subject: editingAsg.subject.trim(),
        description: editingAsg.description?.trim(),
        deadline: editingAsg.deadline,
        priority: editingAsg.priority,
        status: editingAsg.status,
        notes: editingAsg.notes?.trim(),
      });
      setEditingAsg(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Assignments
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Coursework, submissions &amp; academic deadlines
          </p>
        </div>

        <button
          type="button"
          onClick={() => openQuickAdd('assignment')}
          className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Assignment</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {(['Active', 'All', 'Completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`min-h-[32px] px-3.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      {sortedAssignments.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No assignments found.
          </p>
          <button
            type="button"
            onClick={() => openQuickAdd('assignment')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add an assignment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAssignments.map((asg) => {
            const isCompleted = asg.status === 'Completed';
            const deadlineInfo = getDeadlineInfo(asg.deadline, activeDate);
            const isOverdue = !isCompleted && deadlineInfo.days < 0;

            return (
              <div
                key={asg.id}
                className={`relative rounded-xl sm:rounded-2xl border p-4 sm:p-5 transition-all ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75'
                    : isOverdue
                    ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {asg.subject}
                      </span>
                    </div>

                    <h3
                      className={`text-base font-bold mt-0.5 leading-snug break-words ${
                        isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {asg.title}
                    </h3>

                    {asg.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {asg.description}
                      </p>
                    )}

                    {/* Clean unboxed metadata with · separator */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Deadline: {formatShortDate(asg.deadline)}</span>
                      </span>

                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          isOverdue
                            ? 'text-rose-600 dark:text-rose-400'
                            : deadlineInfo.days <= 1
                            ? 'text-amber-600 dark:text-amber-400'
                            : ''
                        }`}
                      >
                        {deadlineInfo.label}
                      </span>

                      <span aria-hidden="true">·</span>
                      <span>Priority: {asg.priority}</span>

                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus: AssignmentStatus =
                            asg.status === 'Not Started'
                              ? 'In Progress'
                              : asg.status === 'In Progress'
                              ? 'Completed'
                              : 'Not Started';
                          updateAssignment(asg.id, { status: nextStatus });
                        }}
                        className="font-medium text-slate-700 dark:text-slate-300 underline cursor-pointer"
                        title="Click to cycle status"
                      >
                        {asg.status}
                      </button>
                    </div>

                    {asg.notes && (
                      <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Note: </span>
                        {asg.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAssignmentStatus(asg.id)}
                      className={`min-h-[44px] px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCompleted
                          ? 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {isCompleted ? 'Mark Active' : 'Complete'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === asg.id ? null : asg.id)}
                      className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      aria-label="Assignment options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dropdown Options */}
                {activeMenuId === asg.id && (
                  <div
                    className="absolute right-4 top-14 z-20 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAsg(asg);
                        setActiveMenuId(null);
                      }}
                      className="min-h-[40px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        rescheduleAssignment(asg.id, addDays(asg.deadline, 1));
                        setActiveMenuId(null);
                      }}
                      className="min-h-[40px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>Extend 1 Day</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteAssignment(asg.id);
                        setActiveMenuId(null);
                      }}
                      className="min-h-[40px] w-full px-3 py-1.5 text-xs text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Assignment Modal */}
      {editingAsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Edit Assignment
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editingAsg.title}
                onChange={(e) => setEditingAsg({ ...editingAsg, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={editingAsg.subject}
                onChange={(e) => setEditingAsg({ ...editingAsg, subject: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={editingAsg.deadline}
                  onChange={(e) => setEditingAsg({ ...editingAsg, deadline: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editingAsg.status}
                  onChange={(e) =>
                    setEditingAsg({ ...editingAsg, status: e.target.value as AssignmentStatus })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAsg(null)}
                className="min-h-[44px] px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
