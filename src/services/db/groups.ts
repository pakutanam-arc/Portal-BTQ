import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { mockGroups } from '../mockData';
import { fetchWithSWR, STATIC_CACHE_TTL_MS } from '../cacheService';
import { Group, OperationType, handleFirestoreError } from './types';

// Helper to parse group number for sorting
export function getGroupNumber(group: { name?: string; id?: string }): number {
  const matchName = group.name?.match(/\d+/);
  if (matchName) return parseInt(matchName[0], 10);
  const matchId = group.id?.match(/\d+/);
  if (matchId) return parseInt(matchId[0], 10);
  return 0;
}

// Helper to clean group display name
export function cleanGroupName(groupId: string): string {
  if (!groupId) return 'Kelompok';
  const num = groupId.replace('group_', '').replace('g', '');
  return `Kelompok ${num}`;
}

// Helper to determine Grade ID for a group:
// Kelompok 1, 2, 3, 7, 8: Grade 1 (Utsmani Jilid 1)
// Kelompok 4, 5, 6, 9: Grade 2 (Utsmani Jilid 2)
// Kelompok 10: Grade 3 (Kurikulum Al-Qur'an & Hafalan Juz 30)
export function getGroupGradeId(group: { name?: string; id?: string; gradeId?: string }): string {
  const gNum = getGroupNumber(group);
  // Kelompok 10 = Grade 3
  if (gNum === 10 || group.id === 'g10' || group.id === 'group_10' || group.name?.toLowerCase().includes('10') || group.name?.toLowerCase().includes('tahfizh')) {
    return 'grade3';
  }
  // Kelompok 4, 5, 6, 9 = Grade 2
  if ([4, 5, 6, 9].includes(gNum) || ['g4', 'g5', 'g6', 'g9'].includes(group.id || '')) {
    return 'grade2';
  }
  // Kelompok 1, 2, 3, 7, 8 = Grade 1
  if ([1, 2, 3, 7, 8].includes(gNum) || ['g1', 'g2', 'g3', 'g7', 'g8'].includes(group.id || '')) {
    return 'grade1';
  }
  if (group.gradeId === 'grade3' || group.gradeId === 'grade2' || group.gradeId === 'grade1') {
    return group.gradeId;
  }
  return 'grade1';
}

export function getGroupAliases(groupId: string): string[] {
  if (!groupId) return [];
  const normalized = groupId.trim();
  if (normalized.startsWith('group_')) {
    const num = normalized.replace('group_', '');
    return [normalized, `g${num}`];
  }
  if (/^g\d+$/.test(normalized)) {
    const num = normalized.replace('g', '');
    return [normalized, `group_${num}`];
  }
  return [normalized];
}

// Fetch all groups with SWR (20 mins static TTL)
export async function getGroups(forceFresh = false): Promise<Group[]> {
  return fetchWithSWR<Group[]>('groups', async () => {
    try {
      const q = query(collection(db, 'groups'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => {
          const data = doc.data() as Group;
          const gradeId = getGroupGradeId({ id: doc.id, ...data });
          return { id: doc.id, ...data, schedule: 'Sabtu, 07:15 - 08:00', gradeId };
        });
        return items.sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    }

    // Fallback to initial groups
    const sortedMock = [...mockGroups].sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
    return sortedMock.map(g => {
      const gradeId = getGroupGradeId(g);
      return { ...g, schedule: 'Sabtu, 07:15 - 08:00', gradeId };
    });
  }, { forceFresh, freshTtlMs: STATIC_CACHE_TTL_MS });
}
