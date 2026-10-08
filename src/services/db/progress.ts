import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { mockStudents } from '../mockData';
import {
  invalidateDbCache,
  fetchWithSWR,
  DYNAMIC_CACHE_TTL_MS,
} from '../cacheService';
import {
  StudentProgress,
  OperationType,
  handleFirestoreError,
} from './types';
import { getGroupAliases } from './groups';
import { logSystemActivity } from './auditLogs';

const LOCAL_STORAGE_KEY_PROGRESS = 'sibtq_student_progress';

function getLocalProgress(): StudentProgress[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProgress(record: StudentProgress) {
  try {
    const existing = getLocalProgress();
    const idx = existing.findIndex(r => 
      r.studentId === record.studentId && (
        (record.meetingNumber && r.meetingNumber === record.meetingNumber) ||
        (record.sessionId && r.sessionId === record.sessionId) ||
        (record.date && r.date === record.date)
      )
    );
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...record };
    } else {
      existing.push(record);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(existing));
  } catch (e) {
    console.warn("Could not save progress to localStorage", e);
  }
}

export async function getAllStudentProgress(limitCount = 2000, forceFresh = false): Promise<StudentProgress[]> {
  const cacheKey = 'all_student_progress';
  return fetchWithSWR<StudentProgress[]>(cacheKey, async () => {
    try {
      const q = query(
        collection(db, 'student_progress'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
        const local = getLocalProgress();
        const mergedMap = new Map<string, StudentProgress>();
        
        local.forEach(r => {
          const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.sessionId || r.date}`;
          mergedMap.set(key, r);
        });
        firestoreRecords.forEach(r => {
          const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.sessionId || r.date}`;
          mergedMap.set(key, r);
        });

        return Array.from(mergedMap.values());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_progress');
    }

    return getLocalProgress();
  }, { forceFresh, freshTtlMs: DYNAMIC_CACHE_TTL_MS });
}

export async function getStudentProgressByGroup(groupId: string, limitCount = 50, forceFresh = false): Promise<StudentProgress[]> {
  const cacheKey = `progress_group_${groupId}`;
  const aliases = getGroupAliases(groupId);

  return fetchWithSWR<StudentProgress[]>(cacheKey, async () => {
    try {
      const q = aliases.length > 1
        ? query(
            collection(db, 'student_progress'),
            where('groupId', 'in', aliases),
            limit(limitCount)
          )
        : query(
            collection(db, 'student_progress'),
            where('groupId', '==', groupId),
            limit(limitCount)
          );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentProgress));
        const local = getLocalProgress().filter(p => aliases.includes(p.groupId));
        const mergedMap = new Map<string, StudentProgress>();
        local.forEach(r => mergedMap.set(`${r.studentId}_${r.meetingNumber || r.sessionId || r.date}`, r));
        records.forEach(r => mergedMap.set(`${r.studentId}_${r.meetingNumber || r.sessionId || r.date}`, r));
        return Array.from(mergedMap.values());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_progress');
    }
    return getLocalProgress().filter(p => aliases.includes(p.groupId));
  }, { forceFresh, freshTtlMs: DYNAMIC_CACHE_TTL_MS });
}

export async function getStudentProgressHistory(studentId: string): Promise<StudentProgress[]> {
  try {
    const q = query(
      collection(db, 'student_progress'),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_progress');
  }

  return getLocalProgress().filter(p => p.studentId === studentId);
}

export async function getStudentProgressBySession(
  groupId: string,
  sessionId: string
): Promise<StudentProgress[]> {
  const aliases = getGroupAliases(groupId);
  try {
    const q = aliases.length > 1
      ? query(
          collection(db, 'student_progress'),
          where('groupId', 'in', aliases),
          where('sessionId', '==', sessionId),
          limit(50)
        )
      : query(
          collection(db, 'student_progress'),
          where('groupId', '==', groupId),
          where('sessionId', '==', sessionId),
          limit(50)
        );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_progress');
  }

  const local = getLocalProgress();
  return local.filter(p => aliases.includes(p.groupId) && p.sessionId === sessionId);
}

export async function getStudentProgressByMeeting(
  groupId: string,
  meetingNumber: number,
  fallbackSessionId?: string
): Promise<StudentProgress[]> {
  const aliases = getGroupAliases(groupId);
  try {
    const q = aliases.length > 1
      ? query(
          collection(db, 'student_progress'),
          where('groupId', 'in', aliases),
          where('meetingNumber', '==', meetingNumber),
          limit(50)
        )
      : query(
          collection(db, 'student_progress'),
          where('groupId', '==', groupId),
          where('meetingNumber', '==', meetingNumber),
          limit(50)
        );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_progress');
  }

  const local = getLocalProgress();
  const byMeeting = local.filter(p => aliases.includes(p.groupId) && p.meetingNumber === meetingNumber);
  if (byMeeting.length > 0) return byMeeting;

  if (fallbackSessionId) {
    return local.filter(p => aliases.includes(p.groupId) && p.sessionId === fallbackSessionId);
  }
  return [];
}

export async function saveStudentProgress(record: StudentProgress): Promise<void> {
  invalidateDbCache('progress');
  invalidateDbCache('all_student_progress');
  saveLocalProgress(record);
  
  const docId = record.meetingNumber 
    ? `${record.studentId}_m${record.meetingNumber}` 
    : `${record.studentId}_${record.sessionId || record.date}`;
    
  const { id, ...data } = record;
  try {
    await setDoc(doc(db, 'student_progress', docId), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `student_progress/${docId}`);
  }

  // Find student name dynamically
  let studentName = 'Santri';
  try {
    const studentDoc = await getDoc(doc(db, 'students', record.studentId));
    if (studentDoc.exists()) {
      studentName = studentDoc.data().name || 'Santri';
    } else {
      const localS = mockStudents.find(s => s.id === record.studentId);
      if (localS) studentName = localS.name;
    }
  } catch {}

  await logSystemActivity(
    'progress',
    'Progress Santri',
    `Pencapaian ${studentName} diperbarui (Rata-rata: ${record.total || 0}%).`
  );
}
