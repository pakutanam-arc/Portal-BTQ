import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { mockGroups, mockStudents, mockMentors, mockStudentAttendance, mockProgress } from './mockData';

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
}

// Local cache keys
const LOCAL_STORAGE_KEY_ATTENDANCE = 'sibtq_student_attendance';
const LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE = 'sibtq_mentor_attendance';
const LOCAL_STORAGE_KEY_PROGRESS = 'sibtq_student_progress';

function getLocalAttendance(): StudentAttendance[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ATTENDANCE);
    return raw ? JSON.parse(raw) : mockStudentAttendance;
  } catch {
    return mockStudentAttendance;
  }
}

function saveLocalAttendance(records: StudentAttendance[]) {
  try {
    const existing = getLocalAttendance();
    const updated = [...existing];
    records.forEach(rec => {
      const idx = updated.findIndex(r => r.studentId === rec.studentId && r.date.split('T')[0] === rec.date.split('T')[0]);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...rec };
      } else {
        updated.push(rec);
      }
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_ATTENDANCE, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }
}

// Fetch all groups
export async function getGroups(): Promise<Group[]> {
  try {
    const q = query(collection(db, 'groups'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => {
        const data = doc.data() as Group;
        const gNum = parseInt(doc.id.replace(/\D/g, '') || '1');
        const gradeId = gNum <= 4 ? 'grade1' : gNum <= 8 ? 'grade2' : 'grade3';
        return { id: doc.id, gradeId, ...data };
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'groups');
  }

  // Fallback to initial groups
  return mockGroups.map(g => {
    const gNum = parseInt(g.id.replace(/\D/g, '') || '1');
    const gradeId = gNum <= 4 ? 'grade1' : gNum <= 8 ? 'grade2' : 'grade3';
    return { ...g, gradeId };
  });
}

// Fetch all students
export async function getStudents(): Promise<Student[]> {
  try {
    const q = query(collection(db, 'students'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }

  return mockStudents;
}

// Fetch all mentors
export async function getMentors(): Promise<Mentor[]> {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'mentor'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mentor));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }

  return mockMentors.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: 'mentor',
    status: m.status,
    groupId: m.groupId,
  }));
}

// Fetch students for a specific group
export async function getStudentsByGroup(groupId: string): Promise<Student[]> {
  try {
    const q = query(collection(db, 'students'), where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }

  return mockStudents.filter(s => s.groupId === groupId);
}

export interface StudentAttendance {
  id?: string;
  studentId: string;
  groupId: string;
  date: string;
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

export async function getStudentAttendance(groupId: string, date: string): Promise<StudentAttendance[]> {
  const datePrefix = date.split('T')[0];
  try {
    const q = query(collection(db, 'student_attendance'), where('groupId', '==', groupId), where('date', '==', datePrefix));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttendance));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_attendance');
  }

  const local = getLocalAttendance();
  return local.filter(a => a.groupId === groupId && a.date.startsWith(datePrefix));
}

export async function saveStudentAttendance(records: StudentAttendance[]): Promise<void> {
  saveLocalAttendance(records);
  for (const record of records) {
    const datePrefix = record.date.split('T')[0];
    const docId = `${record.studentId}_${datePrefix}`;
    const { id, ...data } = record;
    try {
      await setDoc(doc(db, 'student_attendance', docId), { ...data, date: datePrefix }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `student_attendance/${docId}`);
    }
  }
}

export async function getMentorAttendance(date: string): Promise<MentorAttendance[]> {
  const datePrefix = date.split('T')[0];
  try {
    const q = query(collection(db, 'mentor_attendance'), where('date', '==', datePrefix));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MentorAttendance));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'mentor_attendance');
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE);
    const local = raw ? JSON.parse(raw) : [];
    return local.filter((m: MentorAttendance) => m.date.startsWith(datePrefix));
  } catch {
    return [];
  }
}

export async function saveMentorAttendance(records: MentorAttendance[]): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [...existing];
    records.forEach(rec => {
      const idx = updated.findIndex((r: any) => r.mentorId === rec.mentorId && r.date.split('T')[0] === rec.date.split('T')[0]);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...rec };
      } else {
        updated.push(rec);
      }
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_MENTOR_ATTENDANCE, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }

  for (const record of records) {
    const datePrefix = record.date.split('T')[0];
    const docId = `${record.mentorId}_${datePrefix}`;
    const { id, ...data } = record;
    try {
      await setDoc(doc(db, 'mentor_attendance', docId), { ...data, date: datePrefix }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `mentor_attendance/${docId}`);
    }
  }
}

export interface StudentProgress {
  id?: string;
  studentId: string;
  groupId: string;
  sessionId?: string;
  semester?: number;
  date: string;
  reading: number;
  tajwid: number;
  memorization: number;
  writing: number;
  total: number;
}

export async function getAllStudentProgress(): Promise<StudentProgress[]> {
  try {
    const q = query(collection(db, 'student_progress'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'student_progress');
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS);
    if (raw) return JSON.parse(raw);
  } catch {}

  return mockProgress.map(p => {
    const student = mockStudents.find(s => s.id === p.studentId);
    return {
      ...p,
      groupId: student?.groupId || 'g1',
      total: Math.round((p.reading + p.tajwid + p.memorization + p.writing) / 4),
    };
  });
}

export async function saveStudentProgress(record: StudentProgress): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [...existing];
    if (record.id) {
      const idx = updated.findIndex((r: any) => r.id === record.id);
      if (idx >= 0) updated[idx] = record;
      else updated.push(record);
    } else {
      updated.push({ ...record, id: `p_${Date.now()}` });
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }

  try {
    if (record.id) {
      const { id, ...data } = record;
      await updateDoc(doc(db, 'student_progress', id), data);
    } else {
      await addDoc(collection(db, 'student_progress'), record);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'student_progress');
  }
}

// ----------------------------------------------------------------------------
// Real-time Notification System
// ----------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  targetRole: 'all' | 'admin' | 'mentor';
  link?: string;
  readBy: string[]; // List of user IDs or emails who have read this notification
  createdAt: string; // ISO date string
  createdBy?: string;
}

const LOCAL_STORAGE_NOTIFS_KEY = 'sibtq_notifications_v1';
const LOCAL_READ_NOTIFS_KEY = 'sibtq_read_notifications_v1';

const defaultSeedNotifications: Omit<AppNotification, 'id'>[] = [
  {
    title: 'Jadwal Bimbingan Sabtu (07.30 - 09.00 WIB)',
    message: 'Pengingat: Kegiatan Bimbingan BTQ SMPN 102 Jakarta dilaksanakan setiap hari Sabtu. Mohon seluruh mentor hadir tepat waktu.',
    type: 'info',
    targetRole: 'all',
    link: '/attendance/students',
    readBy: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdBy: 'Koordinator BTQ'
  },
  {
    title: 'Sesi Aktif Kurikulum Pertemuan 3',
    message: 'Sesi pembelajaran aktif saat ini memasuki Pertemuan ke-3. Pastikan pengisian capaian tahsin dan tajwid santri tercatat lengkap.',
    type: 'success',
    targetRole: 'all',
    link: '/progress',
    readBy: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdBy: 'Sistem Kurikulum'
  },
  {
    title: 'Kelompok 4: Pengingat Absensi Siswa',
    message: 'Absensi santri untuk Kelompok 4 belum dilaporkan. Ustadz pengampu dimohon melengkapi absensi sebelum pukul 12.00 WIB.',
    type: 'warning',
    targetRole: 'all',
    link: '/attendance/students',
    readBy: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    createdBy: 'Admin BTQ'
  }
];

function getLocalNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    const seeded = defaultSeedNotifications.map((n, i) => ({
      ...n,
      id: `notif_seed_${i + 1}`
    }));
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return defaultSeedNotifications.map((n, i) => ({
      ...n,
      id: `notif_seed_${i + 1}`
    }));
  }
}

function saveLocalNotifications(notifs: AppNotification[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.warn("Could not save notifications to localStorage", e);
  }
}

/**
 * Real-time listener for notifications from Firestore
 * Fallbacks seamlessly to localStorage if Firestore is empty or offline
 */
export function subscribeNotifications(
  userIdentifier: string,
  userRole: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const notifCollectionRef = collection(db, 'notifications');
  const q = query(notifCollectionRef, orderBy('createdAt', 'desc'));

  let isFirstSnap = true;

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      if (!snapshot.empty) {
        const notifs: AppNotification[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || '',
            message: data.message || '',
            type: data.type || 'info',
            targetRole: data.targetRole || 'all',
            link: data.link || '',
            readBy: Array.isArray(data.readBy) ? data.readBy : [],
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'Admin'
          };
        });

        // Filter based on target role
        const filtered = notifs.filter(n => 
          n.targetRole === 'all' || 
          n.targetRole === userRole || 
          (userRole === 'admin')
        );

        saveLocalNotifications(notifs);
        onUpdate(filtered);
      } else {
        // If collection in Firestore is empty on first snapshot, seed default notifications to Firestore
        if (isFirstSnap) {
          isFirstSnap = false;
          try {
            for (const item of defaultSeedNotifications) {
              await addDoc(notifCollectionRef, item);
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'notifications');
          }
        }
        
        const local = getLocalNotifications();
        const filtered = local.filter(n => 
          n.targetRole === 'all' || 
          n.targetRole === userRole || 
          (userRole === 'admin')
        );
        onUpdate(filtered);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      // Offline fallback
      const local = getLocalNotifications();
      const filtered = local.filter(n => 
        n.targetRole === 'all' || 
        n.targetRole === userRole || 
        (userRole === 'admin')
      );
      onUpdate(filtered);
    }
  );

  return unsubscribe;
}

/**
 * Creates and dispatches a new real-time notification
 */
export async function createNotification(
  notif: Omit<AppNotification, 'id'>
): Promise<string> {
  const newNotif = {
    ...notif,
    readBy: notif.readBy || [],
    createdAt: notif.createdAt || new Date().toISOString()
  };

  // 1. Update local cache immediately
  const local = getLocalNotifications();
  const tempId = `notif_${Date.now()}`;
  const updatedLocal = [{ id: tempId, ...newNotif }, ...local];
  saveLocalNotifications(updatedLocal);

  // 2. Persist to Firestore
  try {
    const docRef = await addDoc(collection(db, 'notifications'), newNotif);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notifications');
    return tempId;
  }
}

/**
 * Mark a single notification as read by the current user
 */
export async function markNotificationAsRead(
  notifId: string,
  userIdentifier: string
): Promise<void> {
  if (!userIdentifier || !notifId) return;

  // 1. Update local
  const local = getLocalNotifications();
  const target = local.find(n => n.id === notifId);
  if (target && !target.readBy.includes(userIdentifier)) {
    target.readBy.push(userIdentifier);
    saveLocalNotifications(local);
  }

  // 2. Update Firestore
  try {
    const docRef = doc(db, 'notifications', notifId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const currentReadBy: string[] = snap.data().readBy || [];
      if (!currentReadBy.includes(userIdentifier)) {
        await updateDoc(docRef, {
          readBy: [...currentReadBy, userIdentifier]
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

/**
 * Mark all visible notifications as read by the current user
 */
export async function markAllNotificationsAsRead(
  notifIds: string[],
  userIdentifier: string
): Promise<void> {
  if (!userIdentifier || notifIds.length === 0) return;

  // 1. Update local
  const local = getLocalNotifications();
  local.forEach(n => {
    if (notifIds.includes(n.id) && !n.readBy.includes(userIdentifier)) {
      n.readBy.push(userIdentifier);
    }
  });
  saveLocalNotifications(local);

  // 2. Update Firestore documents
  for (const notifId of notifIds) {
    try {
      const docRef = doc(db, 'notifications', notifId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentReadBy: string[] = snap.data().readBy || [];
        if (!currentReadBy.includes(userIdentifier)) {
          await updateDoc(docRef, {
            readBy: [...currentReadBy, userIdentifier]
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
    }
  }
}

/**
 * Delete a notification (Admin feature)
 */
export async function deleteNotification(notifId: string): Promise<void> {
  // 1. Update local
  const local = getLocalNotifications();
  const filtered = local.filter(n => n.id !== notifId);
  saveLocalNotifications(filtered);

  // 2. Update Firestore
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
  }
}

// ----------------------------------------------------------------------------
// Teaching Journal System
// ----------------------------------------------------------------------------

export interface TeachingJournal {
  id?: string;
  groupId: string;
  groupName?: string;
  sessionId?: string;
  sessionTitle?: string;
  date: string; // YYYY-MM-DD
  materialTaught: string; // Materi & Halaman yang dibahas hari ini
  pagesCovered?: string;
  studentObstacles: string; // Kendala santri selama sesi
  nextPlan: string; // Rencana materi / target pertemuan pekan depan
  attendanceSummary?: string; // Catatan kehadiran
  mentorId: string;
  mentorName: string;
  createdAt: string;
}

const LOCAL_STORAGE_JOURNALS_KEY = 'sibtq_teaching_journals_v1';

const defaultSeedJournals: TeachingJournal[] = [
  {
    id: 'journal_seed_1',
    groupId: 'group_1',
    groupName: 'Kelompok 1 (Putra 7A)',
    sessionId: 'session_1',
    sessionTitle: 'Pertemuan 1: Makharijul Huruf & Q.S. An-Nas - Al-Falaq',
    date: '2026-08-01',
    materialTaught: 'Tilawati Jilid 3 Hal 1-5 dan Tahsin Q.S. An-Nas sampai Al-Ikhlas',
    pagesCovered: 'Hal 1 - 5',
    studentObstacles: 'Beberapa santri masih sering tertukar antara huruf Ha (ح) dan Kha (خ).',
    nextPlan: 'Melanjutkan Tilawati Jilid 3 Hal 6-10 dan mulai setoran hafalan Al-Falaq & Al-Lahab.',
    attendanceSummary: 'Hadir 5 dari 5 santri.',
    mentorId: 'mentor_1',
    mentorName: 'Ustadz Ahmad Fauzi, S.Pd.I',
    createdAt: '2026-08-01T09:30:00.000Z'
  },
  {
    id: 'journal_seed_2',
    groupId: 'group_2',
    groupName: 'Kelompok 2 (Putri 7A)',
    sessionId: 'session_2',
    sessionTitle: 'Pertemuan 2: Sifatul Huruf & Q.S. Al-Ikhlas - Al-Lahab',
    date: '2026-08-08',
    materialTaught: 'Qur\'an Juz 30 Surah Al-Kafirun & An-Nasr dengan hukum Mad Thabi\'i',
    pagesCovered: 'Surah Al-Kafirun & An-Nasr',
    studentObstacles: 'Penguasaan panjang 2 harakat pada mad thabi\'i sudah baik, santri antusias.',
    nextPlan: 'Latihan pengucapan huruf Qalqalah di Surah Al-Falaq & Al-Ikhlas.',
    attendanceSummary: 'Hadir 5 santri lengkap.',
    mentorId: 'mentor_2',
    mentorName: 'Ustadzah Nurul Hidayah, S.Pd',
    createdAt: '2026-08-08T09:45:00.000Z'
  }
];

export async function getTeachingJournals(groupId?: string): Promise<TeachingJournal[]> {
  try {
    const journalCol = collection(db, 'teaching_journals');
    const q = groupId 
      ? query(journalCol, where('groupId', '==', groupId), orderBy('date', 'desc'))
      : query(journalCol, orderBy('date', 'desc'));
      
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TeachingJournal));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'teaching_journals');
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOURNALS_KEY);
    const list: TeachingJournal[] = raw ? JSON.parse(raw) : defaultSeedJournals;
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_JOURNALS_KEY, JSON.stringify(defaultSeedJournals));
    }
    if (groupId) {
      return list.filter(j => j.groupId === groupId);
    }
    return list;
  } catch {
    return defaultSeedJournals;
  }
}

export async function saveTeachingJournal(journal: TeachingJournal): Promise<string> {
  const payload = {
    ...journal,
    createdAt: journal.createdAt || new Date().toISOString()
  };

  // 1. Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOURNALS_KEY);
    const list: TeachingJournal[] = raw ? JSON.parse(raw) : defaultSeedJournals;
    const tempId = journal.id || `journal_${Date.now()}`;
    const existingIndex = list.findIndex(j => j.id === tempId || (j.groupId === journal.groupId && j.date === journal.date));
    
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...payload, id: list[existingIndex].id };
    } else {
      list.unshift({ ...payload, id: tempId });
    }
    localStorage.setItem(LOCAL_STORAGE_JOURNALS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not save journal locally", e);
  }

  // 2. Persist to Firestore
  try {
    if (journal.id && !journal.id.startsWith('journal_seed_')) {
      const docRef = doc(db, 'teaching_journals', journal.id);
      await setDoc(docRef, payload, { merge: true });
      return journal.id;
    } else {
      const docRef = await addDoc(collection(db, 'teaching_journals'), payload);
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'teaching_journals');
    return journal.id || `journal_${Date.now()}`;
  }
}

export async function deleteTeachingJournal(journalId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOURNALS_KEY);
    if (raw) {
      const list: TeachingJournal[] = JSON.parse(raw);
      const filtered = list.filter(j => j.id !== journalId);
      localStorage.setItem(LOCAL_STORAGE_JOURNALS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn(e);
  }

  try {
    await deleteDoc(doc(db, 'teaching_journals', journalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teaching_journals/${journalId}`);
  }
}

// ----------------------------------------------------------------------------
// Certification & Exam Status System
// ----------------------------------------------------------------------------

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
  notes?: string;
  certificateNumber?: string;
  completedDate?: string;
  examinerName?: string;
  updatedAt: string;
}

const LOCAL_STORAGE_CERTS_KEY = 'sibtq_certifications_v1';

const defaultSeedCertifications: StudentCertification[] = [
  {
    id: 'cert_seed_1',
    studentId: '1',
    studentName: 'Muhammad Rizky Pratama',
    studentNis: '232407001',
    studentClass: '7A',
    groupId: 'group_1',
    groupName: 'Kelompok 1 (Putra 7A)',
    category: "Tasmi' Juz 30",
    status: 'Siap Ujian',
    score: 88,
    notes: 'Hafalan An-Naba s.d An-Nas lancar, tajwid mad jaiz munfashil perlu sedikit pemantapan.',
    examinerName: 'Ustadz Ahmad Fauzi, S.Pd.I',
    updatedAt: '2026-08-20T10:00:00.000Z'
  },
  {
    id: 'cert_seed_2',
    studentId: '2',
    studentName: 'Ahmad Fadillah',
    studentNis: '232407002',
    studentClass: '7A',
    groupId: 'group_1',
    groupName: 'Kelompok 1 (Putra 7A)',
    category: 'Khatam Iqro/Tilawati',
    status: 'Lulus Bersertifikat',
    score: 94,
    notes: 'Makhraj huruf fashih, lancar membaca Al-Qur\'an Juz 1.',
    certificateNumber: 'BTQ-102/CERT/2026/001',
    completedDate: '2026-08-15',
    examinerName: 'Koordinator BTQ SMPN 102',
    updatedAt: '2026-08-15T11:30:00.000Z'
  },
  {
    id: 'cert_seed_3',
    studentId: '6',
    studentName: 'Aisyah Putri Rahmadani',
    studentNis: '232407006',
    studentClass: '7A',
    groupId: 'group_2',
    groupName: 'Kelompok 2 (Putri 7A)',
    category: "Tasmi' Juz 'Amma Pilihan",
    status: 'Lulus Bersertifikat',
    score: 92,
    notes: 'Hafalan Ad-Dhuha s.d An-Nas sangat tartil dan mutqin.',
    certificateNumber: 'BTQ-102/CERT/2026/002',
    completedDate: '2026-08-18',
    examinerName: 'Ustadzah Nurul Hidayah, S.Pd',
    updatedAt: '2026-08-18T10:00:00.000Z'
  }
];

export async function getCertifications(groupId?: string): Promise<StudentCertification[]> {
  try {
    const certCol = collection(db, 'certifications');
    const snap = await getDocs(certCol);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentCertification));
      if (groupId) {
        return items.filter(c => c.groupId === groupId);
      }
      return items;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'certifications');
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CERTS_KEY);
    const list: StudentCertification[] = raw ? JSON.parse(raw) : defaultSeedCertifications;
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_CERTS_KEY, JSON.stringify(defaultSeedCertifications));
    }
    if (groupId) {
      return list.filter(c => c.groupId === groupId);
    }
    return list;
  } catch {
    return defaultSeedCertifications;
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

  // 2. Persist to Firestore
  try {
    if (cert.id && !cert.id.startsWith('cert_seed_')) {
      const docRef = doc(db, 'certifications', cert.id);
      await setDoc(docRef, payload, { merge: true });
      return cert.id;
    } else {
      const docRef = await addDoc(collection(db, 'certifications'), payload);
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'certifications');
    return cert.id || `cert_${Date.now()}`;
  }
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


