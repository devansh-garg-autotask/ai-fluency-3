import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import * as api from '../../services/api.ts';

type ClearTarget = 'students' | 'teachers' | null;

export const DatabaseOperationsModule: React.FC = () => {
  const [activeModalTarget, setActiveModalTarget] = useState<ClearTarget>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live counts for reference
  const [counts, setCounts] = useState<{ students: number; teachers: number }>({ students: 0, teachers: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);

  const refreshCounts = async () => {
    setLoadingCounts(true);
    try {
      const [studentsData, teachersData] = await Promise.all([
        api.getStudents(),
        api.getTeachers(),
      ]);
      setCounts({
        students: studentsData.length,
        teachers: teachersData.length,
      });
    } catch (err) {
      console.error('Failed to fetch counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    refreshCounts();

    const handleSync = () => refreshCounts();
    window.addEventListener('database-resynced', handleSync);
    return () => window.removeEventListener('database-resynced', handleSync);
  }, []);

  const handleConfirmClear = async () => {
    if (!activeModalTarget) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      if (activeModalTarget === 'students') {
        const result = await api.clearAllStudents();
        setFeedback({
          type: 'success',
          message: result.message || 'All student records have been successfully cleared from the database.',
        });
      } else if (activeModalTarget === 'teachers') {
        const result = await api.clearAllTeachers();
        setFeedback({
          type: 'success',
          message: result.message || 'All teacher records have been successfully cleared from the database.',
        });
      }

      // Notify other modules to immediately refresh and update their UI
      window.dispatchEvent(new CustomEvent('database-resynced'));
      await refreshCounts();
      setActiveModalTarget(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to clear records from database.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Database Record Operations</h2>
            <p className="text-xs text-slate-400">
              Administrative management to purge and reset persistent collections in Firestore
            </p>
          </div>
        </div>

        <button
          onClick={refreshCounts}
          disabled={loadingCounts}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-colors shadow-sm cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loadingCounts ? 'animate-spin' : ''}`} />
          <span>Refresh Records Count</span>
        </button>
      </div>

      {/* Operation Feedback Message */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800/70 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">
              {feedback.type === 'success' ? 'Database Operation Completed' : 'Operation Failed'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container with Exactly 2 Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Button 1: Clear All Student Records */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 inline-flex">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                Current Records: <strong className="text-slate-200">{counts.students}</strong>
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Student Master Records</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Purge all registered students, roll number identifiers, multi-contact data, and parent guardian details from the persistent Firestore database.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModalTarget('students')}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Student Records in Database</span>
          </button>
        </div>

        {/* Button 2: Clear All Teacher Records */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400 inline-flex">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
                Current Records: <strong className="text-slate-200">{counts.teachers}</strong>
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">Teacher Profiles & Credentials</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Purge all teacher profiles, Employee IDs, and generated faculty access credentials from the persistent database. Institutional administrator accounts remain safe.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModalTarget('teachers')}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Teacher Records in Database</span>
          </button>
        </div>
      </div>

      {/* Confirmation Warning Modal */}
      {activeModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Warning Header */}
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-800/80 text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Warning: Irreversible Database Clear
                </h3>
                <p className="text-xs text-rose-400 font-semibold mt-0.5">
                  Action cannot be undone
                </p>
              </div>
            </div>

            {/* Warning Details Body */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2.5">
              {activeModalTarget === 'students' ? (
                <>
                  <p>
                    Are you sure you want to permanently clear <strong>ALL student records</strong> from the database?
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    This will permanently delete all {counts.students} student master entries, roll number identifiers, multiple phone numbers, emails, and parent contacts stored in Firestore.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Are you sure you want to permanently clear <strong>ALL teacher records</strong> from the database?
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    This will permanently delete all {counts.teachers} teacher profiles, Employee IDs, and generated faculty login credentials. (Administrator accounts will remain untouched).
                  </p>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end items-center space-x-3 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setActiveModalTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmClear}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Clearing Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {activeModalTarget === 'students'
                        ? 'Yes, Clear All Students'
                        : 'Yes, Clear All Teachers'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
