import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  Server,
  Layers,
  CheckCircle2,
  HardDrive,
  Users,
  GraduationCap,
  Download,
  Key,
  Lock,
} from 'lucide-react';
import * as api from '../../services/api.ts';
import { AdminPasswordModal } from '../../components/AdminPasswordModal.tsx';

export const SystemOverviewModule: React.FC = () => {
  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const teachers = await api.getTeachers();
        const students = await api.getStudents();
        setTeacherCount(teachers.length);
        setStudentCount(students.length);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCounts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-800/60 text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">System Architecture & Persistence</h2>
            <p className="text-xs text-slate-400">
              Persistent Firebase Firestore backend status, modular component isolation, and root security credentials
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Database Backend</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-slate-100">Firebase Firestore</div>
          <p className="text-xs text-slate-400">
            Database ID: <span className="font-mono text-indigo-400">ai-studio-a95e8fa9-...</span>
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Backend API Service</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-lg font-bold text-slate-100">Node.js Express API</div>
          <p className="text-xs text-slate-400">
            Integrated on port 3000, production ready for Render / Vercel.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Record Stats</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-slate-100">
            {teacherCount} Teachers / {studentCount} Students
          </div>
          <p className="text-xs text-slate-400">
            Full ACID persistence with Excel verification engine.
          </p>
        </div>
      </div>

      {/* Admin Security Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Root Administrator Security</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Alter your administrator login password anytime. The updated password will be persisted directly to the Firestore database.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all cursor-pointer shrink-0"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Alter Admin Password</span>
        </button>
      </div>

      {/* Deployment & Git repository guidance for the user */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
          <Server className="w-4 h-4 text-indigo-400" />
          <span>Render & Cloud Deployment Instructions</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The project is engineered in a clean modular architecture separated into frontend (<span className="text-indigo-300 font-mono">/src</span>) and backend services (<span className="text-indigo-300 font-mono">/server</span>).
        </p>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
          <div className="text-slate-500 font-sans font-semibold">Render Build & Start Settings:</div>
          <div><span className="text-indigo-400">Build Command:</span> npm install && npm run build</div>
          <div><span className="text-indigo-400">Start Command:</span> npm run start</div>
          <div><span className="text-indigo-400">Environment:</span> Node 20+, PORT=3000</div>
        </div>
      </div>

      {/* Password Modal */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
