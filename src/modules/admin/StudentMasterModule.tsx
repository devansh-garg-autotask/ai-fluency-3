import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Edit2,
  Trash2,
  Phone,
  Mail,
  User as UserIcon,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { StudentMaster } from '../../types/index.ts';
import * as api from '../../services/api.ts';
import { ExcelUploadModal } from '../../components/ExcelUploadModal.tsx';
import { downloadStudentTemplateExcel } from '../../utils/studentTemplate.ts';

export const StudentMasterModule: React.FC = () => {
  const [students, setStudents] = useState<StudentMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [nameFilter, setNameFilter] = useState('');
  const [rollNumberFilter, setRollNumberFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [generalSearch, setGeneralSearch] = useState('');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentMaster | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentMaster | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRollNumber, setFormRollNumber] = useState('');
  const [formCourse, setFormCourse] = useState('');
  const [formSection, setFormSection] = useState('');

  // Multi-value tag states
  const [phoneList, setPhoneList] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState('');

  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  const [parentName, setParentName] = useState('');
  const [parentPhoneList, setParentPhoneList] = useState<string[]>([]);
  const [parentPhoneInput, setParentPhoneInput] = useState('');

  const [parentEmailList, setParentEmailList] = useState<string[]>([]);
  const [parentEmailInput, setParentEmailInput] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getStudents({
        name: nameFilter || undefined,
        rollNumber: rollNumberFilter || undefined,
        course: courseFilter || undefined,
        search: generalSearch || undefined,
      });
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();

    const handleSync = () => fetchStudents();
    window.addEventListener('database-resynced', handleSync);
    return () => window.removeEventListener('database-resynced', handleSync);
  }, [nameFilter, rollNumberFilter, courseFilter, generalSearch]);

  // Unique courses for filter dropdown
  const uniqueCourses = Array.from(new Set(students.map((s) => s.course).filter(Boolean)));

  const handleClearFilters = () => {
    setNameFilter('');
    setRollNumberFilter('');
    setCourseFilter('');
    setGeneralSearch('');
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormRollNumber('');
    setFormCourse('');
    setFormSection('');
    setPhoneList([]);
    setPhoneInput('');
    setEmailList([]);
    setEmailInput('');
    setParentName('');
    setParentPhoneList([]);
    setParentPhoneInput('');
    setParentEmailList([]);
    setParentEmailInput('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (student: StudentMaster) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormRollNumber(student.rollNumber);
    setFormCourse(student.course);
    setFormSection(student.section || '');
    setPhoneList([...student.phoneNumbers]);
    setPhoneInput('');
    setEmailList([...student.emailIds]);
    setEmailInput('');
    setParentName(student.parentName || '');
    setParentPhoneList([...student.parentPhoneNumbers]);
    setParentPhoneInput('');
    setParentEmailList([...student.parentEmailIds]);
    setParentEmailInput('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Tag list helper
  const addTag = (
    val: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = val.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput('');
    }
  };

  const removeTag = (
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Student Name is mandatory.');
      return;
    }
    if (!formRollNumber.trim()) {
      setFormError('Roll Number is mandatory (identifier column).');
      return;
    }
    if (!formCourse.trim()) {
      setFormError('Course is mandatory.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      name: formName.trim(),
      rollNumber: formRollNumber.trim(),
      course: formCourse.trim(),
      section: formSection.trim() || undefined,
      phoneNumbers: phoneList,
      emailIds: emailList,
      parentName: parentName.trim() || undefined,
      parentPhoneNumbers: parentPhoneList,
      parentEmailIds: parentEmailList,
    };

    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, payload);
      } else {
        await api.createStudent(payload);
      }
      setIsFormModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteStudent(id);
      setDeletingId(null);
      fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete student');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Student Master Database</h2>
              <p className="text-xs text-slate-400">
                Institutional record registry with multi-contact channels, course rosters, and Excel bulk processing
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={downloadStudentTemplateExcel}
            title="Download student_master_schema_template.xlsx (supports comma-separated emails and phone numbers)"
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
            <span>Upload Student Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Student Record</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total Master Records</span>
          <span className="text-2xl font-bold text-slate-100 mt-1 block">{students.length}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Unique Courses</span>
          <span className="text-2xl font-bold text-indigo-300 mt-1 block">{uniqueCourses.length}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Records with Parent Contacts</span>
          <span className="text-2xl font-bold text-sky-400 mt-1 block">
            {students.filter((s) => s.parentName || s.parentPhoneNumbers.length > 0).length}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Persistence State</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">Synced</span>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick Retrieval & Multi-Column Filters</span>
          </span>
          {(nameFilter || rollNumberFilter || courseFilter || generalSearch) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* General Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across all fields..."
              value={generalSearch}
              onChange={(e) => setGeneralSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter by Identifier: Roll Number */}
          <div>
            <input
              type="text"
              placeholder="Filter by Roll Number (Identifier)..."
              value={rollNumberFilter}
              onChange={(e) => setRollNumberFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Filter by Name */}
          <div>
            <input
              type="text"
              placeholder="Filter by Student Name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter by Course */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Courses</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Student Master Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Roll No. (Identifier)</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Course & Section</th>
                <th className="px-4 py-3.5">Contact Channels (Multi)</th>
                <th className="px-4 py-3.5">Parent / Guardian</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {nameFilter || rollNumberFilter || courseFilter || generalSearch
                      ? 'No student records match the active filters.'
                      : 'No student records present. Add a student or upload via Excel.'}
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Identifier Column: Roll Number */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono font-semibold text-xs">
                        {student.rollNumber}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="px-4 py-3.5 font-medium text-slate-100">
                      <span className="font-semibold">{student.name}</span>
                    </td>

                    {/* Course & Section */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-200">{student.course}</div>
                      {student.section && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Section: {student.section}
                        </span>
                      )}
                    </td>

                    {/* Student Contact Channels */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {student.phoneNumbers.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            {student.phoneNumbers.map((ph, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono"
                              >
                                {ph}
                              </span>
                            ))}
                          </div>
                        )}
                        {student.emailIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            {student.emailIds.map((em, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 truncate max-w-[150px]"
                              >
                                {em}
                              </span>
                            ))}
                          </div>
                        )}
                        {student.phoneNumbers.length === 0 && student.emailIds.length === 0 && (
                          <span className="text-slate-500 italic text-[11px]">None provided</span>
                        )}
                      </div>
                    </td>

                    {/* Parent Details */}
                    <td className="px-4 py-3.5">
                      {student.parentName || student.parentPhoneNumbers.length > 0 ? (
                        <div>
                          <div className="font-medium text-slate-200">
                            {student.parentName || 'Guardian'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            {student.parentPhoneNumbers[0] && <span>{student.parentPhoneNumbers[0]}</span>}
                            {student.parentPhoneNumbers.length > 1 && (
                              <span className="text-indigo-400">+{student.parentPhoneNumbers.length - 1} more</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">None</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setDetailStudent(student)}
                          title="View Full Record"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(student)}
                          title="Edit Student"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(student.id)}
                          title="Delete Student"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
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

      {/* Add / Edit Student Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 my-8">
            <h3 className="text-base font-bold text-slate-100 mb-1">
              {editingStudent ? 'Edit Master Student Record' : 'Add New Student to Master Database'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Fields marked with an asterisk (<span className="text-rose-400 font-bold">*</span>) are mandatory. Multiple emails and phone numbers are supported.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Mandatory Fields Section */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-3">
                <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                  Mandatory Academic Data
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">
                      Student Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Rivera"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">
                      Roll Number (Identifier) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS-2026-001"
                      value={formRollNumber}
                      onChange={(e) => setFormRollNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">
                      Course / Degree Program <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. B.Tech Computer Science"
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Section <span className="text-slate-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A, B, or Cohort-1"
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Student Multi-Contact Section */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Student Contact Channels (Multiple Allowed)
                </div>

                {/* Multiple Phone Numbers */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Student Phone Number(s)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter phone and press Add (e.g. +1-555-0101)"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(phoneInput, phoneList, setPhoneList, setPhoneInput);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(phoneInput, phoneList, setPhoneList, setPhoneInput)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                    >
                      Add
                    </button>
                  </div>
                  {phoneList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {phoneList.map((ph, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-mono"
                        >
                          <span>{ph}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(idx, phoneList, setPhoneList)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multiple Emails */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Student Email Address(es)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter email and press Add (e.g. alex@student.edu)"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(emailInput, emailList, setEmailList, setEmailInput);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(emailInput, emailList, setEmailList, setEmailInput)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                    >
                      Add
                    </button>
                  </div>
                  {emailList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {emailList.map((em, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-950/70 border border-sky-800/60 text-sky-300 text-xs"
                        >
                          <span>{em}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(idx, emailList, setEmailList)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Parent / Guardian Section */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Parent / Guardian Details (Optional)
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Carlos Rivera"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Multiple Parent Phones */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parent Phone Number(s)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add parent phone number..."
                      value={parentPhoneInput}
                      onChange={(e) => setParentPhoneInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(parentPhoneInput, parentPhoneList, setParentPhoneList, setParentPhoneInput);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(parentPhoneInput, parentPhoneList, setParentPhoneList, setParentPhoneInput)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                    >
                      Add
                    </button>
                  </div>
                  {parentPhoneList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parentPhoneList.map((ph, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono"
                        >
                          <span>{ph}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(idx, parentPhoneList, setParentPhoneList)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multiple Parent Emails */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parent Email ID(s)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Add parent email..."
                      value={parentEmailInput}
                      onChange={(e) => setParentEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(parentEmailInput, parentEmailList, setParentEmailList, setParentEmailInput);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(parentEmailInput, parentEmailList, setParentEmailList, setParentEmailInput)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                    >
                      Add
                    </button>
                  </div>
                  {parentEmailList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parentEmailList.map((em, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs"
                        >
                          <span>{em}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(idx, parentEmailList, setParentEmailList)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSaving ? 'Saving Record...' : editingStudent ? 'Update Record' : 'Save to Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Student Record Detail Drawer/Modal */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800/60 flex items-center justify-center font-bold">
                  {detailStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{detailStudent.name}</h3>
                  <span className="text-xs text-indigo-400 font-mono">
                    Roll No: {detailStudent.rollNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailStudent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Enrolled Course</span>
                  <span className="text-slate-200 font-semibold">{detailStudent.course}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Section</span>
                  <span className="text-slate-200 font-semibold">{detailStudent.section || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold">Student Phone Numbers</span>
                {detailStudent.phoneNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detailStudent.phoneNumbers.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-xs">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">None provided</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold">Student Email Addresses</span>
                {detailStudent.emailIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detailStudent.emailIds.map((e, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">None provided</span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-slate-300 block text-[11px] font-bold uppercase tracking-wider">
                  Parent / Guardian Information
                </span>
                <div>
                  <span className="text-slate-400 block text-[11px]">Parent Name</span>
                  <span className="text-slate-200 font-semibold">{detailStudent.parentName || 'Not recorded'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 text-[11px]">Parent Phone(s)</span>
                  {detailStudent.parentPhoneNumbers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detailStudent.parentPhoneNumbers.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-xs">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">None</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 text-[11px]">Parent Email(s)</span>
                  {detailStudent.parentEmailIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detailStudent.parentEmailIds.map((e, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs">
                          {e}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">None</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setDetailStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium"
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
            <h3 className="font-bold text-slate-100 text-sm mb-2">Delete Student Record</h3>
            <p className="text-xs text-slate-400 mb-5">
              Are you sure you want to delete this record from the master database? This action is permanent.
            </p>
            <div className="flex justify-end space-x-2.5">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Master Excel Bulk Upload with Line-by-Line Error Debugging */}
      <ExcelUploadModal<StudentMaster>
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Upload Student Master Excel"
        description="Extract student records, parse comma-separated multiple phone numbers & email IDs, validate mandatory fields, and persist to master database"
        schemaDownloadUrl={api.downloadStudentSchemaUrl()}
        schemaDownloadLabel="Download Student Schema"
        onDownloadSchema={downloadStudentTemplateExcel}
        onUpload={api.uploadStudentExcel}
        onSuccess={fetchStudents}
      />
    </div>
  );
};
