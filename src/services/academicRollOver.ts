import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Student, getStudents, addAuditLog, invalidateDbCache } from './db';
import { exportFullDatabaseBackup } from './backupRestore';

export interface AcademicConfig {
  academicYear: string; // e.g. "2026/2027"
  semester: 'Ganjil' | 'Genap';
  activeMeetingNumber: number; // e.g. 1
  lastRolloverDate?: string;
  notes?: string;
}

export const DEFAULT_ACADEMIC_CONFIG: AcademicConfig = {
  academicYear: '2026/2027',
  semester: 'Ganjil',
  activeMeetingNumber: 1,
  lastRolloverDate: undefined,
  notes: 'Tahun Ajaran Aktif Portal BTQ SMPN 102 Jakarta',
};

const LOCAL_STORAGE_ACADEMIC_KEY = 'sibtq_academic_config';

/**
 * Mengambil konfigurasi tahun ajaran aktif dari localStorage atau Firestore
 */
export async function getAcademicConfig(): Promise<AcademicConfig> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACADEMIC_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Gagal membaca academic config dari localStorage', e);
  }

  try {
    const docRef = doc(db, 'settings', 'academic_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as AcademicConfig;
      localStorage.setItem(LOCAL_STORAGE_ACADEMIC_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('Firestore offline/warning saat mengambil academic config', e);
  }

  // Simpan default jika belum ada
  try {
    localStorage.setItem(LOCAL_STORAGE_ACADEMIC_KEY, JSON.stringify(DEFAULT_ACADEMIC_CONFIG));
  } catch {}
  return DEFAULT_ACADEMIC_CONFIG;
}

/**
 * Menyimpan pembaruan konfigurasi tahun ajaran
 */
export async function saveAcademicConfig(config: AcademicConfig, userEmail?: string): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACADEMIC_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('sibtq_academic_updated', { detail: config }));
  } catch (e) {
    console.warn('Gagal menyimpan academic config ke localStorage', e);
  }

  try {
    const docRef = doc(db, 'settings', 'academic_config');
    await setDoc(docRef, config, { merge: true });
  } catch (e) {
    console.warn('Gagal menyimpan academic config ke Firestore', e);
  }

  try {
    await addAuditLog({
      actor: userEmail || 'Administrator',
      actorRole: 'admin',
      action: 'Pembaruan Konfigurasi Tahun Ajaran',
      category: 'system',
      severity: 'info',
      details: `Mengubah tahun ajaran aktif ke ${config.academicYear} semester ${config.semester} (Pertemuan ${config.activeMeetingNumber}).`,
    });
  } catch {}
}

/**
 * Logika penentuan kenaikan kelas santri
 */
export function promoteClassName(currentClass: string): { newClass: string; isGraduating: boolean } {
  const trimmed = currentClass.trim();

  // Santri Kelas 9 (misal 9A, 9B, 9.1, IX A) -> Lulus
  if (/^9|^IX/i.test(trimmed)) {
    return { newClass: trimmed, isGraduating: true };
  }

  // Santri Kelas 8 -> Promosi ke Kelas 9
  if (/^8/i.test(trimmed)) {
    return { newClass: trimmed.replace(/^8/, '9'), isGraduating: false };
  }
  if (/^VIII/i.test(trimmed)) {
    return { newClass: trimmed.replace(/^VIII/i, 'IX'), isGraduating: false };
  }

  // Santri Kelas 7 -> Promosi ke Kelas 8
  if (/^7/i.test(trimmed)) {
    return { newClass: trimmed.replace(/^7/, '8'), isGraduating: false };
  }
  if (/^VII/i.test(trimmed)) {
    return { newClass: trimmed.replace(/^VII/i, 'VIII'), isGraduating: false };
  }

  return { newClass: trimmed, isGraduating: false };
}

export interface RollOverSimulation {
  graduating: { student: Student; originalClass: string }[];
  promotedTo9: { student: Student; originalClass: string; newClass: string }[];
  promotedTo8: { student: Student; originalClass: string; newClass: string }[];
  unchangedOrAlumni: { student: Student }[];
  totalActiveStudents: number;
}

/**
 * Menghasilkan simulasi kenaikan kelas dan kelulusan sebelum dieksekusi
 */
export async function simulateAcademicRollOver(): Promise<RollOverSimulation> {
  const students = await getStudents(true);

  const graduating: { student: Student; originalClass: string }[] = [];
  const promotedTo9: { student: Student; originalClass: string; newClass: string }[] = [];
  const promotedTo8: { student: Student; originalClass: string; newClass: string }[] = [];
  const unchangedOrAlumni: { student: Student }[] = [];

  let totalActive = 0;

  for (const s of students) {
    if (s.status === 'Lulus' || s.status === 'Alumni' || s.status === 'Nonaktif' || s.status === 'Pindah') {
      unchangedOrAlumni.push({ student: s });
      continue;
    }

    totalActive++;
    const { newClass, isGraduating } = promoteClassName(s.class);

    if (isGraduating) {
      graduating.push({ student: s, originalClass: s.class });
    } else if (newClass.startsWith('9')) {
      promotedTo9.push({ student: s, originalClass: s.class, newClass });
    } else if (newClass.startsWith('8')) {
      promotedTo8.push({ student: s, originalClass: s.class, newClass });
    } else {
      unchangedOrAlumni.push({ student: s });
    }
  }

  return {
    graduating,
    promotedTo9,
    promotedTo8,
    unchangedOrAlumni,
    totalActiveStudents: totalActive,
  };
}

export interface ExecuteRollOverOptions {
  targetAcademicYear: string;
  targetSemester: 'Ganjil' | 'Genap';
  autoBackupFirst: boolean;
  userEmail?: string;
  onProgress?: (message: string, percent: number) => void;
}

export interface RollOverResult {
  success: boolean;
  graduatedCount: number;
  promotedTo9Count: number;
  promotedTo8Count: number;
  totalUpdated: number;
  newAcademicYear: string;
  newSemester: 'Ganjil' | 'Genap';
  backupDownloaded: boolean;
}

/**
 * Mengeksekusi transisi tahun ajaran secara resmi:
 * 1. Opsional unduh backup snapshot JSON penuh
 * 2. Mengarsipkan santri kelas 9 menjadi 'Lulus'
 * 3. Mempromosikan santri kelas 7 -> 8 dan 8 -> 9
 * 4. Mereset konfigurasi pertemuan aktif ke Pertemuan 1
 * 5. Menjaga seluruh riwayat presensi & nilai tahun sebelumnya tetap utuh
 */
export async function executeAcademicRollOver(options: ExecuteRollOverOptions): Promise<RollOverResult> {
  const { targetAcademicYear, targetSemester, autoBackupFirst, userEmail, onProgress } = options;

  let backupDownloaded = false;

  // 1. Cadangkan otomatis jika dicentang
  if (autoBackupFirst) {
    onProgress?.('Membuat berkas cadangan otomatis sebelum transisi...', 10);
    try {
      await exportFullDatabaseBackup(userEmail);
      backupDownloaded = true;
    } catch (e) {
      console.warn('Gagal membuat auto backup:', e);
    }
  }

  onProgress?.('Mengambil data seluruh santri...', 25);
  const students = await getStudents(true);

  const updatedStudents: Student[] = [];
  let graduatedCount = 0;
  let promotedTo9Count = 0;
  let promotedTo8Count = 0;

  for (const s of students) {
    // Abaikan yang sudah lulus atau alumni
    if (s.status === 'Lulus' || s.status === 'Alumni' || s.status === 'Nonaktif' || s.status === 'Pindah') {
      updatedStudents.push(s);
      continue;
    }

    const { newClass, isGraduating } = promoteClassName(s.class);

    if (isGraduating) {
      updatedStudents.push({
        ...s,
        status: 'Lulus',
      });
      graduatedCount++;
    } else {
      updatedStudents.push({
        ...s,
        class: newClass,
      });
      if (newClass.startsWith('9')) promotedTo9Count++;
      if (newClass.startsWith('8')) promotedTo8Count++;
    }
  }

  const totalUpdated = graduatedCount + promotedTo9Count + promotedTo8Count;

  // 2. Tulis pembaruan santri ke Firestore (chunked batching)
  onProgress?.(`Memperbarui data ${totalUpdated} santri di cloud Firestore...`, 50);
  const chunkSize = 250;
  for (let i = 0; i < updatedStudents.length; i += chunkSize) {
    const chunk = updatedStudents.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const student of chunk) {
      const ref = doc(db, 'students', student.id);
      batch.set(ref, student, { merge: true });
    }
    try {
      await batch.commit();
    } catch (e) {
      console.warn('Batch update students error:', e);
    }
  }

  // 3. Simpan ke local storage
  try {
    localStorage.setItem('sibtq_students', JSON.stringify(updatedStudents));
  } catch {}

  // 4. Perbarui konfigurasi tahun ajaran aktif & reset pertemuan ke 1
  onProgress?.('Memperbarui kalender akademik dan mereset sesi ke Pertemuan 1...', 80);
  const nowIso = new Date().toISOString();
  const newConfig: AcademicConfig = {
    academicYear: targetAcademicYear,
    semester: targetSemester,
    activeMeetingNumber: 1,
    lastRolloverDate: nowIso,
    notes: `Transisi dari tahun sebelumnya pada ${new Date().toLocaleDateString('id-ID')}`,
  };
  await saveAcademicConfig(newConfig, userEmail);

  // 5. Bersihkan cache SWR
  invalidateDbCache();

  // 6. Catat log audit sistem
  onProgress?.('Mencatat log audit transisi tahun ajaran...', 95);
  try {
    await addAuditLog({
      actor: userEmail || 'Administrator',
      actorRole: 'admin',
      action: 'Transisi Tahun Ajaran Baru (Academic Roll-Over)',
      category: 'system',
      severity: 'success',
      details: `Berhasil beralih ke TA ${targetAcademicYear} (${targetSemester}). Total ${graduatedCount} santri Kelas 9 diluluskan, ${promotedTo9Count} santri naik ke Kelas 9, dan ${promotedTo8Count} santri naik ke Kelas 8. Riwayat nilai historis tetap aman.`,
    });
  } catch {}

  onProgress?.('Transisi tahun ajaran berhasil diselesaikan!', 100);

  return {
    success: true,
    graduatedCount,
    promotedTo9Count,
    promotedTo8Count,
    totalUpdated,
    newAcademicYear: targetAcademicYear,
    newSemester: targetSemester,
    backupDownloaded,
  };
}
