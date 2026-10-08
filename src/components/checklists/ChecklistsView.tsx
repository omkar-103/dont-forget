import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChecklistType, ChecklistItem } from '../../types';
import {
  Check,
  Plus,
  RotateCcw,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Sparkles,
} from 'lucide-react';

export const ChecklistsView: React.FC = () => {
  const {
    data,
    activeDate,
    toggleChecklistItem,
    isChecklistItemChecked,
    getChecklistProgress,
    moveChecklistItem,
    deleteChecklistItem,
    updateChecklistItem,
    resetTodayChecklist,
    openQuickAdd,
  } = useApp();

  const [selectedList, setSelectedList] = useState<ChecklistType>('college');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);

  const progress = getChecklistProgress(selectedList, activeDate);

  const currentItems = data.checklists
    .filter((c) => c.checklistId === selectedList)
    .sort((a, b) => a.order - b.order);

  // Group by section if 'events'
  const sections = selectedList === 'events' ? ['MUST HAVE', 'TECH', 'EVENT'] : ['ALL'];

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem && editingItem.name.trim()) {
      updateChecklistItem(editingItem.id, { name: editingItem.name.trim() });
      setEditingItem(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Segmented Switcher: COLLEGE | EVENTS | TRAVEL */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setSelectedList('college');
              setActiveMenuId(null);
            }}
            className={`min-h-[44px] px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              selectedList === 'college'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            College
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedList('events');
              setActiveMenuId(null);
            }}
            className={`min-h-[44px] px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              selectedList === 'events'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Events
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedList('travel');
              setActiveMenuId(null);
            }}
            className={`min-h-[44px] px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              selectedList === 'travel'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Travel
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset Today Button */}
          <button
            type="button"
            onClick={() => resetTodayChecklist(selectedList)}
            className="min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Uncheck items for today without deleting"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Today</span>
          </button>

          {/* Add Item Button */}
          <button
            type="button"
            onClick={() => openQuickAdd('checklist')}
            className="min-h-[44px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {progress.checked} / {progress.total} packed
            </div>
            {progress.isComplete && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 animate-in fade-in">
                <Sparkles className="w-3.5 h-3.5" />
                <span>You&apos;re good to go.</span>
              </div>
            )}
          </div>
          <div className="font-mono text-xs text-slate-400 tabular-nums">
            {progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progress.isComplete ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-white'
            }`}
            style={{
              width: `${progress.total > 0 ? (progress.checked / progress.total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      {currentItems.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Nothing here yet.
          </p>
          <button
            type="button"
            onClick={() => openQuickAdd('checklist')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add your first item</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const items =
              section === 'ALL'
                ? currentItems
                : currentItems.filter(
                    (i) => (i.section || 'MUST HAVE').toUpperCase() === section
                  );

            if (items.length === 0) return null;

            return (
              <div key={section} className="space-y-2">
                {section !== 'ALL' && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pt-2">
                    {section}
                  </div>
                )}

                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const isChecked = isChecklistItemChecked(item.id, selectedList, activeDate);
                    const isFirst = idx === 0;
                    const isLast = idx === items.length - 1;

                    return (
                      <div
                        key={item.id}
                        className={`relative group rounded-xl sm:rounded-2xl border transition-all duration-150 ${
                          isChecked
                            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Whole Large Clickable Card */}
                        <div
                          onClick={() => toggleChecklistItem(item.id, selectedList)}
                          className="min-h-[56px] sm:min-h-[64px] px-4 sm:px-5 py-3 flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Visual Check box */}
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                isChecked
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                  : 'border-2 border-slate-300 dark:border-slate-700 group-hover:border-slate-400'
                              }`}
                            >
                              {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                            </div>

                            {/* Item Name */}
                            <span
                              className={`text-sm sm:text-base font-semibold truncate transition-colors ${
                                isChecked
                                  ? 'line-through text-slate-400 dark:text-slate-500 font-medium'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.name}
                            </span>
                          </div>

                          {/* Quick 3-dot or reorder controls */}
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId(activeMenuId === item.id ? null : item.id)
                              }
                              className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                              aria-label="Item options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Options Menu Popover */}
                        {activeMenuId === item.id && (
                          <div
                            className="absolute right-3 top-12 z-20 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem({ id: item.id, name: item.name });
                                setActiveMenuId(null);
                              }}
                              className="min-h-[40px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Edit Name</span>
                            </button>
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => {
                                moveChecklistItem(item.id, 'up');
                                setActiveMenuId(null);
                              }}
                              className="min-h-[40px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              <span>Move Up</span>
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => {
                                moveChecklistItem(item.id, 'down');
                                setActiveMenuId(null);
                              }}
                              className="min-h-[40px] w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              <span>Move Down</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteChecklistItem(item.id);
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
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-sm bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Edit Item Name
            </h4>
            <input
              type="text"
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
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
