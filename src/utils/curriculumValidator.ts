import { getGroups, getTeachingJournals, Group, TeachingJournal } from '../services/db';
import { masterGrades, masterSessions, getGradeForGroup, CurriculumSession } from '../services/curriculumData';

export type IssueType = 
  | 'skipped_meeting'    // Pertemuan terlewat dalam urutan (misal: Sesi 1 & 3 terisi, tapi Sesi 2 terlewati)
  | 'tahap_mismatch'     // Ketidaksesuaian topik/tahap kurikulum dengan master grade
  | 'duplicate_meeting'  // Pertemuan ganda tercatat untuk kelompok yang sama
  | 'out_of_range';      // Nomor pertemuan di luar kisaran 1-32

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface CurriculumValidationIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  groupId: string;
  groupName: string;
  gradeName: string;
  meetingNumber: number;
  title: string;
  description: string;
  recommendation: string;
}

export interface CurriculumValidationReport {
  timestamp: string;
  totalGroupsChecked: number;
  totalJournalsChecked: number;
  hasIssues: boolean;
  errorCount: number;
  warningCount: number;
  issues: CurriculumValidationIssue[];
}

// In-memory cache for validation report
let cachedReportMap: Map<string, { report: CurriculumValidationReport; timestamp: number }> = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds cache

export function clearValidationCache() {
  cachedReportMap.clear();
}

/**
 * Utility function to validate consistency between 'Pertemuan Ke-' in Teaching Sessions
 * and 'Tahap' in Curriculum (32 Tahap per Grade).
 */
export async function validateCurriculumConsistency(
  targetGroupId?: string, 
  forceRefresh: boolean = false
): Promise<CurriculumValidationReport> {
  const cacheKey = targetGroupId || 'all';
  const now = Date.now();

  if (!forceRefresh && cachedReportMap.has(cacheKey)) {
    const cached = cachedReportMap.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.report;
    }
  }

  const groups = await getGroups();
  const { data: allJournals } = await getTeachingJournals(undefined, 300);
  
  const filteredGroups = targetGroupId && targetGroupId !== 'all' 
    ? groups.filter(g => g.id === targetGroupId) 
    : groups;

  const issues: CurriculumValidationIssue[] = [];

  for (const group of filteredGroups) {
    const grade = getGradeForGroup(group);
    const groupJournals = allJournals.filter(j => j.groupId === group.id);
    
    // Extract valid logged meeting numbers
    const loggedMeetings = groupJournals
      .map(j => j.meetingNumber)
      .filter((m): m is number => typeof m === 'number' && m > 0);

    const sortedMeetings = Array.from(new Set(loggedMeetings)).sort((a, b) => a - b);

    // 1. Detect Skipped Meetings (Gap Analysis)
    if (sortedMeetings.length > 0) {
      const maxMeeting = Math.max(...sortedMeetings);
      for (let m = 1; m < maxMeeting; m++) {
        if (!sortedMeetings.includes(m)) {
          issues.push({
            id: `issue_skipped_${group.id}_m${m}`,
            type: 'skipped_meeting',
            severity: 'warning',
            groupId: group.id,
            groupName: group.name,
            gradeName: grade.name,
            meetingNumber: m,
            title: `Pertemuan Ke-${m} Terlewat / Belum Diisi`,
            description: `${group.name} telah mencatatkan Pertemuan Ke-${maxMeeting}, tetapi Pertemuan Ke-${m} terlewati tanpa rekam Sesi Mengajar/Jurnal.`,
            recommendation: `Isi Jurnal Mengajar dan Absensi untuk Pertemuan Ke-${m} agar tahapan kurikulum ${grade.name} berurutan.`
          });
        }
      }
    }

    // 2. Detect Duplicate Entries for Same Meeting Number
    const meetingMap: Record<number, TeachingJournal[]> = {};
    for (const journal of groupJournals) {
      if (journal.meetingNumber) {
        meetingMap[journal.meetingNumber] = meetingMap[journal.meetingNumber] || [];
        meetingMap[journal.meetingNumber].push(journal);
      }
    }

    for (const [mStr, journals] of Object.entries(meetingMap)) {
      const mNum = parseInt(mStr, 10);
      if (journals.length > 1) {
        issues.push({
          id: `issue_dup_${group.id}_m${mNum}`,
          type: 'duplicate_meeting',
          severity: 'error',
          groupId: group.id,
          groupName: group.name,
          gradeName: grade.name,
          meetingNumber: mNum,
          title: `Duplikasi Jurnal pada Pertemuan Ke-${mNum}`,
          description: `Terdapat ${journals.length} entri jurnal terpisah untuk Pertemuan Ke-${mNum} pada ${group.name}.`,
          recommendation: `Periksa dan hapus/gabungkan entri jurnal ganda pada Pertemuan Ke-${mNum} agar laporan tidak tumpang tindih.`
        });
      }
    }

    // 3. Detect Out-of-Range Meeting Numbers (> 32 or < 1)
    for (const journal of groupJournals) {
      if (journal.meetingNumber && (journal.meetingNumber < 1 || journal.meetingNumber > 32)) {
        issues.push({
          id: `issue_range_${journal.id}`,
          type: 'out_of_range',
          severity: 'error',
          groupId: group.id,
          groupName: group.name,
          gradeName: grade.name,
          meetingNumber: journal.meetingNumber,
          title: `Nomor Pertemuan Ke-${journal.meetingNumber} Di Luar Rentang Kurikulum`,
          description: `Struktur kurikulum BTQ SMPN 102 dirancang untuk 32 Tahap (16 Sesi/Semester). Pertemuan Ke-${journal.meetingNumber} tidak valid.`,
          recommendation: `Ubah nomor pertemuan menjadi di antara Pertemuan Ke-1 hingga Ke-32.`
        });
      }
    }

    // 4. Detect Mismatch with Master Curriculum Topic/Session ID
    for (const journal of groupJournals) {
      if (!journal.meetingNumber) continue;

      const expectedSession = masterSessions.find(
        s => s.gradeId === grade.id && s.sessionNumber === journal.meetingNumber
      );

      if (expectedSession) {
        // If sessionId specifies a different session number than meetingNumber
        if (journal.sessionId && journal.sessionId.includes('s') && !journal.sessionId.includes(`s${journal.meetingNumber}`) && !journal.sessionId.includes(`session_${journal.meetingNumber}`)) {
          issues.push({
            id: `issue_mismatch_${journal.id}`,
            type: 'tahap_mismatch',
            severity: 'warning',
            groupId: group.id,
            groupName: group.name,
            gradeName: grade.name,
            meetingNumber: journal.meetingNumber,
            title: `Ketidaksesuaian ID Tahap dengan Master (${grade.name})`,
            description: `Pertemuan Ke-${journal.meetingNumber} menggunakan ID Sesi "${journal.sessionId}", tetapi materi kurikulum mewajibkan Tahap ${expectedSession.sessionNumber}: "${expectedSession.topic}".`,
            recommendation: `Buka Sesi Mengajar dan pilih Tahap Kurikulum yang sesuai dengan Pertemuan Ke-${journal.meetingNumber}.`
          });
        }
      }
    }
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  const report: CurriculumValidationReport = {
    timestamp: new Date().toISOString(),
    totalGroupsChecked: filteredGroups.length,
    totalJournalsChecked: allJournals.length,
    hasIssues: issues.length > 0,
    errorCount,
    warningCount,
    issues
  };

  cachedReportMap.set(cacheKey, { report, timestamp: now });

  return report;
}
