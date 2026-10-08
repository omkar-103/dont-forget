/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/today/TodayView';
import { TasksView } from './components/tasks/TasksView';
import { AssignmentsView } from './components/assignments/AssignmentsView';
import { EventsView } from './components/events/EventsView';
import { CalendarView } from './components/calendar/CalendarView';
import { ChecklistsView } from './components/checklists/ChecklistsView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { QuickAddModal } from './components/QuickAddModal';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { RecordAttendanceModal } from './components/attendance/RecordAttendanceModal';
import { SubjectSetupModal } from './components/attendance/SubjectSetupModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SecurityLockScreen } from './components/auth/SecurityLockScreen';
import { RefreshCw } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentTab, setIsSearchOpen, openQuickAdd } = useApp();

  // Global key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid if user is currently typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (document.activeElement?.tagName || '').toUpperCase()
        )
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '/' || e.key === '?') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openQuickAdd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen, openQuickAdd]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <Header />

      {/* Navigation (Desktop Top segmented / Mobile Bottom bar) */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {currentTab === 'today' && <TodayView />}
        {currentTab === 'tasks' && <TasksView />}
        {currentTab === 'assignments' && <AssignmentsView />}
        {currentTab === 'events' && <EventsView />}
        {currentTab === 'calendar' && <CalendarView />}
        {currentTab === 'checklists' && <ChecklistsView />}
        {currentTab === 'attendance' && <AttendanceView />}
      </main>

      {/* Global Interactive Modals */}
      <QuickAddModal />
      <SearchModal />
      <SettingsModal />
      <RecordAttendanceModal />
      <SubjectSetupModal />
    </div>
  );
};

const AppGate: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center animate-pulse mb-3">
          <RefreshCw className="w-6 h-6 text-rose-400 animate-spin" />
        </div>
        <p className="text-xs font-mono text-slate-400 tracking-wider uppercase">
          Verifying Security Vault...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SecurityLockScreen />;
  }

  return (
    <AppProvider>
      <AttendanceProvider>
        <MainContent />
      </AttendanceProvider>
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
