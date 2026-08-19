import { Student, Group, Mentor, StudentAttendance, MentorAttendance, Progress, Curriculum, LearningSession } from '../types';
import { addDays, format, subDays, subMonths } from 'date-fns';

export const mockMentors: Mentor[] = [
  { id: 'm1', name: 'Ustadz Ahmad Fauzi', email: 'ahmad@smpn102.sch.id', status: 'Aktif', groupId: 'g1' },
  { id: 'm2', name: 'Ustadzah Siti Aminah', email: 'siti@smpn102.sch.id', status: 'Aktif', groupId: 'g2' },
  { id: 'm3', name: 'Ustadz Budi Santoso', email: 'budi@smpn102.sch.id', status: 'Aktif', groupId: 'g3' },
  { id: 'm4', name: 'Ustadzah Nurul Hidayah', email: 'nurul@smpn102.sch.id', status: 'Aktif', groupId: 'g4' },
  { id: 'm5', name: 'Ustadz Hasan Basri', email: 'hasan@smpn102.sch.id', status: 'Aktif', groupId: 'g5' },
  { id: 'm6', name: 'Ustadzah Fatimah', email: 'fatimah@smpn102.sch.id', status: 'Aktif', groupId: 'g6' },
  { id: 'm7', name: 'Ustadz Zainal Abidin', email: 'zainal@smpn102.sch.id', status: 'Aktif', groupId: 'g7' },
  { id: 'm8', name: 'Ustadzah Aisyah', email: 'aisyah@smpn102.sch.id', status: 'Aktif', groupId: 'g8' },
  { id: 'm9', name: 'Ustadz Rahman', email: 'rahman@smpn102.sch.id', status: 'Aktif', groupId: 'g9' },
  { id: 'm10', name: 'Ustadzah Khadijah', email: 'khadijah@smpn102.sch.id', status: 'Aktif', groupId: 'g10' },
];

export const mockGroups: Group[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `g${i + 1}`,
  name: `Kelompok ${i + 1}`,
  mentorId: `m${i + 1}`,
  schedule: i % 2 === 0 ? 'Senin, 15:30 - 17:00' : 'Rabu, 15:30 - 17:00',
  room: `Ruang ${101 + i}`,
}));

const firstNamesL = ['Budi', 'Andi', 'Rizky', 'Fajar', 'Hendra', 'Aditya', 'Dimas', 'Eko', 'Ilham', 'Deni', 'Arif', 'Bayu', 'Gilang', 'Rian', 'Fauzan'];
const firstNamesP = ['Siti', 'Ayu', 'Putri', 'Dewi', 'Sari', 'Nisa', 'Rina', 'Indah', 'Fitri', 'Dian', 'Lestari', 'Ratna', 'Wulan', 'Nur', 'Sri'];
const lastNames = ['Saputra', 'Pratama', 'Kurniawan', 'Wijaya', 'Setiawan', 'Hidayat', 'Nugroho', 'Lestari', 'Wahyuni', 'Utami', 'Sari', 'Rahmawati', 'Putri', 'Ramadhan', 'Maulana'];

export const mockStudents: Student[] = [];
let studentCount = 1;

mockGroups.forEach((group, index) => {
  // Generate random number of students per group (12-18)
  const numStudents = 12 + Math.floor(Math.random() * 7);
  for (let i = 0; i < numStudents; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? firstNamesL[Math.floor(Math.random() * firstNamesL.length)] : firstNamesP[Math.floor(Math.random() * firstNamesP.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    mockStudents.push({
      id: `s${studentCount}`,
      nis: `102${String(studentCount).padStart(4, '0')}`,
      name: `${firstName} ${lastName}`,
      class: `7${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`, // 7A - 7F
      groupId: group.id,
      gender: isMale ? 'L' : 'P',
      status: 'Aktif',
      createdAt: subMonths(new Date(), 3).toISOString(),
    });
    studentCount++;
  }
});

// Generate some attendance data
export const mockStudentAttendance: StudentAttendance[] = [];
export const mockProgress: Progress[] = [];

const today = new Date();
const dates = [
  subDays(today, 21),
  subDays(today, 14),
  subDays(today, 7),
  today,
];

mockStudents.forEach(student => {
  // Attendance
  dates.forEach(date => {
    const rand = Math.random();
    let status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' = 'Hadir';
    if (rand > 0.95) status = 'Alpa';
    else if (rand > 0.90) status = 'Sakit';
    else if (rand > 0.85) status = 'Izin';
    
    mockStudentAttendance.push({
      id: `sa_${student.id}_${format(date, 'yyyyMMdd')}`,
      studentId: student.id,
      groupId: student.groupId,
      date: date.toISOString(),
      status,
    });
  });

  // Progress
  let baseReading = 40 + Math.random() * 20;
  let baseTajwid = 30 + Math.random() * 20;
  let baseMemorization = 30 + Math.random() * 30;
  let baseWriting = 40 + Math.random() * 20;

  [subMonths(today, 2), subMonths(today, 1), today].forEach(date => {
    baseReading = Math.min(100, baseReading + Math.random() * 10);
    baseTajwid = Math.min(100, baseTajwid + Math.random() * 12);
    baseMemorization = Math.min(100, baseMemorization + Math.random() * 15);
    baseWriting = Math.min(100, baseWriting + Math.random() * 10);
    
    mockProgress.push({
      id: `p_${student.id}_${format(date, 'yyyyMMdd')}`,
      studentId: student.id,
      date: date.toISOString(),
      reading: Math.round(baseReading),
      tajwid: Math.round(baseTajwid),
      memorization: Math.round(baseMemorization),
      writing: Math.round(baseWriting),
      total: Math.round((baseReading + baseTajwid + baseMemorization + baseWriting) / 4),
    });
  });
});

export const mockCurriculum: Curriculum[] = [
  {
    id: 'c1',
    stage: 'Tahap 1 - Dasar Al-Qur\'an',
    week: 'Minggu 1-2',
    topic: 'Pengenalan Huruf Hijaiyah & Harakat',
    description: 'Mengenal huruf hijaiyah tunggal dan tanda baca (fathah, kasrah, dhammah).',
    target: 'Siswa hafal 29 huruf hijaiyah dan bunyinya.',
    status: 'Selesai'
  },
  {
    id: 'c2',
    stage: 'Tahap 2 - Membaca',
    week: 'Minggu 3-5',
    topic: 'Membaca Huruf Bersambung & Tanwin',
    description: 'Membaca huruf bersambung di awal, tengah, dan akhir. Mengenal tanwin.',
    target: 'Siswa dapat membaca kata sederhana.',
    status: 'Selesai'
  },
  {
    id: 'c3',
    stage: 'Tahap 3 - Tajwid Dasar',
    week: 'Minggu 6-9',
    topic: 'Nun Mati, Tanwin, Mim Mati, & Qalqalah',
    description: 'Hukum bacaan nun mati/tanwin (Izhar, Idgham, Iqlab, Ikhfa) dan mim mati.',
    target: 'Siswa dapat mengidentifikasi hukum bacaan dalam ayat pendek.',
    status: 'Sedang Berjalan'
  },
  {
    id: 'c4',
    stage: 'Tahap 4 - Kelancaran',
    week: 'Minggu 10-13',
    topic: 'Perbaikan Makhraj & Kelancaran',
    description: 'Fokus pada ketepatan makharijul huruf dan tajwid saat membaca surat-surat pendek.',
    target: 'Siswa dapat membaca surat pendek dengan lancar dan tartil.',
    status: 'Belum Mulai'
  },
  {
    id: 'c5',
    stage: 'Tahap 5 - Hafalan & Praktik',
    week: 'Minggu 14-16',
    topic: 'Hafalan Surat Pendek & Doa Harian',
    description: 'Menghafal surat-surat dalam Juz 30 dan mempraktikkan bacaan shalat.',
    target: 'Siswa hafal minimal 10 surat pendek dan bacaan shalat.',
    status: 'Belum Mulai'
  }
];

export const mockMentorAttendance: MentorAttendance[] = [];
mockMentors.forEach(mentor => {
  dates.forEach(date => {
    mockMentorAttendance.push({
      id: `ma_${mentor.id}_${format(date, 'yyyyMMdd')}`,
      mentorId: mentor.id,
      groupId: mentor.groupId || '',
      date: date.toISOString(),
      time: '15:25',
      status: Math.random() > 0.1 ? 'Hadir' : 'Izin',
    });
  });
});
