import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { mockStudentAttendance, mockMentorAttendance } from '../mockData';
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

// Local cache keys
const LOCAL_STORAGE_KEY_ATTENDANCE = 'sibtq_student_attendance';
const LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE = 'sibtq_mentor_attendance';

function getLocalAttendance(): StudentAttendance[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
    if (raw) {
      const parsed: StudentAttendance[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mergedMap = new Map<string, StudentAttendance>();
        mockStudentAttendance.forEach(r => {
          const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.date.split('T')[0]}`;
          mergedMap.set(key, r);
        });
        parsed.forEach(r => {
          const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.date.split('T')[0]}`;
          mergedMap.set(key, r);
        });
        return Array.from(mergedMap.values());
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify(mockStudentAttendance));
    return mockStudentAttendance;
  } catch {
    return mockStudentAttendance;
  }
}

function saveLocalAttendance(records: StudentAttendance[]) {
  try {
    const existing = getLocalAttendance();
    const updated = [...existing];
    records.forEach(rec => {
      const recDate = rec.date.split('T')[0];
      const idx = updated.findIndex(r => 
        r.studentId === rec.studentId && (
          (rec.meetingNumber && r.meetingNumber === rec.meetingNumber) ||
          (r.date && r.date.split('T')[0] === recDate)
        )
      );
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...rec, date: recDate };
      } else {
        updated.push({ ...rec, date: recDate });
      }
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { records } }));
    }
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }
}

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
            limit(50)
          )
        : query(
            collection(db, 'student_attendance'),
            where('groupId', '==', groupId),
            where('meetingNumber', '==', mNum),
            limit(50)
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
          limit(50)
        )
      : query(
          collection(db, 'student_attendance'),
          where('groupId', '==', groupId),
          where('date', '==', datePrefix),
          limit(50)
        );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_attendance');
  }

  const local = getLocalAttendance();
  if (mNum) {
    const byMeeting = local.filter(a => aliases.includes(a.groupId) && (a.meetingNumber === mNum || (mNum === 1 && a.date.startsWith('2026-08-15')) || (mNum === 2 && a.date.startsWith('2026-08-22'))));
    if (byMeeting.length > 0) return byMeeting;
  }
  return local.filter(a => aliases.includes(a.groupId) && a.date.startsWith(datePrefix));
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
        const firestoreRecords = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));

        const local = getLocalAttendance();
        const mergedMap = new Map<string, StudentAttendance>();
        
        // 1. Masukkan baseline seed presensi
        mockStudentAttendance
          .filter(r => !activeStartDate || (r.date && r.date >= activeStartDate))
          .forEach(r => {
            const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.date.split('T')[0]}`;
            mergedMap.set(key, r);
          });

        // 2. Masukkan local cache terfilter
        local
          .filter(r => !activeStartDate || (r.date && r.date >= activeStartDate))
          .forEach(r => {
            const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.date.split('T')[0]}`;
            mergedMap.set(key, r);
          });
        
        // 3. Override atau tambahkan dari Firestore
        firestoreRecords.forEach(r => {
          const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.date.split('T')[0]}`;
          mergedMap.set(key, r);
        });

        return Array.from(mergedMap.values());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_attendance');
    }

    const local = getLocalAttendance();
    const mergedMap = new Map<string, StudentAttendance>();
    mockStudentAttendance
      .filter(r => !activeStartDate || (r.date && r.date >= activeStartDate))
      .forEach(r => {
        const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.date.split('T')[0]}`;
        mergedMap.set(key, r);
      });
    local
      .filter(r => !activeStartDate || (r.date && r.date >= activeStartDate))
      .forEach(r => {
        const key = r.meetingNumber ? `${r.studentId}_m${r.meetingNumber}` : `${r.studentId}_${r.date.split('T')[0]}`;
        mergedMap.set(key, r);
      });

    return Array.from(mergedMap.values());
  }, { forceFresh, freshTtlMs: DYNAMIC_CACHE_TTL_MS });
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
  return getLocalAttendance().filter(a => a.studentId === studentId);
}

export async function getStudentAttendanceByGroup(groupId: string, limitCount = 30, forceFresh = false): Promise<StudentAttendance[]> {
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
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentAttendance));
        const local = getLocalAttendance().filter(a => aliases.includes(a.groupId));
        const mergedMap = new Map<string, StudentAttendance>();
        mockStudentAttendance.filter(a => aliases.includes(a.groupId)).forEach(r => mergedMap.set(`${r.studentId}_${r.meetingNumber || r.date}`, r));
        local.forEach(r => mergedMap.set(`${r.studentId}_${r.meetingNumber || r.date}`, r));
        records.forEach(r => mergedMap.set(`${r.studentId}_${r.meetingNumber || r.date}`, r));
        return Array.from(mergedMap.values());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'student_attendance');
    }
    const local = getLocalAttendance().filter(a => aliases.includes(a.groupId));
    const baseline = mockStudentAttendance.filter(a => aliases.includes(a.groupId));
    const mergedMap = new Map<string, StudentAttendance>();
    baseline.forEach(r => mergedMap.set(`${r.studentId}_${r.meetingNumber || r.date}`, r));
    local.forEach(r => mergedMap.set(`${r.studentId}_${r.meetingNumber || r.date}`, r));
    return Array.from(mergedMap.values());
  }, { forceFresh, freshTtlMs: DYNAMIC_CACHE_TTL_MS });
}

export async function saveStudentAttendance(records: StudentAttendance[]): Promise<void> {
  invalidateDbCache('attendance');
  invalidateDbCache('all_attendance');
  saveLocalAttendance(records);
  for (const record of records) {
    const datePrefix = record.date.split('T')[0];
    const meetingNum = record.meetingNumber || (datePrefix === '2026-08-15' ? 1 : datePrefix === '2026-08-22' ? 2 : 3);
    const docId = `${record.studentId}_m${meetingNum}`;
    const { id, ...data } = record;
    try {
      await setDoc(doc(db, 'student_attendance', docId), { 
        ...data, 
        date: datePrefix, 
        meetingNumber: meetingNum 
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `student_attendance/${docId}`);
    }
  }

  if (records.length > 0) {
    const groupName = cleanGroupName(records[0].groupId);
    await logSystemActivity(
      'attendance',
      'Presensi Siswa',
      `Absensi ${groupName} diperbarui (${records.length} siswa).`
    );
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

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE);
    const local = raw ? JSON.parse(raw) : [];
    const filtered = local.filter((m: MentorAttendance) => m.date.startsWith(datePrefix));
    if (filtered.length > 0) return filtered;
  } catch {}

  return mockMentorAttendance.filter(m => m.date.startsWith(datePrefix));
}

export async function getAllMentorAttendance(): Promise<MentorAttendance[]> {
  try {
    const q = query(collection(db, 'mentor_attendance'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const firestoreRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MentorAttendance));
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE);
      const local: MentorAttendance[] = localRaw ? JSON.parse(localRaw) : [];
      const mergedMap = new Map<string, MentorAttendance>();
      
      mockMentorAttendance.forEach(m => mergedMap.set(`${m.mentorId}_${m.date.split('T')[0]}`, m));
      local.forEach(m => mergedMap.set(`${m.mentorId}_${m.date.split('T')[0]}`, m));
      firestoreRecords.forEach(m => mergedMap.set(`${m.mentorId}_${m.date.split('T')[0]}`, m));

      return Array.from(mergedMap.values());
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'mentor_attendance');
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE);
    if (raw) {
      const parsed: MentorAttendance[] = JSON.parse(raw);
      if (parsed.length > 0) {
        const mergedMap = new Map<string, MentorAttendance>();
        mockMentorAttendance.forEach(m => mergedMap.set(`${m.mentorId}_${m.date.split('T')[0]}`, m));
        parsed.forEach(m => mergedMap.set(`${m.mentorId}_${m.date.split('T')[0]}`, m));
        return Array.from(mergedMap.values());
      }
    }
  } catch {}

  return mockMentorAttendance;
}

export async function saveMentorAttendance(records: MentorAttendance[]): Promise<void> {
  invalidateDbCache('mentor_attendance');
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [...existing];
    records.forEach(rec => {
      const idx = updated.findIndex((r: any) => r.mentorId === rec.mentorId && r.date.split('T')[0] === rec.date.split('T')[0]);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...rec };
      } else {
        updated.push(rec);
      }
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }

  for (const record of records) {
    const datePrefix = record.date.split('T')[0];
    const docId = `${record.mentorId}_${datePrefix}`;
    const { id, ...data } = record;
    try {
      await setDoc(doc(db, 'mentor_attendance', docId), { ...data, date: datePrefix }, { merge: true });
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
