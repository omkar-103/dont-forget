import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { addDays, formatShortDate, formatWeekdayShort } from '../../utils/date';

interface DayWorkload {
  date: string;
  dayLabel: string;
  weekday: string;
  majorTasks: number;
  assignments: number;
  events: number;
  total: number;
  isToday: boolean;
}

export const WorkloadChart: React.FC<{ daysCount?: number }> = ({ daysCount = 7 }) => {
  const { data, activeDate, setActiveDate } = useApp();

  const workloadData = useMemo(() => {
    const list: DayWorkload[] = [];

    for (let i = 0; i < daysCount; i++) {
      const d = addDays(activeDate, i);
      const isToday = i === 0;

      // Major tasks on this date
      const majorTasks = data.tasks.filter(
        (t) => t.date === d && t.priority === 'Major' && t.status !== 'Completed'
      ).length;

      // Assignments with deadline on this date
      const assignments = data.assignments.filter(
        (a) => a.deadline === d && a.status !== 'Completed'
      ).length;

      // Events active or with registration/submission deadline on this date
      const events = data.events.filter(
        (e) =>
          (e.startDate <= d && e.endDate >= d) ||
          e.registrationDeadline === d ||
          e.submissionDeadline === d
      ).length;

      const total = majorTasks + assignments + events;

      list.push({
        date: d,
        dayLabel: formatShortDate(d),
        weekday: formatWeekdayShort(d),
        majorTasks,
        assignments,
        events,
        total,
        isToday,
      });
    }

    return list;
  }, [data, activeDate, daysCount]);

  const maxTotal = useMemo(() => {
    const max = Math.max(...workloadData.map((w) => w.total), 1);
    return Math.max(max, 4); // minimum 4 scale for nice baseline
  }, [workloadData]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Upcoming Workload
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Next {daysCount} days · Major tasks, assignments &amp; events
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
            {workloadData.reduce((acc, curr) => acc + curr.total, 0)}
          </span>{' '}
          <span className="text-[11px] text-slate-500">scheduled items</span>
        </div>
      </div>

      {/* Chart Bars */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 items-end h-28 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        {workloadData.map((item) => {
          const heightPercent = item.total === 0 ? 6 : Math.round((item.total / maxTotal) * 100);
          return (
            <div
              key={item.date}
              onClick={() => setActiveDate(item.date)}
              className="flex flex-col items-center justify-end h-full group cursor-pointer"
              title={`${item.dayLabel}: ${item.total} items (${item.majorTasks} major tasks, ${item.assignments} assignments, ${item.events} events)`}
            >
              {/* Count label above bar */}
              <span
                className={`font-mono text-[10px] font-semibold mb-1 transition-opacity tabular-nums ${
                  item.total > 0
                    ? 'text-slate-700 dark:text-slate-300 opacity-80 group-hover:opacity-100'
                    : 'text-slate-300 dark:text-slate-700 opacity-40'
                }`}
              >
                {item.total}
              </span>

              {/* Bar */}
              <div className="w-full max-w-[32px] bg-slate-100 dark:bg-slate-800 rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full transition-all duration-200 rounded-t-md ${
                    item.isToday
                      ? 'bg-slate-900 dark:bg-white'
                      : item.total >= 4
                      ? 'bg-rose-500/80'
                      : item.total >= 2
                      ? 'bg-amber-500/80'
                      : item.total > 0
                      ? 'bg-slate-400 dark:bg-slate-500'
                      : 'bg-slate-200 dark:bg-slate-800'
                  } group-hover:brightness-110`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis date labels */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-2 text-center">
        {workloadData.map((item) => (
          <button
            key={item.date}
            onClick={() => setActiveDate(item.date)}
            className={`min-h-[36px] flex flex-col items-center justify-center rounded-md p-0.5 transition-colors cursor-pointer ${
              item.isToday
                ? 'font-bold text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-[10px] uppercase font-semibold">{item.weekday}</span>
            <span className="font-mono text-[11px] tabular-nums mt-0.5">
              {item.date.split('-')[2]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
