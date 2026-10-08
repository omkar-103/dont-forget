import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatHeaderDate, getTodayLocal } from '../utils/date';
import { Search, Plus, Settings, Calendar, RotateCcw, Sun, Moon, Lock } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeDate,
    resetActiveDateToToday,
    setIsSearchOpen,
    openQuickAdd,
    setIsSettingsOpen,
    setCurrentTab,
    isDarkMode,
    toggleTheme,
    theme,
  } = useApp();

  const { lock } = useAuth();

  const realToday = getTodayLocal();
  const isSimulatedOrDifferent = activeDate !== realToday && activeDate !== '2026-10-09';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Brand title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('today')}
            className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white rounded"
          >
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white uppercase transition-colors">
              DON&apos;T FORGET
            </span>
          </button>
        </div>

        {/* Zone 2: Date display (Clean unboxed text) */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            {formatHeaderDate(activeDate)}
          </span>
          {isSimulatedOrDifferent && (
            <button
              onClick={resetActiveDateToToday}
              className="ml-2 inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              title="Return to today"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Today</span>
            </button>
          )}
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            className="min-h-[40px] min-w-[40px] p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={
              theme === 'system'
                ? `System Mode (${isDarkMode ? 'Dark' : 'Light'}) - Click to toggle`
                : isDarkMode
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
            className="min-h-[40px] min-w-[40px] p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white relative"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-500 hover:text-amber-400 transition-transform active:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:text-indigo-600 transition-transform active:-rotate-12" />
            )}
            {theme === 'system' && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500"
                title="System theme active"
              />
            )}
          </button>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={() => openQuickAdd()}
            className="min-h-[40px] px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            className="min-h-[40px] min-w-[40px] p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quick Lock Button */}
          <button
            type="button"
            onClick={() => lock()}
            aria-label="Lock Site"
            title="Lock Site with 8-digit password"
            className="min-h-[40px] min-w-[40px] p-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
