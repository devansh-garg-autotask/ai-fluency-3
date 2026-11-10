import * as XLSX from 'xlsx';

export interface StudentTemplateRow {
  'Name': string;
  'Roll Number': string;
  'Course': string;
  'Section': string;
  'Phone Number': string;
  'Email ID': string;
  'Parent Name': string;
  'Parent Phone Number': string;
  'Parent Email ID': string;
}

export function generateStudentTemplateWorkbook(): XLSX.WorkBook {
  const sampleData: StudentTemplateRow[] = [
    {
      'Name': 'Alex Rivera',
      'Roll Number': 'CS-2026-001',
      'Course': 'B.Tech Computer Science',
      'Section': 'A',
      'Phone Number': '+1-555-8821, +1-555-8822',
      'Email ID': 'alex.rivera@student.edu, alex.personal@gmail.com',
      'Parent Name': 'Carlos Rivera',
      'Parent Phone Number': '+1-555-9901, +1-555-9902',
      'Parent Email ID': 'carlos.rivera@family.org, c.rivera@work.com',
    },
    {
      'Name': 'Emily Watson',
      'Roll Number': 'CS-2026-002',
      'Course': 'B.Tech Computer Science',
      'Section': 'B',
      'Phone Number': '+1-555-8833, +1-555-8834, +1-555-8835',
      'Email ID': 'emily.watson@student.edu, emily.w@outlook.com',
      'Parent Name': 'Diana Watson',
      'Parent Phone Number': '+1-555-9922, +1-555-9923',
      'Parent Email ID': 'diana.watson@gmail.com, dwatson@corp.net',
    },
    {
      'Name': 'Marcus Chen',
      'Roll Number': 'CS-2026-003',
      'Course': 'B.Tech Information Technology',
      'Section': 'A',
      'Phone Number': '+1-555-7711',
      'Email ID': 'marcus.chen@student.edu',
      'Parent Name': 'David Chen',
      'Parent Phone Number': '+1-555-6611, +1-555-6612',
      'Parent Email ID': 'david.chen@family.org',
    },
    {
      'Name': 'Sophia Martinez',
      'Roll Number': 'CS-2026-004',
      'Course': 'B.Tech Artificial Intelligence',
      'Section': 'Cohort-1',
      'Phone Number': '+1-555-4401, +1-555-4402',
      'Email ID': 'sophia.m@student.edu, sophia.martinez@gmail.com',
      'Parent Name': 'Maria Martinez',
      'Parent Phone Number': '+1-555-3301',
      'Parent Email ID': 'maria.martinez@gmail.com',
    },
  ];

  const guideData = [
    {
      'Column Header': 'Name',
      'Status': 'MANDATORY',
      'Description & Format': 'Full legal student name (e.g. Alex Rivera)',
    },
    {
      'Column Header': 'Roll Number',
      'Status': 'MANDATORY (Identifier)',
      'Description & Format': 'Unique student roll number/identifier (e.g. CS-2026-001)',
    },
    {
      'Column Header': 'Course',
      'Status': 'MANDATORY',
      'Description & Format': 'Academic degree or program (e.g. B.Tech Computer Science)',
    },
    {
      'Column Header': 'Section',
      'Status': 'OPTIONAL',
      'Description & Format': 'Assigned section or class cohort (e.g. A, B, Cohort-1)',
    },
    {
      'Column Header': 'Phone Number',
      'Status': 'OPTIONAL (Multi-Value)',
      'Description & Format': 'Primary and secondary phone numbers, SEPARATED BY COMMA (e.g. +1-555-8821, +1-555-8822)',
    },
    {
      'Column Header': 'Email ID',
      'Status': 'OPTIONAL (Multi-Value)',
      'Description & Format': 'Academic and personal email addresses, SEPARATED BY COMMA (e.g. alex@student.edu, alex@gmail.com)',
    },
    {
      'Column Header': 'Parent Name',
      'Status': 'OPTIONAL',
      'Description & Format': 'Full name of parent or guardian (e.g. Carlos Rivera)',
    },
    {
      'Column Header': 'Parent Phone Number',
      'Status': 'OPTIONAL (Multi-Value)',
      'Description & Format': 'Parent mobile/work phone numbers, SEPARATED BY COMMA (e.g. +1-555-9901, +1-555-9902)',
    },
    {
      'Column Header': 'Parent Email ID',
      'Status': 'OPTIONAL (Multi-Value)',
      'Description & Format': 'Parent email addresses, SEPARATED BY COMMA (e.g. carlos@family.org, c.rivera@work.com)',
    },
  ];

  const studentSheet = XLSX.utils.json_to_sheet(sampleData);
  studentSheet['!cols'] = [
    { wch: 22 }, // Name
    { wch: 18 }, // Roll Number
    { wch: 30 }, // Course
    { wch: 14 }, // Section
    { wch: 36 }, // Phone Number
    { wch: 48 }, // Email ID
    { wch: 22 }, // Parent Name
    { wch: 36 }, // Parent Phone Number
    { wch: 48 }, // Parent Email ID
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guideData);
  guideSheet['!cols'] = [
    { wch: 24 },
    { wch: 24 },
    { wch: 70 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student_Master_Schema');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Field_Instructions');

  return workbook;
}

/**
 * Direct client-side download utility: writes student_master_schema_template.xlsx
 * directly without relying on iframe anchor navigations.
 */
export function downloadStudentTemplateExcel(): void {
  const workbook = generateStudentTemplateWorkbook();
  XLSX.writeFile(workbook, 'student_master_schema_template.xlsx');
}
