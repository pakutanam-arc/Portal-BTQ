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
            status: 'Aktif',
            signature: data.signature || (mapEntry as any)?.signature || ''
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
  return updateMentorProfile(mentorId, { name: newName });
}

/**
 * Memperbarui nama dan tanda tangan digital mentor di Firestore
 */
export async function updateMentorProfile(
  mentorId: string, 
  updates: { name: string; signature?: string; email?: string }
): Promise<void> {
  const trimmed = updates.name.trim();
  if (!trimmed) {
    throw new Error('Nama mentor tidak boleh kosong');
  }

  try {
    const docRef = doc(db, 'mentors', mentorId);
    const payload: Partial<Mentor> & { updatedAt: string } = {
      name: trimmed,
      updatedAt: new Date().toISOString()
    };
    if (updates.signature !== undefined) {
      payload.signature = updates.signature;
    }
    if (updates.email) {
      payload.email = updates.email;
    }

    await setDoc(docRef, payload, { merge: true });

    // Update juga di users jika ada
    try {
      const userRef = doc(db, 'users', mentorId);
      await setDoc(userRef, {
        name: trimmed,
        signature: updates.signature || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}

    // Invalidate caches agar perubahan langsung muncul di seluruh antarmuka
    invalidateDbCache('mentors');
    invalidateDbCache('groups');

    // Dispatch event browser agar antarmuka aktif langsung bereaksi
    window.dispatchEvent(new CustomEvent('user_profile_updated', {
      detail: {
        mentorId,
        name: trimmed,
        signature: updates.signature || ''
      }
    }));

    await logSystemActivity(
      'mentor',
      'Pembaruan Profil Mentor',
      `Profil mentor ID "${mentorId}" (${trimmed}) dan tanda tangan digital berhasil diperbarui.`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mentors/${mentorId}`);
    throw error;
  }
}
