export const DEFAULT_PUBLIC_DOMAIN = 'https://portal-btq.netlify.app';

/**
 * Generates the public-facing URL for a student's ID card/profile.
 * Prioritizes the active live window origin so QR codes scanned by mobile phones
 * open the exact accessible deployment immediately without requiring login.
 */
export function getPublicStudentUrl(studentId: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const customDomain = localStorage.getItem('sibtq_custom_public_domain');
      if (customDomain && customDomain.trim()) {
        const clean = customDomain.trim().replace(/\/+$/, '');
        return `${clean}/#/student/card/${studentId}`;
      }
    } catch {}
    return `${window.location.origin}/#/student/card/${studentId}`;
  }
  return `${DEFAULT_PUBLIC_DOMAIN}/#/student/card/${studentId}`;
}

export const PUBLIC_DOMAIN = typeof window !== 'undefined' && window.location?.origin 
  ? window.location.origin 
  : DEFAULT_PUBLIC_DOMAIN;

export interface StudentLike {
  name?: string;
  fullName?: string;
  className?: string;
  class?: string;
  grade?: string;
  gradeName?: string;
  groupName?: string;
  [key: string]: any;
}

export interface ClassComponents {
  gradeNumber: number;
  section: string;
  rawClass: string;
}

/**
 * Extracts numeric grade number (7, 8, 9) and section letter (A, B, C) from class names.
 * Handles formats like "7A", "Kelas 8B", "9 C", "VIII A".
 */
export function extractClassComponents(className?: string): ClassComponents {
  if (!className) return { gradeNumber: 999, section: '', rawClass: '' };
  const str = className.trim();
  
  const normalized = str
    .replace(/\bVII\b/gi, '7')
    .replace(/\bVIII\b/gi, '8')
    .replace(/\bIX\b/gi, '9')
    .replace(/\bVI\b/gi, '6');
    
  const match = normalized.match(/(\d+)\s*([a-zA-Z]*)/);
  if (match) {
    return {
      gradeNumber: parseInt(match[1], 10),
      section: (match[2] || '').toUpperCase(),
      rawClass: str
    };
  }
  return { gradeNumber: 999, section: str.toUpperCase(), rawClass: str };
}

/**
 * Compares two student objects naturally:
 * 1. Numeric grade number (7 < 8 < 9)
 * 2. Class section letter (A < B < C)
 * 3. Raw class string
 * 4. Student Name (A-Z)
 */
export function compareStudentsByClassAndName(a: StudentLike, b: StudentLike): number {
  const classAStr = a.className || a.class || a.gradeName || a.grade || a.groupName || '';
  const classBStr = b.className || b.class || b.gradeName || b.grade || b.groupName || '';

  const classA = extractClassComponents(classAStr);
  const classB = extractClassComponents(classBStr);

  if (classA.gradeNumber !== classB.gradeNumber) {
    return classA.gradeNumber - classB.gradeNumber;
  }

  const sectionCmp = classA.section.localeCompare(classB.section, 'id');
  if (sectionCmp !== 0) return sectionCmp;

  const rawClassCmp = classAStr.localeCompare(classBStr, 'id');
  if (rawClassCmp !== 0) return rawClassCmp;

  const nameA = (a.name || a.fullName || '').trim();
  const nameB = (b.name || b.fullName || '').trim();
  return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
}

/**
 * Returns a new array sorted by class grade, section, and student name.
 */
export function sortStudents<T extends StudentLike>(students: T[]): T[] {
  return [...students].sort(compareStudentsByClassAndName);
}

