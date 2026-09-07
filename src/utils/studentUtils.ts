export const PUBLIC_DOMAIN = 'https://portal-btq.netlify.app';

/**
 * Generates the public-facing URL for a student's ID card/profile.
 * This ensures QR codes always point to the accessible netlify deployment.
 */
export function getPublicStudentUrl(studentId: string): string {
  return `https://portal-btq.netlify.app/#/student/card/${studentId}`;
}