import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  SystemActivity,
  AuditLogEntry,
  OperationType,
  handleFirestoreError,
} from './types';
import { initialSeedAuditLogs } from './initialData';

const LOCAL_STORAGE_ACTIVITIES_KEY = 'sibtq_system_activities_v1';
const LOCAL_STORAGE_AUDIT_LOGS_KEY = 'sibtq_audit_logs_v1';

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
    const actSnap = await getDocs(query(actCol, orderBy('createdAt', 'desc'), limit(30)));
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

export async function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
  const newLog: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  // 1. Save to local storage cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
    const existing: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    const updated = [newLog, ...existing].slice(0, 300); // Keep last 300 logs
    localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Local storage audit log error:", err);
  }

  // 2. Save to Firestore
  try {
    await addDoc(collection(db, 'audit_logs'), newLog);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
  }

  return newLog;
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const logs: AuditLogEntry[] = [];

  try {
    const colRef = collection(db, 'audit_logs');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(200));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.docs.forEach(docSnap => {
        logs.push({ id: docSnap.id, ...docSnap.data() } as AuditLogEntry);
      });
      return logs;
    }
  } catch (err) {
    console.warn("Firestore audit_logs fetch fallback to local:", err);
  }

  // Fallback to local storage or initial seed
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  try {
    localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(initialSeedAuditLogs));
  } catch {}

  return initialSeedAuditLogs;
}
