export type UserRole = 'admin' | 'teacher';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  employeeId?: string;
  contactNumber?: string;
  emailId?: string;
  outlookConnection?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  username: string;
  password?: string;
  role: 'teacher';
  name: string;
  employeeId: string;
  contactNumber?: string;
  emailId?: string;
  department?: string;
  sourceRowNumber?: number;
  outlookConnection?: any;
  createdAt: string;
  updatedAt: string;
}

export interface StudentMaster {
  id: string;
  name: string;              // Mandatory
  rollNumber: string;        // Mandatory, identifier
  course: string;            // Mandatory
  section?: string;          // Optional
  phoneNumbers: string[];    // Optional, multiple
  emailIds: string[];        // Optional, multiple
  parentName?: string;       // Optional
  parentEmailIds: string[];  // Optional, multiple
  parentPhoneNumbers: string[]; // Optional, multiple
  sourceRowNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExcelRowError {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
}

export interface ExcelUploadSummary<T> {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  createdRecords: T[];
  failedRecords: ExcelRowError[];
}
