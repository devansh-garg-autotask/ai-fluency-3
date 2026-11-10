import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap,
  LogOut,
  ShieldCheck,
  UserCheck,
  Database,
  Building2,
  RefreshCw,
  CheckCircle2,
  Key,
} from 'lucide-react';
import * as api from '../services/api.ts';
import { AdminPasswordModal } from './AdminPasswordModal.tsx';

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Boot');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      const res = await api.resyncDatabase();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(timeStr);
      setSyncStatus('success');
      // Dispatch global event so all active modules instantly update their tables
      window.dispatchEvent(new CustomEvent('database-resynced', { detail: res }));
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Re-sync failed:', err);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">EduCore</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Institutional Master System</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Re-Sync Database Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Fetch and re-sync all details directly from Firestore database"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isSyncing ? 'Syncing...' : 'Re-sync DB'}
            </span>
            {lastSyncTime !== 'Boot' && (
              <span className="hidden md:inline text-[10px] text-slate-400 font-mono border-l border-slate-700 pl-1.5">
                {lastSyncTime}
              </span>
            )}
          </button>

          {/* Database Status Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs">
            <Database className="w-3.5 h-3.5" />
            <span>Firestore Connected</span>
          </div>

          {/* User Profile Pill & Actions */}
          <div className="flex items-center space-x-2.5 bg-slate-800/70 border border-slate-700/60 rounded-xl pl-3 pr-2 py-1.5">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">
                {user?.name || user?.username}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {user?.employeeId ? `ID: ${user.employeeId}` : `@${user?.username}`}
              </span>
            </div>

            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                role === 'admin'
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-700/60'
                  : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/60'
              }`}
            >
              {role === 'admin' ? (
                <>
                  <ShieldCheck className="w-3 h-3 mr-1 inline" />
                  Admin
                </>
              ) : (
                <>
                  <UserCheck className="w-3 h-3 mr-1 inline" />
                  Teacher
                </>
              )}
            </span>

            {/* If Admin, show Change Password key action */}
            {role === 'admin' && (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                title="Alter Admin Password in Database"
                className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 rounded-lg transition-colors cursor-pointer"
              >
                <Key className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={logout}
              title="Log Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Admin Password Modal */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
