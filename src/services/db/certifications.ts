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
import { StudentCertification, OperationType, handleFirestoreError } from './types';
import { logSystemActivity } from './auditLogs';
import { defaultSeedCertifications } from './initialData';

const LOCAL_STORAGE_CERTS_KEY = 'sibtq_certifications_v1';

export async function getCertifications(
  groupId?: string,
  pageSize: number = 20,
  lastDocSnap?: any
): Promise<{ data: StudentCertification[], lastDoc: any, hasMore: boolean }> {
  try {
    const certCol = collection(db, 'certifications');
    let q = groupId 
      ? query(certCol, where('groupId', '==', groupId), orderBy('updatedAt', 'desc'))
      : query(certCol, orderBy('updatedAt', 'desc'));
      
    if (lastDocSnap && lastDocSnap.id) {
      q = query(q, startAfter(lastDocSnap));
    }
    
    q = query(q, limit(pageSize));
    
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docs = snap.docs;
      return {
        data: docs.map(d => ({ id: d.id, ...d.data() } as StudentCertification)),
        lastDoc: docs[docs.length - 1],
        hasMore: docs.length === pageSize
      };
    } else {
      return { data: [], lastDoc: null, hasMore: false };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'certifications');
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CERTS_KEY);
    let list: StudentCertification[] = raw ? JSON.parse(raw) : defaultSeedCertifications;
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_CERTS_KEY, JSON.stringify(defaultSeedCertifications));
    }
    
    // Sort local data descending by updatedAt
    list.sort((a, b) => new Date(b.updatedAt || b.completedDate || 0).getTime() - new Date(a.updatedAt || a.completedDate || 0).getTime());
    
    if (groupId) {
      list = list.filter(c => c.groupId === groupId);
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
    return { data: defaultSeedCertifications.slice(0, pageSize), lastDoc: null, hasMore: false };
  }
}

export async function saveCertification(cert: StudentCertification): Promise<string> {
  const payload = {
    ...cert,
    updatedAt: new Date().toISOString()
  };

  // 1. Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CERTS_KEY);
    const list: StudentCertification[] = raw ? JSON.parse(raw) : defaultSeedCertifications;
    const tempId = cert.id || `cert_${Date.now()}`;
    const existingIndex = list.findIndex(c => 
      (c.id && c.id === tempId) || 
      (c.studentId === cert.studentId && c.category === cert.category)
    );

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...payload, id: list[existingIndex].id };
    } else {
      list.unshift({ ...payload, id: tempId });
    }
    localStorage.setItem(LOCAL_STORAGE_CERTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not save cert locally", e);
  }

  let finalId = cert.id || `cert_${Date.now()}`;
  // 2. Persist to Firestore
  try {
    if (cert.id && !cert.id.startsWith('cert_seed_')) {
      const docRef = doc(db, 'certifications', cert.id);
      await setDoc(docRef, payload, { merge: true });
    } else {
      const docRef = await addDoc(collection(db, 'certifications'), payload);
      finalId = docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'certifications');
  }

  const studentName = cert.studentName || 'Santri';
  await logSystemActivity(
    'certification',
    'Sertifikasi Kelulusan',
    `Sertifikasi "${cert.category}" diterbitkan untuk ${studentName}.`
  );

  return finalId;
}

export async function deleteCertification(certId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CERTS_KEY);
    if (raw) {
      const list: StudentCertification[] = JSON.parse(raw);
      const filtered = list.filter(c => c.id !== certId);
      localStorage.setItem(LOCAL_STORAGE_CERTS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn(e);
  }

  try {
    await deleteDoc(doc(db, 'certifications', certId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `certifications/${certId}`);
  }
}
