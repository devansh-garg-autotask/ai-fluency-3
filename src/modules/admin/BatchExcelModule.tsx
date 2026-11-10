import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  Table,
} from 'lucide-react';
import * as api from '../../services/api.ts';
import { ExcelUploadModal } from '../../components/ExcelUploadModal.tsx';
import { User, StudentMaster } from '../../types/index.ts';

export const BatchExcelModule: React.FC<{
  onRefreshData?: () => void;
}> = ({ onRefreshData }) => {
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Excel Batch Processing & Schemas</h2>
            <p className="text-xs text-slate-400">
              Download standard Excel schemas, prepare bulk institutional records, and execute validated data ingestion
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Two Modules: Teacher Schema & Student Schema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teacher Upload & Schema Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60">
                Staff & Faculty Module
              </span>
              <span className="text-xs text-slate-400 font-mono">Format: .xlsx, .xls</span>
            </div>

            <h3 className="text-base font-bold text-slate-100">Teacher Record Schema</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload faculty lists to automatically provision teacher accounts, generate standardized user IDs (from Name and Employee ID), and generate randomized access passwords.
            </p>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block text-[11px] uppercase tracking-wider">
                Expected Excel Columns:
              </span>
              <ul className="space-y-1 text-slate-400">
                <li className="flex items-center space-x-1.5">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Teacher Name</strong> (Mandatory)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Employee ID</strong> (Mandatory, Unique)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-bold">•</span>
                  <span><strong>Role</strong> (Defaults to 'teacher')</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-bold">•</span>
                  <span><strong>Contact Number</strong> (Optional)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-bold">•</span>
                  <span><strong>Email ID</strong> (Optional)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <a
              href={api.downloadTeacherSchemaUrl()}
              download
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download Schema</span>
            </a>
            <button
              onClick={() => setTeacherModalOpen(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Faculty File</span>
            </button>
          </div>
        </div>

        {/* Student Master Upload & Schema Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Master Database Module
              </span>
              <span className="text-xs text-slate-400 font-mono">Format: .xlsx, .xls</span>
            </div>

            <h3 className="text-base font-bold text-slate-100">Student Master Schema</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload the central student database. Supports multiple phone numbers and email addresses per student and parent, comma-separated within the cells.
            </p>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block text-[11px] uppercase tracking-wider">
                Expected Excel Columns:
              </span>
              <ul className="space-y-1 text-slate-400">
                <li className="flex items-center space-x-1.5">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Student Name</strong> (Mandatory)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Roll Number</strong> (Mandatory, Unique Identifier)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Course</strong> (Mandatory)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-bold">•</span>
                  <span><strong>Section</strong> (Optional)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-bold">•</span>
                  <span><strong>Phone Number & Email ID</strong> (Multiple allowed)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-bold">•</span>
                  <span><strong>Parent Name, Phone & Email</strong> (Multiple allowed)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <a
              href={api.downloadStudentSchemaUrl()}
              download
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download Schema</span>
            </a>
            <button
              onClick={() => setStudentModalOpen(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Student File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modals */}
      <ExcelUploadModal<User>
        isOpen={teacherModalOpen}
        onClose={() => setTeacherModalOpen(false)}
        title="Upload Teacher Excel Data"
        description="Extract teacher details, automatically generate user ID and random passwords, and persist to Firebase"
        schemaDownloadUrl={api.downloadTeacherSchemaUrl()}
        schemaDownloadLabel="Download Teacher Schema"
        onUpload={api.uploadTeacherExcel}
        onSuccess={() => onRefreshData && onRefreshData()}
      />

      <ExcelUploadModal<StudentMaster>
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title="Upload Student Master Excel"
        description="Extract student records, validate mandatory fields, and display row-by-row debugging reports"
        schemaDownloadUrl={api.downloadStudentSchemaUrl()}
        schemaDownloadLabel="Download Student Schema"
        onUpload={api.uploadStudentExcel}
        onSuccess={() => onRefreshData && onRefreshData()}
      />
    </div>
  );
};
