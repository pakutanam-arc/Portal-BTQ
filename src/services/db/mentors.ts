import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  fetchWithSWR,
  invalidateDbCache,
  STATIC_CACHE_TTL_MS,
} from '../cacheService';
import { Mentor, OperationType, handleFirestoreError } from './types';
import { mentorMappingData } from './initialData';
import { logSystemActivity } from './auditLogs';

// Fetch all mentors with SWR (20 mins static TTL)
export async function getMentors(forceFresh = false): Promise<Mentor[]> {
  return fetchWithSWR<Mentor[]>('mentors', async () => {
    try {
      const q = query(collection(db, 'mentors'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => {
          const data = doc.data() as Mentor;
          const mapEntry = mentorMappingData.find(m => m.id === doc.id || m.groupId === data.groupId);
          return {
            id: doc.id,
            ...data,
            name: data.name || (mapEntry ? mapEntry.name : 'Mentor'),
            email: data.email || (mapEntry ? mapEntry.newEmail : 'mentor@smpn102.sch.id'),
            role: 'mentor',
            status: 'Aktif'
          };
        });
      }
      return [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'mentors');
      return [];
    }
  }, { forceFresh, freshTtlMs: STATIC_CACHE_TTL_MS });
}

/**
 * Memperbarui nama tampilan mentor di Firestore tanpa mengubah akun/user login
 */
export async function updateMentorName(mentorId: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('Nama mentor tidak boleh kosong');
  }

  try {
    const docRef = doc(db, 'mentors', mentorId);
    await setDoc(docRef, {
      name: trimmed,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Invalidate caches agar perubahan langsung muncul di seluruh antarmuka
    invalidateDbCache('mentors');
    invalidateDbCache('groups');

    await logSystemActivity(
      'mentor',
      'Pembaruan Profil Mentor',
      `Nama mentor ID "${mentorId}" diperbarui menjadi "${trimmed}". Akun user tetap aman.`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mentors/${mentorId}`);
    throw error;
  }
}
