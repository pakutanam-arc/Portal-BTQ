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
    return { data: [], lastDoc: null, hasMore: false };
  }
}

export async function saveCertification(cert: StudentCertification): Promise<string> {
  const payload = {
    ...cert,
    updatedAt: new Date().toISOString()
  };

  let finalId = cert.id || `cert_${Date.now()}`;
  try {
    if (cert.id) {
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
    await deleteDoc(doc(db, 'certifications', certId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `certifications/${certId}`);
  }
}
