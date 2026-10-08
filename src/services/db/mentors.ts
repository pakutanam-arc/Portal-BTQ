import {
  collection,
  getDocs,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { mockMentors } from '../mockData';
import {
  fetchWithSWR,
  STATIC_CACHE_TTL_MS,
} from '../cacheService';
import { Mentor, OperationType, handleFirestoreError } from './types';
import { mentorMappingData } from './initialData';

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
            name: mapEntry ? mapEntry.name : data.name,
            email: mapEntry ? mapEntry.newEmail : (data.email || 'mentor@smpn102.sch.id'),
            role: 'mentor',
            status: 'Aktif'
          };
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'mentors');
    }

    return mockMentors.map(m => {
      const mapEntry = mentorMappingData.find(map => map.id === m.id || map.groupId === m.groupId);
      return {
        ...m,
        name: mapEntry ? mapEntry.name : m.name,
        email: mapEntry ? mapEntry.newEmail : m.email,
        role: 'mentor',
        status: 'Aktif'
      };
    });
  }, { forceFresh, freshTtlMs: STATIC_CACHE_TTL_MS });
}
