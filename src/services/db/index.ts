// Sub-module exports for Database Service Architecture
export * from './types';
export * from './initialData';
export * from './groups';
export * from './students';
export * from './attendance';
export * from './progress';
export * from './journals';
export * from './certifications';
export * from './notifications';
export * from './auditLogs';
export * from './mentors';
export * from './calendar';
export {
  invalidateDbCache,
  getCached,
  setCached,
  fetchWithSWR,
  STATIC_CACHE_TTL_MS,
  DYNAMIC_CACHE_TTL_MS,
} from '../cacheService';
