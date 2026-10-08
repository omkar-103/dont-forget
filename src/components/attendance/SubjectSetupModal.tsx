import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const SubjectSetupModal: React.FC = () => {
  const { isSetupModalOpen, setIsSetupModalOpen, batchSetupSubjects } = useAttendance();

  const [subjectsList, setSubjectsList] = useState<Array<{ name: string; code: string }>>([
    { name: '', code: '' },
    { name: '', code: '' },
    { name: '', code: '' },
    { name: '', code: '' },
    { name: '', code: '' },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isSetupModalOpen) return null;

  const handleNameChange = (index: number, val: string) => {
    const next = [...subjectsList];
    next[index].name = val;
    setSubjectsList(next);
  };

  const handleCodeChange = (index: number, val: string) => {
    const next = [...subjectsList];
    next[index].code = val;
    setSubjectsList(next);
  };

  const handleAddMore = () => {
    setSubjectsList([...subjectsList, { name: '', code: '' }]);
  };

  const handleRemove = (index: number) => {
    if (subjectsList.length <= 1) return;
    setSubjectsList(subjectsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = subjectsList.filter((s) => s.name.trim().length > 0);

    if (valid.length === 0) {
      setError('Please provide at least one subject name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await batchSetupSubjects(valid);
      setIsSetupModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save subjects to MongoDB Atlas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-subjects-title"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id="setup-subjects-title" className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
              Set Up Your Subjects
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Enter your college subjects to start tracking theory &amp; practical attendance
            </p>
          </div>
          <button
            onClick={() => setIsSetupModalOpen(false)}
            className="min-h-[44px] min-w-[44px] -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-3">
            {subjectsList.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400 w-6 tabular-nums">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  placeholder={`Subject ${idx + 1} Name *`}
                  value={item.name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
                <input
                  type="text"
                  placeholder="Code (optional)"
                  value={item.code}
                  onChange={(e) => handleCodeChange(idx, e.target.value)}
                  className="w-28 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
                {subjectsList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                    aria-label="Remove subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleAddMore}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another subject</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSetupModalOpen(false)}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Subjects'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
