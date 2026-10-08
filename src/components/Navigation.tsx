import React from 'react';
import { useApp } from '../context/AppContext';
import { NavigationTab } from '../types';
import {
  Sun,
  CheckSquare,
  BookOpen,
  Trophy,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'events', label: 'Events', icon: Trophy },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'checklists', label: 'Checklists', icon: CheckCircle2 },
  { id: 'attendance', label: 'Attendance', icon: GraduationCap },
];

export const Navigation: React.FC = () => {
  const { currentTab, setCurrentTab } = useApp();

  return (
    <>
      {/* Desktop Navigation Tabs */}
      <nav className="hidden md:block border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-inherit' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="grid grid-cols-7 items-center h-15 px-1 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 transition-transform ${
                    isActive ? 'scale-110 text-slate-900 dark:text-white' : 'text-slate-400'
                  }`}
                />
                <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[52px]">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-slate-900 dark:bg-white rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
