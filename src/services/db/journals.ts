import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { db } from '../firebase';
import { invalidateDbCache } from '../cacheService';
import { TeachingJournal, OperationType, handleFirestoreError } from './types';
import { getGroupAliases, cleanGroupName } from './groups';
import { logSystemActivity } from './auditLogs';
import { defaultSeedJournals } from './initialData';

const LOCAL_STORAGE_JOURNALS_KEY = 'sibtq_teaching_journals_v1';

export async function getTeachingJournals(
  groupId?: string,
  pageSize: number = 20,
  lastDocSnap?: any,
  startDate?: string
): Promise<{ data: TeachingJournal[], lastDoc: any, hasMore: boolean }> {
  try {
    const journalCol = collection(db, 'teaching_journals');
    const aliases = groupId ? getGroupAliases(groupId) : [];
    let q;
    if (groupId && groupId !== 'all') {
      if (startDate) {
        q = aliases.length > 1
          ? query(journalCol, where('groupId', 'in', aliases), where('date', '>=', startDate), limit(pageSize))
          : query(journalCol, where('groupId', '==', groupId), where('date', '>=', startDate), limit(pageSize));
      } else {
        q = aliases.length > 1
          ? query(journalCol, where('groupId', 'in', aliases), limit(pageSize))
          : query(journalCol, where('groupId', '==', groupId), limit(pageSize));
      }
    } else {
      if (startDate) {
        q = query(journalCol, where('date', '>=', startDate), orderBy('date', 'desc'), limit(pageSize));
      } else {
        q = query(journalCol, orderBy('date', 'desc'), limit(pageSize));
      }
    }
      
    if (lastDocSnap && lastDocSnap.id) {
      q = query(q, startAfter(lastDocSnap));
    }
      
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) } as TeachingJournal));
      // Sort in memory by meetingNumber descending, then date descending
      docs.sort((a, b) => (b.meetingNumber || 0) - (a.meetingNumber || 0) || new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        data: docs,
        lastDoc: snap.docs[snap.docs.length - 1],
        hasMore: snap.docs.length === pageSize
      };
    } else {
      return { data: [], lastDoc: null, hasMore: false };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'teaching_journals');
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOURNALS_KEY);
    let list: TeachingJournal[] = raw ? JSON.parse(raw) : defaultSeedJournals;
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_JOURNALS_KEY, JSON.stringify(defaultSeedJournals));
    }
    if (groupId && groupId !== 'all') {
      const aliases = getGroupAliases(groupId);
      list = list.filter(j => aliases.includes(j.groupId));
    }
    if (startDate) {
      list = list.filter(j => !j.date || j.date >= startDate);
    }
    
    const startIndex = lastDocSnap && typeof lastDocSnap.index === 'number' ? lastDocSnap.index : 0;
    const paginated = list.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < list.length;
    
    return {
      data: paginated,
      lastDoc: hasMore ? { index: startIndex + pageSize } : null,
      hasMore
    };
  } catch {
    const fallbackList = defaultSeedJournals.filter(j => !startDate || !j.date || j.date >= startDate);
    return { data: fallbackList.slice(0, pageSize), lastDoc: null, hasMore: false };
  }
}

export async function saveTeachingJournal(journal: TeachingJournal): Promise<string> {
  invalidateDbCache('teaching_journals');
  const payload = {
    ...journal,
    createdAt: journal.createdAt || new Date().toISOString()
  };

  // 1. Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOURNALS_KEY);
    const list: TeachingJournal[] = raw ? JSON.parse(raw) : defaultSeedJournals;
    const tempId = journal.id || `journal_${Date.now()}`;
    const existingIndex = list.findIndex(j => j.id === tempId || (j.groupId === journal.groupId && j.date === journal.date));
    
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...payload, id: list[existingIndex].id };
    } else {
      list.unshift({ ...payload, id: tempId });
    }
    localStorage.setItem(LOCAL_STORAGE_JOURNALS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not save journal locally", e);
  }

  let finalId = journal.id || `journal_${Date.now()}`;
  // 2. Persist to Firestore
  try {
    if (journal.id) {
      const docRef = doc(db, 'teaching_journals', journal.id);
      await setDoc(docRef, payload, { merge: true });
    } else {
      const docRef = await addDoc(collection(db, 'teaching_journals'), payload);
      finalId = docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'teaching_journals');
  }

  const mentorName = journal.mentorName || 'Mentor';
  const groupName = cleanGroupName(journal.groupId);
  await logSystemActivity(
    'journal',
    'Jurnal Mengajar',
    `${mentorName} mengisi jurnal mengajar untuk ${groupName}.`
  );

  return finalId;
}

export async function deleteTeachingJournal(journalId: string): Promise<void> {
  invalidateDbCache('teaching_journals');
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOURNALS_KEY);
    if (raw) {
      const list: TeachingJournal[] = JSON.parse(raw);
      const filtered = list.filter(j => j.id !== journalId);
      localStorage.setItem(LOCAL_STORAGE_JOURNALS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn(e);
  }

  try {
    await deleteDoc(doc(db, 'teaching_journals', journalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teaching_journals/${journalId}`);
  }
}
