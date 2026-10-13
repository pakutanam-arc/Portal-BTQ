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
    return { data: [], lastDoc: null, hasMore: false };
  }
}

export async function saveTeachingJournal(journal: TeachingJournal): Promise<string> {
  invalidateDbCache('teaching_journals');
  const payload = {
    ...journal,
    createdAt: journal.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  let finalId = journal.id || `journal_${Date.now()}`;
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
    await deleteDoc(doc(db, 'teaching_journals', journalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teaching_journals/${journalId}`);
  }
}
