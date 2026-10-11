import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { fetchWithSWR, invalidateDbCache, STATIC_CACHE_TTL_MS } from '../cacheService';
import { OperationType, handleFirestoreError } from './types';

export interface AcademicHoliday {
  id: string;          // format: 'holiday_YYYY-MM-DD'
  date: string;        // '2026-08-29'
  reason: string;      // 'Libur Maulid Nabi' / 'Kegiatan Sekolah'
  semester: number;    // 1 atau 2
  academicYear: string;// '2026/2027'
  createdBy?: string;
  createdAt: string;
}

const LOCAL_STORAGE_HOLIDAYS_KEY = 'btq_academic_holidays_cache';

// Helper baca cache lokal
function getLocalHolidays(): AcademicHoliday[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HOLIDAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper simpan cache lokal
function saveLocalHolidays(holidays: AcademicHoliday[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_HOLIDAYS_KEY, JSON.stringify(holidays));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Mengambil daftar hari libur akademik dari Cloud Firestore
 */
export async function getAcademicHolidays(forceFresh = false): Promise<AcademicHoliday[]> {
  return fetchWithSWR<AcademicHoliday[]>('academic_holidays', async () => {
    try {
      const q = query(collection(db, 'academic_holidays'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AcademicHoliday));
        saveLocalHolidays(list);
        return list;
      }
    } catch (error) {
      console.warn("Firestore fetch academic_holidays fallback to local:", error);
      handleFirestoreError(error, OperationType.LIST, 'academic_holidays');
    }

    return getLocalHolidays();
  }, { forceFresh, freshTtlMs: STATIC_CACHE_TTL_MS });
}

/**
 * Menyimpan atau menandai hari libur akademik ke Cloud Firestore
 */
export async function saveAcademicHoliday(holiday: {
  date: string;
  reason: string;
  semester?: number;
  academicYear?: string;
  createdBy?: string;
}): Promise<void> {
  const docId = `holiday_${holiday.date.split('T')[0]}`;
  const path = `academic_holidays/${docId}`;
  const nowIso = new Date().toISOString();

  const data: AcademicHoliday = {
    id: docId,
    date: holiday.date.split('T')[0],
    reason: holiday.reason.trim(),
    semester: holiday.semester || 1,
    academicYear: holiday.academicYear || '2026/2027',
    createdBy: holiday.createdBy || 'Admin BTQ',
    createdAt: nowIso
  };

  try {
    await setDoc(doc(db, 'academic_holidays', docId), data);
    invalidateDbCache('academic_holidays');

    // Update local cache
    const current = getLocalHolidays().filter(h => h.date !== data.date);
    current.push(data);
    saveLocalHolidays(current);

    // Broadcast update agar kalender & dashboard otomatis menyelaraskan jadwal
    window.dispatchEvent(new CustomEvent('calendar-updated', { detail: { date: data.date, holiday: data } }));
    window.dispatchEvent(new CustomEvent('attendance-updated'));
  } catch (error) {
    console.error("Gagal menyimpan hari libur ke Firestore:", error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Menghapus status hari libur dan mengaktifkan kembali sesi di Cloud Firestore
 */
export async function deleteAcademicHoliday(date: string): Promise<void> {
  const cleanDate = date.split('T')[0];
  const docId = `holiday_${cleanDate}`;
  const path = `academic_holidays/${docId}`;

  try {
    await deleteDoc(doc(db, 'academic_holidays', docId));
    invalidateDbCache('academic_holidays');

    // Update local cache
    const current = getLocalHolidays().filter(h => h.date !== cleanDate);
    saveLocalHolidays(current);

    // Broadcast update
    window.dispatchEvent(new CustomEvent('calendar-updated', { detail: { date: cleanDate, removed: true } }));
    window.dispatchEvent(new CustomEvent('attendance-updated'));
  } catch (error) {
    console.error("Gagal menghapus status libur dari Firestore:", error);
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Real-time listener untuk sinkronisasi otomatis kalender akademik
 */
export function subscribeAcademicHolidays(
  callback: (holidays: AcademicHoliday[]) => void
): () => void {
  try {
    const q = query(collection(db, 'academic_holidays'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AcademicHoliday));
        saveLocalHolidays(list);
        callback(list);
      },
      (error) => {
        console.warn("Snapshot error academic_holidays:", error);
        callback(getLocalHolidays());
      }
    );
  } catch (err) {
    console.warn("Unable to attach snapshot to academic_holidays:", err);
    callback(getLocalHolidays());
    return () => {};
  }
}
