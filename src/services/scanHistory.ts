export interface ScanHistoryRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNis?: string;
  studentClass?: string;
  groupName?: string;
  timestamp: string;
  isoTimestamp: string;
  verificationStatus: 'Terverifikasi QR' | 'Terverifikasi' | 'Valid';
  status: 'Hadir' | string;
  mentorEmail?: string;
  method?: 'QR_SCAN' | 'MANUAL';
}

const STORAGE_PREFIX = 'btq_session_attendance_scans_';

export function getSessionStorageKey(userEmail?: string): string {
  const cleanEmail = userEmail ? userEmail.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_') : 'default';
  return `${STORAGE_PREFIX}${cleanEmail}`;
}

/**
 * Record a successful scan for the current user's session
 */
export function recordSuccessfulScan(
  record: {
    studentId: string;
    studentName: string;
    studentNis?: string;
    studentClass?: string;
    groupName?: string;
    status?: string;
    verificationStatus?: 'Terverifikasi QR' | 'Terverifikasi' | 'Valid';
    mentorEmail?: string;
    method?: 'QR_SCAN' | 'MANUAL';
  },
  userEmail?: string
): ScanHistoryRecord {
  const key = getSessionStorageKey(userEmail);
  const existing = getSessionScanHistory(userEmail);

  const now = new Date();
  const timeString = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const dateString = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short'
  });

  const newRecord: ScanHistoryRecord = {
    id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studentId: record.studentId,
    studentName: record.studentName,
    studentNis: record.studentNis,
    studentClass: record.studentClass,
    groupName: record.groupName,
    timestamp: `${dateString}, ${timeString}`,
    isoTimestamp: now.toISOString(),
    verificationStatus: record.verificationStatus || 'Terverifikasi QR',
    status: record.status || 'Hadir',
    mentorEmail: record.mentorEmail || userEmail,
    method: record.method || 'QR_SCAN'
  };

  // Filter out duplicates of same student scanned within short burst, keep latest at top
  const filtered = existing.filter(item => item.studentId !== record.studentId);
  const updated = [newRecord, ...filtered].slice(0, 10); // Keep last 10

  try {
    sessionStorage.setItem(key, JSON.stringify(updated));
    // Also save in localStorage as backup for same browser tab recovery
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save scan history to sessionStorage', err);
  }

  // Dispatch custom event for real-time reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('btq_scan_history_updated', {
      detail: { record: newRecord, history: updated }
    }));
  }

  return newRecord;
}

/**
 * Retrieve the last 10 successful scans for the current user's session
 */
export function getSessionScanHistory(userEmail?: string, limit = 10): ScanHistoryRecord[] {
  const key = getSessionStorageKey(userEmail);
  try {
    let raw = sessionStorage.getItem(key);
    if (!raw) {
      // Fallback to localStorage if refreshed or opened in new tab of same session
      raw = localStorage.getItem(key);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, limit);
      }
    }
  } catch (err) {
    console.warn('Failed to parse scan history', err);
  }
  return [];
}

/**
 * Clear the scan history for the current user's session
 */
export function clearSessionScanHistory(userEmail?: string): void {
  const key = getSessionStorageKey(userEmail);
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear scan history', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('btq_scan_history_updated', {
      detail: { history: [] }
    }));
  }
}
