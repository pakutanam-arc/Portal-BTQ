/**
 * Automated Firestore Migration & Seeding Service
 * 
 * Memigrasikan seluruh data master (157 Santri, 10 Kelompok, 10 Mentor,
 * Kurikulum, Jurnal KBM, Presensi, Sertifikasi, dan Kalender Akademik)
 * ke Cloud Firestore sebagai Single Source of Truth permanen.
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  mockStudents,
  mockGroups,
  mockMentors,
  mockStudentAttendance,
  mockMentorAttendance,
} from '../mockData';
import {
  mentorMappingData,
  defaultSeedJournals,
  defaultSeedCertifications,
  initialSeedAuditLogs,
} from './initialData';
import { masterGrades } from '../curriculumData';
import { invalidateDbCache } from '../cacheService';

export interface MigrationStatus {
  seeded: boolean;
  version: string;
  totalStudents: number;
  totalGroups: number;
  totalMentors: number;
  migratedAt: string;
}

let migrationPromise: Promise<boolean> | null = null;

/**
 * Memeriksa apakah database Firestore telah diinisialisasi
 */
export async function checkMigrationStatus(): Promise<MigrationStatus | null> {
  try {
    const statusDoc = await getDoc(doc(db, 'system_metadata', 'migration_status'));
    if (statusDoc.exists()) {
      return statusDoc.data() as MigrationStatus;
    }
    return null;
  } catch (error) {
    console.warn('[Migration] Error checking migration status:', error);
    return null;
  }
}

/**
 * Menjalankan migrasi data ke Cloud Firestore
 */
export async function runMigration(force = false): Promise<boolean> {
  try {
    console.log('[Migration] Checking migration status in Cloud Firestore...');
    if (!force) {
      const existingStatus = await checkMigrationStatus();
      if (existingStatus && existingStatus.seeded) {
        console.log('[Migration] Firestore database already fully migrated (Status: Seeded).');
        return true;
      }
    }

    console.log('[Migration] Starting pure cloud migration to Firestore...');

    // 1. Migrasi 10 Kelompok
    const groupsBatch = writeBatch(db);
    for (const group of mockGroups) {
      const groupRef = doc(db, 'groups', group.id);
      groupsBatch.set(groupRef, {
        ...group,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await groupsBatch.commit();
    console.log(`[Migration] Migrated ${mockGroups.length} groups.`);

    // 2. Migrasi 10 Mentor & User Accounts
    const mentorsBatch = writeBatch(db);
    for (const mentor of mockMentors) {
      const mapEntry = mentorMappingData.find(m => m.id === mentor.id || m.groupId === mentor.groupId);
      const mentorName = mapEntry ? mapEntry.name : mentor.name;
      const mentorEmail = mapEntry ? mapEntry.newEmail : mentor.email;

      const mentorRef = doc(db, 'mentors', mentor.id);
      mentorsBatch.set(mentorRef, {
        ...mentor,
        name: mentorName,
        email: mentorEmail,
        status: 'Aktif',
        role: 'mentor',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const userRef = doc(db, 'users', mentor.id);
      mentorsBatch.set(userRef, {
        id: mentor.id,
        name: mentorName,
        email: mentorEmail,
        role: 'mentor',
        groupId: mentor.groupId,
        status: 'Aktif',
        createdAt: new Date().toISOString(),
      }, { merge: true });
    }

    // Seed default administrator
    const adminRef = doc(db, 'users', 'admin_102');
    mentorsBatch.set(adminRef, {
      id: 'admin_102',
      name: 'Administrator BTQ 102',
      email: 'admin@smpn102.sch.id',
      role: 'admin',
      status: 'Aktif',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    await mentorsBatch.commit();
    console.log(`[Migration] Migrated ${mockMentors.length} mentors and user accounts.`);

    // 3. Migrasi 3 Tingkat Kurikulum (masterGrades)
    const gradesBatch = writeBatch(db);
    for (const grade of masterGrades) {
      const gradeRef = doc(db, 'grades', grade.id);
      gradesBatch.set(gradeRef, {
        ...grade,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await gradesBatch.commit();
    console.log(`[Migration] Migrated ${masterGrades.length} grades.`);

    // 4. Migrasi 157 Santri (Per Chunk <= 400 Dokumen)
    const CHUNK_SIZE = 400;
    for (let i = 0; i < mockStudents.length; i += CHUNK_SIZE) {
      const chunk = mockStudents.slice(i, i + CHUNK_SIZE);
      const studentBatch = writeBatch(db);
      for (const student of chunk) {
        const studentRef = doc(db, 'students', student.id);
        const sAny = student as any;
        studentBatch.set(studentRef, {
          id: student.id,
          name: student.name,
          nis: student.nis,
          groupId: student.groupId,
          class: student.class || '7A',
          gender: student.gender || 'L',
          status: student.status || 'Aktif',
          targetSurah: sAny.targetSurah || 'Al-Baqarah',
          completedSurah: sAny.completedSurah || 'An-Nas',
          currentGradeId: sAny.currentGradeId || 'grade1',
          createdAt: student.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await studentBatch.commit();
    }
    console.log(`[Migration] Migrated ${mockStudents.length} students to Firestore.`);

    // 5. Migrasi Presensi Siswa & Presensi Mentor
    if (mockStudentAttendance && mockStudentAttendance.length > 0) {
      for (let i = 0; i < mockStudentAttendance.length; i += CHUNK_SIZE) {
        const chunk = mockStudentAttendance.slice(i, i + CHUNK_SIZE);
        const attBatch = writeBatch(db);
        for (const record of chunk) {
          const mNum = record.meetingNumber || 1;
          const docId = `${record.studentId}_m${mNum}`;
          const attRef = doc(db, 'student_attendance', docId);
          attBatch.set(attRef, {
            ...record,
            meetingNumber: mNum,
            date: record.date.split('T')[0],
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
        await attBatch.commit();
      }
      console.log(`[Migration] Migrated ${mockStudentAttendance.length} student attendance records.`);
    }

    if (mockMentorAttendance && mockMentorAttendance.length > 0) {
      const mentorAttBatch = writeBatch(db);
      for (const mAtt of mockMentorAttendance) {
        const mAttRef = doc(db, 'mentor_attendance', mAtt.id);
        mentorAttBatch.set(mAttRef, {
          ...mAtt,
          date: mAtt.date.split('T')[0],
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await mentorAttBatch.commit();
      console.log(`[Migration] Migrated ${mockMentorAttendance.length} mentor attendance records.`);
    }

    // 6. Migrasi Jurnal Mengajar
    if (defaultSeedJournals && defaultSeedJournals.length > 0) {
      const journalBatch = writeBatch(db);
      for (const journal of defaultSeedJournals) {
        const journalRef = doc(db, 'teaching_journals', journal.id);
        journalBatch.set(journalRef, {
          ...journal,
          createdAt: journal.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await journalBatch.commit();
      console.log(`[Migration] Migrated ${defaultSeedJournals.length} teaching journals.`);
    }

    // 7. Migrasi Sertifikasi & Audit Logs
    if (defaultSeedCertifications && defaultSeedCertifications.length > 0) {
      const certBatch = writeBatch(db);
      for (const cert of defaultSeedCertifications) {
        const certRef = doc(db, 'certifications', cert.id);
        certBatch.set(certRef, {
          ...cert,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await certBatch.commit();
    }

    if (initialSeedAuditLogs && initialSeedAuditLogs.length > 0) {
      const auditBatch = writeBatch(db);
      for (const log of initialSeedAuditLogs) {
        const logRef = doc(db, 'audit_logs', log.id);
        auditBatch.set(logRef, log, { merge: true });
      }
      await auditBatch.commit();
    }

    // 8. Tulis Dokumen Status Migrasi Permanen
    const migrationStatus: MigrationStatus = {
      seeded: true,
      version: '2.0.0',
      totalStudents: mockStudents.length,
      totalGroups: mockGroups.length,
      totalMentors: mockMentors.length,
      migratedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'system_metadata', 'migration_status'), migrationStatus);
    console.log('[Migration] Migration status written to Firestore system_metadata/migration_status.');

    // Invalidate All In-Memory & SWR Caches
    invalidateDbCache('students');
    invalidateDbCache('groups');
    invalidateDbCache('mentors');
    invalidateDbCache('teaching_journals');
    invalidateDbCache('attendance');
    invalidateDbCache('all_attendance');
    invalidateDbCache('certifications');

    console.log('[Migration] All data successfully migrated to Cloud Firestore!');
    return true;
  } catch (error) {
    console.error('[Migration] Failed to complete Firestore migration:', error);
    return false;
  }
}

/**
 * Inisialisasi migrasi otomatis saat aplikasi pertama kali dijalankan
 */
export function initAutoMigration(): Promise<boolean> {
  if (!migrationPromise) {
    migrationPromise = runMigration(false);
  }
  return migrationPromise;
}
