import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  setDoc,
  onSnapshot,
  limit,
  startAfter,
  getCountFromServer,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { mockStudents } from '../mockData';
import {
  getCached,
  invalidateDbCache,
  fetchWithSWR,
  STATIC_CACHE_TTL_MS,
} from '../cacheService';
import { Student, OperationType, handleFirestoreError } from './types';
import { getGroupAliases } from './groups';

// Fetch all students with SWR (20 mins static TTL)
export async function getStudents(forceFresh = false): Promise<Student[]> {
  return fetchWithSWR<Student[]>('students', async () => {
    try {
      const q = query(collection(db, 'students'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }

    return mockStudents;
  }, { forceFresh, freshTtlMs: STATIC_CACHE_TTL_MS });
}

// Real-time listener for students collection
export function subscribeToStudents(callback: (students: Student[]) => void): () => void {
  const colRef = collection(db, 'students');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      callback(items);
    } else {
      callback(mockStudents);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'students');
    callback(mockStudents);
  });
}

export async function getStudentsPaginated(
  pageSize: number = 20,
  lastDocSnap?: any,
  filters?: {
    groupId?: string;
    classFilter?: string;
    searchTerm?: string;
  }
): Promise<{ data: Student[], lastDoc: any, hasMore: boolean }> {
  try {
    let q: any = collection(db, 'students');

    if (filters?.groupId && filters.groupId !== 'all') {
      q = query(q, where('groupId', '==', filters.groupId));
    }
    
    q = query(q, orderBy('name', 'asc'));

    if (lastDocSnap && lastDocSnap.id) {
      q = query(q, startAfter(lastDocSnap));
    }

    q = query(q, limit(pageSize));

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docs = snapshot.docs;
      let items = docs.map(d => ({ id: d.id, ...(d.data() as any) } as Student));
      
      if (filters?.searchTerm || filters?.classFilter) {
        items = items.filter(s => {
          const matchSearch = filters.searchTerm 
            ? s.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) || (s.nis && s.nis.includes(filters.searchTerm))
            : true;
          const matchClass = filters.classFilter ? s.class?.includes(filters.classFilter) : true;
          return matchSearch && matchClass;
        });
      }

      return {
        data: items,
        lastDoc: docs[docs.length - 1],
        hasMore: docs.length === pageSize
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }

  // Fallback to local mock
  let items = mockStudents;
  if (filters?.groupId && filters.groupId !== 'all') {
    items = items.filter(s => s.groupId === filters.groupId);
  }
  if (filters?.classFilter) {
    items = items.filter(s => s.class?.includes(filters.classFilter as string));
  }
  if (filters?.searchTerm) {
    items = items.filter(s => 
      s.name.toLowerCase().includes(filters.searchTerm!.toLowerCase()) || 
      (s.nis && s.nis.includes(filters.searchTerm!))
    );
  }
  
  const startIndex = lastDocSnap && typeof lastDocSnap.index === 'number' ? lastDocSnap.index : 0;
  const paginated = items.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < items.length;

  return {
    data: paginated,
    lastDoc: hasMore ? { index: startIndex + pageSize } : null,
    hasMore
  };
}

export async function addStudent(studentData: Omit<Student, 'id'>): Promise<string> {
  const payload = {
    ...studentData,
    gender: (studentData.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
    status: (studentData.status || 'Aktif') as 'Aktif' | 'Nonaktif',
    createdAt: new Date().toISOString()
  };
  try {
    const docRef = await addDoc(collection(db, 'students'), payload);
    const newStudent = { id: docRef.id, ...payload } as any;
    const existingIdx = mockStudents.findIndex(s => s.id === docRef.id);
    if (existingIdx >= 0) {
      mockStudents[existingIdx] = newStudent;
    } else {
      mockStudents.unshift(newStudent);
    }
    invalidateDbCache('students');
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
    throw error;
  }
}

export async function batchAddStudents(
  studentsList: Array<Omit<Student, 'id'>>,
  onProgress?: (processed: number, total: number) => void
): Promise<{ successCount: number; errorCount: number }> {
  invalidateDbCache('students');
  const CHUNK_SIZE = 400; // Under Firestore limit of 500
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < studentsList.length; i += CHUNK_SIZE) {
    const chunk = studentsList.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      const addedStudents: Student[] = [];

      for (const item of chunk) {
        const docRef = doc(collection(db, 'students'));
        const payload = {
          ...item,
          gender: (item.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
          status: (item.status || 'Aktif') as 'Aktif' | 'Nonaktif',
          createdAt: new Date().toISOString(),
        };
        batch.set(docRef, payload);
        addedStudents.push({ id: docRef.id, ...payload });
      }

      await batch.commit();
      mockStudents.unshift(...(addedStudents as any[]));
      successCount += chunk.length;
    } catch (err) {
      console.error('Batch commit failed, falling back to sequential save:', err);
      for (const item of chunk) {
        try {
          await addStudent(item);
          successCount++;
        } catch {
          errorCount++;
        }
      }
    }
    if (onProgress) {
      onProgress(Math.min(i + CHUNK_SIZE, studentsList.length), studentsList.length);
    }
  }

  invalidateDbCache('students');
  return { successCount, errorCount };
}

export async function updateStudent(id: string, studentData: Partial<Student>): Promise<void> {
  try {
    const docRef = doc(db, 'students', id);
    await setDoc(docRef, studentData, { merge: true });
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents[idx] = { ...mockStudents[idx], ...studentData } as any;
    }
    invalidateDbCache('students');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
    throw error;
  }
}

export async function deleteStudent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'students', id));
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents.splice(idx, 1);
    }
    invalidateDbCache('students');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    throw error;
  }
}

export async function deactivateStudent(id: string): Promise<void> {
  return updateStudent(id, { status: 'Nonaktif' });
}

export async function activateStudent(id: string): Promise<void> {
  return updateStudent(id, { status: 'Aktif' });
}

export interface StudentAbsenceAlert {
  studentId: string;
  consecutiveAlpaCount: number;
  totalAlpaCount: number;
  hasAlert: boolean; // true if consecutiveAlpaCount >= 3 or totalAlpaCount >= 3
  isConsecutiveAlert: boolean; // true if consecutiveAlpaCount >= 3
  recentDates: string[];
}

export function calculateStudentAbsenceAlerts(
  attendanceRecords: any[]
): Map<string, StudentAbsenceAlert> {
  const recordsByStudent = new Map<string, any[]>();

  attendanceRecords.forEach(rec => {
    if (!rec.studentId) return;
    const list = recordsByStudent.get(rec.studentId) || [];
    list.push(rec);
    recordsByStudent.set(rec.studentId, list);
  });

  const alerts = new Map<string, StudentAbsenceAlert>();

  recordsByStudent.forEach((records, studentId) => {
    const uniqueRecordsMap = new Map<string, any>();
    records.forEach(r => {
      const key = r.meetingNumber ? `m_${r.meetingNumber}` : (r.date ? r.date.split('T')[0] : r.id || Math.random().toString());
      uniqueRecordsMap.set(key, r);
    });

    const sorted = Array.from(uniqueRecordsMap.values()).sort((a, b) => {
      if (a.date && b.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.meetingNumber || 0) - (a.meetingNumber || 0);
    });

    let consecutiveAlpa = 0;
    let totalAlpa = 0;
    const recentAlpaDates: string[] = [];

    sorted.forEach(r => {
      const st = (r.status || '').toLowerCase().trim();
      if (st === 'alpa') {
        totalAlpa++;
      }
    });

    for (const rec of sorted) {
      const st = (rec.status || '').toLowerCase().trim();
      if (st === 'alpa') {
        consecutiveAlpa++;
        const dStr = rec.date ? rec.date.split('T')[0] : `Pertemuan ${rec.meetingNumber || ''}`;
        recentAlpaDates.push(dStr);
      } else {
        break;
      }
    }

    // Sesuai permintaan pengguna: peringatan khusus untuk 3x alpa beruntun (consecutive)
    const hasAlert = consecutiveAlpa >= 3;

    alerts.set(studentId, {
      studentId,
      consecutiveAlpaCount: consecutiveAlpa,
      totalAlpaCount: totalAlpa,
      hasAlert,
      isConsecutiveAlert: consecutiveAlpa >= 3,
      recentDates: recentAlpaDates.slice(0, 3)
    });
  });

  return alerts;
}

const isStudentInactive = (s: { status?: string }) => {
  const st = s.status || '';
  return st === 'Nonaktif' || st === 'Non-Aktif';
};

export async function getTotalStudentsCount(): Promise<number> {
  const cachedStudents = getCached<Student[]>('students');
  if (cachedStudents) {
    return cachedStudents.filter(s => !isStudentInactive(s)).length;
  }
  try {
    const colRef = collection(db, 'students');
    const snapshot = await getCountFromServer(colRef);
    return snapshot.data().count;
  } catch (error) {
    console.warn("Failed to get count from server, falling back to mock", error);
    return mockStudents.filter(s => !isStudentInactive(s)).length;
  }
}

export async function getGroupStudentsCount(groupId: string): Promise<number> {
  const cachedStudents = getCached<Student[]>('students');
  if (cachedStudents) {
    return cachedStudents.filter(s => s.groupId === groupId && !isStudentInactive(s)).length;
  }
  try {
    const q = query(collection(db, 'students'), where('groupId', '==', groupId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    return mockStudents.filter(s => s.groupId === groupId && !isStudentInactive(s)).length;
  }
}

// Fetch students for a specific group with server-side query and SWR (excludes inactive students by default)
export async function getStudentsByGroup(
  groupId: string, 
  forceFresh = false, 
  includeInactive = false
): Promise<Student[]> {
  const cacheKey = `students_group_${groupId}`;
  const aliases = getGroupAliases(groupId);

  let rawStudents: Student[] | null = null;
  if (!forceFresh) {
    const cachedGroup = getCached<Student[]>(cacheKey);
    if (cachedGroup) {
      rawStudents = cachedGroup;
    } else {
      const cachedAll = getCached<Student[]>('students');
      if (cachedAll) {
        const filtered = cachedAll.filter(s => aliases.includes(s.groupId));
        if (filtered.length > 0) rawStudents = filtered;
      }
    }
  }

  if (!rawStudents) {
    rawStudents = await fetchWithSWR<Student[]>(cacheKey, async () => {
      try {
        const q = aliases.length > 1
          ? query(
              collection(db, 'students'),
              where('groupId', 'in', aliases)
            )
          : query(
              collection(db, 'students'),
              where('groupId', '==', groupId)
            );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
          if (items.length > 0) {
            return items;
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'students');
      }

      return mockStudents.filter(s => aliases.includes(s.groupId));
    }, { forceFresh, freshTtlMs: STATIC_CACHE_TTL_MS });
  }

  if (includeInactive) {
    return rawStudents;
  }
  return rawStudents.filter(s => !isStudentInactive(s));
}
