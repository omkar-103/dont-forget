import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  formatHeaderDate,
  formatShortDate,
  getDeadlineInfo,
  addDays,
  formatWeekdayShort,
} from '../../utils/date';
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Trophy,
  Briefcase,
  Home,
  CheckSquare,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  Flame,
} from 'lucide-react';

export const TodayView: React.FC = () => {
  const {
    data,
    activeDate,
    setCurrentTab,
    setFilterContext,
    toggleTaskComplete,
    isTaskCompletedOnDate,
    rescheduleTask,
    toggleAssignmentStatus,
    getChecklistProgress,
    toggleChecklistItem,
    isChecklistItemChecked,
    openQuickAdd,
  } = useApp();

  const { summary } = useAttendance();

  // 1. Tasks scheduled for today or recurring daily
  const todayTasks = useMemo(() => {
    return data.tasks.filter((t) => {
      if (t.recurring === 'Daily') return true;
      return t.date === activeDate;
    });
  }, [data.tasks, activeDate]);

  // Overdue items
  const overdueTasks = useMemo(() => {
    return data.tasks.filter(
      (t) =>
        t.recurring !== 'Daily' &&
        t.date < activeDate &&
        !isTaskCompletedOnDate(t, activeDate)
    );
  }, [data.tasks, activeDate, isTaskCompletedOnDate]);

  const overdueAssignments = useMemo(() => {
    return data.assignments.filter(
      (a) => a.deadline < activeDate && a.status !== 'Completed'
    );
  }, [data.assignments, activeDate]);

  // High Priority vs Standard
  const majorTasks = useMemo(() => {
    return todayTasks.filter((t) => t.priority === 'High' || t.priority === 'Major');
  }, [todayTasks]);

  const minorTasks = useMemo(() => {
    return todayTasks.filter((t) => t.priority !== 'High' && t.priority !== 'Major');
  }, [todayTasks]);

  // Contexts: College & Home
  const collegeTasks = useMemo(() => {
    return todayTasks.filter((t) => t.category === 'College');
  }, [todayTasks]);

  const homeTasks = useMemo(() => {
    return todayTasks.filter((t) => t.category === 'Home');
  }, [todayTasks]);

  // Today's assignments & deadlines
  const todayAssignments = useMemo(() => {
    return data.assignments.filter(
      (a) => a.deadline === activeDate || (a.deadline > activeDate && a.status !== 'Completed')
    );
  }, [data.assignments, activeDate]);

  // Approaching deadlines (within 3 days)
  const approachingDeadlines = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: 'assignment' | 'event';
      deadline: string;
      days: number;
      label: string;
    }> = [];

    data.assignments
      .filter((a) => a.status !== 'Completed' && a.deadline >= activeDate)
      .forEach((a) => {
        const info = getDeadlineInfo(a.deadline, activeDate);
        if (info.days <= 3) {
          list.push({
            id: a.id,
            title: a.title,
            type: 'assignment',
            deadline: a.deadline,
            days: info.days,
            label: info.label,
          });
        }
      });

    data.events.forEach((e) => {
      const regDl = e.registrationDeadline;
      if (regDl && regDl >= activeDate) {
        const info = getDeadlineInfo(regDl, activeDate);
        if (info.days <= 3) {
          list.push({
            id: e.id,
            title: `${e.name} (Registration)`,
            type: 'event',
            deadline: regDl,
            days: info.days,
            label: info.label,
          });
        }
      }
    });

    return list.sort((a, b) => a.days - b.days);
  }, [data.assignments, data.events, activeDate]);

  // Today's events
  const todayEvents = useMemo(() => {
    return data.events.filter(
      (e) =>
        (e.startDate <= activeDate && e.endDate >= activeDate) ||
        e.registrationDeadline === activeDate
    );
  }, [data.events, activeDate]);

  // Tomorrow preview
  const tomorrowDate = addDays(activeDate, 1);
  const tomorrowTasks = useMemo(() => {
    return data.tasks.filter((t) => t.date === tomorrowDate && t.status !== 'Completed');
  }, [data.tasks, tomorrowDate]);

  const tomorrowAssignments = useMemo(() => {
    return data.assignments.filter((a) => a.deadline === tomorrowDate && a.status !== 'Completed');
  }, [data.assignments, tomorrowDate]);

  // Overall Today Progress calculation
  const totalActionItems = todayTasks.length;
  const completedActionItems = todayTasks.filter((t) =>
    isTaskCompletedOnDate(t, activeDate)
  ).length;

  const progressPercent =
    totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0;
  const isAllComplete = totalActionItems > 0 && completedActionItems === totalActionItems;

  // College Checklist status for "Before You Leave"
  const collegeChecklistProgress = getChecklistProgress('college', activeDate);
  const collegeItems = data.checklists
    .filter((c) => c.checklistId === 'college')
    .sort((a, b) => a.order - b.order);

  // Still Pending at End of Day
  const stillPendingTasks = todayTasks.filter(
    (t) => !isTaskCompletedOnDate(t, activeDate)
  );

  return (
    <div className="space-y-7 pb-20 md:pb-8 stagger-children">
      {/* 1. Daily Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {formatHeaderDate(activeDate)}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
          Here&apos;s what matters today.
        </h1>
      </div>

      {/* 2. Daily Progress Summary Card */}
      <div className="animate-fade-up p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover-lift">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Daily Progress
            </div>
            <div className="font-mono text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {completedActionItems} / {totalActionItems} completed
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {progressPercent}%
            </span>
            {isAllComplete && (
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>You&apos;re good to go.</span>
              </div>
            )}
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isAllComplete ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-white'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. BEFORE YOU LEAVE (Version 1 Identity in Command Center) */}
      <div className="animate-fade-up p-4 sm:p-5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs hover-lift">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Before You Leave
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              College Checklist
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
              {collegeChecklistProgress.checked} / {collegeChecklistProgress.total} packed
            </span>
            <button
              type="button"
              onClick={() => setCurrentTab('checklists')}
              className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              Open Checklist
            </button>
          </div>
        </div>

        {/* Quick tap top 5 items right from Today! */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {collegeItems.slice(0, 5).map((item) => {
            const isChecked = isChecklistItemChecked(item.id, 'college', activeDate);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleChecklistItem(item.id, 'college')}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 line-through'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-slate-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                    isChecked
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TODAY ATTENDANCE SUMMARY (Section 57) */}
      {summary && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Attendance
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {summary.overall.percentage !== null
                  ? `Overall: ${summary.overall.percentage.toFixed(1)}%`
                  : 'No attendance recorded yet'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('attendance')}
              className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              Open Attendance
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
            {summary.lowestOverall && (
              <span>
                Lowest: <strong className="text-slate-800 dark:text-slate-200">{summary.lowestOverall.name}</strong> ({summary.lowestOverall.percentage.toFixed(1)}%)
              </span>
            )}
            {summary.atRiskSubjects.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  At Risk: {summary.atRiskSubjects.length} subject{summary.atRiskSubjects.length === 1 ? '' : 's'}
                </span>
              </>
            )}
            {summary.overall.percentage !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span>Theory: {summary.theory.percentage !== null ? `${summary.theory.percentage.toFixed(0)}%` : '—'}</span>
                <span aria-hidden="true">·</span>
                <span>Practical: {summary.practical.percentage !== null ? `${summary.practical.percentage.toFixed(0)}%` : '—'}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. OVERDUE SECTION (Highest Priority if any exist) */}
      {(overdueTasks.length > 0 || overdueAssignments.length > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Overdue Work</h3>
          </div>

          <div className="space-y-2">
            {/* Overdue Assignments */}
            {overdueAssignments.map((asg) => {
              const info = getDeadlineInfo(asg.deadline, activeDate);
              return (
                <div
                  key={asg.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {asg.title}
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                      <span>{asg.subject}</span>
                      <span className="mx-1">·</span>
                      <span>{info.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleAssignmentStatus(asg.id)}
                      className="min-h-[44px] px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('assignments')}
                      className="min-h-[44px] px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Overdue Tasks */}
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {task.title}
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                    <span>{task.category}</span>
                    <span className="mx-1">·</span>
                    <span>Due {formatShortDate(task.date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(task.id)}
                    className="min-h-[44px] px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => rescheduleTask(task.id, activeDate)}
                    className="min-h-[44px] px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Move to Today
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. HIGH-PRIORITY TASKS TODAY */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>High-Priority Tasks</span>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {majorTasks.filter((t) => isTaskCompletedOnDate(t, activeDate)).length} /{' '}
            {majorTasks.length}
          </span>
        </div>

        {majorTasks.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-400 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            No high-priority tasks planned for today.
          </p>
        ) : (
          <div className="space-y-2">
            {majorTasks.map((task) => {
              const isDone = isTaskCompletedOnDate(task, activeDate);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTaskComplete(task.id)}
                  className={`p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                    isDone
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75 border-l-4 border-l-slate-300 dark:border-l-slate-700'
                      : 'bg-gradient-to-r from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 border-rose-200 dark:border-rose-900/60 border-l-4 border-l-rose-500 dark:border-l-rose-400 shadow-2xs hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isDone
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40'
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm sm:text-base font-bold ${
                            isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        {!isDone && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-800 shrink-0">
                            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                            <span>High Priority</span>
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {task.category}
                        </span>
                        {task.estimatedTime && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{task.estimatedTime}</span>
                          </>
                        )}
                        {task.deadline && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {task.deadline}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. APPROACHING DEADLINES */}
      {approachingDeadlines.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Approaching Deadlines
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {approachingDeadlines.map((dl) => (
              <div
                key={dl.id}
                onClick={() => setCurrentTab(dl.type === 'assignment' ? 'assignments' : 'events')}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {dl.title}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {dl.label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatShortDate(dl.deadline)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TODAY'S EVENTS */}
      {todayEvents.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Today&apos;s Events
          </div>
          <div className="space-y-2">
            {todayEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setCurrentTab('events')}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-slate-300"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {evt.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{evt.type}</span>
                    <span className="mx-1">·</span>
                    <span>{evt.mode}</span>
                    {evt.location && (
                      <>
                        <span className="mx-1">·</span>
                        <span>{evt.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {evt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. COLLEGE & HOME TASKS DUAL GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* College Tasks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              <span>College Tasks</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterContext('College');
                setCurrentTab('tasks');
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              View all
            </button>
          </div>

          {collegeTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No college tasks today.</p>
          ) : (
            <div className="space-y-1.5">
              {collegeTasks.slice(0, 3).map((task) => {
                const isDone = isTaskCompletedOnDate(task, activeDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskComplete(task.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs font-semibold truncate ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Home Tasks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Home className="w-3.5 h-3.5 text-emerald-500" />
              <span>Home Tasks</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterContext('Home');
                setCurrentTab('tasks');
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              View all
            </button>
          </div>

          {homeTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No home tasks today.</p>
          ) : (
            <div className="space-y-1.5">
              {homeTasks.slice(0, 3).map((task) => {
                const isDone = isTaskCompletedOnDate(task, activeDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskComplete(task.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs font-semibold truncate ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 9. MINOR TASKS */}
      {minorTasks.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Minor Tasks
          </div>
          <div className="space-y-1.5">
            {minorTasks.map((task) => {
              const isDone = isTaskCompletedOnDate(task, activeDate);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTaskComplete(task.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isDone
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{task.category}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 10. TOMORROW PREVIEW */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tomorrow · {formatWeekdayShort(tomorrowDate)} {tomorrowDate.split('-')[2]}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {tomorrowTasks.length} task{tomorrowTasks.length === 1 ? '' : 's'} ·{' '}
              {tomorrowAssignments.length} assignment{tomorrowAssignments.length === 1 ? '' : 's'}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('calendar')}
            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            View Calendar
          </button>
        </div>

        {/* Small preview of tomorrow's items */}
        <div className="space-y-1 pt-1">
          {tomorrowTasks.slice(0, 2).map((t) => (
            <div key={t.id} className="text-xs text-slate-600 dark:text-slate-400 truncate">
              • {t.title}
            </div>
          ))}
          {tomorrowAssignments.slice(0, 2).map((a) => (
            <div key={a.id} className="text-xs text-amber-600 dark:text-amber-400 font-medium truncate">
              • Due: {a.title} ({a.subject})
            </div>
          ))}
        </div>
      </div>

      {/* 11. STILL PENDING (End of Day Actions) */}
      {stillPendingTasks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Still Pending
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {stillPendingTasks.length} unfinished item{stillPendingTasks.length === 1 ? '' : 's'} today.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stillPendingTasks.forEach((t) => {
                  rescheduleTask(t.id, tomorrowDate);
                });
              }}
              className="min-h-[44px] px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Move all to tomorrow</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
