import * as XLSX from 'xlsx';

export interface TeacherTemplateRow {
  'Teacher Name': string;
  'Employee ID': string;
  'Email ID': string;
  'Contact Number': string;
  'Department': string;
}

export function generateTeacherTemplateWorkbook(): XLSX.WorkBook {
  const sampleData: TeacherTemplateRow[] = [
    {
      'Teacher Name': 'Dr. Robert Miller',
      'Employee ID': 'EMP-1001',
      'Email ID': 'robert.miller@institution.edu',
      'Contact Number': '+1-555-0192',
      'Department': 'Computer Science',
    },
    {
      'Teacher Name': 'Prof. Sarah Jenkins',
      'Employee ID': 'EMP-1002',
      'Email ID': 'sarah.j@institution.edu',
      'Contact Number': '+1-555-0193',
      'Department': 'Mathematics',
    },
    {
      'Teacher Name': 'Dr. Marcus Vance',
      'Employee ID': 'EMP-1003',
      'Email ID': 'marcus.v@institution.edu',
      'Contact Number': '+1-555-0194',
      'Department': 'Physics',
    },
    {
      'Teacher Name': 'Prof. Elena Rostova',
      'Employee ID': 'EMP-1004',
      'Email ID': 'elena.rostova@institution.edu',
      'Contact Number': '+1-555-0195',
      'Department': 'Chemistry',
    },
  ];

  const guideData = [
    {
      'Column Header': 'Teacher Name',
      'Status': 'MANDATORY',
      'Description & Format': 'Full legal faculty name (e.g. Dr. Robert Miller)',
    },
    {
      'Column Header': 'Employee ID',
      'Status': 'MANDATORY (Unique Identifier)',
      'Description & Format': 'Unique faculty ID code (e.g. EMP-1001). Cannot be duplicate across teachers.',
    },
    {
      'Column Header': 'Email ID',
      'Status': 'OPTIONAL',
      'Description & Format': 'Primary faculty communication email (e.g. robert.miller@institution.edu)',
    },
    {
      'Column Header': 'Contact Number',
      'Status': 'OPTIONAL',
      'Description & Format': 'Primary faculty phone number (e.g. +1-555-0192)',
    },
    {
      'Column Header': 'Department',
      'Status': 'OPTIONAL',
      'Description & Format': 'Academic department or subject area (e.g. Computer Science)',
    },
  ];

  const teacherSheet = XLSX.utils.json_to_sheet(sampleData);
  teacherSheet['!cols'] = [
    { wch: 26 }, // Teacher Name
    { wch: 18 }, // Employee ID
    { wch: 34 }, // Email ID
    { wch: 20 }, // Contact Number
    { wch: 24 }, // Department
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guideData);
  guideSheet['!cols'] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 75 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, teacherSheet, 'Teacher_Schema');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Field_Instructions');

  return workbook;
}

/**
 * Direct client-side download utility: writes teacher_schema_template.xlsx
 * directly without relying on iframe anchor navigations.
 */
export function downloadTeacherTemplateExcel(): void {
  const workbook = generateTeacherTemplateWorkbook();
  XLSX.writeFile(workbook, 'teacher_schema_template.xlsx');
}
