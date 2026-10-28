/**
 * Academic Calendar & Meeting Standardization Service
 * 
 * Mengelola standarisasi "Pertemuan Ke-" dan sinkronisasi tanggal riil
 * pelaksanaan BTQ (Sabtu pagi) dengan fleksibilitas penuh jika ada hari libur / sesi ditiadakan.
 */

import { AcademicHoliday, MeetingOverride } from './db/calendar';

export interface AcademicMeeting {
  meetingNumber: number; // 0 jika hari libur, 1..32 jika sesi efektif
  date: string;          // YYYY-MM-DD
  dayName: string;
  shortDateLabel: string; // e.g. "15 Agu"
  fullDateLabel: string;  // e.g. "Sabtu, 15 Agustus 2026"
  status: 'completed' | 'ongoing' | 'upcoming' | 'holiday';
  title: string;
  notes?: string;
  isHoliday?: boolean;
}

// Master judul kurikulum standar per nomor pertemuan semester 1
export const DEFAULT_MEETING_TOPICS: Record<number, string> = {
  1: 'Pertemuan 1 (Orientasi & Tahsin Awal)',
  2: 'Pertemuan 2 (Pembelajaran & Pemetaan Halaqah)',
  3: 'Pertemuan 3 (Pendalaman Tajwid & Tilawah)',
  4: 'Pertemuan 4 (Makharijul Huruf & Setoran Hafalan)',
  5: 'Pertemuan 5 (Hukum Mad & Praktik Kitabah)',
  6: 'Pertemuan 6 (Kaidah Nun & Mim Sukun)',
  7: 'Pertemuan 7 (Qalqalah & Ghunnah)',
  8: 'Pertemuan 8 (Uji Capaian Tengah Semester)',
  9: 'Pertemuan 9 (Penguatan Mutqin Juz 30)',
  10: 'Pertemuan 10 (Tahsin Tilawah Al-Qur\'an Lanjutan)',
  11: 'Pertemuan 11 (Tafsir Ringkas & Adab Membaca)',
  12: 'Pertemuan 12 (Evaluasi Halaqah & Tahsin Mandiri)',
  13: 'Pertemuan 13 (Pengayaan Kitabah & Rasm Utsmani)',
  14: 'Pertemuan 14 (Ujian Praktik Tartil)',
  15: 'Pertemuan 15 (Munaqasyah Halaqah)',
  16: 'Pertemuan 16 (Rekapitulasi Akhir & Tasmi\')'
};

// Kalender default dasar (jika belum ada libur yang diset)
export const DEFAULT_ACADEMIC_MEETINGS: AcademicMeeting[] = [
  {
    meetingNumber: 1,
    date: '2026-08-15',
    dayName: 'Sabtu',
    shortDateLabel: '15 Agu',
    fullDateLabel: 'Sabtu, 15 Agustus 2026',
    status: 'completed',
    title: DEFAULT_MEETING_TOPICS[1]
  },
  {
    meetingNumber: 2,
    date: '2026-08-22',
    dayName: 'Sabtu',
    shortDateLabel: '22 Agu',
    fullDateLabel: 'Sabtu, 22 Agustus 2026',
    status: 'completed',
    title: DEFAULT_MEETING_TOPICS[2]
  },
  {
    meetingNumber: 3,
    date: '2026-08-29',
    dayName: 'Sabtu',
    shortDateLabel: '29 Agu',
    fullDateLabel: 'Sabtu, 29 Agustus 2026',
    status: 'ongoing',
    title: DEFAULT_MEETING_TOPICS[3]
  },
  {
    meetingNumber: 4,
    date: '2026-09-05',
    dayName: 'Sabtu',
    shortDateLabel: '05 Sep',
    fullDateLabel: 'Sabtu, 05 September 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[4]
  },
  {
    meetingNumber: 5,
    date: '2026-09-12',
    dayName: 'Sabtu',
    shortDateLabel: '12 Sep',
    fullDateLabel: 'Sabtu, 12 September 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[5]
  },
  {
    meetingNumber: 6,
    date: '2026-09-19',
    dayName: 'Sabtu',
    shortDateLabel: '19 Sep',
    fullDateLabel: 'Sabtu, 19 September 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[6]
  },
  {
    meetingNumber: 7,
    date: '2026-09-26',
    dayName: 'Sabtu',
    shortDateLabel: '26 Sep',
    fullDateLabel: 'Sabtu, 26 September 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[7]
  },
  {
    meetingNumber: 8,
    date: '2026-10-03',
    dayName: 'Sabtu',
    shortDateLabel: '03 Okt',
    fullDateLabel: 'Sabtu, 03 Oktober 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[8]
  },
  {
    meetingNumber: 9,
    date: '2026-10-10',
    dayName: 'Sabtu',
    shortDateLabel: '10 Okt',
    fullDateLabel: 'Sabtu, 10 Oktober 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[9]
  },
  {
    meetingNumber: 10,
    date: '2026-10-17',
    dayName: 'Sabtu',
    shortDateLabel: '17 Okt',
    fullDateLabel: 'Sabtu, 17 Oktober 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[10]
  },
  {
    meetingNumber: 11,
    date: '2026-10-24',
    dayName: 'Sabtu',
    shortDateLabel: '24 Okt',
    fullDateLabel: 'Sabtu, 24 Oktober 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[11]
  },
  {
    meetingNumber: 12,
    date: '2026-10-31',
    dayName: 'Sabtu',
    shortDateLabel: '31 Okt',
    fullDateLabel: 'Sabtu, 31 Oktober 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[12]
  },
  {
    meetingNumber: 13,
    date: '2026-11-07',
    dayName: 'Sabtu',
    shortDateLabel: '07 Nov',
    fullDateLabel: 'Sabtu, 07 November 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[13]
  },
  {
    meetingNumber: 14,
    date: '2026-11-14',
    dayName: 'Sabtu',
    shortDateLabel: '14 Nov',
    fullDateLabel: 'Sabtu, 14 November 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[14]
  },
  {
    meetingNumber: 15,
    date: '2026-11-21',
    dayName: 'Sabtu',
    shortDateLabel: '21 Nov',
    fullDateLabel: 'Sabtu, 21 November 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[15]
  },
  {
    meetingNumber: 16,
    date: '2026-11-28',
    dayName: 'Sabtu',
    shortDateLabel: '28 Nov',
    fullDateLabel: 'Sabtu, 28 November 2026',
    status: 'upcoming',
    title: DEFAULT_MEETING_TOPICS[16]
  }
];

/**
 * Memformat tanggal string ISO YYYY-MM-DD ke label bahasa Indonesia pendek (contoh: "15 Agu")
 */
export function formatShortDateID(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

/**
 * Memformat tanggal string ISO YYYY-MM-DD ke label bahasa Indonesia lengkap (contoh: "Sabtu, 15 Agustus 2026")
 */
export function formatFullDateID(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Cek apakah suatu tanggal tercatat sebagai hari libur
 */
export function isDateHoliday(
  dateStr: string,
  holidays: AcademicHoliday[] = []
): AcademicHoliday | undefined {
  if (!dateStr) return undefined;
  const cleanDate = dateStr.split('T')[0];
  return holidays.find(h => h.date === cleanDate);
}

/**
 * Mendapatkan tanggal riil untuk nomor pertemuan tertentu.
 * Mengakomodasi hari libur yang terdaftar di Firestore secara otomatis.
 */
export function getMeetingRealDate(
  meetingNumber: number,
  recordedDates?: { meetingNumber?: number; date?: string }[],
  holidays: AcademicHoliday[] = []
): string | undefined {
  // 1. Cek dari rekaman presensi / jurnal riil yang tersimpan di database
  if (recordedDates && recordedDates.length > 0) {
    const found = recordedDates.find(r => r.meetingNumber === meetingNumber && r.date);
    if (found && found.date) {
      return found.date.split('T')[0];
    }
  }

  // 2. Hitung dinamis dari kalender dengan pergeseran hari libur
  const synchronized = getSynchronizedMeetings([], [], holidays);
  const matched = synchronized.find(m => m.meetingNumber === meetingNumber && !m.isHoliday);
  if (matched) {
    return matched.date;
  }

  // Fallback standar jika di luar rentang
  const def = DEFAULT_ACADEMIC_MEETINGS.find(m => m.meetingNumber === meetingNumber);
  return def ? def.date : undefined;
}

/**
 * Format label standar pertemuan dengan tanggal riil:
 * - 'full': "Pertemuan 1 (15 Agu)"
 * - 'short': "P1 (15 Agu)"
 * - 'chart-axis': "P1 (15/8)"
 * - 'badge': "Pertemuan 1 • 15 Agu"
 */
export function formatMeetingLabel(
  meetingNumber: number,
  dateStr?: string,
  variant: 'full' | 'short' | 'chart-axis' | 'badge' = 'full'
): string {
  const shortDate = dateStr ? formatShortDateID(dateStr) : '';

  if (variant === 'chart-axis') {
    if (dateStr) {
      try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          return `P${meetingNumber} (${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)})`;
        }
      } catch {
        // Fallback
      }
    }
    return shortDate ? `P${meetingNumber} (${shortDate})` : `P${meetingNumber}`;
  }

  if (variant === 'short') {
    return shortDate ? `P${meetingNumber} (${shortDate})` : `P${meetingNumber}`;
  }

  if (variant === 'badge') {
    return shortDate ? `Pertemuan ${meetingNumber} • ${shortDate}` : `Pertemuan ${meetingNumber}`;
  }

  // Default 'full'
  return shortDate ? `Pertemuan ${meetingNumber} (${shortDate})` : `Pertemuan ${meetingNumber}`;
}

/**
 * Memformat objek Date ke string YYYY-MM-DD berbasis tanggal lokal (menghindari pergeseran zona waktu UTC)
 */
export function formatLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Menghasilkan daftar pertemuan akademik dinamis yang disinkronkan dengan:
 * 1. Hari Libur yang disetel Admin (menggeser jadwal ke Sabtu berikutnya secara otomatis)
 * 2. Data riil presensi dan jurnal yang tersimpan di Cloud Firestore
 */
export function getSynchronizedMeetings(
  allAttendance: { meetingNumber?: number; date?: string }[] = [],
  journals: { meetingNumber?: number; date?: string; title?: string }[] = [],
  holidays: AcademicHoliday[] = [],
  overrides: MeetingOverride[] = []
): AcademicMeeting[] {
  const holidayMap = new Map<string, AcademicHoliday>();
  holidays.forEach(h => {
    if (h.date) holidayMap.set(h.date.split('T')[0], h);
  });

  const overrideMap = new Map<number, MeetingOverride>();
  overrides.forEach(o => {
    if (o.meetingNumber) overrideMap.set(o.meetingNumber, o);
  });

  // Petakan frekuensi tanggal dari presensi & jurnal untuk mendeteksi tanggal duplikat yang salah
  const dateMeetingFreq = new Map<string, Set<number>>();
  journals.forEach(j => {
    if (j.meetingNumber && j.date) {
      const d = j.date.split('T')[0];
      const set = dateMeetingFreq.get(d) || new Set<number>();
      set.add(j.meetingNumber);
      dateMeetingFreq.set(d, set);
    }
  });
  allAttendance.forEach(a => {
    if (a.meetingNumber && a.date) {
      const d = a.date.split('T')[0];
      const set = dateMeetingFreq.get(d) || new Set<number>();
      set.add(a.meetingNumber);
      dateMeetingFreq.set(d, set);
    }
  });

  // Hanya gunakan recordedDate jika tanggal tersebut tidak pernah digunakan untuk banyak nomor pertemuan yang berbeda
  const recordedMeetingDates = new Map<number, string>();
  journals.forEach(j => {
    if (j.meetingNumber && j.date) {
      const d = j.date.split('T')[0];
      if ((dateMeetingFreq.get(d)?.size || 0) <= 1) {
        recordedMeetingDates.set(j.meetingNumber, d);
      }
    }
  });
  allAttendance.forEach(a => {
    if (a.meetingNumber && a.date) {
      const d = a.date.split('T')[0];
      if ((dateMeetingFreq.get(d)?.size || 0) <= 1) {
        recordedMeetingDates.set(a.meetingNumber, d);
      }
    }
  });

  const maxRecordedMeeting = Math.max(
    2,
    ...allAttendance.map(a => a.meetingNumber || 0),
    ...journals.map(j => j.meetingNumber || 0)
  );

  // Tanggal awal semester 1 (Sabtu, 15 Agustus 2026)
  const baseYear = 2026;
  const baseMonth = 7; // Month is 0-indexed (7 = Agustus)
  const baseDay = 15;
  const result: AcademicMeeting[] = [];

  let currentMeetingNum = 1;
  const targetMeetingCount = 16;
  let weekOffset = 0;
  const maxWeeksSafety = 30; // Mencegah infinite loop
  const usedDates = new Set<string>();

  while (currentMeetingNum <= targetMeetingCount && weekOffset < maxWeeksSafety) {
    const curDate = new Date(baseYear, baseMonth, baseDay + (weekOffset * 7));
    const dateStr = formatLocalDateString(curDate);

    const holiday = holidayMap.get(dateStr);

    if (holiday) {
      // INI HARI LIBUR: Sisipkan entri libur, JANGAN naikkan currentMeetingNum!
      result.push({
        meetingNumber: 0,
        date: dateStr,
        dayName: 'Sabtu',
        shortDateLabel: formatShortDateID(dateStr),
        fullDateLabel: formatFullDateID(dateStr),
        status: 'holiday',
        title: `Diliburkan: ${holiday.reason}`,
        notes: holiday.reason,
        isHoliday: true
      });
      usedDates.add(dateStr);
    } else {
      // BUKAN LIBUR: Pertemuan Ke-[currentMeetingNum]
      const override = overrideMap.get(currentMeetingNum);
      let actualDateStr = override?.customDate || recordedMeetingDates.get(currentMeetingNum) || dateStr;

      // Cegah tanggal duplikat kecuali jika memang sengaja diset khusus oleh admin
      if (usedDates.has(actualDateStr) && !override?.customDate) {
        actualDateStr = dateStr;
      }
      usedDates.add(actualDateStr);

      let status: 'completed' | 'ongoing' | 'upcoming' | 'holiday' = 'upcoming';
      if (currentMeetingNum < maxRecordedMeeting) {
        status = 'completed';
      } else if (currentMeetingNum === maxRecordedMeeting) {
        status = 'ongoing';
      } else {
        status = 'upcoming';
      }

      const customTitle = override?.customTitle || DEFAULT_MEETING_TOPICS[currentMeetingNum] || `Pertemuan ${currentMeetingNum}`;

      result.push({
        meetingNumber: currentMeetingNum,
        date: actualDateStr,
        dayName: 'Sabtu',
        shortDateLabel: formatShortDateID(actualDateStr),
        fullDateLabel: formatFullDateID(actualDateStr),
        status,
        title: customTitle,
        isHoliday: false
      });

      currentMeetingNum++;
    }

    weekOffset++;
  }

  return result;
}
