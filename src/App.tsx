import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginPage } from './modules/auth/LoginPage.tsx';
import { Header } from './components/Header.tsx';
import { TeacherManagementModule } from './modules/admin/TeacherManagementModule.tsx';
import { StudentMasterModule } from './modules/admin/StudentMasterModule.tsx';
import { DatabaseOperationsModule } from './modules/admin/DatabaseOperationsModule.tsx';
import { TeacherPortalModule } from './modules/teacher/TeacherPortalModule.tsx';
import { testConnection } from './services/firebase.ts';
import {
  Users,
  GraduationCap,
  Database,
} from 'lucide-react';

type AdminModule = 'students' | 'teachers' | 'database';

const MainApp: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  const [activeAdminModule, setActiveAdminModule] = useState<AdminModule>('students');

  // Test Firebase connection on initial boot
  useEffect(() => {
    testConnection();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Initializing EduCore Secure System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Teacher View
  if (role === 'teacher') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          <TeacherPortalModule />
        </main>
      </div>
    );
  }

  // Admin View - 3 tabs: Student Master Database, Teacher Profiles & Credentials, and Database Records
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Modular Navigation Bar: 3 tabs */}
        <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-2xl flex max-w-xl shadow-lg">
          <button
            onClick={() => setActiveAdminModule('students')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeAdminModule === 'students'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Master Database</span>
          </button>

          <button
            onClick={() => setActiveAdminModule('teachers')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeAdminModule === 'teachers'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teacher Profiles & Credentials</span>
          </button>

          <button
            onClick={() => setActiveAdminModule('database')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeAdminModule === 'database'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Records</span>
          </button>
        </div>

        {/* Dynamic Modular Content */}
        <div className="transition-opacity duration-200">
          {activeAdminModule === 'students' && <StudentMasterModule />}
          {activeAdminModule === 'teachers' && <TeacherManagementModule />}
          {activeAdminModule === 'database' && <DatabaseOperationsModule />}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
