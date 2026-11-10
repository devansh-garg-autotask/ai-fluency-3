import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { firestoreDb } from '../../db/firebase.ts';
import { OutlookConnectionDoc } from './outlook.types.ts';
import { OUTLOOK_COLLECTION_NAME } from './outlook.constants.ts';

// In-memory cache for fast access and fallback
const outlookCache = new Map<string, OutlookConnectionDoc>();

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

export async function getOutlookConnection(teacherId: string): Promise<OutlookConnectionDoc | null> {
  if (!teacherId) return null;

  // 1. Fast in-memory cache check
  if (outlookCache.has(teacherId)) {
    return outlookCache.get(teacherId)!;
  }

  // 2. Fetch from authorized teacher document in 'users' collection
  try {
    const userDocRef = doc(firestoreDb, 'users', teacherId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData?.outlookConnection) {
        const data = userData.outlookConnection as OutlookConnectionDoc;
        outlookCache.set(teacherId, data);
        return data;
      }
    }
  } catch (err: any) {
    // Non-fatal fallback
  }

  // 3. Fallback: dedicated collection if accessible
  try {
    const docRef = doc(firestoreDb, OUTLOOK_COLLECTION_NAME, `conn_${teacherId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as OutlookConnectionDoc;
      outlookCache.set(teacherId, data);
      return data;
    }
  } catch {
    // If dedicated collection is not permitted by rules, silently ignore
  }

  return outlookCache.get(teacherId) || null;
}

export async function saveOutlookConnection(data: OutlookConnectionDoc): Promise<void> {
  if (!data.teacherId) return;

  outlookCache.set(data.teacherId, data);

  // 1. Persist directly into teacher user profile in 'users' collection (fully authorized in Firestore rules)
  try {
    const userDocRef = doc(firestoreDb, 'users', data.teacherId);
    await setDoc(userDocRef, { outlookConnection: sanitizeForFirestore(data) }, { merge: true });
  } catch (err) {
    console.error(`[Outlook Repository] Error persisting to user record for teacher ${data.teacherId}:`, err);
  }

  // 2. Also mirror to dedicated collection if accessible
  try {
    const docRef = doc(firestoreDb, OUTLOOK_COLLECTION_NAME, `conn_${data.teacherId}`);
    await setDoc(docRef, sanitizeForFirestore(data));
  } catch {
    // Dedicated collection may be restricted
  }
}

export async function deleteOutlookConnection(teacherId: string): Promise<void> {
  if (!teacherId) return;

  outlookCache.delete(teacherId);

  // 1. Clear from user document
  try {
    const userDocRef = doc(firestoreDb, 'users', teacherId);
    await setDoc(userDocRef, { outlookConnection: null }, { merge: true });
  } catch (err) {
    console.error(`[Outlook Repository] Error clearing outlook connection for teacher ${teacherId}:`, err);
  }

  // 2. Also clear from dedicated collection if accessible
  try {
    const docRef = doc(firestoreDb, OUTLOOK_COLLECTION_NAME, `conn_${teacherId}`);
    await deleteDoc(docRef);
  } catch {
    // Ignore if dedicated collection is restricted
  }
}
