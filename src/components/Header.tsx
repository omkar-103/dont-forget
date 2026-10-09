import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatHeaderDate, getTodayLocal } from '../utils/date';
import {
  Search,
  Plus,
  Settings,
  Calendar,
  RotateCcw,
  Sun,
  Moon,
  Lock,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  X,
  CheckCircle2,
} from 'lucide-react';

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
    isOrangePink,
    syncStatus,
    syncError,
    refreshData,
    migrationNotice,
    dismissMigrationNotice,
  } = useApp();

  const { lock } = useAuth();

  const realToday = getTodayLocal();
  const isSimulatedOrDifferent = activeDate !== realToday;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors animate-slide-down">
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

          {/* Zone 2: Date display & Cloud status */}
          <div className="hidden md:flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                {formatHeaderDate(activeDate)}
              </span>
              {isSimulatedOrDifferent && (
                <button
                  onClick={resetActiveDateToToday}
                  className="ml-1 inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  title="Return to today"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Today</span>
                </button>
              )}
            </div>

            {/* Cloud Sync Status Indicator */}
            <button
              type="button"
              onClick={() => refreshData()}
              title={
                syncStatus === 'saving'
                  ? 'Saving to MongoDB Atlas...'
                  : syncStatus === 'error'
                  ? `Sync error: ${syncError || 'Offline'}. Click to retry.`
                  : 'Central Database Synced (MongoDB Atlas). Click to refresh.'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                syncStatus === 'saving'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : syncStatus === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              {syncStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                  <span className="hidden lg:inline">Saving to Cloud</span>
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <CloudOff className="w-3 h-3 text-rose-500" />
                  <span className="hidden lg:inline">Cloud Offline (Retry)</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 text-emerald-500" />
                  <span className="hidden lg:inline">Cloud Synced</span>
                </>
              )}
            </button>
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

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isOrangePink
                  ? 'Exit Orange Pink mode'
                  : isDarkMode
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              title={
                isOrangePink
                  ? 'Orange Pink Mode — Click to exit'
                  : theme === 'system'
                  ? `System Mode (${isDarkMode ? 'Dark' : 'Light'}) - Click to toggle`
                  : isDarkMode
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              className="min-h-[40px] min-w-[40px] p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer relative"
            >
              {isOrangePink ? (
                <Sparkles className="w-4 h-4" style={{ color: '#FF8A3D' }} />
              ) : isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-500 transition-transform active:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 transition-transform active:-rotate-12" />
              )}
              {/* Indicator dot */}
              {theme === 'system' && !isOrangePink && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500"
                  title="System theme active"
                />
              )}
              {isOrangePink && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #FF8A3D, #F43F7A)' }}
                  title="Orange Pink theme active"
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

            {/* Quick Lock / Logout Button */}
            <button
              type="button"
              onClick={() => lock()}
              aria-label="Lock Session"
              title="Lock Session (Require password to reopen)"
              className="min-h-[40px] min-w-[40px] p-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Migration Notice Banner if local records were safely uploaded */}
      {migrationNotice && (
        <div className="w-full bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{migrationNotice}</span>
            </div>
            <button
              type="button"
              onClick={dismissMigrationNotice}
              className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer text-xs font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};
