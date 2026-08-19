export type Role = 'ADMIN' | 'MENTOR';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
  email: string;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  groupId: string;
  gender: 'L' | 'P';
  parentName?: string;
  contactNumber?: string;
  status: 'Aktif' | 'Nonaktif';
  notes?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  mentorId: string;
  schedule: string;
  room: string;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  groupId?: string; // Some mentors might not have a group assigned yet
  status: 'Aktif' | 'Nonaktif';
}

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface StudentAttendance {
  id: string;
  studentId: string;
  groupId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface MentorAttendance {
  id: string;
  mentorId: string;
  groupId: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface Progress {
  id: string;
  studentId: string;
  date: string;
  reading: number; // 0-100
  tajwid: number; // 0-100
  memorization: number; // 0-100
  writing: number; // 0-100
  total: number; // average of above
  notes?: string;
}

export interface Curriculum {
  id: string;
  stage: string;
  week: string;
  topic: string;
  description: string;
  target: string;
  status: 'Selesai' | 'Sedang Berjalan' | 'Belum Mulai';
}

export interface LearningSession {
  id: string;
  groupId: string;
  mentorId: string;
  date: string;
  topic: string;
  notes?: string;
  status: 'Selesai' | 'Terjadwal';
}
