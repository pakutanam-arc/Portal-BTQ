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

// Helper to parse group number for sorting
export function getGroupNumber(group: { name?: string; id?: string }): number {
  const matchName = group.name?.match(/\d+/);
  if (matchName) return parseInt(matchName[0], 10);
  const matchId = group.id?.match(/\d+/);
  if (matchId) return parseInt(matchId[0], 10);
  return 0;
}

// Fetch all groups
export async function getGroups(): Promise<Group[]> {
  try {
    const q = query(collection(db, 'groups'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => {
        const data = doc.data() as Group;
        const gNum = getGroupNumber({ id: doc.id, ...data }) || 1;
        const gradeId = (gNum === 7 || gNum === 8 || doc.id === 'g7' || doc.id === 'g8' || doc.id === 'group_7' || doc.id === 'group_8')
          ? 'grade1'
          : (gNum === 4 || doc.id === 'g4' || doc.id === 'group_4')
          ? 'grade2'
          : (data.gradeId || (gNum <= 3 ? 'grade1' : gNum <= 8 ? 'grade2' : 'grade3'));
        return { id: doc.id, ...data, schedule: 'Sabtu, 07:15 - 08:00', gradeId };
      });
      return items.sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'groups');
  }

  // Fallback to initial groups
  const sortedMock = [...mockGroups].sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
  return sortedMock.map(g => {
    const gNum = getGroupNumber(g) || 1;
    const gradeId = (gNum === 7 || gNum === 8 || g.id === 'g7' || g.id === 'g8' || g.id === 'group_7' || g.id === 'group_8')
      ? 'grade1'
      : (gNum === 4 || g.id === 'g4' || g.id === 'group_4')
      ? 'grade2'
      : ((g as { gradeId?: string }).gradeId || (gNum <= 3 ? 'grade1' : gNum <= 8 ? 'grade2' : 'grade3'));
    return { ...g, schedule: 'Sabtu, 07:15 - 08:00', gradeId };
  });
}

// Fetch all students
export async function getStudents(): Promise<Student[]> {
  const g1NewNames = new Set([
    'KRESNA AFIF FATHURRAHMAN',
    'MUHAMMAD AZKA AOZORA',
    'ARFAN DIMAS WICAKSONO',
    'ALFABIANO SAPUTRA',
    'ARYA BIMA',
    'MUHAMAD IKHSAN',
    'MUHAMMAD FIRLY SINICHI',
    'RANDHI RIZKYANDRA',
    'MUHAMMAD ZIDAN ALFAREZEL',
    'DHANA HARDIANSYAH',
    'GILANG ZULFADLI AQILA',
    'AHMAD NUR FADLY',
  ]);

  const g2NewNames = new Set([
    'ANDRI PRASETYA KHARISMA PANTOW',
    'DAFFA ADITYA PRATAMA',
    'NATHAN RAUF PUTERA IRAWAN',
    'SAKHA ABIMANYU FIRJATULLAH',
    'DWI KURNIA PUTRA PRASETYO',
    'NAUFAN HIDAYAT',
    'MUHAMMAD ALVI FERDIANSAH',
    'HAFUZA SAMHIMGA ACUZIO',
    'MUHAMAD AZBIN MARSA',
    'RAFA ABIYU PRAMUDYA',
    'MAULANA MALIK IBRAHIM',
    'MUHAMMAD OKTO SYAHPUTRA',
  ]);

  const g3NewNames = new Set([
    'MUHAMMAD RAFFI',
    'PUTRA ARIFIANSYAH',
    'MUHAMMAD IRFAN ANANTA',
    'MUHAMAD RISKI',
    'MIKEL ARFA DASILVA',
    'BARA PUTRA AWI',
    'HAFIZ ALI AKBAR',
    'MUAMAR KHADAFI',
    'RADITYA WIDJAYA',
    'RAFFA DWI KURNIAWAN',
    'RIZKY RAHMAN',
    'MUHAMMAD ALAN AGASTHYA',
    'ARYANUGRAH ZAHY SUJANA',
    'MUHAMAD REYHAN',
    'RIZQI HOIRULLOH',
  ]);

  const g4NewNames = new Set([
    'MUHAMAD ABBYZAR IQSANI',
    'GALANG MAHARDIKA WIBOWO',
    'ALMERO DASTAN ANANTHA',
    'ALTHAF ZIARFA SAPUTRA',
    'AL FATHAR ARDIANSYAH',
    'AUFAN ACHMAD MAHGRON',
    'GIRI MAULANA',
    'MUHAMMAD RAFI AL-DYANI',
    'FATIAN HADIANSYAH',
    'GHANI YAZID KHAIRY',
    'MUHAMMAD SHIDQII AL HARITS',
    'VIRGIAWAN AL HAKIM',
    'ARSHA MASHUDINI',
    'AHMAD AUFAR AL HAFIZH',
    'ADEODATUSSAVA OMAR SASONGKO',
  ]);

  const g5NewNames = new Set([
    'RANGGA PUTRA PRATAMA',
    "MUHAMMAD GAFFI RICHIE AL 'FAIDZIN",
    'MUHAMMAD MAMERU',
    'MUHAMMAD AKRAM KAMIL',
    'RIZKY SATRIA ATMOJO',
    'ADELINO RICKY PERMANA',
    'MUHAMMAD ZIDAN NURACHMANSYAH',
    'MUHAMAD DANANG PRATAMA',
    'RANDY SYUGHANDI RIDINANTA',
    'RUBY ALTHAFI GINANJAR',
    'MUHAMMAD SYARIF',
    'EVANDRA RADITYA',
  ]);

  const g6NewNames = new Set([
    'RIZKI MAULANA',
    'MAULANA YUSUF',
    'IBRAHIM ARYAWINATA',
    'A IAS FERDI SURYA JAYA',
    'ACHMAD HANIF RIZKY PRATAMA',
    'IRZA DWI PUTRA',
    'RAJAWALI TAHTA BUWANA PANGESTU',
    'MUAZAM RAZIQ PARIKESIT',
    'MUHAMMAD FATIR ANUGRAH',
    'GERHAN RAFQI MAULANA PUTRA',
    'DIMAS PANGGALIH BUDOYO',
    'ARDIANSYAH',
    'MUHAMMAD HAIKAL SURYA PUTRA',
    'FARIS HAZMAN NAZIR',
    'RAIHAN MANDALA PUTRA RAMBE',
  ]);

  const g7NewNames = new Set([
    'SHESYA MEIDA ANJELI',
    'AIKO ARNELITA ARIANTO',
    'ARIVANESSA MAURAHMADHANIA',
    'LATIFAH QOLBI',
    'NAURA PUTRI ANDINI',
    'JASMINE AMIRA CALISTA',
    'LAILA NURAINI',
    'MADINAH PUTRI AZZAHRAH',
    'SCRIBBIE CHANDHEA WAHYUDI',
    'RIZKI NUR FITRA',
    'KAIVALYA MUIZEE REDIANSYAH',
    'MARISA KINARA PUTRI',
    'SYAKINAH PUTRI GAUTAMA',
    'ZAHRA HERAWATI',
  ]);

  const g8NewNames = new Set([
    'ANINDYA RIZKY PUTRI ARDITA',
    'FEIYAZ ALMAHYRA ATHANTRI',
    'GHAZIYA HAFIZA ANANDITA',
    'JASMIN PUTRI JAMILAH',
    'NAFISAH DWI DAMAYANTI',
    'JIHAN TALITA ULFA',
    'SALSABILA',
    'SYAHQILLA ALMA DWIFA',
    'ROINA RAMADANI',
    'TAURA HUMAIRA TAUFIQO PUTRI',
    'NAURA MAWADDAH',
    'ZAINA FATHIYYAH AZZAHRA',
    'AJENG SETYA NINGRUM',
    'ALEXA GRISELDA SACA',
  ]);

  const g9NewNames = new Set([
    'AISYAH MALIKA PUTRI',
    'SOFIA MAHARANI',
    'NAURAH AUFA SALAM',
    'CAEISHA PUTRI RAMADHANI',
    'ANNISA WARDHANI GUSTI',
    'SAFIRA YULIANTI',
    'NURIL FATHIYAH',
    'KHAERUNISA AULIA',
    'NAYLA PUTRI BERLIAN',
    'SALSABILAH PUTRI CHANIAGO',
    'SHEILA KHANSA CHAIRUNNISA',
    'RORO DIAN AYU',
    'RAMADHANI FITRIA NINGSIH',
    'KANASYA NUR FATWA AULIA',
    'SALSABILAH RAMADHANI',
    'ZIFANA LATISA',
    'NUR AINI SALWA NABILA',
    'TANIA ADZRA SABRINA',
    'AISHA SELVIRA DANIKA',
    'RAISA ROXANNE MAHESWARI',
    'BEIBY AMEERA',
    'EVELIN VARISTA',
  ]);

  const g10NewNames = new Set([
    'FATIR AZKA NUGROHO',
    'FATHIA AZIZAH HERMA',
    'RADEN RORO GIZKHA ARTNES',
    'AHSAN ATHAYA PUTRA INSAN',
    'MUHAMMAD IKHSAN AFLAH FAEYZAN',
    'JASMINE AL KHANSA QAISARA',
    'MUHAMMAD GHIFARI ISKANDAR',
    'NOVAL DWI PERMANA',
    'APPLEYNA ULFA',
    'NAURA DHANIA AMANDA',
    'SALSABILA FACHNA',
    'CALLISTA AMADEA',
    'ALVARO ARIQ PRADITA',
    'FAEYZA IMANSAH SHAKI JANATHAN',
    'MUHAMMAD FAQIH',
    'NURUL ALYA SIERRA',
    'FIRSYA ZAHRA RATIFA',
    'TIARA APRILIA',
    'MUHAMMAD FAHRI AL MUSLIM',
    'REFAN RAMADHAN',
    'AHMAD FAIZ DARMAWAN',
    'HANA PUTRI QONITA',
    'ARJUNA HANDARU WIDODO',
    'DANNA EVRYL LYO',
    'EVANIA WIRAWAN',
    'MUHAMMAD KHABIB',
  ]);

  try {
    const q = query(collection(db, 'students'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      // Check if Firestore contains legacy g1, g2, g3, g4, g5, g6, or g7 students that are not in the new lists
      const hasLegacyG1 = items.some(s => (s.groupId === 'g1' || s.groupId === 'group_1') && !g1NewNames.has(s.name));
      if (hasLegacyG1) {
        const g1MockStudents = mockStudents.filter(s => s.groupId === 'g1');
        items = items.filter(s => s.groupId !== 'g1' && s.groupId !== 'group_1').concat(g1MockStudents);
      }
      const hasLegacyG2 = items.some(s => (s.groupId === 'g2' || s.groupId === 'group_2') && !g2NewNames.has(s.name));
      if (hasLegacyG2) {
        const g2MockStudents = mockStudents.filter(s => s.groupId === 'g2');
        items = items.filter(s => s.groupId !== 'g2' && s.groupId !== 'group_2').concat(g2MockStudents);
      }
      const hasLegacyG3 = items.some(s => (s.groupId === 'g3' || s.groupId === 'group_3') && !g3NewNames.has(s.name));
      if (hasLegacyG3) {
        const g3MockStudents = mockStudents.filter(s => s.groupId === 'g3');
        items = items.filter(s => s.groupId !== 'g3' && s.groupId !== 'group_3').concat(g3MockStudents);
      }
      const hasLegacyG4 = items.some(s => (s.groupId === 'g4' || s.groupId === 'group_4') && !g4NewNames.has(s.name));
      if (hasLegacyG4) {
        const g4MockStudents = mockStudents.filter(s => s.groupId === 'g4');
        items = items.filter(s => s.groupId !== 'g4' && s.groupId !== 'group_4').concat(g4MockStudents);
      }
      const hasLegacyG5 = items.some(s => (s.groupId === 'g5' || s.groupId === 'group_5') && !g5NewNames.has(s.name));
      if (hasLegacyG5) {
        const g5MockStudents = mockStudents.filter(s => s.groupId === 'g5');
        items = items.filter(s => s.groupId !== 'g5' && s.groupId !== 'group_5').concat(g5MockStudents);
      }
      const hasLegacyG6 = items.some(s => (s.groupId === 'g6' || s.groupId === 'group_6') && !g6NewNames.has(s.name));
      if (hasLegacyG6) {
        const g6MockStudents = mockStudents.filter(s => s.groupId === 'g6');
        items = items.filter(s => s.groupId !== 'g6' && s.groupId !== 'group_6').concat(g6MockStudents);
      }
      const hasLegacyG7 = items.some(s => (s.groupId === 'g7' || s.groupId === 'group_7') && !g7NewNames.has(s.name));
      if (hasLegacyG7) {
        const g7MockStudents = mockStudents.filter(s => s.groupId === 'g7');
        items = items.filter(s => s.groupId !== 'g7' && s.groupId !== 'group_7').concat(g7MockStudents);
      }
      const hasLegacyG8 = items.some(s => (s.groupId === 'g8' || s.groupId === 'group_8') && !g8NewNames.has(s.name));
      if (hasLegacyG8) {
        const g8MockStudents = mockStudents.filter(s => s.groupId === 'g8');
        items = items.filter(s => s.groupId !== 'g8' && s.groupId !== 'group_8').concat(g8MockStudents);
      }
      const hasLegacyG9 = items.some(s => (s.groupId === 'g9' || s.groupId === 'group_9') && !g9NewNames.has(s.name));
      if (hasLegacyG9) {
        const g9MockStudents = mockStudents.filter(s => s.groupId === 'g9');
        items = items.filter(s => s.groupId !== 'g9' && s.groupId !== 'group_9').concat(g9MockStudents);
      }
      const hasLegacyG10 = items.some(s => (s.groupId === 'g10' || s.groupId === 'group_10') && !g10NewNames.has(s.name));
      if (hasLegacyG10) {
        const g10MockStudents = mockStudents.filter(s => s.groupId === 'g10');
        items = items.filter(s => s.groupId !== 'g10' && s.groupId !== 'group_10').concat(g10MockStudents);
      }
      return items;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }

  return mockStudents;
}

// Real-time listener for students collection
export function subscribeToStudents(callback: (students: Student[]) => void): () => void {
  const colRef = collection(db, 'students');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      callback(items);
    } else {
      callback(mockStudents);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'students');
    callback(mockStudents);
  });
}

export async function addStudent(studentData: Omit<Student, 'id'>): Promise<string> {
  const payload = {
    ...studentData,
    gender: (studentData.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
    status: (studentData.status || 'Aktif') as 'Aktif' | 'Nonaktif',
    createdAt: new Date().toISOString()
  };
  try {
    const docRef = await addDoc(collection(db, 'students'), payload);
    const newStudent = { id: docRef.id, ...payload } as any;
    const existingIdx = mockStudents.findIndex(s => s.id === docRef.id);
    if (existingIdx >= 0) {
      mockStudents[existingIdx] = newStudent;
    } else {
      mockStudents.unshift(newStudent);
    }
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
    const newId = `s_${Date.now()}`;
    const newStudent = { id: newId, ...payload } as any;
    mockStudents.unshift(newStudent);
    return newId;
  }
}

export async function updateStudent(id: string, studentData: Partial<Student>): Promise<void> {
  try {
    const docRef = doc(db, 'students', id);
    await setDoc(docRef, studentData, { merge: true });
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents[idx] = { ...mockStudents[idx], ...studentData } as any;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents[idx] = { ...mockStudents[idx], ...studentData } as any;
    }
  }
}

export async function deleteStudent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'students', id));
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents.splice(idx, 1);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    const idx = mockStudents.findIndex(s => s.id === id);
    if (idx >= 0) {
      mockStudents.splice(idx, 1);
    }
  }
}

// Fetch all mentors
export async function getMentors(): Promise<Mentor[]> {
  const mentorMappingData = [
    { id: 'm1', groupId: 'g1', name: 'Kak Alumni 1', oldEmail: 'ahmad@smpn102.sch.id', newEmail: 'alumni1@smpn102.sch.id' },
    { id: 'm2', groupId: 'g2', name: 'Kak Alumni 2', oldEmail: 'siti@smpn102.sch.id', newEmail: 'alumni2@smpn102.sch.id' },
    { id: 'm3', groupId: 'g3', name: 'Kak Alumni 3', oldEmail: 'budi@smpn102.sch.id', newEmail: 'alumni3@smpn102.sch.id' },
    { id: 'm4', groupId: 'g4', name: 'Kak Alumni 4', oldEmail: 'nurul@smpn102.sch.id', newEmail: 'alumni4@smpn102.sch.id' },
    { id: 'm5', groupId: 'g5', name: 'Kak Alumni 5', oldEmail: 'hasan@smpn102.sch.id', newEmail: 'alumni5@smpn102.sch.id' },
    { id: 'm6', groupId: 'g6', name: 'Kak Alumni 6', oldEmail: 'fatimah@smpn102.sch.id', newEmail: 'alumni6@smpn102.sch.id' },
    { id: 'm7', groupId: 'g7', name: 'Kak Alumni 7', oldEmail: 'zainal@smpn102.sch.id', newEmail: 'alumni7@smpn102.sch.id' },
    { id: 'm8', groupId: 'g8', name: 'Kak Alumni 8', oldEmail: 'aisyah@smpn102.sch.id', newEmail: 'alumni8@smpn102.sch.id' },
    { id: 'm9', groupId: 'g9', name: 'Kak Alumni 9', oldEmail: 'rahman@smpn102.sch.id', newEmail: 'alumni9@smpn102.sch.id' },
    { id: 'm10', groupId: 'g10', name: 'Kak Alumni 10', oldEmail: 'khadijah@smpn102.sch.id', newEmail: 'alumni10@smpn102.sch.id' },
  ];

  try {
    const q = query(collection(db, 'users'), where('role', '==', 'mentor'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data() as any;
        const emailLower = data.email?.toLowerCase();
        
        const matched = mentorMappingData.find(
          m => data.groupId === m.groupId || 
               docSnapshot.id === m.id || 
               emailLower === m.oldEmail || 
               emailLower === m.newEmail
        );

        if (matched) {
          if (data.email !== matched.newEmail || data.name !== matched.name) {
            updateDoc(doc(db, 'users', docSnapshot.id), {
              email: matched.newEmail,
              name: matched.name
            }).catch(e => console.warn("Error auto-updating mentor in Firestore:", e));
          }
          return {
            id: docSnapshot.id,
            ...data,
            name: matched.name,
            email: matched.newEmail
          } as Mentor;
        }
        return { id: docSnapshot.id, ...data } as Mentor;
      });

      return items.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }

  const list = mockMentors.map(m => {
    const matched = mentorMappingData.find(md => md.id === m.id || md.groupId === m.groupId);
    return {
      id: m.id,
      name: matched ? matched.name : m.name,
      email: matched ? matched.newEmail : m.email,
      role: 'mentor',
      status: m.status,
      groupId: m.groupId,
    };
  });

  return list.sort((a, b) => {
    const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
}

// Fetch students for a specific group
export async function getStudentsByGroup(groupId: string): Promise<Student[]> {
  const g1NewNames = new Set([
    'KRESNA AFIF FATHURRAHMAN',
    'MUHAMMAD AZKA AOZORA',
    'ARFAN DIMAS WICAKSONO',
    'ALFABIANO SAPUTRA',
    'ARYA BIMA',
    'MUHAMAD IKHSAN',
    'MUHAMMAD FIRLY SINICHI',
    'RANDHI RIZKYANDRA',
    'MUHAMMAD ZIDAN ALFAREZEL',
    'DHANA HARDIANSYAH',
    'GILANG ZULFADLI AQILA',
    'AHMAD NUR FADLY',
  ]);

  const g2NewNames = new Set([
    'ANDRI PRASETYA KHARISMA PANTOW',
    'DAFFA ADITYA PRATAMA',
    'NATHAN RAUF PUTERA IRAWAN',
    'SAKHA ABIMANYU FIRJATULLAH',
    'DWI KURNIA PUTRA PRASETYO',
    'NAUFAN HIDAYAT',
    'MUHAMMAD ALVI FERDIANSAH',
    'HAFUZA SAMHIMGA ACUZIO',
    'MUHAMAD AZBIN MARSA',
    'RAFA ABIYU PRAMUDYA',
    'MAULANA MALIK IBRAHIM',
    'MUHAMMAD OKTO SYAHPUTRA',
  ]);

  const g3NewNames = new Set([
    'MUHAMMAD RAFFI',
    'PUTRA ARIFIANSYAH',
    'MUHAMMAD IRFAN ANANTA',
    'MUHAMAD RISKI',
    'MIKEL ARFA DASILVA',
    'BARA PUTRA AWI',
    'HAFIZ ALI AKBAR',
    'MUAMAR KHADAFI',
    'RADITYA WIDJAYA',
    'RAFFA DWI KURNIAWAN',
    'RIZKY RAHMAN',
    'MUHAMMAD ALAN AGASTHYA',
    'ARYANUGRAH ZAHY SUJANA',
    'MUHAMAD REYHAN',
    'RIZQI HOIRULLOH',
  ]);

  const g4NewNames = new Set([
    'MUHAMAD ABBYZAR IQSANI',
    'GALANG MAHARDIKA WIBOWO',
    'ALMERO DASTAN ANANTHA',
    'ALTHAF ZIARFA SAPUTRA',
    'AL FATHAR ARDIANSYAH',
    'AUFAN ACHMAD MAHGRON',
    'GIRI MAULANA',
    'MUHAMMAD RAFI AL-DYANI',
    'FATIAN HADIANSYAH',
    'GHANI YAZID KHAIRY',
    'MUHAMMAD SHIDQII AL HARITS',
    'VIRGIAWAN AL HAKIM',
    'ARSHA MASHUDINI',
    'AHMAD AUFAR AL HAFIZH',
    'ADEODATUSSAVA OMAR SASONGKO',
  ]);

  const g5NewNames = new Set([
    'RANGGA PUTRA PRATAMA',
    "MUHAMMAD GAFFI RICHIE AL 'FAIDZIN",
    'MUHAMMAD MAMERU',
    'MUHAMMAD AKRAM KAMIL',
    'RIZKY SATRIA ATMOJO',
    'ADELINO RICKY PERMANA',
    'MUHAMMAD ZIDAN NURACHMANSYAH',
    'MUHAMAD DANANG PRATAMA',
    'RANDY SYUGHANDI RIDINANTA',
    'RUBY ALTHAFI GINANJAR',
    'MUHAMMAD SYARIF',
    'EVANDRA RADITYA',
  ]);

  const g6NewNames = new Set([
    'RIZKI MAULANA',
    'MAULANA YUSUF',
    'IBRAHIM ARYAWINATA',
    'A IAS FERDI SURYA JAYA',
    'ACHMAD HANIF RIZKY PRATAMA',
    'IRZA DWI PUTRA',
    'RAJAWALI TAHTA BUWANA PANGESTU',
    'MUAZAM RAZIQ PARIKESIT',
    'MUHAMMAD FATIR ANUGRAH',
    'GERHAN RAFQI MAULANA PUTRA',
    'DIMAS PANGGALIH BUDOYO',
    'ARDIANSYAH',
    'MUHAMMAD HAIKAL SURYA PUTRA',
    'FARIS HAZMAN NAZIR',
    'RAIHAN MANDALA PUTRA RAMBE',
  ]);

  const g7NewNames = new Set([
    'SHESYA MEIDA ANJELI',
    'AIKO ARNELITA ARIANTO',
    'ARIVANESSA MAURAHMADHANIA',
    'LATIFAH QOLBI',
    'NAURA PUTRI ANDINI',
    'JASMINE AMIRA CALISTA',
    'LAILA NURAINI',
    'MADINAH PUTRI AZZAHRAH',
    'SCRIBBIE CHANDHEA WAHYUDI',
    'RIZKI NUR FITRA',
    'KAIVALYA MUIZEE REDIANSYAH',
    'MARISA KINARA PUTRI',
    'SYAKINAH PUTRI GAUTAMA',
    'ZAHRA HERAWATI',
  ]);

  const g8NewNames = new Set([
    'ANINDYA RIZKY PUTRI ARDITA',
    'FEIYAZ ALMAHYRA ATHANTRI',
    'GHAZIYA HAFIZA ANANDITA',
    'JASMIN PUTRI JAMILAH',
    'NAFISAH DWI DAMAYANTI',
    'JIHAN TALITA ULFA',
    'SALSABILA',
    'SYAHQILLA ALMA DWIFA',
    'ROINA RAMADANI',
    'TAURA HUMAIRA TAUFIQO PUTRI',
    'NAURA MAWADDAH',
    'ZAINA FATHIYYAH AZZAHRA',
    'AJENG SETYA NINGRUM',
    'ALEXA GRISELDA SACA',
  ]);

  const g9NewNames = new Set([
    'AISYAH MALIKA PUTRI',
    'SOFIA MAHARANI',
    'NAURAH AUFA SALAM',
    'CAEISHA PUTRI RAMADHANI',
    'ANNISA WARDHANI GUSTI',
    'SAFIRA YULIANTI',
    'NURIL FATHIYAH',
    'KHAERUNISA AULIA',
    'NAYLA PUTRI BERLIAN',
    'SALSABILAH PUTRI CHANIAGO',
    'SHEILA KHANSA CHAIRUNNISA',
    'RORO DIAN AYU',
    'RAMADHANI FITRIA NINGSIH',
    'KANASYA NUR FATWA AULIA',
    'SALSABILAH RAMADHANI',
    'ZIFANA LATISA',
    'NUR AINI SALWA NABILA',
    'TANIA ADZRA SABRINA',
    'AISHA SELVIRA DANIKA',
    'RAISA ROXANNE MAHESWARI',
    'BEIBY AMEERA',
    'EVELIN VARISTA',
  ]);

  const g10NewNames = new Set([
    'FATIR AZKA NUGROHO',
    'FATHIA AZIZAH HERMA',
    'RADEN RORO GIZKHA ARTNES',
    'AHSAN ATHAYA PUTRA INSAN',
    'MUHAMMAD IKHSAN AFLAH FAEYZAN',
    'JASMINE AL KHANSA QAISARA',
    'MUHAMMAD GHIFARI ISKANDAR',
    'NOVAL DWI PERMANA',
    'APPLEYNA ULFA',
    'NAURA DHANIA AMANDA',
    'SALSABILA FACHNA',
    'CALLISTA AMADEA',
    'ALVARO ARIQ PRADITA',
    'FAEYZA IMANSAH SHAKI JANATHAN',
    'MUHAMMAD FAQIH',
    'NURUL ALYA SIERRA',
    'FIRSYA ZAHRA RATIFA',
    'TIARA APRILIA',
    'MUHAMMAD FAHRI AL MUSLIM',
    'REFAN RAMADHAN',
    'AHMAD FAIZ DARMAWAN',
    'HANA PUTRI QONITA',
    'ARJUNA HANDARU WIDODO',
    'DANNA EVRYL LYO',
    'EVANIA WIRAWAN',
    'MUHAMMAD KHABIB',
  ]);

  if (groupId === 'g1' || groupId === 'group_1') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g1', 'group_1']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG1 = items.some(s => !g1NewNames.has(s.name));
        if (!hasLegacyG1) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g1');
  }

  if (groupId === 'g2' || groupId === 'group_2') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g2', 'group_2']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG2 = items.some(s => !g2NewNames.has(s.name));
        if (!hasLegacyG2) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g2');
  }

  if (groupId === 'g3' || groupId === 'group_3') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g3', 'group_3']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG3 = items.some(s => !g3NewNames.has(s.name));
        if (!hasLegacyG3) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g3');
  }

  if (groupId === 'g4' || groupId === 'group_4') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g4', 'group_4']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG4 = items.some(s => !g4NewNames.has(s.name));
        if (!hasLegacyG4) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g4');
  }

  if (groupId === 'g5' || groupId === 'group_5') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g5', 'group_5']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG5 = items.some(s => !g5NewNames.has(s.name));
        if (!hasLegacyG5) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g5');
  }

  if (groupId === 'g6' || groupId === 'group_6') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g6', 'group_6']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG6 = items.some(s => !g6NewNames.has(s.name));
        if (!hasLegacyG6) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g6');
  }

  if (groupId === 'g7' || groupId === 'group_7') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g7', 'group_7']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG7 = items.some(s => !g7NewNames.has(s.name));
        if (!hasLegacyG7) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g7');
  }

  if (groupId === 'g8' || groupId === 'group_8') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g8', 'group_8']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG8 = items.some(s => !g8NewNames.has(s.name));
        if (!hasLegacyG8) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g8');
  }

  if (groupId === 'g9' || groupId === 'group_9') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g9', 'group_9']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG9 = items.some(s => !g9NewNames.has(s.name));
        if (!hasLegacyG9) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g9');
  }

  if (groupId === 'g10' || groupId === 'group_10') {
    try {
      const q = query(collection(db, 'students'), where('groupId', 'in', ['g10', 'group_10']));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        const hasLegacyG10 = items.some(s => !g10NewNames.has(s.name));
        if (!hasLegacyG10) {
          return items;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
    return mockStudents.filter(s => s.groupId === 'g10');
  }

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

  if (records.length > 0) {
    const groupName = cleanGroupName(records[0].groupId);
    await logSystemActivity(
      'attendance',
      'Presensi Siswa',
      `Absensi ${groupName} diperbarui (${records.length} siswa).`
    );
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

  if (records.length > 0) {
    await logSystemActivity(
      'attendance',
      'Presensi Mentor',
      `Kehadiran mentor telah dicatatkan untuk ${records.length} pengajar.`
    );
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
    const scores: number[] = [];
    if (p.reading && p.reading > 0) scores.push(p.reading);
    if (p.tajwid && p.tajwid > 0) scores.push(p.tajwid);
    if (p.memorization && p.memorization > 0) scores.push(p.memorization);
    if (p.writing && p.writing > 0) scores.push(p.writing);
    
    return {
      ...p,
      groupId: student?.groupId || 'g1',
      total: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0,
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

  // Find student name dynamically
  let studentName = 'Santri';
  try {
    const studentDoc = await getDoc(doc(db, 'students', record.studentId));
    if (studentDoc.exists()) {
      studentName = studentDoc.data().name || 'Santri';
    } else {
      // Look in mockStudents
      const localS = mockStudents.find(s => s.id === record.studentId);
      if (localS) studentName = localS.name;
    }
  } catch {}

  await logSystemActivity(
    'progress',
    'Progress Santri',
    `Pencapaian ${studentName} diperbarui (Rata-rata: ${record.total || 0}%).`
  );
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
    title: 'Jadwal Bimbingan Sabtu (07:15 - 08:00 WIB)',
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
    mentorName: 'Kak Alumni 1',
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

  let finalId = journal.id || `journal_${Date.now()}`;
  // 2. Persist to Firestore
  try {
    if (journal.id && !journal.id.startsWith('journal_seed_')) {
      const docRef = doc(db, 'teaching_journals', journal.id);
      await setDoc(docRef, payload, { merge: true });
    } else {
      const docRef = await addDoc(collection(db, 'teaching_journals'), payload);
      finalId = docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'teaching_journals');
  }

  const mentorName = journal.mentorName || 'Mentor';
  const groupName = cleanGroupName(journal.groupId);
  await logSystemActivity(
    'journal',
    'Jurnal Mengajar',
    `${mentorName} mengisi jurnal mengajar untuk ${groupName}.`
  );

  return finalId;
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
    examinerName: 'Kak Alumni 1',
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

  let finalId = cert.id || `cert_${Date.now()}`;
  // 2. Persist to Firestore
  try {
    if (cert.id && !cert.id.startsWith('cert_seed_')) {
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

export interface SystemActivity {
  id: string;
  type: 'journal' | 'progress' | 'certification' | 'attendance';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  bg: string;
  rawDate: Date;
}

const LOCAL_STORAGE_ACTIVITIES_KEY = 'sibtq_system_activities_v1';

export function cleanGroupName(groupId: string): string {
  if (!groupId) return 'Kelompok';
  const num = groupId.replace('group_', '').replace('g', '');
  return `Kelompok ${num}`;
}

export async function logSystemActivity(
  type: 'journal' | 'progress' | 'certification' | 'attendance',
  title: string,
  description: string
): Promise<void> {
  const dateStr = new Date().toISOString();
  const payload = {
    type,
    title,
    description,
    createdAt: dateStr
  };

  // 1. Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVITIES_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [
      {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        ...payload
      },
      ...existing
    ].slice(0, 50); // Keep last 50 only
    localStorage.setItem(LOCAL_STORAGE_ACTIVITIES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save activity locally", e);
  }

  // 2. Persist to Firestore
  try {
    await addDoc(collection(db, 'system_activities'), payload);
  } catch (error) {
    console.error("Could not log activity to firestore", error);
  }
}

export async function getSystemActivities(): Promise<SystemActivity[]> {
  const activities: SystemActivity[] = [];

  const iconMap = {
    journal: '📝',
    progress: '📈',
    certification: '🎓',
    attendance: '✅'
  };

  const colorMap = {
    journal: 'text-[#C99A2E]',
    progress: 'text-[#0362D0]',
    certification: 'text-[#950415]',
    attendance: 'text-[#0362D0]'
  };

  const bgMap = {
    journal: 'bg-[#C99A2E]/10',
    progress: 'bg-[#0362D0]/10',
    certification: 'bg-[#950415]/10',
    attendance: 'bg-[#0362D0]/10'
  };

  try {
    const actCol = collection(db, 'system_activities');
    const actSnap = await getDocs(query(actCol, orderBy('createdAt', 'desc')));
    if (!actSnap.empty) {
      actSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
        const type = (data.type || 'journal') as 'journal' | 'progress' | 'certification' | 'attendance';
        activities.push({
          id: docSnap.id,
          type,
          title: data.title || 'Aktivitas',
          description: data.description || '',
          timestamp: formatActivityTime(dateObj),
          icon: iconMap[type] || '📝',
          color: colorMap[type] || 'text-[#0362D0]',
          bg: bgMap[type] || 'bg-[#0362D0]/10',
          rawDate: dateObj
        });
      });
      return activities.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    }
  } catch (error) {
    console.error("Error fetching system activities from firestore:", error);
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVITIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as any[];
      const localActs = parsed.map(item => {
        const dateObj = item.createdAt ? new Date(item.createdAt) : new Date();
        const type = (item.type || 'journal') as 'journal' | 'progress' | 'certification' | 'attendance';
        return {
          id: item.id || `local_${Date.now()}`,
          type,
          title: item.title || 'Aktivitas',
          description: item.description || '',
          timestamp: formatActivityTime(dateObj),
          icon: iconMap[type] || '📝',
          color: colorMap[type] || 'text-[#0362D0]',
          bg: bgMap[type] || 'bg-[#0362D0]/10',
          rawDate: dateObj
        };
      });
      return localActs.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    }
  } catch {}

  return [];
}

function formatActivityTime(date: Date): string {
  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return 'Baru saja';
  }
}



