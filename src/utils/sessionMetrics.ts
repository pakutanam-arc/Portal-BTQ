export interface AttendanceEntry {
  status: string;
  notes?: string;
}

export interface ProgressEntry {
  reading?: number;
  tajwid?: number;
  writing?: number;
  memorization?: number;
  memorizedSurah?: string;
  ayatRange?: string;
  notes?: string;
  total?: number;
}

export interface LiveSessionMetrics {
  totalStudents: number;
  hadirCount: number;
  izinCount: number;
  sakitCount: number;
  alpaCount: number;
  presentRatePercent: number;
  scoredPresentCount: number;
  unscoredPresentCount: number;
  scoringProgressPercent: number;
  averageClassScore: number;
}

/**
 * Calculates a student's average score across active positive components (reading, tajwid, writing, memorization).
 */
export function calculateStudentTotalScore(progress: ProgressEntry): number {
  const r = typeof progress.reading === 'number' ? progress.reading : parseInt(String(progress.reading || 0), 10) || 0;
  const t = typeof progress.tajwid === 'number' ? progress.tajwid : parseInt(String(progress.tajwid || 0), 10) || 0;
  const w = typeof progress.writing === 'number' ? progress.writing : parseInt(String(progress.writing || 0), 10) || 0;
  const m = typeof progress.memorization === 'number' ? progress.memorization : parseInt(String(progress.memorization || 0), 10) || 0;

  const scores: number[] = [];
  if (r > 0) scores.push(r);
  if (t > 0) scores.push(t);
  if (w > 0) scores.push(w);
  if (m > 0) scores.push(m);

  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length);
}

/**
 * Computes real-time KPI statistics for LiveSession based on current students, attendance map, and progress map.
 */
export function computeLiveSessionMetrics(
  studentIds: string[],
  attendance: Record<string, AttendanceEntry | undefined>,
  progress: Record<string, ProgressEntry | undefined>
): LiveSessionMetrics {
  const totalStudents = studentIds.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      hadirCount: 0,
      izinCount: 0,
      sakitCount: 0,
      alpaCount: 0,
      presentRatePercent: 0,
      scoredPresentCount: 0,
      unscoredPresentCount: 0,
      scoringProgressPercent: 0,
      averageClassScore: 0,
    };
  }

  let hadirCount = 0;
  let izinCount = 0;
  let sakitCount = 0;
  let alpaCount = 0;
  let scoredPresentCount = 0;
  let totalScoreSum = 0;

  for (const id of studentIds) {
    const status = attendance[id]?.status || 'Alpa';
    if (status === 'Hadir') {
      hadirCount++;
      const p = progress[id] || {};
      const total = typeof p.total === 'number' && p.total > 0 ? p.total : calculateStudentTotalScore(p);
      if (total > 0) {
        scoredPresentCount++;
        totalScoreSum += total;
      }
    } else if (status === 'Izin') {
      izinCount++;
    } else if (status === 'Sakit') {
      sakitCount++;
    } else {
      alpaCount++;
    }
  }

  const presentRatePercent = Math.round((hadirCount / totalStudents) * 100);
  const unscoredPresentCount = Math.max(0, hadirCount - scoredPresentCount);
  const scoringProgressPercent = hadirCount > 0 ? Math.round((scoredPresentCount / hadirCount) * 100) : 0;
  const averageClassScore = scoredPresentCount > 0 ? Math.round(totalScoreSum / scoredPresentCount) : 0;

  return {
    totalStudents,
    hadirCount,
    izinCount,
    sakitCount,
    alpaCount,
    presentRatePercent,
    scoredPresentCount,
    unscoredPresentCount,
    scoringProgressPercent,
    averageClassScore,
  };
}

export interface PriorityStudentSummary {
  id: string;
  name: string;
  className: string;
  reason: string;
  severity: 'high' | 'medium';
  progressScore: number;
  attendanceRate: number;
  trendDiff: number;
}

/**
 * Identifies priority students needing mentor attention based on low scores, negative trends, or low attendance.
 */
export function selectPriorityStudents(
  students: Array<{
    id: string;
    name: string;
    class: string;
    progressScore: number;
    attendanceRate: number;
    trend: 'Meningkat' | 'Menurun' | 'Konsisten';
    trendDiff: number;
    sessionHistory?: Array<any>;
    attendanceHistory?: Array<any>;
  }>,
  limit = 4
): PriorityStudentSummary[] {
  const candidates: PriorityStudentSummary[] = [];

  for (const s of students) {
    const hasProg = (s.sessionHistory?.length || 0) > 0;
    const hasAtt = (s.attendanceHistory?.length || 0) > 0;

    if (hasProg && s.progressScore > 0 && s.progressScore < 75) {
      candidates.push({
        id: s.id,
        name: s.name,
        className: s.class,
        reason: `Skor di bawah target (${s.progressScore})`,
        severity: 'high',
        progressScore: s.progressScore,
        attendanceRate: s.attendanceRate,
        trendDiff: s.trendDiff,
      });
    } else if (hasProg && s.trend === 'Menurun' && s.trendDiff < 0) {
      candidates.push({
        id: s.id,
        name: s.name,
        className: s.class,
        reason: `Nilai turun ${Math.abs(s.trendDiff)} poin`,
        severity: s.trendDiff <= -5 ? 'high' : 'medium',
        progressScore: s.progressScore,
        attendanceRate: s.attendanceRate,
        trendDiff: s.trendDiff,
      });
    } else if (hasAtt && s.attendanceRate < 75) {
      candidates.push({
        id: s.id,
        name: s.name,
        className: s.class,
        reason: `Kehadiran rendah (${s.attendanceRate}%)`,
        severity: s.attendanceRate <= 50 ? 'high' : 'medium',
        progressScore: s.progressScore,
        attendanceRate: s.attendanceRate,
        trendDiff: s.trendDiff,
      });
    }
  }

  return candidates
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
      return a.progressScore - b.progressScore;
    })
    .slice(0, limit);
}

export const MIN_PROGRESS_SCORE_STANDARD = 75;
export const MIN_ATTENDANCE_RATE_STANDARD = 75;

export function calculateAverageSessionScore(sessionTotals: number[]): number {
  const valid = sessionTotals.filter(t => typeof t === 'number' && t > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((sum, val) => sum + val, 0) / valid.length);
}

export interface ExamReadinessEvaluation {
  averageScore: number;
  attendanceRate: number;
  hasScoreData: boolean;
  hasAttendanceData: boolean;
  meetsScoreStandard: boolean;
  meetsAttendanceStandard: boolean;
  isExamReady: boolean;
  needsGuidance: boolean;
  readinessLabel: 'Siap Ujian' | 'Proses Pembinaan' | 'Perlu Pendampingan';
}

/**
 * Evaluates a student's exam readiness ("Siap Ujian") based on BOTH:
 * 1) Average progress score across meetings >= MIN_PROGRESS_SCORE_STANDARD (75)
 * 2) Attendance rate across meetings >= MIN_ATTENDANCE_RATE_STANDARD (75%)
 */
export function evaluateStudentExamReadiness(params: {
  sessionTotals: number[];
  attendanceStatuses: string[];
  minScoreStandard?: number;
  minAttendanceStandard?: number;
}): ExamReadinessEvaluation {
  const minScore = params.minScoreStandard ?? MIN_PROGRESS_SCORE_STANDARD;
  const minAtt = params.minAttendanceStandard ?? MIN_ATTENDANCE_RATE_STANDARD;

  const validTotals = params.sessionTotals.filter(t => typeof t === 'number' && t > 0);
  const hasScoreData = validTotals.length > 0;
  const averageScore = calculateAverageSessionScore(validTotals);

  const hasAttendanceData = params.attendanceStatuses.length > 0;
  const hadirCount = params.attendanceStatuses.filter(s => s === 'Hadir').length;
  const attendanceRate = hasAttendanceData
    ? Math.round((hadirCount / params.attendanceStatuses.length) * 100)
    : 0;

  const meetsScoreStandard = hasScoreData && averageScore >= minScore;
  const meetsAttendanceStandard = hasAttendanceData && attendanceRate >= minAtt;

  // Student is only Siap Ujian if BOTH average score and attendance meet or exceed the minimum standard
  const isExamReady = meetsScoreStandard && meetsAttendanceStandard;

  const needsGuidance =
    (hasScoreData && averageScore < minScore) ||
    (hasAttendanceData && attendanceRate < minAtt);

  const readinessLabel: 'Siap Ujian' | 'Proses Pembinaan' | 'Perlu Pendampingan' = isExamReady
    ? 'Siap Ujian'
    : needsGuidance
    ? 'Perlu Pendampingan'
    : 'Proses Pembinaan';

  return {
    averageScore,
    attendanceRate,
    hasScoreData,
    hasAttendanceData,
    meetsScoreStandard,
    meetsAttendanceStandard,
    isExamReady,
    needsGuidance,
    readinessLabel,
  };
}

export interface InstitutionExamReadinessSummary {
  activeStudentsCount: number;
  examReadyCount: number;
  needsGuidanceCount: number;
  inProgressCount: number;
  examReadyRatePercent: number;
}

/**
 * Evaluates school-wide exam readiness across all active students using BOTH average progress score >= 75 and attendance rate >= 75%.
 */
export function computeInstitutionExamReadiness(
  students: Array<{ id: string; status?: string }>,
  progressRecords: Array<{ studentId?: string; total?: number }>,
  attendanceRecords: Array<{ studentId?: string; status?: string }>
): InstitutionExamReadinessSummary {
  const activeStudents = students.filter(s => s.status !== 'Nonaktif');
  const activeStudentsCount = activeStudents.length;

  if (activeStudentsCount === 0) {
    return {
      activeStudentsCount: 0,
      examReadyCount: 0,
      needsGuidanceCount: 0,
      inProgressCount: 0,
      examReadyRatePercent: 0,
    };
  }

  const progMap = new Map<string, number[]>();
  progressRecords.forEach(p => {
    if (!p.studentId) return;
    if (typeof p.total === 'number' && p.total > 0) {
      const list = progMap.get(p.studentId) || [];
      list.push(p.total);
      progMap.set(p.studentId, list);
    }
  });

  const attMap = new Map<string, string[]>();
  attendanceRecords.forEach(a => {
    if (!a.studentId || !a.status) return;
    const list = attMap.get(a.studentId) || [];
    list.push(a.status);
    attMap.set(a.studentId, list);
  });

  let examReadyCount = 0;
  let needsGuidanceCount = 0;
  let inProgressCount = 0;

  activeStudents.forEach(s => {
    const evalRes = evaluateStudentExamReadiness({
      sessionTotals: progMap.get(s.id) || [],
      attendanceStatuses: attMap.get(s.id) || [],
    });
    if (evalRes.isExamReady) {
      examReadyCount++;
    } else if (evalRes.needsGuidance) {
      needsGuidanceCount++;
    } else {
      inProgressCount++;
    }
  });

  const examReadyRatePercent = Math.round((examReadyCount / activeStudentsCount) * 100);

  return {
    activeStudentsCount,
    examReadyCount,
    needsGuidanceCount,
    inProgressCount,
    examReadyRatePercent,
  };
}

export interface GroupMeetingComplianceItem {
  groupId: string;
  groupName: string;
  mentorName: string;
  hasAttendance: boolean;
  hasProgress: boolean;
  hasJournal: boolean;
  completedSteps: number;
  isComplete: boolean;
  statusLabel: 'Selesai Lengkap' | 'Sebagian' | 'Belum Input';
}

export interface InstitutionMeetingComplianceSummary {
  meetingNumber: number;
  totalGroups: number;
  completedGroupsCount: number;
  partialGroupsCount: number;
  unrecordedGroupsCount: number;
  compliancePercent: number;
  items: GroupMeetingComplianceItem[];
}

function normalizeGId(gid?: string): string {
  if (!gid) return '';
  const num = gid.trim().replace(/^group_/, '').replace(/^g/, '');
  return `g${num}`;
}

/**
 * Evaluates each BTQ group's teaching session completion (Attendance + Score + Journal) for a target meeting number.
 */
export function evaluateGroupMeetingCompliance(params: {
  meetingNumber: number;
  groups: Array<{ id: string; name: string; mentorName: string }>;
  attendanceRecords: Array<{ groupId?: string; meetingNumber?: number }>;
  progressRecords: Array<{ groupId?: string; meetingNumber?: number; sessionId?: string; total?: number }>;
  journalRecords: Array<{ groupId?: string; meetingNumber?: number }>;
}): InstitutionMeetingComplianceSummary {
  const { meetingNumber, groups, attendanceRecords, progressRecords, journalRecords } = params;

  const attGroups = new Set<string>();
  attendanceRecords.forEach(a => {
    if (a.meetingNumber === meetingNumber && a.groupId) {
      attGroups.add(normalizeGId(a.groupId));
    }
  });

  const progGroups = new Set<string>();
  progressRecords.forEach(p => {
    let mNum = p.meetingNumber || 0;
    if (!mNum && p.sessionId) {
      const match = p.sessionId.match(/(?:s|session_?)(\d+)/i) || p.sessionId.match(/(\d+)$/);
      if (match) mNum = parseInt(match[1] || match[0], 10);
    }
    if (mNum === meetingNumber && p.groupId && typeof p.total === 'number' && p.total > 0) {
      progGroups.add(normalizeGId(p.groupId));
    }
  });

  const journalGroups = new Set<string>();
  journalRecords.forEach(j => {
    if (j.meetingNumber === meetingNumber && j.groupId) {
      journalGroups.add(normalizeGId(j.groupId));
    }
  });

  let completedGroupsCount = 0;
  let partialGroupsCount = 0;
  let unrecordedGroupsCount = 0;

  const items: GroupMeetingComplianceItem[] = groups.map(g => {
    const gNorm = normalizeGId(g.id);
    const hasAttendance = attGroups.has(gNorm);
    const hasProgress = progGroups.has(gNorm);
    const hasJournal = journalGroups.has(gNorm);
    const completedSteps = (hasAttendance ? 1 : 0) + (hasProgress ? 1 : 0) + (hasJournal ? 1 : 0);
    const isComplete = completedSteps === 3;

    let statusLabel: 'Selesai Lengkap' | 'Sebagian' | 'Belum Input' = 'Belum Input';
    if (isComplete) {
      statusLabel = 'Selesai Lengkap';
      completedGroupsCount++;
    } else if (completedSteps > 0) {
      statusLabel = 'Sebagian';
      partialGroupsCount++;
    } else {
      unrecordedGroupsCount++;
    }

    return {
      groupId: g.id,
      groupName: g.name,
      mentorName: g.mentorName,
      hasAttendance,
      hasProgress,
      hasJournal,
      completedSteps,
      isComplete,
      statusLabel,
    };
  });

  const totalGroups = groups.length;
  const compliancePercent = totalGroups > 0 ? Math.round((completedGroupsCount / totalGroups) * 100) : 0;

  return {
    meetingNumber,
    totalGroups,
    completedGroupsCount,
    partialGroupsCount,
    unrecordedGroupsCount,
    compliancePercent,
    items,
  };
}


