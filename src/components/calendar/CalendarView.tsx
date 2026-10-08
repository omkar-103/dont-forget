import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  parseLocalDate,
  formatToDateStr,
  formatMonthYear,
  formatHeaderDate,
  formatShortDate,
  getDeadlineInfo,
} from '../../utils/date';
import { WorkloadChart } from '../charts/WorkloadChart';
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  BookOpen,
  Trophy,
  CalendarDays,
  Plus,
  Flame,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { data, activeDate, setActiveDate, openQuickAdd, toggleTaskComplete, isTaskCompletedOnDate } =
    useApp();

  // Current calendar month view state
  const [viewDate, setViewDate] = useState(() => parseLocalDate(activeDate));

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Build grid days for the month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const days = [];
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({
        dateStr: formatToDateStr(d),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const d = new Date(currentYear, currentMonth, day);
      days.push({
        dateStr: formatToDateStr(d),
        dayNum: day,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({
        dateStr: formatToDateStr(d),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Aggregate items for selected activeDate
  const dayItems = useMemo(() => {
    const tasks = data.tasks.filter((t) => t.date === activeDate);
    const assignments = data.assignments.filter((a) => a.deadline === activeDate);
    const events = data.events.filter(
      (e) =>
        (e.startDate <= activeDate && e.endDate >= activeDate) ||
        e.registrationDeadline === activeDate ||
        e.submissionDeadline === activeDate
    );

    return { tasks, assignments, events };
  }, [data, activeDate]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Calendar
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visual schedule derived from your tasks, deadlines &amp; events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-900 dark:text-white min-w-[130px] text-center">
            {formatMonthYear(currentYear, currentMonth)}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
          {calendarDays.map((item) => {
            const isSelected = item.dateStr === activeDate;

            // Count scheduled items on this cell
            const tasksCount = data.tasks.filter((t) => t.date === item.dateStr).length;
            const asgsCount = data.assignments.filter((a) => a.deadline === item.dateStr).length;
            const evtsCount = data.events.filter(
              (e) =>
                (e.startDate <= item.dateStr && e.endDate >= item.dateStr) ||
                e.registrationDeadline === item.dateStr
            ).length;
            const total = tasksCount + asgsCount + evtsCount;

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setActiveDate(item.dateStr)}
                className={`min-h-[64px] sm:min-h-[80px] p-1.5 sm:p-2 flex flex-col items-start justify-between text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : item.isCurrentMonth
                    ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    : 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600'
                }`}
              >
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    isSelected
                      ? 'text-white dark:text-slate-900 font-bold'
                      : item.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                >
                  {item.dayNum}
                </span>

                {/* Subtle Dots & count indicator */}
                {total > 0 && (
                  <div className="w-full flex items-center justify-between gap-1 mt-1">
                    <div className="flex items-center gap-1">
                      {tasksCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white dark:bg-slate-900' : 'bg-slate-500'
                          }`}
                        />
                      )}
                      {asgsCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-amber-300' : 'bg-amber-500'
                          }`}
                        />
                      )}
                      {evtsCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`font-mono text-[9px] tabular-nums font-bold ${
                        isSelected
                          ? 'text-white dark:text-slate-900'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {total}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda View */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Selected Agenda
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {formatHeaderDate(activeDate)}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => openQuickAdd('task')}
            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add on this day</span>
          </button>
        </div>

        {/* Day Items */}
        {dayItems.tasks.length === 0 &&
        dayItems.assignments.length === 0 &&
        dayItems.events.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            No items scheduled on this day.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Tasks on this day */}
            {dayItems.tasks.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Tasks ({dayItems.tasks.length})</span>
                </div>
                <div className="space-y-1.5">
                  {dayItems.tasks.map((task) => {
                    const isDone = isTaskCompletedOnDate(task, activeDate);
                    const isHigh = task.priority === 'High' || task.priority === 'Major';
                    const isMedium = task.priority === 'Medium';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isDone
                            ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 opacity-75'
                            : isHigh
                            ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 border-l-4 border-l-rose-500'
                            : isMedium
                            ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500'
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs sm:text-sm font-semibold ${
                                isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {task.title}
                            </span>
                            {!isDone && isHigh && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-300 dark:border-rose-800">
                                <Flame className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                                <span>High</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{task.category}</span>
                            <span className="mx-1">·</span>
                            <span className={isHigh ? 'text-rose-600 font-bold' : isMedium ? 'text-amber-600 font-semibold' : ''}>
                              {task.priority} Priority
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTaskComplete(task.id)}
                          className="min-h-[44px] px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                        >
                          {isDone ? 'Completed' : 'Mark Done'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assignments due on this day */}
            {dayItems.assignments.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Assignments Due ({dayItems.assignments.length})</span>
                </div>
                <div className="space-y-1.5">
                  {dayItems.assignments.map((asg) => (
                    <div
                      key={asg.id}
                      className="p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {asg.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{asg.subject}</span>
                          <span className="mx-1">·</span>
                          <span>Status: {asg.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events active on this day */}
            {dayItems.events.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Events / Deadlines ({dayItems.events.length})</span>
                </div>
                <div className="space-y-1.5">
                  {dayItems.events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {evt.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{evt.type}</span>
                          <span className="mx-1">·</span>
                          <span>{evt.mode}</span>
                          <span className="mx-1">·</span>
                          <span>Status: {evt.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workload chart for upcoming days */}
      <WorkloadChart daysCount={7} />
    </div>
  );
};
