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
import {
  g1NewNames,
  g2NewNames,
  g3NewNames,
  g4NewNames,
  g5NewNames,
  g6NewNames,
  g7NewNames,
  g8NewNames,
  g9NewNames,
  g10NewNames,
} from './initialData';

// Fetch all students with SWR (20 mins static TTL)
export async function getStudents(forceFresh = false): Promise<Student[]> {
  return fetchWithSWR<Student[]>('students', async () => {
    try {
      const q = query(collection(db, 'students'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        
        // Reconcile with updated legacy group rosters if needed
        const hasLegacyG1 = items.some(s => (s.groupId === 'g1' || s.groupId === 'group_1') && !g1NewNames.has(s.name));
        if (hasLegacyG1) {
          const g1MockStudents = mockStudents.filter(s => s.groupId === 'g1');
          items = items.filter(s => s.groupId !== 'g1' && s.groupId !== 'group_1').concat(g1MockStudents);
        }
        const hasLegacyG2 = items.some(s => (s.groupId === 'g2' || s.groupId === 'group_2') && !g2NewNames.has(s.name));
        if (hasLegacyG2) {
          const g2MockStudents = mockStudents.filter(s => s.groupId === 'g2');
          items = items.filter(s => s.groupId !== 'g2' && s.groupId !== 'group_2').concat(g2MockStudents);
        }
        const hasLegacyG3 = items.some(s => (s.groupId === 'g3' || s.groupId === 'group_3') && !g3NewNames.has(s.name));
        if (hasLegacyG3) {
          const g3MockStudents = mockStudents.filter(s => s.groupId === 'g3');
          items = items.filter(s => s.groupId !== 'g3' && s.groupId !== 'group_3').concat(g3MockStudents);
        }
        const hasLegacyG4 = items.some(s => (s.groupId === 'g4' || s.groupId === 'group_4') && !g4NewNames.has(s.name));
        if (hasLegacyG4) {
          const g4MockStudents = mockStudents.filter(s => s.groupId === 'g4');
          items = items.filter(s => s.groupId !== 'g4' && s.groupId !== 'group_4').concat(g4MockStudents);
        }
        const hasLegacyG5 = items.some(s => (s.groupId === 'g5' || s.groupId === 'group_5') && !g5NewNames.has(s.name));
        if (hasLegacyG5) {
          const g5MockStudents = mockStudents.filter(s => s.groupId === 'g5');
          items = items.filter(s => s.groupId !== 'g5' && s.groupId !== 'group_5').concat(g5MockStudents);
        }
        const hasLegacyG6 = items.some(s => (s.groupId === 'g6' || s.groupId === 'group_6') && !g6NewNames.has(s.name));
        if (hasLegacyG6) {
          const g6MockStudents = mockStudents.filter(s => s.groupId === 'g6');
          items = items.filter(s => s.groupId !== 'g6' && s.groupId !== 'group_6').concat(g6MockStudents);
        }
        const hasLegacyG7 = items.some(s => (s.groupId === 'g7' || s.groupId === 'group_7') && !g7NewNames.has(s.name));
        if (hasLegacyG7) {
          const g7MockStudents = mockStudents.filter(s => s.groupId === 'g7');
          items = items.filter(s => s.groupId !== 'g7' && s.groupId !== 'group_7').concat(g7MockStudents);
        }
        const hasLegacyG8 = items.some(s => (s.groupId === 'g8' || s.groupId === 'group_8') && !g8NewNames.has(s.name));
        if (hasLegacyG8) {
          const g8MockStudents = mockStudents.filter(s => s.groupId === 'g8');
          items = items.filter(s => s.groupId !== 'g8' && s.groupId !== 'group_8').concat(g8MockStudents);
        }
        const hasLegacyG9 = items.some(s => (s.groupId === 'g9' || s.groupId === 'group_9') && !g9NewNames.has(s.name));
        if (hasLegacyG9) {
          const g9MockStudents = mockStudents.filter(s => s.groupId === 'g9');
          items = items.filter(s => s.groupId !== 'g9' && s.groupId !== 'group_9').concat(g9MockStudents);
        }
        const hasLegacyG10 = items.some(s => (s.groupId === 'g10' || s.groupId === 'group_10') && !g10NewNames.has(s.name));
        if (hasLegacyG10) {
          const g10MockStudents = mockStudents.filter(s => s.groupId === 'g10');
          items = items.filter(s => s.groupId !== 'g10' && s.groupId !== 'group_10').concat(g10MockStudents);
        }
        return items;
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
  invalidateDbCache('students');
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
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
    const newId = `s_${Date.now()}`;
    const newStudent = { id: newId, ...payload } as any;
    mockStudents.unshift(newStudent);
    return newId;
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

  return { successCount, errorCount };
}

export async function updateStudent(id: string, studentData: Partial<Student>): Promise<void> {
  invalidateDbCache('students');
  try {
    const docRef = doc(db, 'students', id);
    await setDoc(docRef, studentData, { merge: true });
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents[idx] = { ...mockStudents[idx], ...studentData } as any;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents[idx] = { ...mockStudents[idx], ...studentData } as any;
    }
  }
}

export async function deleteStudent(id: string): Promise<void> {
  invalidateDbCache('students');
  try {
    await deleteDoc(doc(db, 'students', id));
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents.splice(idx, 1);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents.splice(idx, 1);
    }
  }
}

export async function getTotalStudentsCount(): Promise<number> {
  const cachedStudents = getCached<Student[]>('students');
  if (cachedStudents) {
    return cachedStudents.length;
  }
  try {
    const colRef = collection(db, 'students');
    const snapshot = await getCountFromServer(colRef);
    return snapshot.data().count;
  } catch (error) {
    console.warn("Failed to get count from server, falling back to mock", error);
    return mockStudents.length;
  }
}

export async function getGroupStudentsCount(groupId: string): Promise<number> {
  const cachedStudents = getCached<Student[]>('students');
  if (cachedStudents) {
    return cachedStudents.filter(s => s.groupId === groupId).length;
  }
  try {
    const q = query(collection(db, 'students'), where('groupId', '==', groupId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    return mockStudents.filter(s => s.groupId === groupId).length;
  }
}

// Fetch students for a specific group with server-side query and SWR
export async function getStudentsByGroup(groupId: string, forceFresh = false): Promise<Student[]> {
  const cacheKey = `students_group_${groupId}`;
  const aliases = getGroupAliases(groupId);

  if (!forceFresh) {
    const cachedGroup = getCached<Student[]>(cacheKey);
    if (cachedGroup) return cachedGroup;
    const cachedAll = getCached<Student[]>('students');
    if (cachedAll) {
      const filtered = cachedAll.filter(s => aliases.includes(s.groupId));
      if (filtered.length > 0) return filtered;
    }
  }

  return fetchWithSWR<Student[]>(cacheKey, async () => {
    try {
      const q = aliases.length > 1
        ? query(
            collection(db, 'students'),
            where('groupId', 'in', aliases),
            limit(50)
          )
        : query(
            collection(db, 'students'),
            where('groupId', '==', groupId),
            limit(50)
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
