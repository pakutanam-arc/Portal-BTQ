import { doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import {
  Student,
  Group,
  Mentor,
  StudentAttendance,
  MentorAttendance,
  StudentProgress,
  TeachingJournal,
  StudentCertification,
  AppNotification,
  AuditLogEntry,
  getStudents,
  getGroups,
  getMentors,
  getAllStudentAttendance,
  getAllMentorAttendance,
  getAllStudentProgress,
  getTeachingJournals,
  getCertifications,
  getStoredNotifications,
  getAuditLogs,
  invalidateDbCache,
  addAuditLog,
} from './db';

export interface BackupSnapshot {
  version: string;
  appName: string;
  exportedAt: string;
  academicYear: string;
  metadata: {
    exportedBy?: string;
    totalRecords: number;
    description: string;
  };
  data: {
    students: Student[];
    groups: Group[];
    mentors: Mentor[];
    studentAttendance: StudentAttendance[];
    mentorAttendance: MentorAttendance[];
    studentProgress: StudentProgress[];
    teachingJournals: TeachingJournal[];
    certifications: StudentCertification[];
    notifications?: AppNotification[];
    auditLogs?: AuditLogEntry[];
  };
  summary: {
    totalStudents: number;
    totalGroups: number;
    totalMentors: number;
    totalStudentAttendance: number;
    totalMentorAttendance: number;
    totalStudentProgress: number;
    totalTeachingJournals: number;
    totalCertifications: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  snapshot?: BackupSnapshot;
}

export interface RestoreStats {
  students: number;
  groups: number;
  mentors: number;
  studentAttendance: number;
  mentorAttendance: number;
  studentProgress: number;
  teachingJournals: number;
  certifications: number;
  notifications: number;
  totalRestored: number;
}

/**
 * Mengambil seluruh data dari Firestore & Cache lokal,
 * lalu membuat berkas .json Snapshot terstruktur dan memicu unduhan di browser.
 */
export async function exportFullDatabaseBackup(userEmail?: string): Promise<BackupSnapshot> {
  // Ambil semua data secara paralel
  const [
    students,
    groups,
    mentors,
    studentAttendance,
    mentorAttendance,
    studentProgress,
    journalsResult,
    certificationsResult,
    auditLogs,
  ] = await Promise.all([
    getStudents(true),
    getGroups(true),
    getMentors(true),
    getAllStudentAttendance(undefined, 5000, true),
    getAllMentorAttendance(),
    getAllStudentProgress(5000, true),
    getTeachingJournals(undefined, 5000),
    getCertifications(undefined, 5000),
    getAuditLogs(),
  ]);

  const teachingJournals = journalsResult.data || [];
  const certifications = certificationsResult.data || [];
  const notifications = getStoredNotifications();

  const totalRecords =
    students.length +
    groups.length +
    mentors.length +
    studentAttendance.length +
    mentorAttendance.length +
    studentProgress.length +
    teachingJournals.length +
    certifications.length;

  const now = new Date();
  const isoTimestamp = now.toISOString();

  const snapshot: BackupSnapshot = {
    version: '1.0',
    appName: 'SI-BTQ SMP Negeri 102 Jakarta',
    exportedAt: isoTimestamp,
    academicYear: '2026/2027 Ganjil & Genap',
    metadata: {
      exportedBy: userEmail || 'Administrator',
      totalRecords,
      description: 'Cadangan penuh snapshot database SI-BTQ SMPN 102 Jakarta untuk arsip offline & Google Drive.',
    },
    data: {
      students,
      groups,
      mentors,
      studentAttendance,
      mentorAttendance,
      studentProgress,
      teachingJournals,
      certifications,
      notifications,
      auditLogs,
    },
    summary: {
      totalStudents: students.length,
      totalGroups: groups.length,
      totalMentors: mentors.length,
      totalStudentAttendance: studentAttendance.length,
      totalMentorAttendance: mentorAttendance.length,
      totalStudentProgress: studentProgress.length,
      totalTeachingJournals: teachingJournals.length,
      totalCertifications: certifications.length,
    },
  };

  // Unduh berkas JSON ke perangkat pengguna
  const jsonContent = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const dateTag = now.toISOString().slice(0, 10);
  const timeTag = now.toTimeString().slice(0, 8).replace(/:/g, '');
  link.download = `SI-BTQ-SMPN102-Full-Backup_${dateTag}_${timeTag}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Catat ke Audit Log
  try {
    await addAuditLog({
      actor: userEmail || 'Administrator',
      actorRole: 'admin',
      action: 'Ekspor Cadangan Database Penuh (Full Backup)',
      category: 'system',
      severity: 'info',
      details: `Mengunduh snapshot JSON lengkap (${totalRecords} dokumen: ${students.length} santri, ${studentAttendance.length} presensi, ${teachingJournals.length} jurnal).`,
    });
  } catch (e) {
    console.warn('Gagal mencatat audit log ekspor:', e);
  }

  return snapshot;
}

/**
 * Memvalidasi string JSON yang diunggah pengguna sebelum proses pemulihan (restore) dimulai.
 */
export function validateBackupFile(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Format berkas tidak valid (bukan objek JSON).' };
    }

    if (!parsed.appName || !parsed.data || typeof parsed.data !== 'object') {
      return {
        isValid: false,
        error: 'Struktur berkas tidak sesuai standar cadangan SI-BTQ SMPN 102 Jakarta.',
      };
    }

    const d = parsed.data;
    if (
      !Array.isArray(d.students) &&
      !Array.isArray(d.groups) &&
      !Array.isArray(d.studentAttendance) &&
      !Array.isArray(d.teachingJournals)
    ) {
      return {
        isValid: false,
        error: 'Berkas cadangan tidak memiliki kumpulan data yang dapat dipulihkan.',
      };
    }

    return {
      isValid: true,
      snapshot: parsed as BackupSnapshot,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Gagal membaca berkas JSON: ${err.message || 'Kesalahan sintaks'}`,
    };
  }
}

/**
 * Memulihkan data dari snapshot JSON ke dalam Firestore dan Local Storage secara batch dan aman.
 */
export async function restoreFullDatabaseBackup(
  snapshot: BackupSnapshot,
  userEmail?: string,
  onProgress?: (message: string, percent: number) => void
): Promise<{ success: boolean; stats: RestoreStats }> {
  const d = snapshot.data;
  const stats: RestoreStats = {
    students: 0,
    groups: 0,
    mentors: 0,
    studentAttendance: 0,
    mentorAttendance: 0,
    studentProgress: 0,
    teachingJournals: 0,
    certifications: 0,
    notifications: 0,
    totalRestored: 0,
  };

  try {
    // 1. Restore Kelompok (Groups)
    if (Array.isArray(d.groups) && d.groups.length > 0) {
      onProgress?.('Memulihkan data kelompok bimbingan...', 10);
      const batch = writeBatch(db);
      for (const g of d.groups) {
        if (!g.id) continue;
        const ref = doc(db, 'groups', g.id);
        batch.set(ref, g, { merge: true });
        stats.groups++;
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Firestore groups write warning:', e);
      }
    }

    // 2. Restore Santri (Students)
    if (Array.isArray(d.students) && d.students.length > 0) {
      onProgress?.('Memulihkan data santri...', 25);
      const chunkSize = 250;
      for (let i = 0; i < d.students.length; i += chunkSize) {
        const chunk = d.students.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const s of chunk) {
          if (!s.id) continue;
          const ref = doc(db, 'students', s.id);
          batch.set(ref, s, { merge: true });
          stats.students++;
        }
        try {
          await batch.commit();
        } catch (e) {
          console.warn('Firestore students chunk write warning:', e);
        }
      }
      try {
        localStorage.setItem('sibtq_students', JSON.stringify(d.students));
      } catch {}
    }

    // 3. Restore Mentors
    if (Array.isArray(d.mentors) && d.mentors.length > 0) {
      onProgress?.('Memulihkan data mentor...', 40);
      const batch = writeBatch(db);
      for (const m of d.mentors) {
        if (!m.id) continue;
        const ref = doc(db, 'mentors', m.id);
        batch.set(ref, m, { merge: true });
        stats.mentors++;
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Firestore mentors write warning:', e);
      }
    }

    // 4. Restore Presensi Santri (Student Attendance)
    if (Array.isArray(d.studentAttendance) && d.studentAttendance.length > 0) {
      onProgress?.('Memulihkan rekap presensi santri...', 55);
      const chunkSize = 250;
      for (let i = 0; i < d.studentAttendance.length; i += chunkSize) {
        const chunk = d.studentAttendance.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const att of chunk) {
          const docId =
            att.id ||
            (att.meetingNumber
              ? `${att.studentId}_m${att.meetingNumber}`
              : `${att.studentId}_${att.date.split('T')[0]}`);
          const ref = doc(db, 'student_attendance', docId);
          batch.set(ref, att, { merge: true });
          stats.studentAttendance++;
        }
        try {
          await batch.commit();
        } catch (e) {
          console.warn('Firestore student_attendance chunk warning:', e);
        }
      }
      try {
        localStorage.setItem('sibtq_student_attendance', JSON.stringify(d.studentAttendance));
      } catch {}
    }

    // 5. Restore Presensi Mentor
    if (Array.isArray(d.mentorAttendance) && d.mentorAttendance.length > 0) {
      onProgress?.('Memulihkan presensi mentor...', 65);
      const batch = writeBatch(db);
      for (const matt of d.mentorAttendance) {
        const docId = matt.id || `${matt.mentorId}_${matt.date}`;
        const ref = doc(db, 'mentor_attendance', docId);
        batch.set(ref, matt, { merge: true });
        stats.mentorAttendance++;
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Firestore mentor_attendance warning:', e);
      }
      try {
        localStorage.setItem('sibtq_mentor_attendance', JSON.stringify(d.mentorAttendance));
      } catch {}
    }

    // 6. Restore Capaian Santri (Student Progress)
    if (Array.isArray(d.studentProgress) && d.studentProgress.length > 0) {
      onProgress?.('Memulihkan capaian belajar santri...', 75);
      const chunkSize = 250;
      for (let i = 0; i < d.studentProgress.length; i += chunkSize) {
        const chunk = d.studentProgress.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const prog of chunk) {
          const docId =
            prog.meetingNumber
              ? `${prog.studentId}_m${prog.meetingNumber}`
              : `${prog.studentId}_${prog.sessionId || prog.date}`;
          const ref = doc(db, 'student_progress', docId);
          batch.set(ref, prog, { merge: true });
          stats.studentProgress++;
        }
        try {
          await batch.commit();
        } catch (e) {
          console.warn('Firestore student_progress chunk warning:', e);
        }
      }
      try {
        localStorage.setItem('sibtq_student_progress', JSON.stringify(d.studentProgress));
      } catch {}
    }

    // 7. Restore Jurnal Mengajar (Teaching Journals)
    if (Array.isArray(d.teachingJournals) && d.teachingJournals.length > 0) {
      onProgress?.('Memulihkan jurnal mengajar mentor...', 85);
      const batch = writeBatch(db);
      for (const j of d.teachingJournals) {
        const docId = j.id || `jnl_${j.groupId}_${j.sessionId || j.meetingNumber || Date.now()}`;
        const ref = doc(db, 'teaching_journals', docId);
        batch.set(ref, j, { merge: true });
        stats.teachingJournals++;
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Firestore teaching_journals warning:', e);
      }
      try {
        localStorage.setItem('sibtq_teaching_journals', JSON.stringify(d.teachingJournals));
      } catch {}
    }

    // 8. Restore Sertifikasi (Certifications)
    if (Array.isArray(d.certifications) && d.certifications.length > 0) {
      onProgress?.('Memulihkan sertifikasi & kelulusan...', 92);
      const batch = writeBatch(db);
      for (const c of d.certifications) {
        if (!c.id) continue;
        const ref = doc(db, 'certifications', c.id);
        batch.set(ref, c, { merge: true });
        stats.certifications++;
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Firestore certifications warning:', e);
      }
      try {
        localStorage.setItem('sibtq_certifications', JSON.stringify(d.certifications));
      } catch {}
    }

    // Invalidate All In-Memory Cache
    invalidateDbCache();

    stats.totalRestored =
      stats.students +
      stats.groups +
      stats.mentors +
      stats.studentAttendance +
      stats.mentorAttendance +
      stats.studentProgress +
      stats.teachingJournals +
      stats.certifications;

    onProgress?.('Penyelarasan selesai. Memperbarui catatan audit...', 98);

    // Catat ke Audit Log
    try {
      await addAuditLog({
        actor: userEmail || 'Administrator',
        actorRole: 'admin',
        action: 'Pemulihan Cadangan Database Penuh (Restore)',
        category: 'system',
        severity: 'info',
        details: `Berhasil memulihkan ${stats.totalRestored} rekaman dari snapshot tanggal ${snapshot.exportedAt}.`,
      });
    } catch (e) {
      console.warn('Audit log restore warning:', e);
    }

    onProgress?.('Pemulihan database selesai!', 100);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error('Terjadi kendala saat memulihkan database:', error);
    throw error;
  }
}
