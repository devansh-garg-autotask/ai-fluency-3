import * as XLSX from 'xlsx';
import type { ExcelRowError, ExcelUploadSummary, StudentMaster, TeacherProfile, User } from '../../src/types/index.ts';

// Helper to generate a unique username from name, employeeId, and existing usernames
export function generateUniqueTeacherUsername(
  name: string,
  employeeId: string,
  existingUsernames: Set<string>
): string {
  const cleanName = (name || 'teacher')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10) || 'teacher';
  const cleanEmpId = (employeeId || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') || '01';

  const base = `${cleanName}_${cleanEmpId}`;
  let candidate = base;
  let counter = 1;

  while (existingUsernames.has(candidate.toLowerCase())) {
    candidate = `${base}_${counter}`;
    counter++;
  }

  // Reserve it immediately
  existingUsernames.add(candidate.toLowerCase());
  return candidate;
}

// Legacy alias for single string generator
export function generateTeacherUsername(name: string, employeeId: string): string {
  const cleanName = (name || 'teacher')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10) || 'teacher';
  const cleanEmpId = (employeeId || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') || '01';
  return `${cleanName}_${cleanEmpId}`;
}

// Helper to generate a secure random password
export function generateRandomPassword(length = 8): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const chars = upper + lower + numbers;
  let result = '';
  // Ensure at least one upper, one lower, one number
  result += upper[Math.floor(Math.random() * upper.length)];
  result += lower[Math.floor(Math.random() * lower.length)];
  result += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 3; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Split multiple values from comma, semicolon, slash, or newline
export function parseMultiString(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  return String(val)
    .split(/[,;\n/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// --- Teacher Excel Parser & Validator ---
export function processTeacherExcel(
  buffer: Buffer,
  existingUsernames: Set<string> = new Set<string>(),
  existingEmployeeIds: Map<string, string> = new Map<string, string>()
): ExcelUploadSummary<TeacherProfile> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const summary: ExcelUploadSummary<TeacherProfile> = {
    totalRows: rawRows.length,
    successfulRows: 0,
    failedRows: 0,
    createdRecords: [],
    failedRecords: [],
  };

  // Map normalized employeeId to rowNumber where it first appeared in this Excel file
  const seenEmpIdsInFile = new Map<string, number>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Accounting for 1-based index and header row
    const errors: string[] = [];

    // Extract fields (case-insensitive header matching)
    const findField = (keys: string[]) => {
      for (const k of Object.keys(row)) {
        const normalized = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const target of keys) {
          if (normalized === target.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            return String(row[k]).trim();
          }
        }
      }
      return '';
    };

    const name = findField(['name', 'teacher name', 'fullname', 'employee name']);
    const employeeId = findField(['employee id', 'employeeid', 'empid', 'emp id', 'id']);
    const contactNumber = findField(['contact number', 'phone', 'contact', 'mobile', 'phone number']);
    const emailId = findField(['email id', 'email', 'emailid', 'mail']);
    const department = findField(['department', 'dept', 'subject']);

    // Validations
    if (!name) {
      errors.push('Teacher Name is required.');
    }
    if (!employeeId) {
      errors.push('Employee ID is required.');
    } else {
      const normalizedEmp = employeeId.trim().toLowerCase();
      if (seenEmpIdsInFile.has(normalizedEmp)) {
        const firstRow = seenEmpIdsInFile.get(normalizedEmp);
        errors.push(`Duplicate Employee ID "${employeeId}" in Excel file (already appeared on Row ${firstRow}).`);
      } else if (existingEmployeeIds.has(normalizedEmp)) {
        const existingName = existingEmployeeIds.get(normalizedEmp);
        errors.push(`Employee ID "${employeeId}" already exists in persistent database (assigned to ${existingName}).`);
      } else {
        seenEmpIdsInFile.set(normalizedEmp, rowNumber);
      }
    }

    const teacherEmails = parseMultiString(emailId);
    teacherEmails.forEach((em) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        errors.push(`Invalid email format: "${em}".`);
      }
    });

    if (errors.length > 0) {
      summary.failedRows++;
      summary.failedRecords.push({
        rowNumber,
        data: row,
        errors,
      });
    } else {
      // System automatically assigns unique username and random password
      const username = generateUniqueTeacherUsername(name, employeeId, existingUsernames);
      const password = generateRandomPassword(9);
      const id = `teacher-${employeeId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

      const teacher: TeacherProfile = {
        id,
        name,
        employeeId,
        role: 'teacher',
        username,
        password,
        contactNumber,
        emailId,
        department,
        sourceRowNumber: rowNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      summary.successfulRows++;
      summary.createdRecords.push(teacher);
    }
  });

  return summary;
}

// --- Student Master Excel Parser & Validator ---
export function processStudentExcel(
  buffer: Buffer,
  existingRollNumbers: Map<string, string> = new Map<string, string>()
): ExcelUploadSummary<StudentMaster> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const summary: ExcelUploadSummary<StudentMaster> = {
    totalRows: rawRows.length,
    successfulRows: 0,
    failedRows: 0,
    createdRecords: [],
    failedRecords: [],
  };

  // Map normalized rollNumber to rowNumber where it first appeared in this Excel file
  const seenRollNumbers = new Map<string, number>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];

    const findField = (keys: string[]) => {
      for (const k of Object.keys(row)) {
        const normalized = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const target of keys) {
          if (normalized === target.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            return String(row[k]).trim();
          }
        }
      }
      return '';
    };

    const name = findField(['name', 'student name', 'fullname']);
    const rollNumber = findField(['roll number', 'roll no', 'rollnumber', 'rollno', 'identifier']);
    const course = findField(['course', 'program', 'degree']);
    const section = findField(['section', 'sec', 'class section']);
    const phoneRaw = findField(['phone number', 'phone numbers', 'phone', 'contact', 'student phone', 'mobile']);
    const emailRaw = findField(['email id', 'email ids', 'email', 'student email', 'mail']);
    const parentName = findField(['parent name', 'father name', 'mother name', 'guardian name']);
    const parentEmailRaw = findField(['parent email id', 'parent email', 'guardian email', 'parent emails']);
    const parentPhoneRaw = findField(['parent phone number', 'parent phone', 'guardian phone', 'parent contacts']);

    // Mandatory validations
    if (!name) {
      errors.push('Student Name is mandatory.');
    }
    if (!rollNumber) {
      errors.push('Roll Number is mandatory (identifier column).');
    } else {
      const normalizedRoll = rollNumber.trim().toLowerCase();
      if (seenRollNumbers.has(normalizedRoll)) {
        const firstRow = seenRollNumbers.get(normalizedRoll);
        errors.push(`Duplicate Roll Number "${rollNumber}" in Excel file (already appeared on Row ${firstRow}).`);
      } else if (existingRollNumbers.has(normalizedRoll)) {
        const existingName = existingRollNumbers.get(normalizedRoll);
        errors.push(`Roll Number "${rollNumber}" already exists in Master Database (assigned to ${existingName}).`);
      } else {
        seenRollNumbers.set(normalizedRoll, rowNumber);
      }
    }
    if (!course) {
      errors.push('Course is mandatory.');
    }

    // Parse multi-values
    const phoneNumbers = parseMultiString(phoneRaw);
    const emailIds = parseMultiString(emailRaw);
    const parentEmailIds = parseMultiString(parentEmailRaw);
    const parentPhoneNumbers = parseMultiString(parentPhoneRaw);

    // Optional email format check
    emailIds.forEach((em) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        errors.push(`Invalid student email format: "${em}".`);
      }
    });
    parentEmailIds.forEach((em) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        errors.push(`Invalid parent email format: "${em}".`);
      }
    });

    if (errors.length > 0) {
      summary.failedRows++;
      summary.failedRecords.push({
        rowNumber,
        data: row,
        errors,
      });
    } else {
      const id = `student-${rollNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
      const student: StudentMaster = {
        id,
        name,
        rollNumber,
        course,
        section: section || undefined,
        phoneNumbers,
        emailIds,
        parentName: parentName || undefined,
        parentEmailIds,
        parentPhoneNumbers,
        sourceRowNumber: rowNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      summary.successfulRows++;
      summary.createdRecords.push(student);
    }
  });

  return summary;
}

// --- Generate Schema Template Files ---
export function createTeacherSchemaWorkbook(): Buffer {
  const sampleData = [
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
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function createStudentSchemaWorkbook(): Buffer {
  const headers = [
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

  const worksheet = XLSX.utils.json_to_sheet(headers);
  // Column formatting for easy viewing
  worksheet['!cols'] = [
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Student_Master_Schema');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Field_Instructions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
