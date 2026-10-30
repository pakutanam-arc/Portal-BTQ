import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  limit,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  invalidateDbCache,
  fetchWithSWR,
  DYNAMIC_CACHE_TTL_MS,
} from '../cacheService';
import {
  StudentAttendance,
  MentorAttendance,
  SemesterInfo,
  OperationType,
  handleFirestoreError,
} from './types';
import { getGroupAliases, cleanGroupName } from './groups';
import { logSystemActivity } from './auditLogs';

export function getActiveSemesterInfo(refDate: Date = new Date()): SemesterInfo {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0 = Jan, 6 = July
  if (month >= 6) {
    return {
      semester: 1,
      semesterName: 'Ganjil',
      academicYear: `${year}/${year + 1}`,
      startDate: `${year}-07-01`,
      endDate: `${year}-12-31`
    };
  }
  return {
    semester: 2,
    semesterName: 'Genap',
    academicYear: `${year - 1}/${year}`,
    startDate: `${year}-01-01`,
    endDate: `${year}-06-30`
  };
}

export function getRecentWeeksStartDate(weeks: number = 8, refDate: Date = new Date()): string {
  const d = new Date(refDate.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

export async function getStudentAttendance(groupId: string, date: string, meetingNumber?: number): Promise<StudentAttendance[]> {
  const datePrefix = date.split('T')[0];
  const mNum = meetingNumber || (datePrefix === '2026-08-15' ? 1 : datePrefix === '2026-08-22' ? 2 : undefined);
  const aliases = getGroupAliases(groupId);

  try {
    if (mNum) {
      const qByM = aliases.length > 1
        ? query(
            collection(db, 'student_attendance'),
            where('groupId', 'in', aliases),
            where('meetingNumber', '==', mNum),
            limit(100)
          )
        : query(
            collection(db, 'student_attendance'),
            where('groupId', '==', groupId),
            where('meetingNumber', '==', mNum),
            limit(100)
          );
      const snapByM = await getDocs(qByM);
      if (!snapByM.empty) {
        return snapByM.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));
      }
    }

    const q = aliases.length > 1
      ? query(
          collection(db, 'student_attendance'),
          where('groupId', 'in', aliases),
          where('date', '==', datePrefix),
          limit(100)
        )
      : query(
          collection(db, 'student_attendance'),
          where('groupId', '==', groupId),
          where('date', '==', datePrefix),
          limit(100)
        );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_attendance');
  }

  return [];
}

export async function getAllStudentAttendance(startDate?: string, limitCount = 2000, forceFresh = false): Promise<StudentAttendance[]> {
  const activeStartDate = startDate === 'all' 
    ? undefined 
    : (startDate || getActiveSemesterInfo().startDate);
  const cacheKey = `all_attendance_${activeStartDate || 'all'}`;

  return fetchWithSWR<StudentAttendance[]>(cacheKey, async () => {
    try {
      const q = activeStartDate 
        ? query(
            collection(db, 'student_attendance'),
            where('date', '>=', activeStartDate),
            limit(limitCount)
          )
        : query(
            collection(db, 'student_attendance'),
            limit(limitCount)
          );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));
      }
      return [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_attendance');
      return [];
    }
  }, { forceFresh, freshTtlMs: DYNAMIC_CACHE_TTL_MS });
}

/**
 * Real-time subscription to all student attendance records from Cloud Firestore
 */
export function subscribeToAllStudentAttendance(
  callback: (records: StudentAttendance[]) => void,
  limitCount = 2000
): () => void {
  const q = query(
    collection(db, 'student_attendance'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));
    callback(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'student_attendance');
    callback([]);
  });
}

export async function getStudentAttendanceByStudent(studentId: string, limitCount = 50): Promise<StudentAttendance[]> {
  try {
    const q = query(
      collection(db, 'student_attendance'),
      where('studentId', '==', studentId),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_attendance');
  }
  return [];
}

export async function getStudentAttendanceByGroup(groupId: string, limitCount = 100, forceFresh = false): Promise<StudentAttendance[]> {
  const cacheKey = `attendance_group_${groupId}`;
  return fetchWithSWR<StudentAttendance[]>(cacheKey, async () => {
    const aliases = getGroupAliases(groupId);
    try {
      const q = aliases.length > 1
        ? query(
            collection(db, 'student_attendance'),
            where('groupId', 'in', aliases),
            limit(limitCount)
          )
        : query(
            collection(db, 'student_attendance'),
            where('groupId', '==', groupId),
            limit(limitCount)
          );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentAttendance));
      }
      return [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_attendance');
      return [];
    }
  }, { forceFresh, freshTtlMs: DYNAMIC_CACHE_TTL_MS });
}

export async function saveStudentAttendance(records: StudentAttendance[]): Promise<void> {
  invalidateDbCache('attendance');
  invalidateDbCache('all_attendance');
  if (records.length === 0) return;

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  for (const record of records) {
    const datePrefix = record.date.split('T')[0];
    const meetingNum = record.meetingNumber || (datePrefix === '2026-08-15' ? 1 : datePrefix === '2026-08-22' ? 2 : 3);
    const docId = `${record.studentId}_m${meetingNum}`;
    const { id, ...data } = record;
    const docRef = doc(db, 'student_attendance', docId);
    batch.set(docRef, {
      ...data,
      date: datePrefix,
      meetingNumber: meetingNum,
      updatedAt: now
    }, { merge: true });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'student_attendance');
  }

  if (records.length > 0) {
    const groupName = cleanGroupName(records[0].groupId);
    logSystemActivity(
      'attendance',
      'Presensi Siswa',
      `Absensi ${groupName} diperbarui (${records.length} siswa).`
    ).catch(() => {});
  }
}

export async function getMentorAttendance(date: string): Promise<MentorAttendance[]> {
  const datePrefix = date.split('T')[0];
  try {
    const q = query(collection(db, 'mentor_attendance'), where('date', '==', datePrefix));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MentorAttendance));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'mentor_attendance');
  }

  return [];
}

export async function getAllMentorAttendance(): Promise<MentorAttendance[]> {
  try {
    const q = query(collection(db, 'mentor_attendance'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MentorAttendance));
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'mentor_attendance');
    return [];
  }
}

export async function saveMentorAttendance(records: MentorAttendance[]): Promise<void> {
  invalidateDbCache('mentor_attendance');
  for (const record of records) {
    const datePrefix = record.date.split('T')[0];
    const docId = `${record.mentorId}_${datePrefix}`;
    const { id, ...data } = record;
    try {
      await setDoc(doc(db, 'mentor_attendance', docId), {
        ...data,
        date: datePrefix,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `mentor_attendance/${docId}`);
    }
  }

  if (records.length > 0) {
    await logSystemActivity(
      'attendance',
      'Presensi Mentor',
      `Kehadiran mentor telah dicatatkan untuk ${records.length} pengajar.`
    );
  }
}
