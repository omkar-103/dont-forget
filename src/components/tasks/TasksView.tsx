import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskPriority, TaskCategory } from '../../types';
import { addDays, getDeadlineInfo, formatShortDate } from '../../utils/date';
import {
  Check,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Repeat,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit2,
  AlertCircle,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
  ArrowUpDown,
  Zap,
} from 'lucide-react';

export function normalizePriority(priority?: TaskPriority): 'High' | 'Medium' | 'Low' {
  if (priority === 'High' || priority === 'Major') return 'High';
  if (priority === 'Medium') return 'Medium';
  return 'Low';
}

export const TasksView: React.FC = () => {
  const {
    data,
    activeDate,
    toggleTaskComplete,
    isTaskCompletedOnDate,
    rescheduleTask,
    deleteTask,
    updateTask,
    openQuickAdd,
    filterContext,
    setFilterContext,
  } = useApp();

  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Overdue'>('All');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'title'>('priority');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Dynamic priority counts based on current status and context filters
  const priorityCounts = useMemo(() => {
    let all = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    data.tasks.forEach((task) => {
      // Context filter check
      if (filterContext && task.category !== filterContext) return;

      // Status filter check
      const isCompleted = isTaskCompletedOnDate(task, activeDate);
      const isOverdue = !isCompleted && task.date < activeDate;
      if (statusFilter === 'Pending' && isCompleted) return;
      if (statusFilter === 'Completed' && !isCompleted) return;
      if (statusFilter === 'Overdue' && !isOverdue) return;

      all++;
      const norm = normalizePriority(task.priority);
      if (norm === 'High') high++;
      else if (norm === 'Medium') medium++;
      else if (norm === 'Low') low++;
    });

    return { all, high, medium, low };
  }, [data.tasks, filterContext, statusFilter, activeDate, isTaskCompletedOnDate]);

  // Uncompleted high-priority tasks requiring urgent attention today
  const pendingHighCount = useMemo(() => {
    return data.tasks.filter((task) => {
      const isCompleted = isTaskCompletedOnDate(task, activeDate);
      const norm = normalizePriority(task.priority);
      return !isCompleted && norm === 'High' && (task.date <= activeDate);
    }).length;
  }, [data.tasks, activeDate, isTaskCompletedOnDate]);

  const filteredTasks = useMemo(() => {
    const list = data.tasks.filter((task) => {
      const isCompleted = isTaskCompletedOnDate(task, activeDate);
      const isOverdue = !isCompleted && task.date < activeDate;
      const normPriority = normalizePriority(task.priority);

      // Status filter
      if (statusFilter === 'Pending' && isCompleted) return false;
      if (statusFilter === 'Completed' && !isCompleted) return false;
      if (statusFilter === 'Overdue' && !isOverdue) return false;

      // Priority filter
      if (priorityFilter !== 'All' && normPriority !== priorityFilter) return false;

      // Context filter
      if (filterContext && task.category !== filterContext) return false;

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      const aDone = isTaskCompletedOnDate(a, activeDate);
      const bDone = isTaskCompletedOnDate(b, activeDate);
      // Completed items always sink to the bottom
      if (aDone !== bDone) return aDone ? 1 : -1;

      if (sortBy === 'priority') {
        const priorityWeight = { High: 3, Medium: 2, Low: 1 };
        const weightA = priorityWeight[normalizePriority(a.priority)];
        const weightB = priorityWeight[normalizePriority(b.priority)];
        if (weightA !== weightB) return weightB - weightA;
        return a.date.localeCompare(b.date);
      }

      if (sortBy === 'date') {
        return a.date.localeCompare(b.date);
      }

      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }

      return 0;
    });
  }, [data.tasks, activeDate, statusFilter, priorityFilter, filterContext, sortBy, isTaskCompletedOnDate]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask && editingTask.title.trim()) {
      updateTask(editingTask.id, {
        title: editingTask.title.trim(),
        description: editingTask.description?.trim(),
        priority: editingTask.priority,
        category: editingTask.category,
        date: editingTask.date,
        deadline: editingTask.deadline?.trim(),
        estimatedTime: editingTask.estimatedTime?.trim(),
      });
      setEditingTask(null);
    }
  };

  const handleQuickPriorityChange = (taskId: string, newPriority: TaskPriority) => {
    updateTask(taskId, { priority: newPriority });
    setActiveMenuId(null);
  };

  const categories: TaskCategory[] = ['College', 'Home', 'Personal', 'Online', 'Event', 'Other'];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header & Quick Add */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Tasks</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {filteredTasks.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personal &amp; college action items with 3-tier priority levels for {formatShortDate(activeDate)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openQuickAdd('task')}
          className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>

      {/* High Priority Attention Banner */}
      {pendingHighCount > 0 && priorityFilter !== 'High' && (
        <div className="p-3 sm:p-3.5 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-4 h-4 fill-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                {pendingHighCount} High-Priority {pendingHighCount === 1 ? 'Task' : 'Tasks'} Need Attention
              </p>
              <p className="text-[11px] text-rose-700/90 dark:text-rose-300/80 truncate">
                Urgent &amp; important action items due on or before today
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPriorityFilter('High')}
            className="min-h-[36px] px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1"
          >
            <span>Focus High</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Filter Controls (Segmented Tabs & Sorters) */}
      <div className="space-y-2.5">
        {/* Priority Tabs & Status Filters */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-1 min-w-0">
            {/* Priority Tabs: All | High | Medium | Low with counters */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg shrink-0">
              {(
                [
                  { key: 'All', label: 'All', count: priorityCounts.all },
                  { key: 'High', label: 'High', count: priorityCounts.high },
                  { key: 'Medium', label: 'Medium', count: priorityCounts.medium },
                  { key: 'Low', label: 'Low', count: priorityCounts.low },
                ] as const
              ).map(({ key, label, count }) => {
                const isActive = priorityFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPriorityFilter(key)}
                    className={`min-h-[32px] px-2.5 sm:px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? key === 'High'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : key === 'Medium'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : key === 'Low'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {key === 'High' && (
                      <Flame className={`w-3.5 h-3.5 ${isActive ? 'text-white fill-white' : 'text-rose-500 fill-rose-500'}`} />
                    )}
                    {key === 'Medium' && (
                      <Minus className={`w-3.5 h-3.5 stroke-[3] ${isActive ? 'text-white' : 'text-amber-500'}`} />
                    )}
                    {key === 'Low' && (
                      <ArrowDown className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                    )}
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                        isActive
                          ? 'bg-black/20 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Status Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg shrink-0">
              {(['All', 'Pending', 'Completed', 'Overdue'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`min-h-[32px] px-2.5 sm:px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    statusFilter === s
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span className="hidden sm:inline">Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'title')}
              className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none"
            >
              <option value="priority">Priority (High → Low)</option>
              <option value="date">Due Date</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Context Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setFilterContext(undefined)}
            className={`min-h-[32px] px-3 text-xs font-medium rounded-lg border transition-colors shrink-0 cursor-pointer ${
              !filterContext
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            All Contexts
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterContext(filterContext === cat ? undefined : cat)}
              className={`min-h-[32px] px-3 text-xs font-medium rounded-lg border transition-colors shrink-0 cursor-pointer ${
                filterContext === cat
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No tasks found for this filter combination.
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            {(priorityFilter !== 'All' || statusFilter !== 'All' || filterContext) && (
              <button
                type="button"
                onClick={() => {
                  setPriorityFilter('All');
                  setStatusFilter('All');
                  setFilterContext(undefined);
                }}
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => openQuickAdd('task')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add a task</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = isTaskCompletedOnDate(task, activeDate);
            const isOverdue = !isCompleted && task.date < activeDate;
            const deadlineInfo = task.deadline ? getDeadlineInfo(task.deadline, activeDate) : null;
            const normPriority = normalizePriority(task.priority);
            const isHighPriority = normPriority === 'High';
            const isMediumPriority = normPriority === 'Medium';
            const isLowPriority = normPriority === 'Low';

            return (
              <div
                key={task.id}
                className={`relative rounded-xl sm:rounded-2xl border p-4 sm:p-5 transition-all ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75 border-l-4 border-l-slate-300 dark:border-l-slate-700'
                    : isOverdue
                    ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 border-l-[5px] border-l-rose-600 ring-1 ring-rose-500/20'
                    : isHighPriority
                    ? 'bg-gradient-to-r from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 border-rose-200 dark:border-rose-900/60 shadow-xs border-l-[5px] border-l-rose-500 dark:border-l-rose-500 ring-1 ring-rose-500/15'
                    : isMediumPriority
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-[4px] border-l-amber-500 dark:border-l-amber-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-[3px] border-l-slate-300 dark:border-l-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Tap checkbox & Task Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task.id)}
                      className="min-h-[44px] min-w-[44px] -ml-2 -mt-2 flex items-center justify-center cursor-pointer"
                      aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : isHighPriority
                            ? 'border-2 border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 hover:border-rose-600 dark:hover:border-rose-400 ring-2 ring-rose-500/15'
                            : isMediumPriority
                            ? 'border-2 border-amber-400 dark:border-amber-500 hover:border-amber-600'
                            : 'border-2 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm sm:text-base font-semibold leading-snug break-words ${
                            isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Visual Badge Indicator for High Priority */}
                        {!isCompleted && isHighPriority && (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-800 shrink-0 shadow-2xs">
                            <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 fill-rose-600 dark:fill-rose-400" />
                            <span>High Priority</span>
                          </span>
                        )}

                        {/* Visual Badge Indicator for Medium Priority */}
                        {!isCompleted && isMediumPriority && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 shrink-0">
                            <Minus className="w-3 h-3 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                            <span>Medium</span>
                          </span>
                        )}

                        {/* Visual Badge Indicator for Low Priority */}
                        {!isCompleted && isLowPriority && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                            <ArrowDown className="w-2.5 h-2.5 text-slate-400" />
                            <span>Low</span>
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isCompleted
                              ? 'text-slate-400 dark:text-slate-500'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {task.description}
                        </p>
                      )}

                      {/* Clean Unboxed Metadata with · separator */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {task.category}
                        </span>

                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold inline-flex items-center gap-1 ${
                            normPriority === 'High'
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : normPriority === 'Medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {normPriority === 'High' && <Flame className="w-3 h-3 fill-rose-500" />}
                          {normPriority === 'Medium' && <Zap className="w-3 h-3 text-amber-500" />}
                          <span>{normPriority} Priority</span>
                        </span>

                        {task.recurring !== 'None' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Repeat className="w-3 h-3" />
                              <span>{task.recurring}</span>
                            </span>
                          </>
                        )}

                        {task.estimatedTime && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{task.estimatedTime}</span>
                            </span>
                          </>
                        )}

                        {task.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{task.location}</span>
                            </span>
                          </>
                        )}

                        {deadlineInfo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-medium ${
                                deadlineInfo.category === 'overdue'
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : ''
                              }`}
                            >
                              {deadlineInfo.label}
                            </span>
                          </>
                        )}

                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>Overdue</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Reschedule & Options */}
                  <div className="flex items-center gap-1">
                    {/* Move to tomorrow button */}
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => rescheduleTask(task.id, addDays(task.date, 1))}
                        className="min-h-[44px] px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Move to tomorrow"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span className="hidden sm:inline">Tomorrow</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                      className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      aria-label="Task options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Task Menu Popover with Quick Priority Shift */}
                {activeMenuId === task.id && (
                  <div
                    className="absolute right-4 top-14 z-20 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(task);
                        setActiveMenuId(null);
                      }}
                      className="min-h-[38px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Details</span>
                    </button>

                    {/* Quick Priority Switchers */}
                    <div className="py-1 px-2 border-t border-b border-slate-100 dark:border-slate-700/60 my-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Set Priority
                      </span>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleQuickPriorityChange(task.id, 'High')}
                          className={`px-1.5 py-1 text-[11px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                            normPriority === 'High'
                              ? 'bg-rose-600 text-white'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          <Flame className="w-3 h-3 fill-current" />
                          <span>High</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickPriorityChange(task.id, 'Medium')}
                          className={`px-1.5 py-1 text-[11px] font-semibold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                            normPriority === 'Medium'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          <span>Med</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickPriorityChange(task.id, 'Low')}
                          className={`px-1.5 py-1 text-[11px] font-medium rounded flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                            normPriority === 'Low'
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <span>Low</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        rescheduleTask(task.id, activeDate);
                        setActiveMenuId(null);
                      }}
                      className="min-h-[38px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Move to Today</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTask(task.id);
                        setActiveMenuId(null);
                      }}
                      className="min-h-[38px] w-full px-3 py-1.5 text-xs text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-2 cursor-pointer"
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

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Edit Task
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white font-medium"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority Level
                </label>
                <select
                  value={normalizePriority(editingTask.priority)}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer font-semibold text-slate-900 dark:text-white"
                >
                  <option value="High">🔥 High (Urgent &amp; Important)</option>
                  <option value="Medium">⚡ Medium (Standard)</option>
                  <option value="Low">🌱 Low (Nice to have)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={editingTask.category}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, category: e.target.value as TaskCategory })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="min-h-[44px] px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
