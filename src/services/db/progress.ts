import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
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
import { getGroupAliases, cleanGroupName } from './groups';
import { logSystemActivity } from './auditLogs';

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
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
      }
      return [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_progress');
      return [];
    }
  }, { forceFresh, freshTtlMs: DYNAMIC_CACHE_TTL_MS });
}

export async function getStudentProgressByGroup(groupId: string, limitCount = 100, forceFresh = false): Promise<StudentProgress[]> {
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
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentProgress));
      }
      return [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_progress');
      return [];
    }
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

  return [];
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
          limit(100)
        )
      : query(
          collection(db, 'student_progress'),
          where('groupId', '==', groupId),
          where('sessionId', '==', sessionId),
          limit(100)
        );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_progress');
  }

  return [];
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
          limit(100)
        )
      : query(
          collection(db, 'student_progress'),
          where('groupId', '==', groupId),
          where('meetingNumber', '==', meetingNumber),
          limit(100)
        );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_progress');
  }

  return [];
}

export async function saveMultipleStudentProgress(records: StudentProgress[]): Promise<void> {
  invalidateDbCache('progress');
  invalidateDbCache('all_student_progress');
  if (records.length === 0) return;

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  for (const record of records) {
    const docId = record.meetingNumber 
      ? `${record.studentId}_m${record.meetingNumber}` 
      : `${record.studentId}_${record.sessionId || record.date}`;
    const { id, ...data } = record;
    const docRef = doc(db, 'student_progress', docId);
    batch.set(docRef, { ...data, updatedAt: now }, { merge: true });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'student_progress');
  }

  // Non-blocking single audit log summary
  if (records[0]?.groupId) {
    const groupName = cleanGroupName(records[0].groupId);
    logSystemActivity(
      'progress',
      'Progress Santri',
      `Pencapaian santri ${groupName} diperbarui (${records.length} santri).`
    ).catch(() => {});
  }
}

export async function saveStudentProgress(record: StudentProgress): Promise<void> {
  invalidateDbCache('progress');
  invalidateDbCache('all_student_progress');
  
  const docId = record.meetingNumber 
    ? `${record.studentId}_m${record.meetingNumber}` 
    : `${record.studentId}_${record.sessionId || record.date}`;
    
  const { id, ...data } = record;
  try {
    await setDoc(doc(db, 'student_progress', docId), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `student_progress/${docId}`);
  }

  // Non-blocking activity logging to prevent UI delays
  (async () => {
    try {
      let studentName = 'Santri';
      const studentDoc = await getDoc(doc(db, 'students', record.studentId));
      if (studentDoc.exists()) {
        studentName = studentDoc.data().name || 'Santri';
      }
      await logSystemActivity(
        'progress',
        'Progress Santri',
        `Pencapaian ${studentName} diperbarui (Rata-rata: ${record.total || 0}%).`
      );
    } catch {}
  })();
}
