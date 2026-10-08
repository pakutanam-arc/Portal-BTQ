/**
 * Stale-While-Revalidate (SWR) Local Cache Service
 * 
 * Provides a two-tiered caching mechanism (Memory L1 + LocalStorage L2) with:
 * 1. Time-To-Live (TTL) configuration:
 *    - Static Master Data (Santri, Kelompok, Mentor): 20 menit (rentang 15-30 menit)
 *    - Dynamic / Transactional Data (Presensi, Capaian, Jurnal): 3 menit
 * 2. Stale-While-Revalidate (SWR):
 *    - Jika data masih Fresh (< TTL): kembalikan langsung dari cache (0ms, tanpa read Firebase).
 *    - Jika data sudah Stale (>= TTL): kembalikan data stale langsung (0ms UX) dan jalankan
 *      revalidasi di latar belakang (background revalidation) untuk memperbarui cache.
 * 3. In-flight request deduplication (mencegah pembacaan Firebase ganda saat banyak komponen mount bersamaan).
 * 4. Safe LocalStorage persistence dengan auto-eviction saat kuota penuh.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export interface SwrOptions<T = any> {
  freshTtlMs?: number;
  maxStaleTtlMs?: number;
  forceFresh?: boolean;
  onRevalidated?: (freshData: T) => void;
}

// TTL Constants
export const STATIC_CACHE_TTL_MS = 20 * 60 * 1000; // 20 Menit untuk data statis santri, kelompok, mentor
export const DYNAMIC_CACHE_TTL_MS = 3 * 60 * 1000;  // 3 Menit untuk data presensi, capaian, jurnal
export const MAX_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Hari (fallback offline / instant render)

const STORAGE_PREFIX = 'sibtq_swr_v1_';

// Level 1: In-Memory Cache Map
const MEM_CACHE = new Map<string, CacheEntry<any>>();

// In-Flight Promise Map to deduplicate concurrent requests
const IN_FLIGHT_REQUESTS = new Map<string, Promise<any>>();

/**
 * Menentukan default TTL berdasarkan kategori key
 */
export function getDefaultFreshTtl(key: string): number {
  if (
    key.startsWith('students') ||
    key.startsWith('groups') ||
    key.startsWith('mentors') ||
    key.startsWith('total_students') ||
    key.startsWith('curriculum')
  ) {
    return STATIC_CACHE_TTL_MS; // 20 menit untuk data statis master
  }
  return DYNAMIC_CACHE_TTL_MS; // 3 menit untuk data dinamis
}

/**
 * Membaca entri dari LocalStorage (Level 2)
 */
function readFromLocalStorage<T>(key: string): CacheEntry<T> | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.timestamp === 'number' && parsed.data !== undefined) {
      return parsed as CacheEntry<T>;
    }
  } catch (err) {
    console.warn(`[CacheService] Gagal membaca key '${key}' dari LocalStorage:`, err);
  }
  return null;
}

/**
 * Menyimpan entri ke LocalStorage (Level 2) dengan penanganan kuota
 */
function writeToLocalStorage<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const storageKey = STORAGE_PREFIX + key;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch (err: any) {
    // Jika quota penuh (QuotaExceededError), bersihkan entri cache tertua
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn(`[CacheService] LocalStorage kuota penuh. Membersihkan cache lama...`);
      evictOldestCacheEntries();
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(entry));
      } catch {
        // Abaikan jika tetap gagal
      }
    }
  }
}

/**
 * Membersihkan 20% cache lokal tertua saat storage penuh
 */
function evictOldestCacheEntries(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const entries: { key: string; timestamp: number }[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        try {
          const item = JSON.parse(window.localStorage.getItem(k) || '{}');
          entries.push({ key: k, timestamp: item.timestamp || 0 });
        } catch {
          entries.push({ key: k, timestamp: 0 });
        }
      }
    }
    // Urutkan dari yang paling tua
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const removeCount = Math.max(1, Math.ceil(entries.length * 0.25));
    for (let i = 0; i < removeCount; i++) {
      window.localStorage.removeItem(entries[i].key);
    }
  } catch (e) {
    console.warn('[CacheService] Gagal melakukan pembersihan cache tertua:', e);
  }
}

/**
 * Mengambil status entri cache
 */
export function getCacheEntry<T>(key: string): {
  entry: CacheEntry<T> | null;
  isFresh: boolean;
  isStale: boolean;
  ageMs: number;
} {
  // 1. Cek Memory Cache (L1)
  let entry = MEM_CACHE.get(key) as CacheEntry<T> | undefined;

  // 2. Jika tidak ada di L1, cek LocalStorage (L2)
  if (!entry) {
    const stored = readFromLocalStorage<T>(key);
    if (stored) {
      entry = stored;
      MEM_CACHE.set(key, stored); // Hangatkan L1
    }
  }

  if (!entry) {
    return { entry: null, isFresh: false, isStale: false, ageMs: 0 };
  }

  const ageMs = Date.now() - entry.timestamp;
  const ttlMs = entry.ttlMs || getDefaultFreshTtl(key);
  const isFresh = ageMs < ttlMs;
  const isStale = ageMs >= ttlMs && ageMs < MAX_STALE_TTL_MS;

  return { entry, isFresh, isStale, ageMs };
}

/**
 * Mendapatkan data yang dicache secara sinkron.
 * @param key Cache key
 * @param allowStale Jika true, kembalikan data meski sudah stale. Jika false, hanya kembalikan data fresh.
 */
export function getCached<T>(key: string, allowStale = false): T | null {
  const { entry, isFresh, isStale } = getCacheEntry<T>(key);
  if (!entry) return null;
  if (isFresh || (allowStale && isStale)) {
    return entry.data;
  }
  return null;
}

/**
 * Menyimpan data ke Memory Cache (L1) dan LocalStorage (L2)
 */
export function setCached<T>(key: string, data: T, customTtlMs?: number): void {
  const ttlMs = customTtlMs || getDefaultFreshTtl(key);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttlMs
  };
  // Simpan di Memory
  MEM_CACHE.set(key, entry);
  // Simpan di LocalStorage
  writeToLocalStorage(key, entry);
}

/**
 * Menghapus cache berdasarkan prefix atau menghapus seluruh cache jika tanpa prefix
 */
export function invalidateDbCache(keyPrefix?: string): void {
  // 1. Invalidate Memory Cache
  if (!keyPrefix) {
    MEM_CACHE.clear();
  } else {
    for (const key of Array.from(MEM_CACHE.keys())) {
      if (key.startsWith(keyPrefix)) {
        MEM_CACHE.delete(key);
      }
    }
  }

  // 2. Invalidate LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (!keyPrefix) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      } else {
        const fullPrefix = STORAGE_PREFIX + keyPrefix;
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(fullPrefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      }
    } catch (e) {
      console.warn('[CacheService] Gagal menghapus cache dari LocalStorage:', e);
    }
  }

  // 3. Emit event agar komponen yang sedang aktif mengetahui perubahan
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('db-cache-invalidated', {
      detail: { keyPrefix, timestamp: Date.now() }
    }));
  }
}

/**
 * Memicu revalidasi data di latar belakang tanpa memblokir thread UI
 */
function triggerBackgroundRevalidation<T>(
  key: string,
  fetcher: () => Promise<T>,
  freshTtlMs: number,
  onRevalidated?: (freshData: T) => void
): void {
  // Jika sudah ada request yang sedang berjalan untuk key ini, jangan duplikasi
  if (IN_FLIGHT_REQUESTS.has(key)) {
    return;
  }

  const promise = (async () => {
    try {
      const freshData = await fetcher();
      setCached(key, freshData, freshTtlMs);

      // Callback jika disediakan
      if (onRevalidated) {
        try {
          onRevalidated(freshData);
        } catch (cbErr) {
          console.error('[CacheService] Error pada onRevalidated callback:', cbErr);
        }
      }

      // Beritahu sistem bahwa cache telah direvalidasi
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db-cache-revalidated', {
          detail: { key, timestamp: Date.now(), data: freshData }
        }));
      }

      return freshData;
    } catch (error) {
      console.warn(`[CacheService] Revalidasi latar belakang untuk '${key}' gagal:`, error);
    } finally {
      IN_FLIGHT_REQUESTS.delete(key);
    }
  })();

  IN_FLIGHT_REQUESTS.set(key, promise);
}

/**
 * Core SWR Fetcher:
 * 
 * 1. Jika forceFresh: jalankan fetcher langsung & update cache.
 * 2. Cek Cache (L1/L2):
 *    - JIKA FRESH: kembalikan langsung (0ms, 0 read Firebase).
 *    - JIKA STALE: kembalikan langsung data stale (0ms render), dan picu revalidasi di latar belakang!
 * 3. JIKA TIDAK ADA: jalankan fetcher (dengan deduplikasi in-flight), simpan ke cache, dan kembalikan.
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: SwrOptions<T>
): Promise<T> {
  const freshTtlMs = options?.freshTtlMs ?? getDefaultFreshTtl(key);

  // Jika dipaksa fresh, lewati cache
  if (options?.forceFresh) {
    // Cek apakah sudah ada request in-flight yang sama
    const inFlight = IN_FLIGHT_REQUESTS.get(key);
    if (inFlight) {
      return inFlight;
    }
    const freshPromise = (async () => {
      try {
        const freshData = await fetcher();
        setCached(key, freshData, freshTtlMs);
        return freshData;
      } finally {
        IN_FLIGHT_REQUESTS.delete(key);
      }
    })();
    IN_FLIGHT_REQUESTS.set(key, freshPromise);
    return freshPromise;
  }

  // Periksa entri di L1 / L2
  const { entry, isFresh, isStale } = getCacheEntry<T>(key);

  if (entry) {
    if (isFresh) {
      // Data masih sangat baru (< 20 menit untuk santri/kelompok/mentor).
      return entry.data;
    }

    if (isStale) {
      // Data kadaluarsa (>= 20 menit), TERAPKAN STALE-WHILE-REVALIDATE:
      // Kembalikan data stale segera agar UI instan tanpa loading screen
      triggerBackgroundRevalidation(key, fetcher, freshTtlMs, options?.onRevalidated);
      return entry.data;
    }

    // Jika melebihi MAX_STALE_TTL_MS, kembalikan data yang ada sembari revalidasi
    triggerBackgroundRevalidation(key, fetcher, freshTtlMs, options?.onRevalidated);
    return entry.data;
  }

  // Belum pernah dicache sama sekali: jalankan fetcher dengan deduplikasi
  const existingInFlight = IN_FLIGHT_REQUESTS.get(key);
  if (existingInFlight) {
    return existingInFlight;
  }

  const initialPromise = (async () => {
    try {
      const data = await fetcher();
      setCached(key, data, freshTtlMs);
      return data;
    } finally {
      IN_FLIGHT_REQUESTS.delete(key);
    }
  })();

  IN_FLIGHT_REQUESTS.set(key, initialPromise);
  return initialPromise;
}
