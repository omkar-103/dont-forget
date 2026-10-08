import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { X, Database, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export const AttendanceSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateRequiredAttendance, dbStatus } = useAttendance();

  const [threshold, setThreshold] = useState<number>(settings.requiredAttendance || 75);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateRequiredAttendance(Number(threshold));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-settings-title"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 id="attendance-settings-title" className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
            Attendance Settings &amp; MongoDB Atlas
          </h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200">
          {/* Required Attendance Threshold */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Required Attendance Threshold (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-32 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white font-mono font-bold"
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isSaved ? 'Updated!' : 'Save Target'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Default: 75%. Changing this updates risk classifications and target class formulas immediately without altering any historical attendance records.
              </p>
            </div>
          </form>

          {/* Database & Cloud Connection Status */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>MongoDB Atlas Backend Status</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Active Backend Mode:</span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    dbStatus?.isUsingAtlas
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {dbStatus?.isUsingAtlas ? 'MongoDB Atlas Live' : 'Resilient Local Fallback'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Database: <span className="font-mono text-slate-700 dark:text-slate-300">{dbStatus?.database || 'dont-forget'}</span>
              </div>
              {dbStatus?.error && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                  {dbStatus.error}
                </div>
              )}
            </div>

            {/* Step-by-Step Setup Guide */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px]">
                Connecting your MongoDB Atlas Cluster:
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                <li>Create a free cluster at <span className="font-mono">cloud.mongodb.com</span>.</li>
                <li>Under <strong>Database Access</strong>, create a database user and password.</li>
                <li>Under <strong>Network Access</strong>, allow your IP or allow access from anywhere (<span className="font-mono">0.0.0.0/0</span>).</li>
                <li>Under <strong>Databases &gt; Connect &gt; Drivers</strong>, copy your connection string.</li>
                <li>Set <span className="font-mono">MONGODB_URI</span> in your environment variables.</li>
                <li>The server automatically connects and synchronizes all attendance records!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
