import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  GraduationCap,
  BookOpen,
  UserCheck,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  ClipboardList,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
  User as UserIcon,
  Clock,
} from 'lucide-react';
import { StudentMaster } from '../../types/index.ts';
import * as api from '../../services/api.ts';
import { OutlookIntegrationModule } from './OutlookIntegrationModule.tsx';

export const TeacherPortalModule: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'profile' | 'modules' | 'outlook'>('roster');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await api.getStudents();
        setStudents(data);
      } catch (e) {
        console.error('Error loading students in teacher portal:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const courses = Array.from(new Set(students.map((s) => s.course).filter(Boolean)));

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse ? s.course === selectedCourse : true;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Welcome & Faculty Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-950/50">
              {user?.name?.charAt(0).toUpperCase() || 'T'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Welcome, {user?.name}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                  Faculty Account
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Employee ID: <strong className="text-slate-200 font-mono">{user?.employeeId || 'N/A'}</strong></span>
                <span>•</span>
                <span>Username: <strong className="text-slate-200 font-mono">{user?.username}</strong></span>
                {user?.emailId && (
                  <>
                    <span>•</span>
                    <span>{user.emailId}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'roster'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Student Directory
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Faculty Details
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'modules'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming Modules
            </button>
            <button
              onClick={() => setActiveTab('outlook')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'outlook'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Outlook Integration
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Courses ({courses.length})</option>
                {courses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Directory Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Roll Number</th>
                    <th className="px-4 py-3.5">Student Name</th>
                    <th className="px-4 py-3.5">Course / Program</th>
                    <th className="px-4 py-3.5">Section</th>
                    <th className="px-4 py-3.5">Contact Details</th>
                    <th className="px-4 py-3.5">Parent / Guardian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 font-mono text-indigo-300 font-semibold">
                          <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/50">
                            {st.rollNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-100">{st.name}</td>
                        <td className="px-4 py-3 text-slate-300">{st.course}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{st.section || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {st.phoneNumbers[0] && (
                              <div className="flex items-center space-x-1 text-slate-400">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{st.phoneNumbers[0]}</span>
                              </div>
                            )}
                            {st.emailIds[0] && (
                              <div className="flex items-center space-x-1 text-slate-400">
                                <Mail className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[150px]">{st.emailIds[0]}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {st.parentName || (st.parentPhoneNumbers[0] ? st.parentPhoneNumbers[0] : '—')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <UserIcon className="w-4 h-4 text-indigo-400" />
            <span>Teacher Profile Summary</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Full Name</span>
              <span className="text-slate-100 font-semibold text-sm">{user?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Employee ID</span>
              <span className="text-indigo-300 font-mono font-semibold text-sm">
                {user?.employeeId || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Assigned Login ID</span>
              <span className="text-slate-200 font-mono">{user?.username}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Account Role</span>
              <span className="text-emerald-400 uppercase font-mono font-bold">Faculty (Teacher)</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Contact Number</span>
              <span className="text-slate-200 font-mono">{user?.contactNumber || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Email Address</span>
              <span className="text-slate-200">{user?.emailId || 'Not specified'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modular Extension Placeholders (Ready for User's Upcoming Requirements) */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/50 flex items-start space-x-3 text-xs text-indigo-300">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-200">
                Modular Architecture Ready For Next Requirements
              </p>
              <p className="text-indigo-300/80 mt-0.5">
                The application structure is fully isolated and ready to receive your specific teacher features (such as attendance registers, marks entry, syllabus mapping, or batch announcements).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 space-y-3 opacity-80">
              <div className="p-2.5 rounded-xl bg-slate-800 w-fit text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-100">Attendance Registry</h4>
              <p className="text-xs text-slate-400">
                Course and section daily attendance logging with leave tracking.
              </p>
              <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Module Slot Ready
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 space-y-3 opacity-80">
              <div className="p-2.5 rounded-xl bg-slate-800 w-fit text-purple-400">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-100">Gradebook & Assessments</h4>
              <p className="text-xs text-slate-400">
                Midterm, final examinations, internal marks entry, and GPA computation.
              </p>
              <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Module Slot Ready
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 space-y-3 opacity-80">
              <div className="p-2.5 rounded-xl bg-slate-800 w-fit text-sky-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-100">Curriculum & Study Material</h4>
              <p className="text-xs text-slate-400">
                Module-wise lesson plans, resource uploads, and syllabus tracking.
              </p>
              <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Module Slot Ready
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Outlook Integration Module */}
      {activeTab === 'outlook' && <OutlookIntegrationModule />}
    </div>
  );
};
