import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAttendance } from '../context/AttendanceContext';
import { Search, X, CheckSquare, BookOpen, Trophy, CheckCircle2, GraduationCap, Flame } from 'lucide-react';
import { getDeadlineInfo } from '../utils/date';

export const SearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    data,
    activeDate,
    setCurrentTab,
    toggleTaskComplete,
    isTaskCompletedOnDate,
    toggleAssignmentStatus,
  } = useApp();

  const { subjects, setSelectedSubjectId } = useAttendance();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { tasks: [], assignments: [], events: [], checklists: [], subjects: [] };

    const tasks = data.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
    );

    const assignments = data.assignments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );

    const events = data.events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.organizer && e.organizer.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q))
    );

    const checklists = data.checklists.filter((c) =>
      c.name.toLowerCase().includes(q)
    );

    const matchedSubjects = subjects.filter((s) =>
      s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q))
    );

    return { tasks, assignments, events, checklists, subjects: matchedSubjects };
  }, [query, data, subjects]);

  if (!isSearchOpen) return null;

  const totalResults =
    results.tasks.length +
    results.assignments.length +
    results.events.length +
    results.checklists.length +
    results.subjects.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20 bg-black/50 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
      >
        {/* Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            id="search-modal-title"
            type="text"
            placeholder="Search tasks, assignments, events, checklists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="min-h-[44px] px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Type anything to search across your tasks, deadlines, hackathons & checklists.
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching items found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tasks ({results.tasks.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.tasks.map((task) => {
                      const isDone = isTaskCompletedOnDate(task, activeDate);
                      const isHigh = task.priority === 'High' || task.priority === 'Major';
                      const isMedium = task.priority === 'Medium';
                      return (
                        <div
                          key={task.id}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                            isDone
                              ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 opacity-75'
                              : isHigh
                              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 border-l-4 border-l-rose-500'
                              : isMedium
                              ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500'
                              : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                          }`}
                        >
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setCurrentTab('tasks');
                              setIsSearchOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-xs font-semibold ${
                                  isDone
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-slate-100'
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
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{task.category}</span>
                              <span className="mx-1">·</span>
                              <span className={isHigh ? 'text-rose-600 font-bold' : isMedium ? 'text-amber-600 font-semibold' : ''}>
                                {task.priority} Priority
                              </span>
                              {task.recurring !== 'None' && (
                                <>
                                  <span className="mx-1">·</span>
                                  <span>{task.recurring}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleTaskComplete(task.id)}
                            className="min-h-[44px] min-w-[44px] text-xs font-semibold px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                          >
                            {isDone ? 'Undo' : 'Complete'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignments */}
              {results.assignments.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Assignments ({results.assignments.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.assignments.map((asg) => {
                      const deadlineInfo = getDeadlineInfo(asg.deadline, activeDate);
                      const isDone = asg.status === 'Completed';
                      return (
                        <div
                          key={asg.id}
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                        >
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setCurrentTab('assignments');
                              setIsSearchOpen(false);
                            }}
                          >
                            <div
                              className={`text-xs font-semibold ${
                                isDone
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {asg.title}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{asg.subject}</span>
                              <span className="mx-1">·</span>
                              <span
                                className={
                                  deadlineInfo.category === 'overdue'
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : ''
                                }
                              >
                                {deadlineInfo.label}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAssignmentStatus(asg.id)}
                            className="min-h-[44px] min-w-[44px] text-xs font-semibold px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                          >
                            {isDone ? 'Undo' : 'Complete'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Events */}
              {results.events.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Events & Hackathons ({results.events.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.events.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => {
                          setCurrentTab('events');
                          setIsSearchOpen(false);
                        }}
                        className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {evt.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{evt.type}</span>
                          <span className="mx-1">·</span>
                          <span>{evt.mode}</span>
                          <span className="mx-1">·</span>
                          <span>{evt.startDate}</span>
                          {evt.status && (
                            <>
                              <span className="mx-1">·</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {evt.status}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects */}
              {results.subjects && results.subjects.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Attendance Subjects ({results.subjects.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.subjects.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubjectId(sub.id);
                          setCurrentTab('attendance');
                          setIsSearchOpen(false);
                        }}
                        className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between"
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {sub.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {sub.code || 'Subject'} · View Attendance
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklists */}
              {results.checklists.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Checklist Items ({results.checklists.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.checklists.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCurrentTab('checklists');
                          setIsSearchOpen(false);
                        }}
                        className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between"
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          {c.checklistId} {c.section ? `· ${c.section}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
