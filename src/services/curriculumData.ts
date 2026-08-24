export interface Grade {
  id: string;
  name: string;
  programName: string;
  description: string;
  bookTitle: string;
  level: number;
  groups: string[];
}

export interface CurriculumSession {
  id: string;
  gradeId: string;
  semester: 1 | 2;
  sessionNumber: number;
  scheduleDay?: string;
  topic: string;
  subtopic?: string;
  pageRef?: string;
  target: string;
  description?: string;
  isOrientation?: boolean;
}

export const CURRICULUM_CONFIG = {
  scheduleDay: 'Sabtu',
  scheduleTime: '07.30 - 09.00 WIB',
  totalSessions: 32,
  sessionsPerSemester: 16,
  completedSessionsCount: 2, // Sudah 2x pertemuan terlaksana
  currentActiveSessionNumber: 3, // Pertemuan berikutnya yang aktif
  currentSemester: 1 as const,
  statusDescription: 'Kegiatan rutin setiap hari Sabtu. Saat ini telah terlaksana 2x pertemuan (Pertemuan 1 Pengenalan Mentor & Pertemuan 2 Mulai Pembelajaran).'
};

export const masterGrades: Grade[] = [
  { 
    id: 'grade1', 
    level: 1, 
    name: 'Grade 1', 
    programName: 'Utsmani Jilid 1', 
    bookTitle: 'Bimbingan Tahsin & Tajwid Al-Qur\'an Utsmani Dewasa Jilid 1',
    description: 'Fokus pengenalan huruf hijaiyyah, tanda baca (harakat), huruf sambung, tanwin, mad thobi\'i, sukun, tasydid, dan dasar kelancaran membaca mushaf rasm Utsmani.',
    groups: ['Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Kelompok 5']
  },
  { 
    id: 'grade2', 
    level: 2, 
    name: 'Grade 2', 
    programName: 'Utsmani Jilid 2', 
    bookTitle: 'Bimbingan Tahsin & Tajwid Al-Qur\'an Utsmani Dewasa Jilid 2',
    description: 'Fokus pendalaman kaidah tajwid lengkap (Hukum Nun & Mim Sukun, Ghunnah, Idgham, Qalqalah, Hukum Mad Lanjutan, Sifat & Makhorijul Huruf, serta Gharib Al-Qur\'an).',
    groups: ['Kelompok 6', 'Kelompok 7', 'Kelompok 8', 'Kelompok 9']
  },
  { 
    id: 'grade3', 
    level: 3, 
    name: 'Grade 3', 
    programName: 'Tahfizh Al-Qur\'an', 
    bookTitle: 'Kurikulum Tahfizh & Mutqin Al-Qur\'an Juz 30',
    description: 'Fokus bimbingan tahsin bacaan, talaqqi, setoran hafalan baru, murajaah harian/pekanan, evaluasi mutqin, dan tasmi\' Juz 30.',
    groups: ['Kelompok 10']
  },
];

export const masterSessions: CurriculumSession[] = [
  // =========================================================================
  // GRADE 1: UTSMANI JILID 1 (KELOMPOK 1, 2, 3, 4, 5) - SEMESTER 1 (Sesi 1-16)
  // =========================================================================
  {
    id: 'g1-s1',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 1,
    scheduleDay: 'Sabtu (Pekan 1)',
    isOrientation: true,
    topic: 'Ta\'aruf, Pengenalan Mentor & Kontrak Belajar BTQ',
    pageRef: 'Orientasi Kelas',
    target: 'Perkenalan ustadz/ustadzah pembimbing dan santri dalam kelompok binaan, pengenalan adab thalabul ilmi, pembagian modul Utsmani Jilid 1, dan pemetaan awal kesiapan santri.'
  },
  {
    id: 'g1-s2',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 2,
    scheduleDay: 'Sabtu (Pekan 2)',
    topic: 'Mulai Pembelajaran: Pengenalan 29 Huruf Hijaiyyah Tunggal & Makhorijul Huruf',
    pageRef: 'Halaman 1–3',
    target: 'Siswa mampu melafalkan 29 huruf hijaiyyah tunggal sesuai titik makhraj aslinya secara fasih, jelas, dan tanpa terpengaruh dialek lokal.'
  },
  {
    id: 'g1-s3',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 3,
    scheduleDay: 'Sabtu (Pekan 3)',
    topic: 'Harakat Tunggal: Fathah (A), Kasrah (I), dan Dhammah (U)',
    pageRef: 'Halaman 4–6',
    target: 'Siswa mampu membaca huruf berharakat fathah, kasrah, dan dhammah secara tegas dan cepat tanpa memanjangkan bacaan yang bukan mad.'
  },
  {
    id: 'g1-s4',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 4,
    scheduleDay: 'Sabtu (Pekan 4)',
    topic: 'Bentuk Perubahan Huruf Sambung di Awal, Tengah, dan Akhir Kata',
    pageRef: 'Halaman 7–9',
    target: 'Siswa mengenali dan mengidentifikasi perubahan bentuk kepala/badan huruf hijaiyyah saat berada di awal, tengah, maupun akhir sambungan.'
  },
  {
    id: 'g1-s5',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 5,
    scheduleDay: 'Sabtu (Pekan 5)',
    topic: 'Latihan Membaca Rangkaian Kata 2–3 Huruf Sambung',
    pageRef: 'Halaman 10–12',
    target: 'Siswa lancar membaca kata sederhana 2–3 huruf bersambung dengan tempo ketukan yang stabil.'
  },
  {
    id: 'g1-s6',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 6,
    scheduleDay: 'Sabtu (Pekan 6)',
    topic: 'Harakat Tanwin: Fathatain (-an), Kasratain (-in), dan Dhammatain (-un)',
    pageRef: 'Halaman 13–15',
    target: 'Siswa membunyikan suara tanwin secara tegas dan tepat tanpa terputus-putus atau tertahan.'
  },
  {
    id: 'g1-s7',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 7,
    scheduleDay: 'Sabtu (Pekan 7)',
    topic: 'Mad Thobi\'i (Asli): Fathah + Alif, Kasrah + Ya Sukun, Dhammah + Wawu Sukun',
    pageRef: 'Halaman 16–21',
    target: 'Siswa konsisten memanjangkan bacaan mad thobi\'i tepat sepanjang 2 harakat (1 ayunan/2 ketukan).'
  },
  {
    id: 'g1-s8',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 8,
    scheduleDay: 'Sabtu (Pekan 8)',
    topic: 'Evaluasi Tengah Semester 1 (PTS 1) Utsmani Jilid 1',
    pageRef: 'Halaman 1–21',
    target: 'Ujian capaian kelancaran huruf sambung, harakat tunggal, tanwin, dan ketepatan panjang-pendek 2 harakat.'
  },
  {
    id: 'g1-s9',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 9,
    scheduleDay: 'Sabtu (Pekan 9)',
    topic: 'Fathah Berdiri, Kasrah Berdiri, dan Dhammah Terbalik',
    pageRef: 'Halaman 22–24',
    target: 'Siswa memahami kaidah mad pengganti (fathah/kasrah berdiri & dhammah terbalik = 2 harakat).'
  },
  {
    id: 'g1-s10',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 10,
    scheduleDay: 'Sabtu (Pekan 10)',
    topic: 'Huruf Lin (Layyin): Fathah Bertemu Wawu Sukun & Ya Sukun',
    pageRef: 'Halaman 25–27',
    target: 'Siswa mampu melafalkan bunyi lin (aw/ay) dengan lembut tanpa dipanjangkan berlebihan.'
  },
  {
    id: 'g1-s11',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 11,
    scheduleDay: 'Sabtu (Pekan 11)',
    topic: 'Huruf Sukun (Mati) Dasar pada Huruf Halq & Syafatain',
    pageRef: 'Halaman 28–30',
    target: 'Siswa dapat membaca huruf mati tanpa memantulkannya jika bukan huruf qalqalah.'
  },
  {
    id: 'g1-s12',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 12,
    scheduleDay: 'Sabtu (Pekan 12)',
    topic: 'Karakteristik Hams pada Huruf Sukun (Ta, Tsa, Ha, Kha, Sin, Syin, Shad, Fa, Kaf)',
    pageRef: 'Halaman 31–33',
    target: 'Siswa mampu mengeluarkan desis nafas (hams) yang proporsional saat mematikan huruf hams.'
  },
  {
    id: 'g1-s13',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 13,
    scheduleDay: 'Sabtu (Pekan 13)',
    topic: 'Pengenalan Huruf Qalqalah Sukun (Baju Ditoko: Ba, Jim, Dal, Tha, Qaf)',
    pageRef: 'Halaman 34–36',
    target: 'Siswa mampu memantulkan bunyi huruf qalqalah sukun secara alami dan tegas.'
  },
  {
    id: 'g1-s14',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 14,
    scheduleDay: 'Sabtu (Pekan 14)',
    topic: 'Latihan Membaca Huruf Bertasydid (Syaddah) Dasar',
    pageRef: 'Halaman 37–39',
    target: 'Siswa mampu menekan lafal huruf bertasydid dengan bobot makhraj yang benar.'
  },
  {
    id: 'g1-s15',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 15,
    scheduleDay: 'Sabtu (Pekan 15)',
    topic: 'Pemantapan Materi & Latihan Membaca Kalimat Panjang Jilid 1',
    pageRef: 'Halaman 40–42',
    target: 'Siswa lancar membaca potongan kalimat Al-Qur\'an dengan memadukan seluruh kaidah semester 1.'
  },
  {
    id: 'g1-s16',
    gradeId: 'grade1',
    semester: 1,
    sessionNumber: 16,
    scheduleDay: 'Sabtu (Pekan 16)',
    topic: 'Evaluasi Akhir Semester 1 (PAS 1) Utsmani Jilid 1',
    pageRef: 'Halaman 1–42',
    target: 'Penilaian komprehensif kemampuan membaca Utsmani Jilid 1 Semester 1.'
  },

  // GRADE 1: SEMESTER 2 (Sesi 17-32)
  {
    id: 'g1-s17',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 17,
    scheduleDay: 'Sabtu (Pekan 17)',
    topic: 'Review Semester 1 & Pendalaman Tasydid Rangkap',
    pageRef: 'Halaman 43–45',
    target: 'Mengulang kaidah pokok dan melatih kefasihan membaca kata-kata bertasydid beruntun.'
  },
  {
    id: 'g1-s18',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 18,
    scheduleDay: 'Sabtu (Pekan 18)',
    topic: 'Ghunnah Musyaddadah: Nun Bertasydid (نّ) dan Mim Bertasydid (مّ)',
    pageRef: 'Halaman 46–48',
    target: 'Siswa menahan dengung (ghunnah) pada nun/mim tasydid selama 2–3 harakat.'
  },
  {
    id: 'g1-s19',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 19,
    scheduleDay: 'Sabtu (Pekan 19)',
    topic: 'Alif Lam Qomariyyah (Idzhar Qamari: Membaca Lam Sukun Jelas)',
    pageRef: 'Halaman 49–51',
    target: 'Siswa melafalkan bunyi "Al" dengan jelas saat bertemu huruf-huruf Qomariyyah.'
  },
  {
    id: 'g1-s20',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 20,
    scheduleDay: 'Sabtu (Pekan 20)',
    topic: 'Alif Lam Syamsiyyah (Idgham Syamsi: Melebur ke Huruf Syamsiyyah)',
    pageRef: 'Halaman 52–54',
    target: 'Siswa memasukkan bunyi alif lam langsung ke dalam huruf syamsiyyah yang bertasydid.'
  },
  {
    id: 'g1-s21',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 21,
    scheduleDay: 'Sabtu (Pekan 21)',
    topic: 'Kaidah Waqaf (Berhenti) pada Akhir Kata Berharakat Tunggal & Tanwin',
    pageRef: 'Halaman 55–57',
    target: 'Siswa memahami cara mematikan huruf akhir saat waqaf dan membaca fathatain menjadi mad \'iwadh.'
  },
  {
    id: 'g1-s22',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 22,
    scheduleDay: 'Sabtu (Pekan 22)',
    topic: 'Kaidah Waqaf pada Ta Marbuthah (ة) & Huruf Bertasydid di Akhir Kata',
    pageRef: 'Halaman 58–60',
    target: 'Siswa mampu mengubah Ta Marbuthah menjadi Ha Sukun saat berhenti.'
  },
  {
    id: 'g1-s23',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 23,
    scheduleDay: 'Sabtu (Pekan 23)',
    topic: 'Latihan Ketukan & Pengaturan Nafas pada Ayat Panjang',
    pageRef: 'Halaman 61–63',
    target: 'Siswa membaca ayat secara stabil dan mampu mengambil jeda waqaf/ibtida\' yang tepat.'
  },
  {
    id: 'g1-s24',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 24,
    scheduleDay: 'Sabtu (Pekan 24)',
    topic: 'Evaluasi Tengah Semester 2 (PTS 2) Utsmani Jilid 1',
    pageRef: 'Halaman 43–63',
    target: 'Ujian praktik waqaf, idzhar qamari, idgham syamsi, dan ghunnah musyaddadah.'
  },
  {
    id: 'g1-s25',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 25,
    scheduleDay: 'Sabtu (Pekan 25)',
    topic: 'Pengenalan Tanda-Tanda Waqaf Rasm Utsmani (Mim, La, Jim, Qif, Sholiy, Qoliy)',
    pageRef: 'Halaman 64–66',
    target: 'Siswa memahami arti simbol tanda berhenti dalam mushaf standar Utsmani.'
  },
  {
    id: 'g1-s26',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 26,
    scheduleDay: 'Sabtu (Pekan 26)',
    topic: 'Praktik Membaca QS Al-Fatihah dengan Kaidah Standar Utsmani',
    pageRef: 'Mushaf Al-Fatihah',
    target: 'Siswa membaca QS Al-Fatihah dengan fasih, makhraj presisi, dan kaidah tajwid yang benar.'
  },
  {
    id: 'g1-s27',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 27,
    scheduleDay: 'Sabtu (Pekan 27)',
    topic: 'Praktik Membaca QS An-Naas s.d. QS Al-Falaq',
    pageRef: 'Juz 30',
    target: 'Penerapan kaidah Jilid 1 pada surat An-Naas dan Al-Falaq.'
  },
  {
    id: 'g1-s28',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 28,
    scheduleDay: 'Sabtu (Pekan 28)',
    topic: 'Praktik Membaca QS Al-Ikhlas s.d. QS Al-Kafirun',
    pageRef: 'Juz 30',
    target: 'Penerapan qalqalah dan ghunnah pada surat Al-Ikhlas, Al-Lahab, An-Nashr, dan Al-Kafirun.'
  },
  {
    id: 'g1-s29',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 29,
    scheduleDay: 'Sabtu (Pekan 29)',
    topic: 'Praktik Membaca QS Al-Kautsar s.d. QS Al-Fil',
    pageRef: 'Juz 30',
    target: 'Kelancaran membaca surat-surat pendek dengan makhraj dan harakat sempurna.'
  },
  {
    id: 'g1-s30',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 30,
    scheduleDay: 'Sabtu (Pekan 30)',
    topic: 'Pemantapan Akhir Seluruh Materi Buku Utsmani Jilid 1',
    pageRef: 'Halaman 1–66',
    target: 'Review menyeluruh dan bimbingan khusus untuk siswa yang membutuhkan pemantapan.'
  },
  {
    id: 'g1-s31',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 31,
    scheduleDay: 'Sabtu (Pekan 31)',
    topic: 'Pra-Ujian & Tasmi\' Khatam Utsmani Jilid 1',
    pageRef: 'Khatam Jilid 1',
    target: 'Simulasi ujian kenaikan tingkat dan pengecekan kelancaran membaca mandiri.'
  },
  {
    id: 'g1-s32',
    gradeId: 'grade1',
    semester: 2,
    sessionNumber: 32,
    scheduleDay: 'Sabtu (Pekan 32)',
    topic: 'Munaqasyah Akhir & Evaluasi Kenaikan Grade ke Utsmani Jilid 2',
    pageRef: 'Ujian Kenaikan Grade',
    target: 'Siswa dinyatakan lulus dan siap melanjutkan ke pembelajaran Grade 2 (Utsmani Jilid 2).'
  },

  // =========================================================================
  // GRADE 2: UTSMANI JILID 2 (KELOMPOK 6, 7, 8, 9) - SEMESTER 1 (Sesi 1-16)
  // =========================================================================
  {
    id: 'g2-s1',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 1,
    scheduleDay: 'Sabtu (Pekan 1)',
    isOrientation: true,
    topic: 'Ta\'aruf, Pengenalan Mentor & Kontrak Belajar Tajwid Jilid 2',
    pageRef: 'Orientasi Kelas',
    target: 'Ta\'aruf mentor dan santri bimbingan, penjelasan target kurikulum tajwid aplikatif, adab pembelajar Al-Qur\'an, dan review placement kemampuan membaca.'
  },
  {
    id: 'g2-s2',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 2,
    scheduleDay: 'Sabtu (Pekan 2)',
    topic: 'Mulai Pembelajaran: Hukum Nun Sukun & Tanwin - Idzhar Halqi (6 Huruf Halq)',
    pageRef: 'Halaman 1–4',
    target: 'Siswa membaca nun sukun/tanwin bertemu Hamzah, Ha, \'Ain, Ha, Ghain, Kha dengan jelas tanpa dengung.'
  },
  {
    id: 'g2-s3',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 3,
    scheduleDay: 'Sabtu (Pekan 3)',
    topic: 'Hukum Nun Sukun & Tanwin: Idgham Bighunnah (Ya, Nun, Mim, Wawu)',
    pageRef: 'Halaman 5–8',
    target: 'Siswa memasukkan bacaan disertai dengung 2–3 harakat ke huruf Yanmu.'
  },
  {
    id: 'g2-s4',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 4,
    scheduleDay: 'Sabtu (Pekan 4)',
    topic: 'Hukum Nun Sukun & Tanwin: Idgham Bilaghunnah (Lam dan Ra)',
    pageRef: 'Halaman 9–12',
    target: 'Siswa melebur nun sukun/tanwin ke huruf Lam dan Ra tanpa dengung.'
  },
  {
    id: 'g2-s5',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 5,
    scheduleDay: 'Sabtu (Pekan 5)',
    topic: 'Hukum Nun Sukun & Tanwin: Iqlab (Mengubah Bunyi Menjadi Mim Disertai Ghunnah)',
    pageRef: 'Halaman 13–16',
    target: 'Siswa merapatkan bibir ringan dan mendengungkan suara mim saat bertemu huruf Ba.'
  },
  {
    id: 'g2-s6',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 6,
    scheduleDay: 'Sabtu (Pekan 6)',
    topic: 'Hukum Nun Sukun & Tanwin: Ikhfa Haqiqi (15 Huruf Hijaiyyah) - Bagian 1 & 2',
    pageRef: 'Halaman 17–24',
    target: 'Siswa melafalkan bunyi samar dengan dengung seimbang pada huruf-huruf ikhfa aqrab, awsath, dan ab\'ad serta membedakan dengung tebal/tipis.'
  },
  {
    id: 'g2-s7',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 7,
    scheduleDay: 'Sabtu (Pekan 7)',
    topic: 'Hukum Mim Sukun: Ikhfa Syafawi, Idgham Mimi, & Idzhar Syafawi',
    pageRef: 'Halaman 25–28',
    target: 'Siswa menguasai ketiga hukum mim mati dengan ketepatan dengung bibir.'
  },
  {
    id: 'g2-s8',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 8,
    scheduleDay: 'Sabtu (Pekan 8)',
    topic: 'Evaluasi Tengah Semester 1 (PTS 1) Tajwid Hukum Nun & Mim Sukun',
    pageRef: 'Halaman 1–28',
    target: 'Ujian teori dan praktik identifikasi hukum nun sukun, tanwin, dan mim sukun.'
  },
  {
    id: 'g2-s9',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 9,
    scheduleDay: 'Sabtu (Pekan 9)',
    topic: 'Tingkatan Qalqalah: Sughra, Kubra, dan Akbar saat Waqaf Bertasydid',
    pageRef: 'Halaman 29–32',
    target: 'Siswa mampu membedakan pantulan qalqalah ringan di tengah kata dan pantulan kuat saat waqaf.'
  },
  {
    id: 'g2-s10',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 10,
    scheduleDay: 'Sabtu (Pekan 10)',
    topic: 'Hukum Lam Jalalah: Lafazh Allah (Tafkhim / Tebal & Tarqiq / Tipis)',
    pageRef: 'Halaman 33–36',
    target: 'Siswa menebalkan bunyi lam jalalah setelah fathah/dhammah dan menipiskannya setelah kasrah.'
  },
  {
    id: 'g2-s11',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 11,
    scheduleDay: 'Sabtu (Pekan 11)',
    topic: 'Hukum Ra\': Kondisi Ra\' Tafkhim (Dibaca Tebal)',
    pageRef: 'Halaman 37–40',
    target: 'Siswa menguasai kondisi-kondisi ra\' berharakat dan ra\' sukun yang wajib dibaca tebal.'
  },
  {
    id: 'g2-s12',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 12,
    scheduleDay: 'Sabtu (Pekan 12)',
    topic: 'Hukum Ra\': Kondisi Ra\' Tarqiq (Dibaca Tipis) & Jawazul Wajhain',
    pageRef: 'Halaman 41–44',
    target: 'Siswa mengenali ra\' yang dibaca tipis dan kondisi khusus yang boleh tebal/tipis.'
  },
  {
    id: 'g2-s13',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 13,
    scheduleDay: 'Sabtu (Pekan 13)',
    topic: 'Hukum Mad Lanjutan: Mad Wajib Muttashil & Mad Jaiz Munfashil',
    pageRef: 'Halaman 45–48',
    target: 'Siswa konsisten memanjangkan mad wajib (4–5 harakat) dan mad jaiz dalam satu nafas.'
  },
  {
    id: 'g2-s14',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 14,
    scheduleDay: 'Sabtu (Pekan 14)',
    topic: 'Hukum Mad Lazim: Kilmi & Harfi (Mukhaffaf & Mutsaqqal 6 Harakat)',
    pageRef: 'Halaman 49–52',
    target: 'Siswa tepat memanjangkan mad lazim 6 harakat pada ayat maupun huruf fawatihussuwar.'
  },
  {
    id: 'g2-s15',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 15,
    scheduleDay: 'Sabtu (Pekan 15)',
    topic: 'Pemantapan Seluruh Kaidah Tajwid Utsmani Jilid 2 Semester 1',
    pageRef: 'Halaman 1–52',
    target: 'Praktik bacaan komprehensif mengaplikasikan seluruh hukum tajwid semester 1.'
  },
  {
    id: 'g2-s16',
    gradeId: 'grade2',
    semester: 1,
    sessionNumber: 16,
    scheduleDay: 'Sabtu (Pekan 16)',
    topic: 'Evaluasi Akhir Semester 1 (PAS 1) Utsmani Jilid 2',
    pageRef: 'Halaman 1–52',
    target: 'Penilaian kelancaran, akurasi hukum tajwid, dan kefasihan bacaan mushaf.'
  },

  // GRADE 2: SEMESTER 2 (Sesi 17-32)
  {
    id: 'g2-s17',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 17,
    scheduleDay: 'Sabtu (Pekan 17)',
    topic: 'Mad \'Aridh Lissukun & Mad Lin saat Waqaf (2, 4, 6 Harakat)',
    pageRef: 'Halaman 53–56',
    target: 'Siswa menjaga ritme panjang mad \'aridh lissukun secara konsisten pada akhir ayat.'
  },
  {
    id: 'g2-s18',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 18,
    scheduleDay: 'Sabtu (Pekan 18)',
    topic: 'Mad \'Iwadh, Mad Badal, & Mad Shilah (Qashirah dan Thawilah)',
    pageRef: 'Halaman 57–60',
    target: 'Siswa memahami kaidah mad shilah pada Ha Dhamir dan mad \'iwadh saat berhenti di tanwin fathah.'
  },
  {
    id: 'g2-s19',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 19,
    scheduleDay: 'Sabtu (Pekan 19)',
    topic: 'Idgham Mutamatsilain, Mutajanisain, dan Mutaqaribain',
    pageRef: 'Halaman 61–64',
    target: 'Siswa mampu melebur dua huruf yang sama/sejenis/berdekatan makhrajnya dengan tepat.'
  },
  {
    id: 'g2-s20',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 20,
    scheduleDay: 'Sabtu (Pekan 20)',
    topic: 'Sifat-Sifat Huruf Bagian 1: Hams vs Jahr, Syiddah vs Rakhawah vs Tawassuth',
    pageRef: 'Halaman 65–68',
    target: 'Siswa memahami sifat mengalirnya nafas dan suara saat mengucapkan huruf-huruf hijaiyyah.'
  },
  {
    id: 'g2-s21',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 21,
    scheduleDay: 'Sabtu (Pekan 21)',
    topic: 'Sifat-Sifat Huruf Bagian 2: Isti\'la vs Istifal, Ithbaq vs Infitah, Qalqalah, Shafir, Tafasy-syi, Istitholah',
    pageRef: 'Halaman 69–72',
    target: 'Siswa menguasai sifat tebal-tipis lidah dan sifat-sifat khusus huruf hijaiyyah.'
  },
  {
    id: 'g2-s22',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 22,
    scheduleDay: 'Sabtu (Pekan 22)',
    topic: 'Gharib Al-Qur\'an Bagian 1: Imalah (Majreha), Isymam (La Ta\'manna), Saktah',
    pageRef: 'Halaman 73–76',
    target: 'Siswa mampu mempraktikkan bacaan unik/gharib dalam Al-Qur\'an riwayat Hafsh \'an \'Ashim.'
  },
  {
    id: 'g2-s23',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 23,
    scheduleDay: 'Sabtu (Pekan 23)',
    topic: 'Gharib Al-Qur\'an Bagian 2: Tashil (A\'a\'jamiyyun), Naql, Nun Wiqayah (Nun Washal)',
    pageRef: 'Halaman 77–80',
    target: 'Siswa lancar membaca nun washal dan tashil hamzah kedua.'
  },
  {
    id: 'g2-s24',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 24,
    scheduleDay: 'Sabtu (Pekan 24)',
    topic: 'Evaluasi Tengah Semester 2 (PTS 2) Sifat Huruf & Gharib Al-Qur\'an',
    pageRef: 'Halaman 53–80',
    target: 'Ujian pemahaman sifat lazimah huruf dan praktik bacaan ayat gharibah.'
  },
  {
    id: 'g2-s25',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 25,
    scheduleDay: 'Sabtu (Pekan 25)',
    topic: 'Hamzah Washal & Hamzah Qatha\' dalam Mushaf Rasm Utsmani',
    pageRef: 'Halaman 81–84',
    target: 'Siswa mampu menentukan harakat awal saat memulai bacaan (ibtida\') pada hamzah washal.'
  },
  {
    id: 'g2-s26',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 26,
    scheduleDay: 'Sabtu (Pekan 26)',
    topic: 'Praktik Tahsin Terapan: QS Ad-Dhuha s.d. QS Al-Humazah',
    pageRef: 'Juz 30',
    target: 'Penerapan seluruh hukum tajwid Jilid 2 secara fasih dan tartil.'
  },
  {
    id: 'g2-s27',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 27,
    scheduleDay: 'Sabtu (Pekan 27)',
    topic: 'Praktik Tahsin Terapan: QS Al-A\'la s.d. QS Al-Lail',
    pageRef: 'Juz 30',
    target: 'Penerapan waqaf ibtida\', makhraj, dan ghunnah pada surat-surat pertengahan Juz 30.'
  },
  {
    id: 'g2-s28',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 28,
    scheduleDay: 'Sabtu (Pekan 28)',
    topic: 'Praktik Tahsin Terapan: QS An-Naba\' (Ayat 1–20)',
    pageRef: 'QS An-Naba\'',
    target: 'Membaca tartil dengan ketukan stabil dan ketepatan mad lazim & muttashil.'
  },
  {
    id: 'g2-s29',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 29,
    scheduleDay: 'Sabtu (Pekan 29)',
    topic: 'Praktik Tahsin Terapan: QS An-Naba\' (Ayat 21–40)',
    pageRef: 'QS An-Naba\'',
    target: 'Kefasihan membaca hingga akhir surat An-Naba\' sesuai standar sanad Utsmani.'
  },
  {
    id: 'g2-s30',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 30,
    scheduleDay: 'Sabtu (Pekan 30)',
    topic: 'Pemantapan Komprehensif Seluruh Buku Bimbingan Utsmani Jilid 2',
    pageRef: 'Halaman 1–84',
    target: 'Review keseluruhan kaidah tajwid dan persiapan munaqasyah kelulusan jilid.'
  },
  {
    id: 'g2-s31',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 31,
    scheduleDay: 'Sabtu (Pekan 31)',
    topic: 'Pra-Ujian & Tasmi\' Khatam Utsmani Jilid 2',
    pageRef: 'Khatam Jilid 2',
    target: 'Ujian simulasi dan verifikasi kelayakan tajwid sebelum kenaikan grade.'
  },
  {
    id: 'g2-s32',
    gradeId: 'grade2',
    semester: 2,
    sessionNumber: 32,
    scheduleDay: 'Sabtu (Pekan 32)',
    topic: 'Munaqasyah Kelulusan Grade 2 & Sertifikasi Tahsin Utsmani',
    pageRef: 'Ujian Sertifikasi',
    target: 'Siswa dinyatakan tuntas seluruh kurikulum tahsin & tajwid dan berhak naik ke Grade 3 (Tahfizh).'
  },

  // =========================================================================
  // GRADE 3: TAHFIZH AL-QUR'AN (KELOMPOK 10) - SEMESTER 1 (Sesi 1-16)
  // =========================================================================
  {
    id: 'g3-s1',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 1,
    scheduleDay: 'Sabtu (Pekan 1)',
    isOrientation: true,
    topic: 'Ta\'aruf, Pengenalan Mentor & Orientasi Program Tahfizh Juz 30',
    pageRef: 'Orientasi Kelas',
    target: 'Ta\'aruf mentor dan santri, pengenalan metode menghafal mutqin (talaqqi, tikrar, murajaah harian), adab penghafal Al-Qur\'an, dan komitmen target hafalan Juz 30.'
  },
  {
    id: 'g3-s2',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 2,
    scheduleDay: 'Sabtu (Pekan 2)',
    topic: 'Mulai Pembelajaran: Talaqqi Awal & Setoran QS An-Naas s.d. QS Al-Falaq',
    pageRef: 'Juz 30',
    target: 'Talaqqi dan setoran hafalan baru surat An-Naas dan Al-Falaq dengan tajwid dan makhraj mutqin.'
  },
  {
    id: 'g3-s3',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 3,
    scheduleDay: 'Sabtu (Pekan 3)',
    topic: 'Talaqqi, Setoran Baru & Murajaah QS Al-Ikhlas, Al-Lahab, dan An-Nashr',
    pageRef: 'Juz 30',
    target: 'Setoran hafalan baru dengan makhraj dan tajwid mutqin serta murajaah surat pekan sebelumnya.'
  },
  {
    id: 'g3-s4',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 4,
    scheduleDay: 'Sabtu (Pekan 4)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Al-Kafirun, Al-Kautsar, dan Al-Ma\'un',
    pageRef: 'Juz 30',
    target: 'Setoran lancar tanpa terbata-bata dan murajaah hafalan sebelumnya.'
  },
  {
    id: 'g3-s5',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 5,
    scheduleDay: 'Sabtu (Pekan 5)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Quraisy, Al-Fil, dan Al-Humazah',
    pageRef: 'Juz 30',
    target: 'Penguatan makhraj dan mutqin hafalan 3 surat.'
  },
  {
    id: 'g3-s6',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 6,
    scheduleDay: 'Sabtu (Pekan 6)',
    topic: 'Talaqqi & Setoran QS Al-\'Ashr, At-Takatsur + Murajaah Blok 1 (QS An-Naas s.d. QS Al-\'Ashr)',
    pageRef: 'Juz 30',
    target: 'Tasmi\' mandiri seluruh surat pendek dari QS An-Naas sampai QS Al-\'Ashr dalam sekali duduk.'
  },
  {
    id: 'g3-s7',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 7,
    scheduleDay: 'Sabtu (Pekan 7)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Al-Qari\'ah dan QS Al-\'Adiyat',
    pageRef: 'Juz 30',
    target: 'Ketepatan ghunnah dan waqaf pada QS Al-Qari\'ah dan QS Al-\'Adiyat.'
  },
  {
    id: 'g3-s8',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 8,
    scheduleDay: 'Sabtu (Pekan 8)',
    topic: 'Evaluasi Tengah Semester 1 (PTS 1) - Ujian Tasmi\' QS An-Naas s.d. QS Az-Zalzalah',
    pageRef: 'Tasmi\' PTS 1',
    target: 'Ujian tasmi\' kelancaran dan mutqin tanpa melihat mushaf.'
  },
  {
    id: 'g3-s9',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 9,
    scheduleDay: 'Sabtu (Pekan 9)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Az-Zalzalah dan QS Al-Bayyinah (Ayat 1–4)',
    pageRef: 'Juz 30',
    target: 'Hafal kuat dengan kelancaran pelafalan ayat panjang pada awal surat Al-Bayyinah.'
  },
  {
    id: 'g3-s10',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 10,
    scheduleDay: 'Sabtu (Pekan 10)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Al-Bayyinah (Ayat 5–8) dan QS Al-Qadr',
    pageRef: 'Juz 30',
    target: 'Tuntas menghafal seluruh surat Al-Bayyinah dan Al-Qadr.'
  },
  {
    id: 'g3-s11',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 11,
    scheduleDay: 'Sabtu (Pekan 11)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Al-\'Alaq (Ayat 1–10)',
    pageRef: 'Juz 30',
    target: 'Hafal 10 ayat pertama QS Al-\'Alaq dengan makhraj fasih.'
  },
  {
    id: 'g3-s12',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 12,
    scheduleDay: 'Sabtu (Pekan 12)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Al-\'Alaq (Ayat 11–19) dan QS At-Tin',
    pageRef: 'Juz 30',
    target: 'Tuntas menghafal QS Al-\'Alaq dan QS At-Tin.'
  },
  {
    id: 'g3-s13',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 13,
    scheduleDay: 'Sabtu (Pekan 13)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Al-Insyirah dan QS Ad-Dhuha',
    pageRef: 'Juz 30',
    target: 'Hafal lancar dan memahami kaidah waqaf pada akhir ayat kedua surat.'
  },
  {
    id: 'g3-s14',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 14,
    scheduleDay: 'Sabtu (Pekan 14)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Asy-Syams (Ayat 1–15)',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS Asy-Syams dengan ketepatan mad thobi\'i akhir ayat.'
  },
  {
    id: 'g3-s15',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 15,
    scheduleDay: 'Sabtu (Pekan 15)',
    topic: 'Talaqqi & Setoran Hafalan Baru QS Al-Lail (Ayat 1–21) + Murajaah Akbar',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS Al-Lail dan menyambungkan murajaah bersama surat-surat sebelumnya.'
  },
  {
    id: 'g3-s16',
    gradeId: 'grade3',
    semester: 1,
    sessionNumber: 16,
    scheduleDay: 'Sabtu (Pekan 16)',
    topic: 'Evaluasi Akhir Semester 1 (PAS 1) - Ujian Mutqin & Sambung Ayat Tahfizh',
    pageRef: 'PAS 1 Tahfizh',
    target: 'Penilaian akhir semester 1 kelancaran hafalan juz 30 paruh bawah.'
  },

  // GRADE 3: SEMESTER 2 (Sesi 17-32)
  {
    id: 'g3-s17',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 17,
    scheduleDay: 'Sabtu (Pekan 17)',
    topic: 'Talaqqi & Setoran QS Al-Balad (Ayat 1–20) + Murajaah QS Al-Lail',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS Al-Balad dengan tartil dan tajwid sempurna.'
  },
  {
    id: 'g3-s18',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 18,
    scheduleDay: 'Sabtu (Pekan 18)',
    topic: 'Talaqqi & Setoran QS Al-Fajr (Ayat 1–16)',
    pageRef: 'Juz 30',
    target: 'Hafal separuh pertama QS Al-Fajr dengan kelancaran waqaf.'
  },
  {
    id: 'g3-s19',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 19,
    scheduleDay: 'Sabtu (Pekan 19)',
    topic: 'Talaqqi & Setoran QS Al-Fajr (Ayat 17–30) + Tuntas QS Al-Fajr',
    pageRef: 'Juz 30',
    target: 'Menyelesaikan setoran utuh QS Al-Fajr.'
  },
  {
    id: 'g3-s20',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 20,
    scheduleDay: 'Sabtu (Pekan 20)',
    topic: 'Talaqqi & Setoran QS Al-Ghasyiyah (Ayat 1–26)',
    pageRef: 'Juz 30',
    target: 'Hafal lancar QS Al-Ghasyiyah dengan ketepatan makharijul huruf.'
  },
  {
    id: 'g3-s21',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 21,
    scheduleDay: 'Sabtu (Pekan 21)',
    topic: 'Talaqqi & Setoran QS Al-A\'la (Ayat 1–19)',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS Al-A\'la dengan intonasi dan tajwid yang tartil.'
  },
  {
    id: 'g3-s22',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 22,
    scheduleDay: 'Sabtu (Pekan 22)',
    topic: 'Talaqqi & Setoran QS At-Thariq (Ayat 1–17) + Murajaah Blok QS Al-A\'la s.d. Al-Balad',
    pageRef: 'Juz 30',
    target: 'Menguatkan hafalan 4 surat berurutan secara mutqin.'
  },
  {
    id: 'g3-s23',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 23,
    scheduleDay: 'Sabtu (Pekan 23)',
    topic: 'Talaqqi & Setoran QS Al-Buruj (Ayat 1–22)',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS Al-Buruj dengan penguasaan qalqalah dan waqaf.'
  },
  {
    id: 'g3-s24',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 24,
    scheduleDay: 'Sabtu (Pekan 24)',
    topic: 'Evaluasi Tengah Semester 2 (PTS 2) - Ujian Tasmi\' QS Al-Lail s.d. QS Al-Buruj',
    pageRef: 'PTS 2 Tahfizh',
    target: 'Ujian tasmi\' kelancaran paruh tengah Juz 30.'
  },
  {
    id: 'g3-s25',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 25,
    scheduleDay: 'Sabtu (Pekan 25)',
    topic: 'Talaqqi & Setoran QS Al-Insyiqaq (Ayat 1–25)',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS Al-Insyiqaq disertai pemahaman tempat sujud tilawah.'
  },
  {
    id: 'g3-s26',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 26,
    scheduleDay: 'Sabtu (Pekan 26)',
    topic: 'Talaqqi & Setoran QS Al-Muthaffifin (Ayat 1–18)',
    pageRef: 'Juz 30',
    target: 'Hafal paruh pertama QS Al-Muthaffifin dengan tajwid teliti.'
  },
  {
    id: 'g3-s27',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 27,
    scheduleDay: 'Sabtu (Pekan 27)',
    topic: 'Talaqqi & Setoran QS Al-Muthaffifin (Ayat 19–36) + QS Al-Infithar',
    pageRef: 'Juz 30',
    target: 'Tuntas QS Al-Muthaffifin dan tuntas QS Al-Infithar.'
  },
  {
    id: 'g3-s28',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 28,
    scheduleDay: 'Sabtu (Pekan 28)',
    topic: 'Talaqqi & Setoran QS At-Takwir (Ayat 1–29)',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS At-Takwir dengan ketukan nafas stabil.'
  },
  {
    id: 'g3-s29',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 29,
    scheduleDay: 'Sabtu (Pekan 29)',
    topic: 'Talaqqi & Setoran QS \'Abasa (Ayat 1–42)',
    pageRef: 'Juz 30',
    target: 'Hafal utuh QS \'Abasa dan murajaah berantai.'
  },
  {
    id: 'g3-s30',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 30,
    scheduleDay: 'Sabtu (Pekan 30)',
    topic: 'Talaqqi & Setoran QS An-Nazi\'at & QS An-Naba\'',
    pageRef: 'Juz 30',
    target: 'Penyempurnaan hafalan dua surat pembuka Juz 30.'
  },
  {
    id: 'g3-s31',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 31,
    scheduleDay: 'Sabtu (Pekan 31)',
    topic: 'Murajaah Akbar Mutqin Juz 30 (Khatam Tasmi\' Sekali Duduk)',
    pageRef: 'Tasmi\' Juz 30',
    target: 'Simulasi tasmi\' 1 Juz 30 penuh dihadapan dewan penguji.'
  },
  {
    id: 'g3-s32',
    gradeId: 'grade3',
    semester: 2,
    sessionNumber: 32,
    scheduleDay: 'Sabtu (Pekan 32)',
    topic: 'Munaqasyah Akbar Tahfizh Al-Qur\'an Juz 30 & Wisuda Tahfizh',
    pageRef: 'Sertifikasi Tahfizh',
    target: 'Ujian sertifikasi resmi kelulusan Tahfizh Al-Qur\'an Juz 30 SMPN 102.'
  },
];
