import {
  User,
  StudentMaster,
  ExcelUploadSummary,
  TeacherProfile,
} from '../types/index.ts';

const API_BASE = '/api';

export async function login(username: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Authentication failed' }));
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function updateAdminPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/update-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update password' }));
    throw new Error(err.error || 'Failed to update password');
  }
  return res.json();
}

// Database Re-Sync API: forces fresh fetch directly from Firestore
export async function resyncDatabase(): Promise<{
  success: boolean;
  timestamp: string;
  usersCount: number;
  studentsCount: number;
}> {
  const res = await fetch(`${API_BASE}/sync`, { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to re-sync with database');
  }
  return res.json();
}

// Teacher APIs
export async function getTeachers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/teachers`);
  if (!res.ok) throw new Error('Failed to fetch teachers');
  const data = await res.json();
  return data.teachers || [];
}

export async function createTeacher(payload: {
  name: string;
  employeeId: string;
  username?: string;
  password?: string;
  contactNumber?: string;
  emailId?: string;
  department?: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create teacher' }));
    throw new Error(err.error || 'Failed to create teacher');
  }
  const data = await res.json();
  return data.teacher;
}

export async function updateTeacher(
  id: string,
  payload: Partial<User>
): Promise<User> {
  const res = await fetch(`${API_BASE}/teachers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update teacher' }));
    throw new Error(err.error || 'Failed to update teacher');
  }
  const data = await res.json();
  return data.teacher;
}

export async function deleteTeacher(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/teachers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete teacher' }));
    throw new Error(err.error || 'Failed to delete teacher');
  }
  return true;
}

export async function uploadTeacherExcel(base64Data: string): Promise<ExcelUploadSummary<User>> {
  const res = await fetch(`${API_BASE}/teachers/upload-excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to process Excel file' }));
    throw new Error(err.error || 'Failed to process Excel file');
  }
  const data = await res.json();
  return data.summary;
}

// Student APIs
export async function getStudents(filters?: {
  name?: string;
  rollNumber?: string;
  course?: string;
  search?: string;
}): Promise<StudentMaster[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.name) params.append('name', filters.name);
  if (filters?.rollNumber) params.append('rollNumber', filters.rollNumber);
  if (filters?.course) params.append('course', filters.course);

  const res = await fetch(`${API_BASE}/students?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch students');
  const data = await res.json();
  return data.students || [];
}

export async function createStudent(payload: Omit<StudentMaster, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentMaster> {
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create student' }));
    throw new Error(err.error || 'Failed to create student');
  }
  const data = await res.json();
  return data.student;
}

export async function updateStudent(
  id: string,
  payload: Partial<StudentMaster>
): Promise<StudentMaster> {
  const res = await fetch(`${API_BASE}/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update student' }));
    throw new Error(err.error || 'Failed to update student');
  }
  const data = await res.json();
  return data.student;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/students/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete student' }));
    throw new Error(err.error || 'Failed to delete student');
  }
  return true;
}

export async function uploadStudentExcel(base64Data: string): Promise<ExcelUploadSummary<StudentMaster>> {
  const res = await fetch(`${API_BASE}/students/upload-excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to process Excel file' }));
    throw new Error(err.error || 'Failed to process Excel file');
  }
  const data = await res.json();
  return data.summary;
}

// Download schema templates
export function downloadTeacherSchemaUrl(): string {
  return `${API_BASE}/schema/teacher-template.xlsx`;
}

export function downloadStudentSchemaUrl(): string {
  return `${API_BASE}/schema/student-template.xlsx`;
}

// Bulk database clear operations
export async function clearAllStudents(): Promise<{ success: boolean; count: number; message: string }> {
  const res = await fetch(`${API_BASE}/students/clear-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to clear student records' }));
    throw new Error(err.error || 'Failed to clear student records');
  }
  return res.json();
}

export async function clearAllTeachers(): Promise<{ success: boolean; count: number; message: string }> {
  const res = await fetch(`${API_BASE}/teachers/clear-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to clear teacher records' }));
    throw new Error(err.error || 'Failed to clear teacher records');
  }
  return res.json();
}

