import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { EventItem, EventStatus, EventType } from '../../types';
import { getDeadlineInfo, formatShortDate } from '../../utils/date';
import {
  Plus,
  Trophy,
  Calendar,
  MapPin,
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';

export const EventsView: React.FC = () => {
  const { data, activeDate, updateEvent, deleteEvent, openQuickAdd } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingEvt, setEditingEvt] = useState<EventItem | null>(null);

  // Filter and sort events by nearest relevant date/deadline
  const sortedEvents = useMemo(() => {
    let list = [...data.events];

    if (statusFilter !== 'All') {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (typeFilter !== 'All') {
      list = list.filter((e) => e.type === typeFilter);
    }

    return list.sort((a, b) => {
      // Pick earliest relevant upcoming date for each: registrationDeadline || startDate
      const aDate = a.registrationDeadline || a.startDate;
      const bDate = b.registrationDeadline || b.startDate;
      return aDate.localeCompare(bDate);
    });
  }, [data.events, statusFilter, typeFilter]);

  const eventTypes: EventType[] = [
    'Hackathon',
    'Meetup',
    'Conference',
    'Workshop',
    'Tech Fest',
    'Competition',
  ];

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvt && editingEvt.name.trim()) {
      updateEvent(editingEvt.id, {
        name: editingEvt.name.trim(),
        type: editingEvt.type,
        mode: editingEvt.mode,
        status: editingEvt.status,
        startDate: editingEvt.startDate,
        endDate: editingEvt.endDate,
        registrationDeadline: editingEvt.registrationDeadline || undefined,
        location: editingEvt.location?.trim() || undefined,
        registrationLink: editingEvt.registrationLink?.trim() || undefined,
        notes: editingEvt.notes?.trim() || undefined,
      });
      setEditingEvt(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Events &amp; Hackathons
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your registered hackathons, tech fests, workshops &amp; competitions
          </p>
        </div>

        <button
          type="button"
          onClick={() => openQuickAdd('event')}
          className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-2">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {['All', 'Registered', 'Interested', 'Attending', 'Completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`min-h-[32px] px-3 text-xs font-medium rounded-lg border transition-colors shrink-0 cursor-pointer ${
                statusFilter === s
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setTypeFilter('All')}
            className={`min-h-[28px] px-2.5 text-[11px] font-medium rounded-md transition-colors shrink-0 cursor-pointer ${
              typeFilter === 'All'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Types
          </button>
          {eventTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`min-h-[28px] px-2.5 text-[11px] font-medium rounded-md transition-colors shrink-0 cursor-pointer ${
                typeFilter === t
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {sortedEvents.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No events found.
          </p>
          <button
            type="button"
            onClick={() => openQuickAdd('event')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add an event or hackathon</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((evt) => {
            const nearestDeadlineStr = evt.registrationDeadline || evt.submissionDeadline;
            const deadlineInfo = nearestDeadlineStr
              ? getDeadlineInfo(nearestDeadlineStr, activeDate)
              : null;

            return (
              <div
                key={evt.id}
                className="relative rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {evt.type}
                      </span>
                      {evt.organizer && (
                        <>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {evt.organizer}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                      {evt.name}
                    </h3>

                    {evt.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {evt.description}
                      </p>
                    )}

                    {/* Unboxed Metadata with · separator */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatShortDate(evt.startDate)}
                          {evt.endDate !== evt.startDate ? ` – ${formatShortDate(evt.endDate)}` : ''}
                        </span>
                      </span>

                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{evt.mode}</span>

                      {evt.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.location}</span>
                          </span>
                        </>
                      )}

                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          const statuses: EventStatus[] = [
                            'Interested',
                            'Registered',
                            'Attending',
                            'Completed',
                            'Not Attending',
                          ];
                          const nextIdx = (statuses.indexOf(evt.status) + 1) % statuses.length;
                          updateEvent(evt.id, { status: statuses[nextIdx] });
                        }}
                        className="font-semibold text-slate-800 dark:text-slate-200 underline cursor-pointer"
                        title="Click to change status"
                      >
                        Status: {evt.status}
                      </button>

                      {deadlineInfo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              deadlineInfo.category === 'overdue'
                                ? 'text-rose-600 dark:text-rose-400'
                                : deadlineInfo.days <= 1
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {evt.registrationDeadline
                                ? `Registration: ${deadlineInfo.label}`
                                : `Submission: ${deadlineInfo.label}`}
                            </span>
                          </span>
                        </>
                      )}
                    </div>

                    {evt.notes && (
                      <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Prep: </span>
                        {evt.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions & Links */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {evt.registrationLink && (
                      <a
                        href={evt.registrationLink}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[44px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Open Link</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === evt.id ? null : evt.id)}
                      className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      aria-label="Event options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dropdown Options */}
                {activeMenuId === evt.id && (
                  <div
                    className="absolute right-4 top-14 z-20 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEvt(evt);
                        setActiveMenuId(null);
                      }}
                      className="min-h-[40px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Event</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteEvent(evt.id);
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

      {/* Edit Event Modal */}
      {editingEvt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Edit Event
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={editingEvt.name}
                onChange={(e) => setEditingEvt({ ...editingEvt, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={editingEvt.type}
                  onChange={(e) =>
                    setEditingEvt({ ...editingEvt, type: e.target.value as EventType })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  {eventTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editingEvt.status}
                  onChange={(e) =>
                    setEditingEvt({ ...editingEvt, status: e.target.value as EventStatus })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
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
                  Start Date
                </label>
                <input
                  type="date"
                  value={editingEvt.startDate}
                  onChange={(e) => setEditingEvt({ ...editingEvt, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registration Deadline
                </label>
                <input
                  type="date"
                  value={editingEvt.registrationDeadline || ''}
                  onChange={(e) =>
                    setEditingEvt({ ...editingEvt, registrationDeadline: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={editingEvt.location || ''}
                onChange={(e) => setEditingEvt({ ...editingEvt, location: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEvt(null)}
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
