import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ExcelUploadSummary, ExcelRowError } from '../types/index.ts';

interface ExcelUploadModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  schemaDownloadUrl: string;
  schemaDownloadLabel: string;
  onDownloadSchema?: () => void;
  onUpload: (base64: string) => Promise<ExcelUploadSummary<T>>;
  onSuccess: () => void;
}

export function ExcelUploadModal<T>({
  isOpen,
  onClose,
  title,
  description,
  schemaDownloadUrl,
  schemaDownloadLabel,
  onDownloadSchema,
  onUpload,
  onSuccess,
}: ExcelUploadModalProps<T>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<ExcelUploadSummary<T> | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSummary(null);
      setGeneralError(null);
    }
  };

  const handleProcessUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setGeneralError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const result = await onUpload(base64);
          setSummary(result);
          if (result.successfulRows > 0) {
            onSuccess();
          }
        } catch (err: any) {
          setGeneralError(err.message || 'Error processing uploaded file');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setGeneralError('Failed to read file from disk');
        setIsProcessing(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setGeneralError(err.message || 'File upload failure');
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSummary(null);
    setGeneralError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Download Schema notice banner */}
          <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-indigo-200">
                  Standard Excel Schema Available
                </p>
                <p className="text-xs text-indigo-300/80">
                  Download the sample template to ensure proper column names and structure.
                </p>
              </div>
            </div>
            {onDownloadSchema ? (
              <button
                type="button"
                onClick={onDownloadSchema}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{schemaDownloadLabel}</span>
              </button>
            ) : (
              <a
                href={schemaDownloadUrl}
                download="schema_template.xlsx"
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{schemaDownloadLabel}</span>
              </a>
            )}
          </div>

          {generalError && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* File Picker or Dropzone */}
          {!summary && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-indigo-500 bg-indigo-950/20'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-indigo-300">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Click to browse or drag and drop your Excel sheet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, and .csv files</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || isProcessing}
                  onClick={handleProcessUpload}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Parsing & Validating...</span>
                    </>
                  ) : (
                    <span>Process & Save to Master DB</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Upload Results & Inconsistency / Failure Debugging Table */}
          {summary && (
            <div className="space-y-5">
              {/* Metric stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <span className="text-xs text-slate-400 block">Total Rows Evaluated</span>
                  <span className="text-xl font-bold text-slate-100">{summary.totalRows}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-center">
                  <span className="text-xs text-emerald-400 block">Successfully Saved</span>
                  <span className="text-xl font-bold text-emerald-300">{summary.successfulRows}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-center">
                  <span className="text-xs text-rose-400 block">Failed Inconsistencies</span>
                  <span className="text-xl font-bold text-rose-300">{summary.failedRows}</span>
                </div>
              </div>

              {/* Status message */}
              {summary.failedRows === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold">All records validated and committed!</p>
                    <p className="text-emerald-400/80 mt-0.5">
                      Successfully persisted {summary.successfulRows} records directly to the database.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        Validation & Inconsistency Report ({summary.failedRows} failed row{summary.failedRows > 1 ? 's' : ''})
                      </p>
                      <p className="text-amber-400/80 mt-0.5">
                        The rows listed below failed validation and were excluded from database entry. Review the reasons and correct your file.
                      </p>
                    </div>
                  </div>

                  {/* Failure Debugging Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-16">Row #</th>
                          <th className="px-3 py-2">Data Excerpt</th>
                          <th className="px-3 py-2">Validation Failure Reason(s)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {summary.failedRecords.map((item: ExcelRowError, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="px-3 py-2.5 font-mono text-rose-400 font-semibold align-top whitespace-nowrap">
                              {item.rowNumber > 0 ? `Row ${item.rowNumber}` : 'Database'}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="space-y-1 text-[11px] max-w-xs">
                                {Object.entries(item.data).slice(0, 4).map(([k, v]) => (
                                  v !== undefined && v !== '' ? (
                                    <div key={k} className="flex items-baseline gap-1.5 truncate">
                                      <span className="text-slate-400 font-medium">{k}:</span>
                                      <span className="text-slate-200 font-mono font-semibold truncate">{String(v)}</span>
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <ul className="space-y-1.5">
                                {item.errors.map((err, errIdx) => (
                                  <li key={errIdx} className="text-rose-300 text-xs flex items-start space-x-1.5 bg-rose-950/30 border border-rose-900/50 p-1.5 rounded-lg">
                                    <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                                    <span className="leading-snug">{err}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Upload Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
