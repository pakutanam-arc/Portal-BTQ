import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStudentTotalScore,
  computeLiveSessionMetrics,
  selectPriorityStudents,
  calculateAverageSessionScore,
  evaluateStudentExamReadiness,
  computeInstitutionExamReadiness,
  evaluateGroupMeetingCompliance,
} from './sessionMetrics';

test('calculateStudentTotalScore averages only positive score components', () => {
  assert.equal(calculateStudentTotalScore({ reading: 80, tajwid: 90, writing: 85, memorization: 0 }), 85);
  assert.equal(calculateStudentTotalScore({ reading: 0, tajwid: 0, writing: 0, memorization: 0 }), 0);
  assert.equal(calculateStudentTotalScore({ reading: 90, tajwid: 80, writing: 85, memorization: 95 }), 88);
});

test('computeLiveSessionMetrics computes attendance and scoring progress accurately', () => {
  const ids = ['s1', 's2', 's3', 's4'];
  const attendance = {
    s1: { status: 'Hadir' },
    s2: { status: 'Hadir' },
    s3: { status: 'Izin' },
    s4: { status: 'Alpa' },
  };
  const progress = {
    s1: { reading: 80, tajwid: 90, writing: 85, total: 85 },
    s2: { reading: 0, tajwid: 0, writing: 0, total: 0 },
    s3: { reading: 0, tajwid: 0, writing: 0, total: 0 },
    s4: { reading: 0, tajwid: 0, writing: 0, total: 0 },
  };

  const metrics = computeLiveSessionMetrics(ids, attendance, progress);
  assert.equal(metrics.totalStudents, 4);
  assert.equal(metrics.hadirCount, 2);
  assert.equal(metrics.izinCount, 1);
  assert.equal(metrics.sakitCount, 0);
  assert.equal(metrics.alpaCount, 1);
  assert.equal(metrics.presentRatePercent, 50);
  assert.equal(metrics.scoredPresentCount, 1);
  assert.equal(metrics.unscoredPresentCount, 1);
  assert.equal(metrics.scoringProgressPercent, 50);
  assert.equal(metrics.averageClassScore, 85);
});

test('selectPriorityStudents ranks low score and declining students first', () => {
  const sample = [
    {
      id: '1',
      name: 'Ahmad',
      class: '7A',
      progressScore: 90,
      attendanceRate: 100,
      trend: 'Meningkat' as const,
      trendDiff: 5,
      sessionHistory: [{}],
      attendanceHistory: [{}],
    },
    {
      id: '2',
      name: 'Budi',
      class: '7B',
      progressScore: 70,
      attendanceRate: 100,
      trend: 'Konsisten' as const,
      trendDiff: 0,
      sessionHistory: [{}],
      attendanceHistory: [{}],
    },
    {
      id: '3',
      name: 'Citra',
      class: '7C',
      progressScore: 80,
      attendanceRate: 100,
      trend: 'Menurun' as const,
      trendDiff: -6,
      sessionHistory: [{}, {}],
      attendanceHistory: [{}],
    },
  ];

  const priorities = selectPriorityStudents(sample);
  assert.equal(priorities.length, 2);
  assert.equal(priorities[0].id, '2');
  assert.equal(priorities[1].id, '3');
});

test('evaluateStudentExamReadiness requires BOTH average score >= 75 and attendance >= 75%', () => {
  assert.equal(calculateAverageSessionScore([80, 0, 90, 76]), 82);

  // High score (85) AND high attendance (80%) -> Siap Ujian
  const ready = evaluateStudentExamReadiness({
    sessionTotals: [80, 90],
    attendanceStatuses: ['Hadir', 'Hadir', 'Hadir', 'Hadir', 'Izin'],
  });
  assert.equal(ready.averageScore, 85);
  assert.equal(ready.attendanceRate, 80);
  assert.equal(ready.isExamReady, true);
  assert.equal(ready.readinessLabel, 'Siap Ujian');

  // High score (88) BUT low attendance (50% < 75%) -> NOT Siap Ujian
  const highScoreLowAtt = evaluateStudentExamReadiness({
    sessionTotals: [86, 90],
    attendanceStatuses: ['Hadir', 'Alpa', 'Hadir', 'Izin'],
  });
  assert.equal(highScoreLowAtt.averageScore, 88);
  assert.equal(highScoreLowAtt.attendanceRate, 50);
  assert.equal(highScoreLowAtt.isExamReady, false);
  assert.equal(highScoreLowAtt.needsGuidance, true);
  assert.equal(highScoreLowAtt.readinessLabel, 'Perlu Pendampingan');

  // High attendance (100%) BUT low average score (70 < 75) -> NOT Siap Ujian
  const lowScoreHighAtt = evaluateStudentExamReadiness({
    sessionTotals: [68, 72],
    attendanceStatuses: ['Hadir', 'Hadir', 'Hadir', 'Hadir'],
  });
  assert.equal(lowScoreHighAtt.averageScore, 70);
  assert.equal(lowScoreHighAtt.attendanceRate, 100);
  assert.equal(lowScoreHighAtt.isExamReady, false);
  assert.equal(lowScoreHighAtt.needsGuidance, true);
});

test('computeInstitutionExamReadiness aggregates school-wide readiness excluding inactive students', () => {
  const students = [
    { id: 's1', status: 'Aktif' },
    { id: 's2', status: 'Aktif' },
    { id: 's3', status: 'Nonaktif' },
  ];
  const progressRecords = [
    { studentId: 's1', total: 82 },
    { studentId: 's2', total: 85 },
    { studentId: 's3', total: 95 },
  ];
  const attendanceRecords = [
    { studentId: 's1', status: 'Hadir' },
    { studentId: 's1', status: 'Hadir' },
    { studentId: 's2', status: 'Hadir' },
    { studentId: 's2', status: 'Alpa' }, // 50% attendance -> not ready
  ];

  const summary = computeInstitutionExamReadiness(students, progressRecords, attendanceRecords);
  assert.equal(summary.activeStudentsCount, 2);
  assert.equal(summary.examReadyCount, 1);
  assert.equal(summary.needsGuidanceCount, 1);
  assert.equal(summary.examReadyRatePercent, 50);
});

test('evaluateGroupMeetingCompliance tracks 3-step KBM completion per group', () => {
  const groups = [
    { id: 'group_1', name: 'Kelompok 1', mentorName: 'Mentor 1' },
    { id: 'group_2', name: 'Kelompok 2', mentorName: 'Mentor 2' },
    { id: 'group_3', name: 'Kelompok 3', mentorName: 'Mentor 3' },
  ];
  const attendanceRecords = [
    { groupId: 'g1', meetingNumber: 2 },
    { groupId: 'group_2', meetingNumber: 2 },
  ];
  const progressRecords = [
    { groupId: 'g1', meetingNumber: 2, total: 84 },
  ];
  const journalRecords = [
    { groupId: 'group_1', meetingNumber: 2 },
  ];

  const compliance = evaluateGroupMeetingCompliance({
    meetingNumber: 2,
    groups,
    attendanceRecords,
    progressRecords,
    journalRecords,
  });

  assert.equal(compliance.totalGroups, 3);
  assert.equal(compliance.completedGroupsCount, 1);
  assert.equal(compliance.partialGroupsCount, 1);
  assert.equal(compliance.unrecordedGroupsCount, 1);
  assert.equal(compliance.compliancePercent, 33);
  assert.equal(compliance.items[0].statusLabel, 'Selesai Lengkap');
  assert.equal(compliance.items[1].statusLabel, 'Sebagian');
  assert.equal(compliance.items[2].statusLabel, 'Belum Input');
});


