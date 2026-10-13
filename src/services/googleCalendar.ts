/**
 * Google Calendar Integration Service for Portal BTQ SMPN 102 Jakarta
 * 
 * Mengelola integrasi Google Calendar API (REST endpoints v3)
 * dengan arsitektur Google Groups (contoh: rohis-102@googlegroups.com),
 * keamanan token OAuth 2.0 in-memory, serta proteksi API rate-limit
 * (Smart Diff / Idempotency hash, adaptive throttling, dan exponential backoff).
 */

import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { AcademicMeeting } from './academicCalendar';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events'
];

// In-Memory Token Caching (Sesuai panduan keamanan workspace-integration)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: { name?: string | null; email?: string | null; photoURL?: string | null } | null = null;

// Provider Google Auth khusus Calendar
const googleProvider = new GoogleAuthProvider();
GOOGLE_CALENDAR_SCOPES.forEach(scope => googleProvider.addScope(scope));
// Minta refresh consent untuk memastikan token calendar selalu aktif
googleProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'online'
});

export interface GoogleCalendarConfig {
  groupEmail: string;             // default: 'rohis-102@googlegroups.com'
  enableGroupInvite: boolean;     // default: true
  sendUpdates: 'none' | 'all';    // default: 'none' (menghindari rate-limit email broadcast)
  throttleMs: number;             // delay antar request (default 300ms)
  smartDiffEnabled: boolean;      // skip event jika isi belum berubah (hemat kuota API)
}

export const DEFAULT_GCAL_CONFIG: GoogleCalendarConfig = {
  groupEmail: 'rohis-102@googlegroups.com',
  enableGroupInvite: true,
  sendUpdates: 'none',
  throttleMs: 300,
  smartDiffEnabled: true
};

const LOCAL_STORAGE_GCAL_CONFIG_KEY = 'btq_gcal_sync_config_cache';

/**
 * Membaca konfigurasi Google Calendar & Google Groups (Cache + Firestore)
 */
export async function getGoogleCalendarConfig(): Promise<GoogleCalendarConfig> {
  try {
    const docRef = doc(db, 'calendar_settings', 'google_sync_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<GoogleCalendarConfig>;
      const config: GoogleCalendarConfig = {
        groupEmail: data.groupEmail || DEFAULT_GCAL_CONFIG.groupEmail,
        enableGroupInvite: data.enableGroupInvite !== undefined ? data.enableGroupInvite : DEFAULT_GCAL_CONFIG.enableGroupInvite,
        sendUpdates: data.sendUpdates || DEFAULT_GCAL_CONFIG.sendUpdates,
        throttleMs: data.throttleMs || DEFAULT_GCAL_CONFIG.throttleMs,
        smartDiffEnabled: data.smartDiffEnabled !== undefined ? data.smartDiffEnabled : DEFAULT_GCAL_CONFIG.smartDiffEnabled
      };
      localStorage.setItem(LOCAL_STORAGE_GCAL_CONFIG_KEY, JSON.stringify(config));
      return config;
    }
  } catch (e) {
    console.warn('Gagal memuat konfigurasi Google Calendar dari Firestore, menggunakan fallback:', e);
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GCAL_CONFIG_KEY);
    if (raw) return { ...DEFAULT_GCAL_CONFIG, ...JSON.parse(raw) };
  } catch {}

  return DEFAULT_GCAL_CONFIG;
}

/**
 * Menyimpan konfigurasi Google Calendar & Google Groups ke Firestore
 */
export async function saveGoogleCalendarConfig(config: Partial<GoogleCalendarConfig>): Promise<GoogleCalendarConfig> {
  const current = await getGoogleCalendarConfig();
  const updated: GoogleCalendarConfig = {
    ...current,
    ...config,
    groupEmail: (config.groupEmail || current.groupEmail).trim().toLowerCase()
  };

  try {
    const docRef = doc(db, 'calendar_settings', 'google_sync_config');
    await setDoc(docRef, {
      ...updated,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Gagal menyimpan konfigurasi ke Firestore:', e);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_GCAL_CONFIG_KEY, JSON.stringify(updated));
  } catch {}

  return updated;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  htmlLink?: string;
  status?: string;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
}

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  totalSynced: number;
  totalSkipped: number;
  errors: string[];
  events: { meetingNumber: number; eventId: string; htmlLink?: string; skipped?: boolean }[];
}

/**
 * Cek apakah Google Calendar saat ini terhubung dan memiliki akses token aktif
 */
export function isGoogleCalendarConnected(): boolean {
  return !!cachedAccessToken;
}

/**
 * Mendapatkan access token yang tersimpan di memori
 */
export function getGoogleCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Mendapatkan info pengguna Google yang terhubung
 */
export function getConnectedGoogleUser() {
  return cachedGoogleUser;
}

/**
 * Putuskan koneksi Google Calendar (menghapus token dari memori)
 */
export function disconnectGoogleCalendar(): void {
  cachedAccessToken = null;
  cachedGoogleUser = null;
  window.dispatchEvent(new CustomEvent('gcal-auth-changed', { detail: { connected: false } }));
}

/**
 * Menghubungkan akun Google dengan memunculkan Google Sign-in Popup
 */
export async function connectGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Akses token Google Calendar tidak ditemukan dalam respons otentikasi.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = {
      name: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL
    };

    // Broadcast status perubahan login Google
    window.dispatchEvent(new CustomEvent('gcal-auth-changed', { 
      detail: { connected: true, email: result.user.email } 
    }));

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Gagal menghubungkan Google Calendar:', error);
    throw error;
  }
}

/**
 * Format tanggal dan jam ke ISO string dengan Timezone Asia/Jakarta (+07:00)
 */
function toJakartaIsoDateTime(dateYmd: string, timeHms: string): string {
  return `${dateYmd}T${timeHms}+07:00`;
}

/**
 * Hash string sederhana untuk fingerprint payload meeting (Smart Idempotency Diff)
 */
export function computeMeetingFingerprint(meeting: AcademicMeeting, groupEmail?: string): string {
  const isHoliday = meeting.isHoliday || meeting.status === 'holiday';
  const str = `${meeting.date}|${meeting.meetingNumber}|${isHoliday}|${meeting.title}|${meeting.notes || ''}|${groupEmail || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return String(Math.abs(hash));
}

/**
 * Membuat tautan ekspor cepat ke Google Calendar (One-click Web URL)
 * dengan Google Group otomatis sebagai tamu
 */
export function generateGoogleCalendarWebLink(meeting: AcademicMeeting, groupEmail = 'rohis-102@googlegroups.com'): string {
  const isHoliday = meeting.isHoliday || meeting.status === 'holiday';
  
  const title = isHoliday
    ? `[LIBUR] BTQ SMPN 102 - ${meeting.notes || 'Ditiadakan'}`
    : `BTQ SMPN 102: Pertemuan ${meeting.meetingNumber} (${meeting.title.replace(/^Pertemuan \d+\s*\((.+)\)$/, '$1')})`;

  const details = isHoliday
    ? `Pemberitahuan Hari Libur Kalender Akademik BTQ SMP Negeri 102 Jakarta.\nKeterangan: ${meeting.notes || 'Sesi ditiadakan, penomoran pertemuan bergeser ke pekan efektif berikutnya.'}\n\nUndangan grup: ${groupEmail}\nInfo: Portal BTQ SMPN 102 Jakarta`
    : `Kegiatan Pembelajaran & Pembinaan Baca Tulis Al-Qur'an (BTQ)\nSMP Negeri 102 Jakarta\n\nNomor: Pertemuan Ke-${meeting.meetingNumber}\nMateri: ${meeting.title}\nTarget: Tahsin, Tilawah, dan Hafalan Santri\n\nUndangan Distribusi: ${groupEmail} (Mentor & Santri BTQ)\nJadwal: Sabtu, 07:00 - 08:30 WIB\nLokasi: SMP Negeri 102 Jakarta, Jl. Raya Cijantung, Jakarta Timur`;

  const cleanDate = meeting.date.replace(/-/g, '');
  const dates = isHoliday 
    ? `${cleanDate}T070000/${cleanDate}T090000`
    : `${cleanDate}T070000/${cleanDate}T083000`;

  const location = 'SMP Negeri 102 Jakarta, Cijantung, Pasar Rebo, Jakarta Timur';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dates,
    details: details,
    location: location,
    ctz: 'Asia/Jakarta'
  });

  if (groupEmail && groupEmail.includes('@')) {
    params.set('add', groupEmail);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Wrapper HTTP fetch dengan Exponential Backoff + Jitter untuk mengatasi Rate Limit HTTP 429 / 503
 */
async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelayMs = 800
): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);

      // Jika terkena rate limit (429) atau server busy (503), lakukan backoff
      if (response.status === 429 || response.status === 503) {
        if (attempt === maxRetries) {
          return response;
        }
        // Jitter antara 0.8 s.d 1.2
        const jitter = 0.8 + Math.random() * 0.4;
        const delay = Math.round(baseDelayMs * Math.pow(2, attempt) * jitter);
        console.warn(`[GCal API Rate-Limit] Menerima status ${response.status}. Menunggu ${delay}ms sebelum retry ke-${attempt + 1}...`);
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }

      return response;
    } catch (networkErr) {
      if (attempt === maxRetries) throw networkErr;
      const delay = Math.round(baseDelayMs * Math.pow(2, attempt));
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }

  throw new Error('Gagal menghubungi Google Calendar API setelah beberapa percobaan.');
}

/**
 * Menyinkronkan satu pertemuan atau hari libur ke Google Calendar
 * dengan proteksi Smart Diff dan integrasi Google Groups
 */
export async function syncMeetingToGoogleCalendar(
  meeting: AcademicMeeting,
  tokenOverride?: string,
  configOverride?: GoogleCalendarConfig,
  forceUpdate = false
): Promise<{ eventId: string; htmlLink?: string; skipped?: boolean }> {
  const token = tokenOverride || cachedAccessToken;
  if (!token) {
    throw new Error('Akses Google Calendar belum aktif. Silakan hubungkan akun Google Anda.');
  }

  const config = configOverride || (await getGoogleCalendarConfig());
  const isHoliday = meeting.isHoliday || meeting.status === 'holiday';
  const currentFingerprint = computeMeetingFingerprint(
    meeting, 
    config.enableGroupInvite ? config.groupEmail : ''
  );

  // 1. Cek Record Sinkronisasi di Firestore untuk Idempotency & Smart Diff
  let existingEventId: string | null = null;
  let existingHtmlLink: string | null = null;
  let existingFingerprint: string | null = null;

  try {
    const syncDocRef = doc(db, 'academic_calendar_sync', `event_${meeting.date}`);
    const snap = await getDoc(syncDocRef);
    if (snap.exists()) {
      const data = snap.data();
      existingEventId = data?.googleEventId || null;
      existingHtmlLink = data?.htmlLink || null;
      existingFingerprint = data?.fingerprint || null;
    }
  } catch (e) {
    // Abaikan jika Firestore offline
  }

  // 2. Proteksi Efisiensi: Jika Smart Diff aktif & fingerprint identik & tidak dipaksa -> Skip API Call!
  if (config.smartDiffEnabled && !forceUpdate && existingEventId && existingFingerprint === currentFingerprint) {
    return {
      eventId: existingEventId,
      htmlLink: existingHtmlLink || undefined,
      skipped: true
    };
  }

  // 3. Susun Payload Event
  const summary = isHoliday
    ? `[LIBUR] BTQ SMPN 102: ${meeting.notes || 'Diliburkan'}`
    : `BTQ SMPN 102: Pertemuan ${meeting.meetingNumber} - ${meeting.title}`;

  const description = isHoliday
    ? `Hari Libur Akademik BTQ SMP Negeri 102 Jakarta.\nAlasan: ${meeting.notes || 'Sesi ditiadakan'}.\nJadwal pertemuan bergeser otomatis ke Sabtu berikutnya.\n\nUndangan Distribusi: ${config.enableGroupInvite ? config.groupEmail : 'Internal'}`
    : `Sesi Pembelajaran BTQ SMP Negeri 102 Jakarta\n• Pertemuan: Ke-${meeting.meetingNumber}\n• Materi: ${meeting.title}\n• Waktu: Sabtu, 07:00 - 08:30 WIB\n• Lokasi: Lingkungan SMPN 102 Jakarta\n• Distribusi Google Groups: ${config.enableGroupInvite ? config.groupEmail : 'Nonaktif'}\n\nCatatan: Guru dan santri terhubung via Google Groups untuk update kehadiran & materi.`;

  const startDateTime = toJakartaIsoDateTime(meeting.date, '07:00:00');
  const endDateTime = toJakartaIsoDateTime(meeting.date, isHoliday ? '09:00:00' : '08:30:00');

  // Konfigurasi Attendees: Gunakan Google Groups untuk menghubungkan seluruh mentor & siswa
  // Menggunakan 1 Google Groups attendee mencegah terbakarnya quota limit dan pencegahan abuse
  const attendeesList: { email: string; displayName?: string; responseStatus?: string }[] = [];
  if (config.enableGroupInvite && config.groupEmail && config.groupEmail.includes('@')) {
    attendeesList.push({
      email: config.groupEmail,
      displayName: 'Rohis 102 & Mentee BTQ',
      responseStatus: 'needsAction'
    });
  }

  const eventPayload: any = {
    summary,
    description,
    location: 'SMP Negeri 102 Jakarta, Jl. Raya Cijantung, Kec. Pasar Rebo, Jakarta Timur',
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Jakarta'
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Asia/Jakarta'
    },
    colorId: isHoliday ? '11' : '10', // 10: Basil (Green), 11: Flamingo (Red)
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 * 24 }, // H-1 (Jumat pagi)
        { method: 'popup', minutes: 60 }        // H-1 jam (Sabtu 06:00)
      ]
    },
    extendedProperties: {
      private: {
        appSource: 'PORTAL_BTQ_SMPN102',
        meetingNumber: String(meeting.meetingNumber),
        meetingDate: meeting.date,
        isHoliday: isHoliday ? 'true' : 'false',
        googleGroup: config.groupEmail,
        fingerprint: currentFingerprint
      }
    }
  };

  if (attendeesList.length > 0) {
    eventPayload.attendees = attendeesList;
  }

  // 4. Bangun URL API dan tentukan PUT vs POST
  const sendUpdatesParam = config.sendUpdates === 'all' ? 'all' : 'none';
  let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=${sendUpdatesParam}`;
  let httpMethod = 'POST';

  if (existingEventId) {
    apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}?sendUpdates=${sendUpdatesParam}`;
    httpMethod = 'PUT';
  }

  const res = await fetchWithBackoff(apiUrl, {
    method: httpMethod,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventPayload)
  });

  if (!res.ok) {
    // Jika event lama tidak ditemukan (404), buat event baru via POST
    if (res.status === 404 && existingEventId) {
      const createUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=${sendUpdatesParam}`;
      const retryRes = await fetchWithBackoff(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });
      if (retryRes.ok) {
        const newEvent = await retryRes.json();
        await saveSyncRecord(meeting, newEvent.id, currentFingerprint, newEvent.htmlLink);
        return { eventId: newEvent.id, htmlLink: newEvent.htmlLink, skipped: false };
      }
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gagal menyinkronkan event Google Calendar (Status ${res.status})`);
  }

  const eventData = await res.json();
  await saveSyncRecord(meeting, eventData.id, currentFingerprint, eventData.htmlLink);

  return {
    eventId: eventData.id,
    htmlLink: eventData.htmlLink,
    skipped: false
  };
}

/**
 * Menyimpan metadata sync ke Firestore agar dapat dilacak status sinkronisasinya
 */
async function saveSyncRecord(meeting: AcademicMeeting, eventId: string, fingerprint: string, htmlLink?: string) {
  try {
    const docRef = doc(db, 'academic_calendar_sync', `event_${meeting.date}`);
    await setDoc(docRef, {
      meetingNumber: meeting.meetingNumber,
      date: meeting.date,
      googleEventId: eventId,
      fingerprint,
      htmlLink: htmlLink || '',
      syncedAt: new Date().toISOString(),
      isHoliday: !!meeting.isHoliday
    }, { merge: true });
  } catch (err) {
    console.warn('Gagal mencatat sync metadata di Firestore:', err);
  }
}

/**
 * Mengambil status sinkronisasi tersimpan dari Firestore
 */
export async function getCalendarSyncStatus(): Promise<Record<string, { googleEventId: string; syncedAt: string; htmlLink?: string; fingerprint?: string }>> {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'academic_calendar_sync'));
    const map: Record<string, { googleEventId: string; syncedAt: string; htmlLink?: string; fingerprint?: string }> = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.date) {
        map[data.date] = {
          googleEventId: data.googleEventId,
          syncedAt: data.syncedAt,
          htmlLink: data.htmlLink,
          fingerprint: data.fingerprint
        };
      }
    });
    return map;
  } catch (err) {
    return {};
  }
}

/**
 * Batch Sync: Menyinkronkan seluruh daftar pertemuan ke Google Calendar secara efisien
 * Menggunakan Smart Diff (skip unchanged), Adaptive Throttling (300ms delay),
 * serta Google Groups attendee tunggal untuk mencegah limit API.
 */
export async function batchSyncMeetingsToGoogleCalendar(
  meetings: AcademicMeeting[],
  options?: {
    forceAll?: boolean;
    onProgress?: (processed: number, total: number, label: string, skippedCount: number) => void;
  }
): Promise<SyncResult> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Akses Google Calendar belum aktif. Silakan hubungkan akun Google terlebih dahulu.');
  }

  const config = await getGoogleCalendarConfig();
  const total = meetings.length;
  let successCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];
  const eventsResult: { meetingNumber: number; eventId: string; htmlLink?: string; skipped?: boolean }[] = [];

  for (let i = 0; i < total; i++) {
    const meeting = meetings[i];
    const label = meeting.isHoliday ? `Libur (${meeting.date})` : `Pertemuan ${meeting.meetingNumber}`;
    
    if (options?.onProgress) {
      options.onProgress(i, total, label, skippedCount);
    }

    try {
      const res = await syncMeetingToGoogleCalendar(
        meeting, 
        token, 
        config, 
        options?.forceAll ?? false
      );

      if (res.skipped) {
        skippedCount++;
      } else {
        successCount++;
      }

      eventsResult.push({
        meetingNumber: meeting.meetingNumber,
        eventId: res.eventId,
        htmlLink: res.htmlLink,
        skipped: res.skipped
      });

      // Adaptive Throttling: Berikan jeda antar request agar terhindar dari per-second burst limits
      // Jika di-skip (tidak panggil Google API), tidak perlu jeda lama.
      const delay = res.skipped ? 20 : (config.throttleMs || 300);
      await new Promise(r => setTimeout(r, delay));
    } catch (err: any) {
      console.error(`Gagal sinkronisasi ${label}:`, err);
      errors.push(`${label}: ${err.message || 'Gagal menyimpan ke Google'}`);
    }
  }

  if (options?.onProgress) {
    options.onProgress(total, total, 'Selesai', skippedCount);
  }

  return {
    success: errors.length === 0,
    totalProcessed: total,
    totalSynced: successCount,
    totalSkipped: skippedCount,
    errors,
    events: eventsResult
  };
}
