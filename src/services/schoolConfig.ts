import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { addAuditLog } from './db';
import { handleFirestoreError, OperationType } from './db/types';

export interface SchoolConfig {
  schoolName: string; // e.g. "SMP Negeri 102 Jakarta"
  schoolNpsn: string; // e.g. "20102557"
  schoolAddress: string; // e.g. "Jl. Cijantung IV, Pasar Rebo, Jakarta Timur"
  headmasterName: string; // e.g. "Dra. Hj. Sri Rahayu, M.Pd."
  headmasterNip: string; // e.g. "19680512 199412 2 001"
  headmasterSignature?: string; // base64 PNG data URL
  coordinatorName?: string; // e.g. "Muhamad Sulkhi, S.Pd.I." (Pembina Rohis/Admin)
  coordinatorNip?: string; // e.g. "199403112023211010"
  coordinatorSignature?: string; // base64 PNG data URL (Tanda tangan Admin/Pembina)
  kkm: number; // e.g. 75 or 78
  academicYear: string; // e.g. "2026/2027"
  semester: 'Ganjil' | 'Genap';
  printCity: string; // e.g. "Jakarta"
  programTitle: string; // e.g. "Bina Baca Tulis Al-Qur'an (BTQ)"
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'SMP Negeri 102 Jakarta',
  schoolNpsn: '20102557',
  schoolAddress: 'Jl. Cijantung IV, Pasar Rebo, Jakarta Timur',
  headmasterName: 'Dra. Hj. Sri Rahayu, M.Pd.',
  headmasterNip: '19680512 199412 2 001',
  headmasterSignature: '',
  coordinatorName: 'Muhamad Sulkhi, S.Pd.I.',
  coordinatorNip: '199403112023211010',
  coordinatorSignature: '',
  kkm: 75,
  academicYear: '2026/2027',
  semester: 'Ganjil',
  printCity: 'Jakarta',
  programTitle: "Bina Baca Tulis Al-Qur'an (BTQ)",
};

export const LOCAL_STORAGE_SCHOOL_KEY = 'sibtq_school_config';

/**
 * Membaca konfigurasi sekolah secara sinkron dari localStorage (atau fallback default)
 * Berguna saat inisialisasi render lembar rapor tanpa jeda asinkron
 */
export function getStoredSchoolConfig(): SchoolConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SCHOOL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Auto-migrasi jika cache lokal masih menyimpan nama placeholder lama
      if (parsed.coordinatorName === 'H. Ahmad Fauzi, S.Pd.I' || !parsed.coordinatorName) {
        parsed.coordinatorName = 'Muhamad Sulkhi, S.Pd.I.';
      }
      if (parsed.coordinatorNip === '19790415 200801 1 012' || !parsed.coordinatorNip) {
        parsed.coordinatorNip = '199403112023211010';
      }
      return {
        ...DEFAULT_SCHOOL_CONFIG,
        ...parsed,
        kkm: Number(parsed.kkm) || DEFAULT_SCHOOL_CONFIG.kkm,
      };
    }
  } catch (e) {
    console.warn('Gagal membaca school config dari cache', e);
  }
  return DEFAULT_SCHOOL_CONFIG;
}

/**
 * Mengambil konfigurasi sekolah dari Firestore (dengan fallback ke cache & default)
 */
export async function getSchoolConfig(): Promise<SchoolConfig> {
  const cached = getStoredSchoolConfig();

  try {
    const docRef = doc(db, 'settings', 'school_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as Partial<SchoolConfig>;
      // Auto-migrasi data cloud jika dokumen Firestore lama masih memuat nama placeholder
      let hasMigrated = false;
      if (remoteData.coordinatorName === 'H. Ahmad Fauzi, S.Pd.I' || !remoteData.coordinatorName) {
        remoteData.coordinatorName = 'Muhamad Sulkhi, S.Pd.I.';
        hasMigrated = true;
      }
      if (remoteData.coordinatorNip === '19790415 200801 1 012' || !remoteData.coordinatorNip) {
        remoteData.coordinatorNip = '199403112023211010';
        hasMigrated = true;
      }
      
      const merged: SchoolConfig = {
        ...DEFAULT_SCHOOL_CONFIG,
        ...remoteData,
        kkm: Number(remoteData.kkm) || DEFAULT_SCHOOL_CONFIG.kkm,
      };
      
      try {
        localStorage.setItem(LOCAL_STORAGE_SCHOOL_KEY, JSON.stringify(merged));
      } catch {}

      if (hasMigrated) {
        // Tulis balik pembaruan ke Firestore agar permanen
        try {
          await setDoc(docRef, { coordinatorName: merged.coordinatorName, coordinatorNip: merged.coordinatorNip }, { merge: true });
        } catch {}
      }

      return merged;
    } else {
      // Inisialisasi dokumen konfigurasi sekolah di Firestore jika belum ada
      try {
        await setDoc(docRef, DEFAULT_SCHOOL_CONFIG, { merge: true });
      } catch {}
    }
  } catch (err) {
    console.warn('Firestore offline / izin terbatas saat membaca konfigurasi sekolah:', err);
  }

  return cached;
}

/**
 * Berlangganan (real-time listener) ke dokumen settings/school_config di Firestore.
 * Mengembalikan fungsi unsubscribe.
 */
export function subscribeToSchoolConfig(callback: (config: SchoolConfig) => void): () => void {
  const cached = getStoredSchoolConfig();
  callback(cached);

  const docRef = doc(db, 'settings', 'school_config');
  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const remoteData = snap.data() as Partial<SchoolConfig>;
        let hasMigrated = false;
        if (remoteData.coordinatorName === 'H. Ahmad Fauzi, S.Pd.I' || !remoteData.coordinatorName) {
          remoteData.coordinatorName = 'Muhamad Sulkhi, S.Pd.I.';
          hasMigrated = true;
        }
        if (remoteData.coordinatorNip === '19790415 200801 1 012' || !remoteData.coordinatorNip) {
          remoteData.coordinatorNip = '199403112023211010';
          hasMigrated = true;
        }

        const merged: SchoolConfig = {
          ...DEFAULT_SCHOOL_CONFIG,
          ...remoteData,
          kkm: Number(remoteData.kkm) || DEFAULT_SCHOOL_CONFIG.kkm,
        };

        try {
          localStorage.setItem(LOCAL_STORAGE_SCHOOL_KEY, JSON.stringify(merged));
        } catch {}

        if (hasMigrated) {
          setDoc(docRef, { coordinatorName: merged.coordinatorName, coordinatorNip: merged.coordinatorNip }, { merge: true }).catch(() => {});
        }

        callback(merged);
      } else {
        setDoc(docRef, DEFAULT_SCHOOL_CONFIG, { merge: true }).catch(() => {});
        callback(DEFAULT_SCHOOL_CONFIG);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/school_config');
    }
  );

  return unsubscribe;
}

/**
 * Menyimpan konfigurasi sekolah ke Firestore dan localStorage, sekaligus mencatat audit log
 */
export async function saveSchoolConfig(config: SchoolConfig, userEmail?: string): Promise<void> {
  const payload: SchoolConfig = {
    ...config,
    kkm: Number(config.kkm) || 75,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail || 'Administrator',
  };

  // Simpan ke localStorage terlebih dahulu untuk update instan
  try {
    localStorage.setItem(LOCAL_STORAGE_SCHOOL_KEY, JSON.stringify(payload));
    
    // Sinkronkan juga semester dan tahun ajaran ke sibtq_academic_config
    const academicRaw = localStorage.getItem('sibtq_academic_config');
    const academicParsed = academicRaw ? JSON.parse(academicRaw) : {};
    localStorage.setItem(
      'sibtq_academic_config',
      JSON.stringify({
        ...academicParsed,
        academicYear: payload.academicYear,
        semester: payload.semester,
        kkm: payload.kkm,
        headmasterName: payload.headmasterName,
        headmasterNip: payload.headmasterNip,
      })
    );

    // Kirim event browser agar komponen yang sedang terbuka (misal modal rapor) langsung memperbarui tampilannya
    window.dispatchEvent(new CustomEvent('school_config_updated', { detail: payload }));
  } catch (e) {
    console.warn('Gagal menyimpan school config ke localStorage:', e);
  }

  // Simpan ke Firestore
  try {
    const docRef = doc(db, 'settings', 'school_config');
    await setDoc(docRef, payload, { merge: true });

    // Sinkronkan ke dokumen academic_config juga
    try {
      const acadRef = doc(db, 'settings', 'academic_config');
      await setDoc(
        acadRef,
        {
          academicYear: payload.academicYear,
          semester: payload.semester,
          kkm: payload.kkm,
          headmasterName: payload.headmasterName,
          headmasterNip: payload.headmasterNip,
        },
        { merge: true }
      );
    } catch {}

    // Catat Audit Log
    try {
      await addAuditLog({
        actor: userEmail || 'admin.btq@smpn102.sch.id',
        actorRole: 'admin',
        action: 'UPDATE_SCHOOL_SETTINGS',
        category: 'system',
        severity: 'info',
        details: `Pembaruan Konfigurasi Sekolah: KKM=${payload.kkm}, Kepala Sekolah=${payload.headmasterName}, NIP=${payload.headmasterNip}, Semester=${payload.semester} ${payload.academicYear}`,
      });
    } catch {}
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi sekolah ke Firestore:', err);
    throw err;
  }
}

/**
 * Menyimpan profil Admin/Pembina Rohis dan Pejabat Kepala Sekolah sekaligus
 */
export async function saveAdminAndSchoolProfile(params: {
  adminName: string;
  adminNip?: string;
  adminSignature?: string;
  headmasterName: string;
  headmasterNip?: string;
  headmasterSignature?: string;
  userEmail?: string;
}): Promise<void> {
  const current = await getSchoolConfig();
  const updated: SchoolConfig = {
    ...current,
    coordinatorName: params.adminName.trim() || current.coordinatorName,
    coordinatorNip: params.adminNip?.trim() || current.coordinatorNip,
    coordinatorSignature: params.adminSignature !== undefined ? params.adminSignature : current.coordinatorSignature,
    headmasterName: params.headmasterName.trim() || current.headmasterName,
    headmasterNip: params.headmasterNip?.trim() || current.headmasterNip,
    headmasterSignature: params.headmasterSignature !== undefined ? params.headmasterSignature : current.headmasterSignature,
    updatedAt: new Date().toISOString(),
    updatedBy: params.userEmail || 'Administrator',
  };

  // Simpan ke konfigurasi sekolah
  await saveSchoolConfig(updated, params.userEmail);

  // Simpan profil admin ke dokumen users
  try {
    const adminUserRef = doc(db, 'users', 'admin_profile');
    await setDoc(adminUserRef, {
      name: updated.coordinatorName,
      nip: updated.coordinatorNip,
      signature: updated.coordinatorSignature,
      role: 'admin',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Gagal sinkronisasi admin_profile ke users:', e);
  }

  // Dispatch event agar antarmuka realtime ter-update
  window.dispatchEvent(new CustomEvent('user_profile_updated', { 
    detail: { 
      role: 'admin', 
      name: updated.coordinatorName,
      nip: updated.coordinatorNip,
      signature: updated.coordinatorSignature
    } 
  }));
}

