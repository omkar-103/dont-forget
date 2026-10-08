import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Moon,
  Sun,
  Laptop,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Calendar,
  Lock,
  KeyRound,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { getTodayLocal } from '../utils/date';
import { validateImportedJson, exportDataAsJson } from '../utils/storage';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    theme,
    setTheme,
    isDarkMode,
    isOrangePink,
    resetTodayChecklist,
    restoreDefaultChecklists,
    importBackup,
    clearAllData,
    activeDate,
    setActiveDate,
    resetActiveDateToToday,
    data,
  } = useApp();

  const {
    subjects,
    records: attendanceRecords,
    settings: attendanceSettings,
    batchSetupSubjects,
  } = useAttendance();

  const { lock, changePin, isDefaultPin } = useAuth();
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDefaults, setConfirmDefaults] = useState(false);
  const [confirmResetToday, setConfirmResetToday] = useState(false);

  if (!isSettingsOpen) return null;

  const realToday = getTodayLocal();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(currentPinInput.trim())) {
      setPinChangeMsg({ text: 'Current password must be exactly 8 digits.', error: true });
      return;
    }
    if (!/^\d{8}$/.test(newPinInput.trim())) {
      setPinChangeMsg({ text: 'New password must be exactly 8 numeric digits.', error: true });
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeMsg({ text: 'New passwords do not match.', error: true });
      return;
    }

    setIsChangingPin(true);
    setPinChangeMsg(null);
    const res = await changePin(currentPinInput.trim(), newPinInput.trim());
    setIsChangingPin(false);
    if (res.success) {
      setPinChangeMsg({ text: '8-Digit password updated successfully! Any other sessions have been logged out.', error: false });
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setTimeout(() => setPinChangeMsg(null), 4000);
    } else {
      setPinChangeMsg({ text: res.error || 'Failed to change password.', error: true });
    }
  };

  const handleExportBackup = () => {
    exportDataAsJson(data, {
      subjects,
      attendanceRecords,
      attendanceSettings,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validated = validateImportedJson(parsed);

        if (validated.valid && validated.data) {
          if (
            window.confirm(
              'Replace current items with the imported backup? Any unsaved changes will be overwritten.'
            )
          ) {
            importBackup(validated.data);
            if (validated.attendanceData?.subjects && validated.attendanceData.subjects.length > 0) {
              await batchSetupSubjects(validated.attendanceData.subjects);
            }
            setImportStatus('Backup restored successfully!');
            setTimeout(() => setImportStatus(null), 3000);
          }
        } else {
          setImportStatus(`Import failed: ${validated.error || 'Invalid file format'}`);
        }
      } catch {
        setImportStatus('Import failed: Could not read JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 id="settings-modal-title" className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase">
            Settings & Options
          </h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="min-h-[44px] min-w-[44px] -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200">
          {/* THEME SELECTOR */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Appearance
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Light */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`min-h-[52px] p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40 font-semibold ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0">
                  <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
                <span className={`text-xs ${theme === 'light' ? 'text-indigo-900 dark:text-indigo-200' : ''}`}>Light</span>
              </button>

              {/* Dark */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`min-h-[52px] p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40 font-semibold ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xs flex-shrink-0">
                  <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-indigo-400' : 'text-slate-300'}`} />
                </div>
                <span className={`text-xs ${theme === 'dark' ? 'text-indigo-900 dark:text-indigo-200' : ''}`}>Dark</span>
              </button>

              {/* System */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`min-h-[52px] p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40 font-semibold ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-100 to-slate-800 flex items-center justify-center shadow-xs flex-shrink-0">
                  <Laptop className="w-3.5 h-3.5 text-white" />
                </div>
                <span className={`text-xs ${theme === 'system' ? 'text-indigo-900 dark:text-indigo-200' : ''}`}>System</span>
              </button>

              {/* Orange Pink ✨ */}
              <button
                type="button"
                onClick={() => setTheme('orange-pink')}
                className={`min-h-[52px] p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  isOrangePink
                    ? 'border-orange-400 bg-orange-50/70 font-semibold ring-2 ring-orange-400/20'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-orange-200 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-xs flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF8A3D, #FF6B6B, #F43F7A)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className={`text-xs ${isOrangePink ? 'text-orange-800' : ''}`}>Orange Pink</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1">
              <span>
                Active:{' '}
                <strong className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {isOrangePink ? '🌸 Orange Pink' : isDarkMode ? 'Dark' : 'Light'} Mode
                </strong>
              </span>
              <span>
                {theme === 'system' ? '(Following OS)' : '(Manual)'}
              </span>
            </div>
          </div>

          {/* ACTIVE DATE SIMULATOR / SYSTEM DATE */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span>Active System Date</span>
              <span className="text-[11px] font-normal text-slate-400">Baseline: 9 Oct 2026</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={activeDate}
                  onChange={(e) => {
                    if (e.target.value) setActiveDate(e.target.value);
                  }}
                  className="flex-1 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={resetActiveDateToToday}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Today ({realToday})
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You can switch dates to preview tomorrow or subsequent days. Your daily completion states adapt automatically without losing checklists.
              </p>
            </div>
          </div>

          {/* CHECKLIST MANAGEMENT */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Checklist Controls
            </div>
            <div className="space-y-2">
              {/* Reset today's checklist */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Reset today&apos;s checklist
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Unchecks packed items for today ({activeDate}) while preserving all item names.
                  </div>
                </div>
                {confirmResetToday ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        resetTodayChecklist();
                        setConfirmResetToday(false);
                      }}
                      className="min-h-[44px] px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetToday(false)}
                      className="min-h-[44px] px-2 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetToday(true)}
                    className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset today</span>
                  </button>
                )}
              </div>

              {/* Restore default items */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Restore default items
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Re-seeds default College, Events, and Travel checklists.
                  </div>
                </div>
                {confirmDefaults ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        restoreDefaultChecklists();
                        setConfirmDefaults(false);
                      }}
                      className="min-h-[44px] px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDefaults(false)}
                      className="min-h-[44px] px-2 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDefaults(true)}
                    className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer shrink-0"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BACKUP & RESTORE */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Backup & Portability
            </div>
            {importStatus && (
              <div className="p-2 mb-2 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {importStatus}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="min-h-[44px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Import JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* PRIVACY NOTE & DATA STATS */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                Your data stays on this device.
              </span>{' '}
              Stored securely in localStorage. No external telemetry, no background scrapers, no accounts.
              <div className="mt-1 font-mono text-[10px] text-slate-400">
                {data.tasks.length} tasks · {data.assignments.length} assignments ·{' '}
                {data.events.length} events · {data.checklists.length} checklist items
              </div>
            </div>
          </div>

          {/* SITE SECURITY & 8-DIGIT PASSWORD SECTION */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                <span>Site Security & 8-Digit Password</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Single Active Session
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span>8-Digit Password Status</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isDefaultPin ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Using Default Password (<code className="font-mono">12345678</code>) — Update recommended
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Custom 8-digit password active & encrypted
                      </span>
                    )}
                  </div>
                </div>

                {/* Instant Lock Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    lock();
                  }}
                  className="min-h-[36px] px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                  title="Lock site immediately"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Site Now</span>
                </button>
              </div>

              {/* Password update form */}
              <form onSubmit={handleChangePassword} className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Change 8-Digit Password:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      Current Password (8 digits)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      pattern="[0-9]*"
                      placeholder="••••••••"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      New Password (8 digits)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      pattern="[0-9]*"
                      placeholder="••••••••"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      Confirm New (8 digits)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      pattern="[0-9]*"
                      placeholder="••••••••"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {pinChangeMsg && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                      pinChangeMsg.error
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    {pinChangeMsg.error ? (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{pinChangeMsg.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Changing the password will immediately invalidate all other open sessions.
                  </p>
                  <button
                    type="submit"
                    disabled={isChangingPin || !currentPinInput || !newPinInput || !confirmPinInput}
                    className="min-h-[36px] px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    {isChangingPin ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {confirmClear ? (
              <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 space-y-2">
                <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                  Delete all local tasks and events?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllData();
                      setConfirmClear(false);
                      setIsSettingsOpen(false);
                    }}
                    className="min-h-[44px] px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Yes, clear data
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="min-h-[44px] px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[44px] w-full p-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Stored Data</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
