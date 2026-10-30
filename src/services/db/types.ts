import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Warning/Offline:', JSON.stringify(errInfo));
}

export interface Group {
  id: string;
  name: string;
  mentorId: string;
  gradeId?: string;
  schedule: string;
  room?: string;
  createdAt?: string;
}

export interface Student {
  id: string;
  name: string;
  nis: string;
  groupId: string;
  class: string;
  gender: string;
  status: string;
  createdAt?: string;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  groupId?: string;
  signature?: string;
}

export interface StudentAttendance {
  id?: string;
  studentId: string;
  groupId: string;
  date: string;
  meetingNumber?: number;
  status: string;
  notes?: string;
}

export interface MentorAttendance {
  id?: string;
  mentorId: string;
  groupId?: string;
  date: string;
  status: string;
  notes?: string;
}

export interface Curriculum {
  id: string;
  stage: string;
  topic: string;
  target: string;
}

export interface SemesterInfo {
  semester: 1 | 2;
  semesterName: 'Ganjil' | 'Genap';
  academicYear: string;
  startDate: string;
  endDate: string;
}

export interface StudentProgress {
  id?: string;
  studentId: string;
  groupId: string;
  sessionId?: string;
  meetingNumber?: number;
  semester?: number;
  date: string;
  reading: number;
  tajwid: number;
  memorization?: number;
  memorizedSurah?: string;
  writing: number;
  total: number;
  notes?: string;
  ayatRange?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  targetRole: 'all' | 'admin' | 'mentor';
  link?: string;
  readBy: string[];
  createdAt: string;
  createdBy?: string;
}

export interface TeachingJournal {
  id?: string;
  groupId: string;
  groupName?: string;
  sessionId?: string;
  sessionIds?: string[];
  sessionTitle?: string;
  meetingNumber?: number;
  date: string;
  materialTaught: string;
  pagesCovered?: string;
  studentObstacles: string;
  nextPlan: string;
  attendanceSummary?: string;
  mentorId: string;
  mentorName: string;
  createdAt: string;
}

export type CertCategory = 
  | 'Khatam Iqro/Tilawati'
  | "Tasmi' Juz 30"
  | "Tasmi' Juz 'Amma Pilihan"
  | 'Ujian Kenaikan Tingkat'
  | "Khatam Al-Qur'an 30 Juz";

export type CertStatus = 
  | 'Persiapan'
  | 'Siap Ujian'
  | 'Lulus Bersertifikat'
  | 'Perbaikan';

export interface StudentCertification {
  id?: string;
  studentId: string;
  studentName?: string;
  studentNis?: string;
  studentClass?: string;
  groupId: string;
  groupName?: string;
  category: CertCategory;
  status: CertStatus;
  score?: number;
  examScore?: number;
  notes?: string;
  certificateNumber?: string;
  completedDate?: string;
  examDate?: string;
  examinerName?: string;
  updatedAt: string;
}

export interface SystemActivity {
  id: string;
  type: 'journal' | 'progress' | 'certification' | 'attendance' | 'mentor';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  bg: string;
  rawDate: Date;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: 'admin' | 'system' | 'mentor';
  action: string;
  category: 'sync' | 'security' | 'journal' | 'attendance' | 'certification' | 'system' | 'correction';
  severity: 'info' | 'warning' | 'error' | 'success';
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}
