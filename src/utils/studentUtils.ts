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
