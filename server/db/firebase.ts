import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type { User, StudentMaster } from '../../src/types/index.ts';

// Suppress benign internal gRPC idle stream cancellation notices
setLogLevel('silent');

// Load Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    firebaseConfig = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firestoreDb = initializeFirestore(
  app,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId
);

// Helper to recursively strip any undefined properties because Firestore strictly forbids undefined values
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = sanitizeForFirestore(value);
      } else if (Array.isArray(value)) {
        result[key] = value.filter((v) => v !== undefined);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// In-memory fallback / cache layer for quick access & resiliency
const memoryStore = {
  users: new Map<string, User>(),
  students: new Map<string, StudentMaster>(),
  initialized: false,
};

// Seed initial Admin: username: "admin", password: "admin"
export async function initializeDatabase() {
  if (memoryStore.initialized) return;

  const initialAdminId = 'user-admin-root';
  const defaultAdmin: User = {
    id: initialAdminId,
    username: 'admin',
    password: 'admin',
    role: 'admin',
    name: 'Administrator',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const adminDocRef = doc(firestoreDb, 'users', initialAdminId);
    const snap = await getDoc(adminDocRef);
    if (!snap.exists()) {
      await setDoc(adminDocRef, sanitizeForFirestore(defaultAdmin));
      console.log('Seeded initial admin into Firestore: admin / admin');
    }
  } catch (err) {
    console.warn('Firestore initial admin seed warning (using resilient memory backing):', err);
  }

  // Ensure default admin in memory
  if (!memoryStore.users.has(initialAdminId)) {
    memoryStore.users.set(initialAdminId, defaultAdmin);
  }

  // Pre-load users and students from Firestore if available
  try {
    const userDocs = await getDocs(collection(firestoreDb, 'users'));
    userDocs.forEach((d) => {
      const u = d.data() as User;
      memoryStore.users.set(u.id || d.id, { ...u, id: u.id || d.id });
    });

    const studentDocs = await getDocs(collection(firestoreDb, 'students'));
    studentDocs.forEach((d) => {
      const s = d.data() as StudentMaster;
      memoryStore.students.set(s.id || d.id, { ...s, id: s.id || d.id });
    });
  } catch (err) {
    console.warn('Note: Populating initial cache from Firestore:', err);
  }

  memoryStore.initialized = true;
}

// Live full re-sync from Firestore database
export async function syncDatabaseFromFirestore(): Promise<{
  success: boolean;
  timestamp: string;
  usersCount: number;
  studentsCount: number;
}> {
  await initializeDatabase();
  try {
    const userDocs = await getDocs(collection(firestoreDb, 'users'));
    memoryStore.users.clear();
    userDocs.forEach((d) => {
      const u = d.data() as User;
      memoryStore.users.set(u.id || d.id, { ...u, id: u.id || d.id });
    });

    const studentDocs = await getDocs(collection(firestoreDb, 'students'));
    memoryStore.students.clear();
    studentDocs.forEach((d) => {
      const s = d.data() as StudentMaster;
      memoryStore.students.set(s.id || d.id, { ...s, id: s.id || d.id });
    });

    // Ensure root admin is present
    const initialAdminId = 'user-admin-root';
    if (!memoryStore.users.has(initialAdminId)) {
      const defaultAdmin: User = {
        id: initialAdminId,
        username: 'admin',
        password: 'admin',
        role: 'admin',
        name: 'Administrator',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryStore.users.set(initialAdminId, defaultAdmin);
    }

    console.log(`Synced with Firestore: ${memoryStore.users.size} users, ${memoryStore.students.size} students`);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      usersCount: memoryStore.users.size,
      studentsCount: memoryStore.students.size,
    };
  } catch (err: any) {
    console.error('Error during Firestore sync:', err);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      usersCount: memoryStore.users.size,
      studentsCount: memoryStore.students.size,
    };
  }
}

// User (Admin / Teacher) DAO
export async function getAllUsers(): Promise<User[]> {
  await initializeDatabase();
  try {
    const snap = await getDocs(collection(firestoreDb, 'users'));
    const list: User[] = [];
    snap.forEach((d) => {
      const data = d.data() as User;
      list.push({ ...data, id: d.id });
      memoryStore.users.set(d.id, { ...data, id: d.id });
    });
    if (list.length > 0) return list;
  } catch (e) {
    console.warn('Firestore getAllUsers fallback to cache');
  }
  return Array.from(memoryStore.users.values());
}

export async function getUserById(id: string): Promise<User | null> {
  await initializeDatabase();
  try {
    const snap = await getDoc(doc(firestoreDb, 'users', id));
    if (snap.exists()) {
      const data = snap.data() as User;
      return { ...data, id: snap.id };
    }
  } catch (e) {
    // fallback
  }
  return memoryStore.users.get(id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  await initializeDatabase();
  const all = await getAllUsers();
  const match = all.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  return match || null;
}

export async function getUserByEmployeeId(employeeId: string): Promise<User | null> {
  await initializeDatabase();
  const all = await getAllUsers();
  const cleanEmp = employeeId.trim().toLowerCase();
  const match = all.find((u) => u.employeeId && u.employeeId.trim().toLowerCase() === cleanEmp);
  return match || null;
}

export async function saveUser(user: User): Promise<User> {
  await initializeDatabase();

  // Guard against duplicate employeeId
  if (user.employeeId && user.employeeId.trim()) {
    const cleanEmp = user.employeeId.trim().toLowerCase();
    for (const [, existing] of memoryStore.users) {
      if (
        existing.id !== user.id &&
        existing.employeeId &&
        existing.employeeId.trim().toLowerCase() === cleanEmp
      ) {
        throw new Error(
          `Duplicate Employee ID detected: "${user.employeeId.trim()}" is already assigned to ${existing.name}.`
        );
      }
    }
  }

  const now = new Date().toISOString();
  const toSave: User = {
    ...user,
    updatedAt: now,
    createdAt: user.createdAt || now,
  };

  memoryStore.users.set(toSave.id, toSave);

  try {
    const firestoreData = sanitizeForFirestore(toSave);
    await setDoc(doc(firestoreDb, 'users', toSave.id), firestoreData);
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }
  return toSave;
}

export async function deleteUser(id: string): Promise<boolean> {
  await initializeDatabase();
  memoryStore.users.delete(id);
  try {
    await deleteDoc(doc(firestoreDb, 'users', id));
    return true;
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
    return true;
  }
}

// Student Master DAO
export async function getAllStudents(): Promise<StudentMaster[]> {
  await initializeDatabase();
  try {
    const snap = await getDocs(collection(firestoreDb, 'students'));
    const list: StudentMaster[] = [];
    snap.forEach((d) => {
      const data = d.data() as StudentMaster;
      list.push({ ...data, id: d.id });
      memoryStore.students.set(d.id, { ...data, id: d.id });
    });
    if (list.length > 0) return list;
  } catch (e) {
    console.warn('Firestore getAllStudents fallback to cache');
  }
  return Array.from(memoryStore.students.values());
}

export async function getStudentById(id: string): Promise<StudentMaster | null> {
  await initializeDatabase();
  try {
    const snap = await getDoc(doc(firestoreDb, 'students', id));
    if (snap.exists()) {
      const data = snap.data() as StudentMaster;
      return { ...data, id: snap.id };
    }
  } catch (e) {}
  return memoryStore.students.get(id) || null;
}

export async function getStudentByRollNumber(rollNumber: string): Promise<StudentMaster | null> {
  await initializeDatabase();
  const all = await getAllStudents();
  const cleanRoll = rollNumber.trim().toLowerCase();
  const match = all.find((s) => s.rollNumber && s.rollNumber.trim().toLowerCase() === cleanRoll);
  return match || null;
}

export async function saveStudent(student: StudentMaster): Promise<StudentMaster> {
  await initializeDatabase();

  // Guard against duplicate rollNumber in persistent DB
  if (student.rollNumber && student.rollNumber.trim()) {
    const cleanRoll = student.rollNumber.trim().toLowerCase();
    for (const [, existing] of memoryStore.students) {
      if (
        existing.id !== student.id &&
        existing.rollNumber &&
        existing.rollNumber.trim().toLowerCase() === cleanRoll
      ) {
        throw new Error(
          `Duplicate Roll Number detected: "${student.rollNumber.trim()}" is already assigned to ${existing.name}.`
        );
      }
    }
  }

  const now = new Date().toISOString();
  const toSave: StudentMaster = {
    ...student,
    phoneNumbers: Array.isArray(student.phoneNumbers) ? student.phoneNumbers.filter(Boolean) : [],
    emailIds: Array.isArray(student.emailIds) ? student.emailIds.filter(Boolean) : [],
    parentPhoneNumbers: Array.isArray(student.parentPhoneNumbers) ? student.parentPhoneNumbers.filter(Boolean) : [],
    parentEmailIds: Array.isArray(student.parentEmailIds) ? student.parentEmailIds.filter(Boolean) : [],
    updatedAt: now,
    createdAt: student.createdAt || now,
  };

  memoryStore.students.set(toSave.id, toSave);

  try {
    const firestoreData = sanitizeForFirestore(toSave);
    await setDoc(doc(firestoreDb, 'students', toSave.id), firestoreData);
  } catch (err) {
    console.error('Error saving student to Firestore:', err);
  }
  return toSave;
}

export async function deleteStudent(id: string): Promise<boolean> {
  await initializeDatabase();
  memoryStore.students.delete(id);
  try {
    await deleteDoc(doc(firestoreDb, 'students', id));
    return true;
  } catch (err) {
    console.error('Error deleting student from Firestore:', err);
    return true;
  }
}

// Clear all student records from persistent Firestore database and memory store
export async function clearAllStudents(): Promise<number> {
  await initializeDatabase();
  let count = 0;
  try {
    const snap = await getDocs(collection(firestoreDb, 'students'));
    const deletePromises: Promise<any>[] = [];
    snap.forEach((d) => {
      count++;
      deletePromises.push(deleteDoc(d.ref));
    });
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Error clearing all students from Firestore:', err);
  }

  // Clear memory cache as well
  if (count === 0) {
    count = memoryStore.students.size;
  }
  memoryStore.students.clear();
  console.log(`Cleared ${count} student records from persistent database.`);
  return count;
}

// Clear all teacher profiles from persistent Firestore database (preserves admin accounts)
export async function clearAllTeachers(): Promise<number> {
  await initializeDatabase();
  let count = 0;
  try {
    const snap = await getDocs(collection(firestoreDb, 'users'));
    const deletePromises: Promise<any>[] = [];
    snap.forEach((d) => {
      const data = d.data() as User;
      // Strictly protect admin accounts; only delete teachers
      if (data.role === 'teacher' || d.id.startsWith('teacher-')) {
        count++;
        deletePromises.push(deleteDoc(d.ref));
        memoryStore.users.delete(d.id);
      }
    });
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Error clearing all teachers from Firestore:', err);
  }

  // Also clean memory store of any remaining teachers
  for (const [id, user] of memoryStore.users) {
    if (user.role === 'teacher' || id.startsWith('teacher-')) {
      if (!count) count++;
      memoryStore.users.delete(id);
    }
  }

  console.log(`Cleared ${count} teacher records from persistent database.`);
  return count;
}

