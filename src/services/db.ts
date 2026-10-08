/**
 * Database Access Layer (Modularized Architecture)
 * 
 * Re-exports all sub-modules from ./db for backwards compatibility and clean organization.
 * Sub-modules:
 * - src/services/db/types.ts (Data models, interfaces, error handling)
 * - src/services/db/initialData.ts (Mock data & seed constants)
 * - src/services/db/groups.ts (Kelompok bimbingan & halaqah)
 * - src/services/db/students.ts (Santri & mutasi)
 * - src/services/db/attendance.ts (Presensi santri & mentor)
 * - src/services/db/progress.ts (Capaian santri, nilai tahsin/tajwid/menulis)
 * - src/services/db/journals.ts (Jurnal KBM & materi)
 * - src/services/db/certifications.ts (Sertifikasi, Tasmi' & Ujian Khatam)
 * - src/services/db/notifications.ts (Notifikasi & pengumuman)
 * - src/services/db/auditLogs.ts (Audit logs & aktivitas sistem)
 * - src/services/db/mentors.ts (Mentor & akun)
 */

export * from './db/index';
