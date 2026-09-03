import { Student, Group, Mentor, StudentAttendance, MentorAttendance, Progress, Curriculum, LearningSession } from '../types';
import { addDays, format, subDays, subMonths } from 'date-fns';

export const mockMentors: Mentor[] = [
  { id: 'm1', name: 'Kak Alumni 1', email: 'alumni1@smpn102.sch.id', status: 'Aktif', groupId: 'g1' },
  { id: 'm2', name: 'Kak Alumni 2', email: 'alumni2@smpn102.sch.id', status: 'Aktif', groupId: 'g2' },
  { id: 'm3', name: 'Kak Alumni 3', email: 'alumni3@smpn102.sch.id', status: 'Aktif', groupId: 'g3' },
  { id: 'm4', name: 'Kak Alumni 4', email: 'alumni4@smpn102.sch.id', status: 'Aktif', groupId: 'g4' },
  { id: 'm5', name: 'Kak Alumni 5', email: 'alumni5@smpn102.sch.id', status: 'Aktif', groupId: 'g5' },
  { id: 'm6', name: 'Kak Alumni 6', email: 'alumni6@smpn102.sch.id', status: 'Aktif', groupId: 'g6' },
  { id: 'm7', name: 'Kak Alumni 7', email: 'alumni7@smpn102.sch.id', status: 'Aktif', groupId: 'g7' },
  { id: 'm8', name: 'Kak Alumni 8', email: 'alumni8@smpn102.sch.id', status: 'Aktif', groupId: 'g8' },
  { id: 'm9', name: 'Kak Alumni 9', email: 'alumni9@smpn102.sch.id', status: 'Aktif', groupId: 'g9' },
  { id: 'm10', name: 'Kak Alumni 10', email: 'alumni10@smpn102.sch.id', status: 'Aktif', groupId: 'g10' },
];

const groupRooms: Record<number, string> = {
  1: 'Mushola',
  2: 'Mushola',
  3: 'Mushola',
  4: '9A',
  5: '9B',
  6: '9C',
  7: 'Perpustakaan',
  8: 'Perpustakaan',
  9: '7C lantai 1',
  10: '9D',
};

export const mockGroups: Group[] = Array.from({ length: 10 }).map((_, i) => {
  const gNum = i + 1;
  const gradeId = gNum === 10 ? 'grade3' : [4, 5, 6, 9].includes(gNum) ? 'grade2' : 'grade1';
  return {
    id: `g${gNum}`,
    name: `Kelompok ${gNum}`,
    mentorId: `m${gNum}`,
    schedule: 'Sabtu, 07:15 - 08:00',
    room: groupRooms[gNum] || `Ruang ${101 + i}`,
    gradeId,
  };
});

const firstNamesL = ['Budi', 'Andi', 'Rizky', 'Fajar', 'Hendra', 'Aditya', 'Dimas', 'Eko', 'Ilham', 'Deni', 'Arif', 'Bayu', 'Gilang', 'Rian', 'Fauzan'];
const firstNamesP = ['Siti', 'Ayu', 'Putri', 'Dewi', 'Sari', 'Nisa', 'Rina', 'Indah', 'Fitri', 'Dian', 'Lestari', 'Ratna', 'Wulan', 'Nur', 'Sri'];
const lastNames = ['Saputra', 'Pratama', 'Kurniawan', 'Wijaya', 'Setiawan', 'Hidayat', 'Nugroho', 'Lestari', 'Wahyuni', 'Utami', 'Sari', 'Rahmawati', 'Putri', 'Ramadhan', 'Maulana'];

export const mockStudents: Student[] = [];
let studentCount = 1;

mockGroups.forEach((group) => {
  if (group.id === 'g1') {
    // 12 new students for Kelompok 1
    const g1List = [
      { name: 'KRESNA AFIF FATHURRAHMAN', class: '7D' },
      { name: 'MUHAMMAD AZKA AOZORA', class: '7D' },
      { name: 'ARFAN DIMAS WICAKSONO', class: '7E' },
      { name: 'ALFABIANO SAPUTRA', class: '7F' },
      { name: 'ARYA BIMA', class: '7F' },
      { name: 'MUHAMAD IKHSAN', class: '7F' },
      { name: 'MUHAMMAD FIRLY SINICHI', class: '7F' },
      { name: 'RANDHI RIZKYANDRA', class: '7F' },
      { name: 'MUHAMMAD ZIDAN ALFAREZEL', class: '8B' },
      { name: 'DHANA HARDIANSYAH', class: '8C' },
      { name: 'GILANG ZULFADLI AQILA', class: '8E' },
      { name: 'AHMAD NUR FADLY', class: '9G' },
    ];

    g1List.forEach((st, idx) => {
      mockStudents.push({
        id: `s1_${idx + 1}`,
        nis: `102${String(idx + 1).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g1',
        gender: 'L',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g2') {
    // 12 new students for Kelompok 2
    const g2List = [
      { name: 'ANDRI PRASETYA KHARISMA PANTOW', class: '7A' },
      { name: 'DAFFA ADITYA PRATAMA', class: '7A' },
      { name: 'NATHAN RAUF PUTERA IRAWAN', class: '7A' },
      { name: 'SAKHA ABIMANYU FIRJATULLAH', class: '7A' },
      { name: 'DWI KURNIA PUTRA PRASETYO', class: '7B' },
      { name: 'NAUFAN HIDAYAT', class: '7B' },
      { name: 'MUHAMMAD ALVI FERDIANSAH', class: '7C' },
      { name: 'HAFUZA SAMHIMGA ACUZIO', class: '7D' },
      { name: 'MUHAMAD AZBIN MARSA', class: '9C' },
      { name: 'RAFA ABIYU PRAMUDYA', class: '9D' },
      { name: 'MAULANA MALIK IBRAHIM', class: '9F' },
      { name: 'MUHAMMAD OKTO SYAHPUTRA', class: '9G' },
    ];

    g2List.forEach((st, idx) => {
      mockStudents.push({
        id: `s2_${idx + 1}`,
        nis: `102${String(idx + 13).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g2',
        gender: 'L',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g3') {
    // 15 new students for Kelompok 3
    const g3List = [
      { name: 'MUHAMMAD RAFFI', class: '9A' },
      { name: 'PUTRA ARIFIANSYAH', class: '9A' },
      { name: 'MUHAMMAD IRFAN ANANTA', class: '9B' },
      { name: 'MUHAMAD RISKI', class: '9B' },
      { name: 'MIKEL ARFA DASILVA', class: '9C' },
      { name: 'BARA PUTRA AWI', class: '9C' },
      { name: 'HAFIZ ALI AKBAR', class: '9C' },
      { name: 'MUAMAR KHADAFI', class: '9C' },
      { name: 'RADITYA WIDJAYA', class: '9C' },
      { name: 'RAFFA DWI KURNIAWAN', class: '9C' },
      { name: 'RIZKY RAHMAN', class: '9C' },
      { name: 'MUHAMMAD ALAN AGASTHYA', class: '9E' },
      { name: 'ARYANUGRAH ZAHY SUJANA', class: '9F' },
      { name: 'MUHAMAD REYHAN', class: '9F' },
      { name: 'RIZQI HOIRULLOH', class: '9F' },
    ];

    g3List.forEach((st, idx) => {
      mockStudents.push({
        id: `s3_${idx + 1}`,
        nis: `102${String(idx + 25).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g3',
        gender: 'L',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g4') {
    // 15 new students for Kelompok 4
    const g4List = [
      { name: 'MUHAMAD ABBYZAR IQSANI', class: '7A' },
      { name: 'GALANG MAHARDIKA WIBOWO', class: '7B' },
      { name: 'ALMERO DASTAN ANANTHA', class: '7D' },
      { name: 'ALTHAF ZIARFA SAPUTRA', class: '7D' },
      { name: 'AL FATHAR ARDIANSYAH', class: '7E' },
      { name: 'AUFAN ACHMAD MAHGRON', class: '7E' },
      { name: 'GIRI MAULANA', class: '7E' },
      { name: 'MUHAMMAD RAFI AL-DYANI', class: '7E' },
      { name: 'FATIAN HADIANSYAH', class: '7F' },
      { name: 'GHANI YAZID KHAIRY', class: '7F' },
      { name: 'MUHAMMAD SHIDQII AL HARITS', class: '7F' },
      { name: 'VIRGIAWAN AL HAKIM', class: '7F' },
      { name: 'ARSHA MASHUDINI', class: '8A' },
      { name: 'AHMAD AUFAR AL HAFIZH', class: '8B' },
      { name: 'ADEODATUSSAVA OMAR SASONGKO', class: '8C' },
    ];

    g4List.forEach((st, idx) => {
      mockStudents.push({
        id: `s4_${idx + 1}`,
        nis: `102${String(idx + 40).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g4',
        gender: 'L',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g5') {
    // 12 new students for Kelompok 5
    const g5List = [
      { name: 'RANGGA PUTRA PRATAMA', class: '8D' },
      { name: "MUHAMMAD GAFFI RICHIE AL 'FAIDZIN", class: '8D' },
      { name: 'MUHAMMAD MAMERU', class: '8F' },
      { name: 'MUHAMMAD AKRAM KAMIL', class: '8B' },
      { name: 'RIZKY SATRIA ATMOJO', class: '8D' },
      { name: 'ADELINO RICKY PERMANA', class: '9E' },
      { name: 'MUHAMMAD ZIDAN NURACHMANSYAH', class: '9E' },
      { name: 'MUHAMAD DANANG PRATAMA', class: '9F' },
      { name: 'RANDY SYUGHANDI RIDINANTA', class: '9F' },
      { name: 'RUBY ALTHAFI GINANJAR', class: '9F' },
      { name: 'MUHAMMAD SYARIF', class: '9G' },
      { name: 'EVANDRA RADITYA', class: '9G' },
    ];

    g5List.forEach((st, idx) => {
      mockStudents.push({
        id: `s5_${idx + 1}`,
        nis: `102${String(idx + 55).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g5',
        gender: 'L',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g6') {
    // 15 new students for Kelompok 6
    const g6List = [
      { name: 'RIZKI MAULANA', class: '9B' },
      { name: 'MAULANA YUSUF', class: '9C' },
      { name: 'IBRAHIM ARYAWINATA', class: '9C' },
      { name: 'A IAS FERDI SURYA JAYA', class: '9D' },
      { name: 'ACHMAD HANIF RIZKY PRATAMA', class: '9D' },
      { name: 'IRZA DWI PUTRA', class: '9D' },
      { name: 'RAJAWALI TAHTA BUWANA PANGESTU', class: '9D' },
      { name: 'MUAZAM RAZIQ PARIKESIT', class: '9E' },
      { name: 'MUHAMMAD FATIR ANUGRAH', class: '9E' },
      { name: 'GERHAN RAFQI MAULANA PUTRA', class: '9F' },
      { name: 'DIMAS PANGGALIH BUDOYO', class: '9F' },
      { name: 'ARDIANSYAH', class: '9G' },
      { name: 'MUHAMMAD HAIKAL SURYA PUTRA', class: '9B' },
      { name: 'FARIS HAZMAN NAZIR', class: '9E' },
      { name: 'RAIHAN MANDALA PUTRA RAMBE', class: '9F' },
    ];

    g6List.forEach((st, idx) => {
      mockStudents.push({
        id: `s6_${idx + 1}`,
        nis: `102${String(idx + 70).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g6',
        gender: 'L',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g7') {
    // 14 new students for Kelompok 7
    const g7List = [
      { name: 'SHESYA MEIDA ANJELI', class: '7A', gender: 'P' },
      { name: 'AIKO ARNELITA ARIANTO', class: '7B', gender: 'P' },
      { name: 'ARIVANESSA MAURAHMADHANIA', class: '7B', gender: 'P' },
      { name: 'LATIFAH QOLBI', class: '7B', gender: 'P' },
      { name: 'NAURA PUTRI ANDINI', class: '7B', gender: 'P' },
      { name: 'JASMINE AMIRA CALISTA', class: '7C', gender: 'P' },
      { name: 'LAILA NURAINI', class: '7C', gender: 'P' },
      { name: 'MADINAH PUTRI AZZAHRAH', class: '7C', gender: 'P' },
      { name: 'SCRIBBIE CHANDHEA WAHYUDI', class: '7C', gender: 'P' },
      { name: 'RIZKI NUR FITRA', class: '8B', gender: 'L' },
      { name: 'KAIVALYA MUIZEE REDIANSYAH', class: '8D', gender: 'L' },
      { name: 'MARISA KINARA PUTRI', class: '8F', gender: 'P' },
      { name: 'SYAKINAH PUTRI GAUTAMA', class: '9D', gender: 'P' },
      { name: 'ZAHRA HERAWATI', class: '9D', gender: 'P' },
    ];

    g7List.forEach((st, idx) => {
      mockStudents.push({
        id: `s7_${idx + 1}`,
        nis: `102${String(idx + 85).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g7',
        gender: st.gender as 'L' | 'P',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g8') {
    // 14 new students for Kelompok 8
    const g8List = [
      { name: 'ANINDYA RIZKY PUTRI ARDITA', class: '7D', gender: 'P' },
      { name: 'FEIYAZ ALMAHYRA ATHANTRI', class: '7D', gender: 'P' },
      { name: 'GHAZIYA HAFIZA ANANDITA', class: '7D', gender: 'P' },
      { name: 'JASMIN PUTRI JAMILAH', class: '7D', gender: 'P' },
      { name: 'NAFISAH DWI DAMAYANTI', class: '7D', gender: 'P' },
      { name: 'JIHAN TALITA ULFA', class: '7E', gender: 'P' },
      { name: 'SALSABILA', class: '7F', gender: 'P' },
      { name: 'SYAHQILLA ALMA DWIFA', class: '7F', gender: 'P' },
      { name: 'ROINA RAMADANI', class: '9F', gender: 'P' },
      { name: 'TAURA HUMAIRA TAUFIQO PUTRI', class: '9F', gender: 'P' },
      { name: 'NAURA MAWADDAH', class: '9F', gender: 'P' },
      { name: 'ZAINA FATHIYYAH AZZAHRA', class: '9G', gender: 'P' },
      { name: 'AJENG SETYA NINGRUM', class: '9G', gender: 'P' },
      { name: 'ALEXA GRISELDA SACA', class: '9G', gender: 'P' },
    ];

    g8List.forEach((st, idx) => {
      mockStudents.push({
        id: `s8_${idx + 1}`,
        nis: `102${String(idx + 100).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g8',
        gender: st.gender as 'L' | 'P',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g9') {
    // 22 new students for Kelompok 9
    const g9List = [
      { name: 'AISYAH MALIKA PUTRI', class: '9A', gender: 'P' },
      { name: 'SOFIA MAHARANI', class: '9A', gender: 'P' },
      { name: 'NAURAH AUFA SALAM', class: '9A', gender: 'P' },
      { name: 'CAEISHA PUTRI RAMADHANI', class: '9B', gender: 'P' },
      { name: 'ANNISA WARDHANI GUSTI', class: '9C', gender: 'P' },
      { name: 'SAFIRA YULIANTI', class: '9C', gender: 'P' },
      { name: 'NURIL FATHIYAH', class: '9C', gender: 'P' },
      { name: 'KHAERUNISA AULIA', class: '9C', gender: 'P' },
      { name: 'NAYLA PUTRI BERLIAN', class: '9C', gender: 'P' },
      { name: 'SALSABILAH PUTRI CHANIAGO', class: '9C', gender: 'P' },
      { name: 'SHEILA KHANSA CHAIRUNNISA', class: '9D', gender: 'P' },
      { name: 'RORO DIAN AYU', class: '9D', gender: 'P' },
      { name: 'RAMADHANI FITRIA NINGSIH', class: '9E', gender: 'P' },
      { name: 'KANASYA NUR FATWA AULIA', class: '9F', gender: 'P' },
      { name: 'SALSABILAH RAMADHANI', class: '9F', gender: 'P' },
      { name: 'ZIFANA LATISA', class: '9F', gender: 'P' },
      { name: 'NUR AINI SALWA NABILA', class: '9G', gender: 'P' },
      { name: 'TANIA ADZRA SABRINA', class: '9G', gender: 'P' },
      { name: 'AISHA SELVIRA DANIKA', class: '9C', gender: 'P' },
      { name: 'RAISA ROXANNE MAHESWARI', class: '8D', gender: 'P' },
      { name: 'BEIBY AMEERA', class: '8B', gender: 'P' },
      { name: 'EVELIN VARISTA', class: '8E', gender: 'P' },
    ];

    g9List.forEach((st, idx) => {
      mockStudents.push({
        id: `s9_${idx + 1}`,
        nis: `102${String(idx + 120).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g9',
        gender: st.gender as 'L' | 'P',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else if (group.id === 'g10') {
    // 26 new students for Kelompok 10
    const g10List = [
      { name: 'FATIR AZKA NUGROHO', class: '7D', gender: 'L' },
      { name: 'FATHIA AZIZAH HERMA', class: '8A', gender: 'P' },
      { name: 'RADEN RORO GIZKHA ARTNES', class: '8A', gender: 'P' },
      { name: 'AHSAN ATHAYA PUTRA INSAN', class: '8B', gender: 'L' },
      { name: 'MUHAMMAD IKHSAN AFLAH FAEYZAN', class: '8D', gender: 'L' },
      { name: 'JASMINE AL KHANSA QAISARA', class: '8D', gender: 'P' },
      { name: 'MUHAMMAD GHIFARI ISKANDAR', class: '8F', gender: 'L' },
      { name: 'NOVAL DWI PERMANA', class: '8F', gender: 'L' },
      { name: 'APPLEYNA ULFA', class: '9A', gender: 'P' },
      { name: 'NAURA DHANIA AMANDA', class: '9B', gender: 'P' },
      { name: 'SALSABILA FACHNA', class: '9B', gender: 'P' },
      { name: 'CALLISTA AMADEA', class: '9B', gender: 'P' },
      { name: 'ALVARO ARIQ PRADITA', class: '9B', gender: 'L' },
      { name: 'FAEYZA IMANSAH SHAKI JANATHAN', class: '9B', gender: 'L' },
      { name: 'MUHAMMAD FAQIH', class: '9B', gender: 'L' },
      { name: 'NURUL ALYA SIERRA', class: '9D', gender: 'P' },
      { name: 'FIRSYA ZAHRA RATIFA', class: '9D', gender: 'P' },
      { name: 'TIARA APRILIA', class: '9D', gender: 'P' },
      { name: 'MUHAMMAD FAHRI AL MUSLIM', class: '9D', gender: 'L' },
      { name: 'REFAN RAMADHAN', class: '9D', gender: 'L' },
      { name: 'AHMAD FAIZ DARMAWAN', class: '9D', gender: 'L' },
      { name: 'HANA PUTRI QONITA', class: '9E', gender: 'P' },
      { name: 'ARJUNA HANDARU WIDODO', class: '9E', gender: 'L' },
      { name: 'DANNA EVRYL LYO', class: '9E', gender: 'L' },
      { name: 'EVANIA WIRAWAN', class: '9F', gender: 'P' },
      { name: 'MUHAMMAD KHABIB', class: '9F', gender: 'L' },
    ];

    g10List.forEach((st, idx) => {
      mockStudents.push({
        id: `s10_${idx + 1}`,
        nis: `102${String(idx + 150).padStart(4, '0')}`,
        name: st.name,
        class: st.class,
        groupId: 'g10',
        gender: st.gender as 'L' | 'P',
        status: 'Aktif',
        createdAt: subMonths(new Date(), 3).toISOString(),
      });
      studentCount++;
    });
  } else {
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

  // Progress per stage (Tahap 1, 2, 3)
  const group = mockGroups.find(g => g.id === student.groupId);
  const gradeId = group?.gradeId || 'grade1';
  const prefix = gradeId === 'grade1' ? 'g1' : gradeId === 'grade2' ? 'g2' : 'g3';
  const isGrade3 = gradeId === 'grade3';

  // Seed student trend profile deterministically by student index
  const studentNum = parseInt(student.id.replace(/\D/g, ''), 10) || 1;
  const trendType = (studentNum % 5 === 0) ? 'menurun' : (studentNum % 4 === 0) ? 'konsisten' : 'meningkat';

  let s1Reading = 70 + (studentNum % 15);
  let s1Tajwid = 68 + ((studentNum * 2) % 18);
  let s1Writing = 72 + ((studentNum * 3) % 15);
  let s1Memorization = isGrade3 ? (70 + (studentNum % 20)) : 0;

  const sessionData = [
    { 
      date: subMonths(today, 2), 
      sessionNum: 1,
      r: s1Reading,
      t: s1Tajwid,
      w: s1Writing,
      m: s1Memorization
    },
    { 
      date: subMonths(today, 1), 
      sessionNum: 2,
      r: trendType === 'menurun' ? s1Reading - 2 : trendType === 'konsisten' ? s1Reading : s1Reading + 4,
      t: trendType === 'menurun' ? s1Tajwid - 3 : trendType === 'konsisten' ? s1Tajwid : s1Tajwid + 5,
      w: trendType === 'menurun' ? s1Writing - 1 : trendType === 'konsisten' ? s1Writing : s1Writing + 3,
      m: isGrade3 ? (trendType === 'menurun' ? s1Memorization - 2 : trendType === 'konsisten' ? s1Memorization : s1Memorization + 4) : 0
    },
    { 
      date: today, 
      sessionNum: 3,
      r: trendType === 'menurun' ? s1Reading - 6 : trendType === 'konsisten' ? s1Reading : s1Reading + 9,
      t: trendType === 'menurun' ? s1Tajwid - 7 : trendType === 'konsisten' ? s1Tajwid : s1Tajwid + 10,
      w: trendType === 'menurun' ? s1Writing - 5 : trendType === 'konsisten' ? s1Writing : s1Writing + 7,
      m: isGrade3 ? (trendType === 'menurun' ? s1Memorization - 6 : trendType === 'konsisten' ? s1Memorization : s1Memorization + 8) : 0
    }
  ];

  const grade3Surahs = ['QS. An-Nas s.d. Al-Falaq', 'QS. Al-Ikhlas s.d. Al-Lahab', 'QS. An-Nashr s.d. Al-Kafirun'];

  sessionData.forEach(({ date, sessionNum, r, t, w, m }) => {
    const reading = isGrade3 ? Math.min(98, Math.max(60, r)) : 0;
    const tajwid = Math.min(98, Math.max(58, t));
    const writing = Math.min(98, Math.max(60, w));
    const memorization = isGrade3 ? Math.min(98, Math.max(58, m)) : 0;
    const memorizedSurah = isGrade3 ? (grade3Surahs[sessionNum - 1] || 'Juz 30') : '';
    
    // Nilai Rata-rata mutu untuk Kelompok 10: Membaca, Tajwid, Menulis (Hafalan dicatat tersendiri per surah)
    // Nilai Rata-rata untuk Kelompok 1-9: Tajwid, Menulis
    const total = isGrade3
      ? Math.round((reading + tajwid + writing) / 3)
      : Math.round((tajwid + writing) / 2);

    mockProgress.push({
      id: `p_${student.id}_s${sessionNum}`,
      studentId: student.id,
      groupId: student.groupId,
      sessionId: `${prefix}-s${sessionNum}`,
      semester: 1,
      date: date.toISOString().split('T')[0],
      reading,
      tajwid,
      memorization,
      memorizedSurah,
      writing,
      total,
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
