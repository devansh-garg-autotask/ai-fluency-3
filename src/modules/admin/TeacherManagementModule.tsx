import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Edit2,
  Trash2,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Briefcase,
  Mail,
  Phone,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { User } from '../../types/index.ts';
import * as api from '../../services/api.ts';
import { ExcelUploadModal } from '../../components/ExcelUploadModal.tsx';
import { downloadTeacherTemplateExcel } from '../../utils/teacherTemplate.ts';

// Client-side random password generator
const generateRandomPassword = (length = 9) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const chars = upper + lower + numbers;
  let result = '';
  result += upper[Math.floor(Math.random() * upper.length)];
  result += lower[Math.floor(Math.random() * lower.length)];
  result += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 3; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export const TeacherManagementModule: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Add / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    password: '',
    contactNumber: '',
    emailId: '',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Credentials View Dialog
  const [credentialsModalUser, setCredentialsModalUser] = useState<User | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTeachers();
      setTeachers(data);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();

    // Listen for database re-sync events from Header or Auth
    const handleSync = () => fetchTeachers();
    window.addEventListener('database-resynced', handleSync);
    return () => window.removeEventListener('database-resynced', handleSync);
  }, []);

  const openAddModal = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      employeeId: '',
      password: '',
      contactNumber: '',
      emailId: '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (teacher: User) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name || '',
      employeeId: teacher.employeeId || '',
      password: teacher.password || '',
      contactNumber: teacher.contactNumber || '',
      emailId: teacher.emailId || '',
    });
    setShowEditPassword(false);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.employeeId.trim()) {
      setFormError('Name and Employee ID are required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingTeacher) {
        // Admin alters password or details; username is immutable
        await api.updateTeacher(editingTeacher.id, {
          name: formData.name.trim(),
          employeeId: formData.employeeId.trim(),
          password: formData.password.trim(),
          contactNumber: formData.contactNumber.trim() || undefined,
          emailId: formData.emailId.trim() || undefined,
        });
      } else {
        // System automatically generates unique username and password
        await api.createTeacher({
          name: formData.name.trim(),
          employeeId: formData.employeeId.trim(),
          contactNumber: formData.contactNumber.trim() || undefined,
          emailId: formData.emailId.trim() || undefined,
        });
      }
      setIsFormModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTeacher(id);
      setDeletingId(null);
      fetchTeachers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete teacher');
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRegeneratePassword = () => {
    const newPwd = generateRandomPassword(9);
    setFormData((prev) => ({ ...prev, password: newPwd }));
    setShowEditPassword(true);
  };

  const previewUsername = () => {
    const cleanName = (formData.name || 'teacher')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    const cleanEmp = (formData.employeeId || 'empid')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    return `${cleanName}_${cleanEmp}`;
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.employeeId && t.employeeId.toLowerCase().includes(q)) ||
      t.username.toLowerCase().includes(q) ||
      (t.emailId && t.emailId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Teacher Profile Management</h2>
              <p className="text-xs text-slate-400">
                System-assigned unique usernames, randomized credentials, and password administration
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={downloadTeacherTemplateExcel}
            title="Download teacher_schema_template.xlsx for Teacher Profile"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download Schema Excel</span>
          </button>

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-200 text-xs font-medium border border-indigo-800/70 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload Teacher Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Teacher Profile</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total Faculty Profiles</span>
          <span className="text-2xl font-bold text-slate-100 mt-1 block">{teachers.length}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">System-Assigned Usernames</span>
          <span className="text-2xl font-bold text-indigo-300 mt-1 block">100% Unique</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Persistence Backend</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">Firestore Synced</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, employee ID, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={fetchTeachers}
          title="Refresh List"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Teachers Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Teacher Name</th>
                <th className="px-4 py-3.5">Employee ID</th>
                <th className="px-4 py-3.5">Assigned Login ID</th>
                <th className="px-4 py-3.5">Contact Details</th>
                <th className="px-4 py-3.5">Password Control</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {searchQuery ? 'No teachers found matching your search.' : 'No teacher profiles created yet. Add one or upload via Excel.'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-100">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-800/60 text-indigo-300 flex items-center justify-center font-semibold text-xs">
                          {teacher.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-semibold text-slate-100">{teacher.name}</span>
                          <span className="text-[10px] text-slate-400">Role: Faculty</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-indigo-300">
                      {teacher.employeeId || '—'}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-xs">
                        {teacher.username}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {teacher.emailId && (
                          <div className="flex items-center space-x-1.5 text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[180px]">{teacher.emailId}</span>
                          </div>
                        )}
                        {teacher.contactNumber && (
                          <div className="flex items-center space-x-1.5 text-slate-400">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{teacher.contactNumber}</span>
                          </div>
                        )}
                        {!teacher.emailId && !teacher.contactNumber && (
                          <span className="text-slate-500 italic">No contact provided</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setCredentialsModalUser(teacher);
                            setShowPassword(false);
                          }}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          <Key className="w-3 h-3" />
                          <span>View Password</span>
                        </button>
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          <span>Alter</span>
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(teacher)}
                          title="Edit Profile & Password"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(teacher.id)}
                          title="Delete Profile"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Profile Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-100 mb-1">
              {editingTeacher ? 'Alter Teacher Profile & Password' : 'Create New Teacher Profile'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {editingTeacher
                ? 'Username is immutable. Admin has option to view or alter password.'
                : 'Login ID and password will automatically be assigned by the system.'}
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Miller"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-1042"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Automatic System Assignment Section */}
              {!editingTeacher ? (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-indigo-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>System Automated Credentials</span>
                  </div>
                  <div className="space-y-1 text-slate-400 text-[11px]">
                    <div className="flex justify-between items-center py-0.5">
                      <span>Unique Login ID:</span>
                      <span className="font-mono text-indigo-300 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {previewUsername()} (Auto-Guaranteed)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span>Password:</span>
                      <span className="font-mono text-emerald-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Auto-Generated Randomly
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode: Admin Alters/Views Password, Username is Immutable */
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Assigned Login ID (Immutable)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editingTeacher.username}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800/60 rounded-xl text-xs text-slate-400 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-200">
                        Password (Alter / View)
                      </label>
                      <button
                        type="button"
                        onClick={handleRegeneratePassword}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Generate Random</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        required
                        placeholder="Alter account password..."
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                      >
                        {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. teacher@institution.edu"
                  value={formData.emailId}
                  onChange={(e) => setFormData({ ...formData, emailId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Number <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +1-555-0199"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : editingTeacher ? 'Save Alterations' : 'Assign & Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Credentials Modal */}
      {credentialsModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-100 text-sm">Faculty Access Credentials</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Credentials for <strong className="text-slate-200">{credentialsModalUser.name}</strong> ({credentialsModalUser.employeeId})
            </p>

            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Assigned Username</label>
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 font-mono text-xs text-slate-200">
                  <span>{credentialsModalUser.username}</span>
                  <button
                    onClick={() => handleCopy(credentialsModalUser.username, 'username')}
                    className="text-slate-400 hover:text-indigo-400 cursor-pointer"
                    title="Copy username"
                  >
                    {copiedKey === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Current Password</label>
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 font-mono text-xs text-slate-200">
                  <span>
                    {showPassword ? (credentialsModalUser.password || '••••••••') : '••••••••••••'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {credentialsModalUser.password && (
                      <button
                        onClick={() => handleCopy(credentialsModalUser.password!, 'password')}
                        className="text-slate-400 hover:text-indigo-400 cursor-pointer"
                        title="Copy password"
                      >
                        {copiedKey === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-5">
              <button
                onClick={() => {
                  const target = credentialsModalUser;
                  setCredentialsModalUser(null);
                  openEditModal(target);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Alter Password
              </button>
              <button
                onClick={() => setCredentialsModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-slate-100 text-sm mb-2">Confirm Profile Removal</h3>
            <p className="text-xs text-slate-400 mb-5">
              Are you sure you want to remove this teacher profile? Their login access will be revoked immediately from the persistent database.
            </p>
            <div className="flex justify-end space-x-2.5">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Excel Upload Modal with Error Debugging */}
      <ExcelUploadModal<User>
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Upload Teacher Excel Data"
        description="Extract teacher details, automatically generate unique user ID and random passwords, and persist to Firebase"
        schemaDownloadUrl={api.downloadTeacherSchemaUrl()}
        schemaDownloadLabel="Download Teacher Schema"
        onDownloadSchema={downloadTeacherTemplateExcel}
        onUpload={api.uploadTeacherExcel}
        onSuccess={fetchTeachers}
      />
    </div>
  );
};
