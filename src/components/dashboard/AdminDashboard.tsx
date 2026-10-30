import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Layers,
  UserCheck,
  TrendingUp,
  Loader2,
  Calendar,
  Clock,
  Edit3,
  PlusCircle,
  CheckSquare,
  RefreshCw,
  CheckCircle2,
  Award,
  AlertTriangle,
  BarChart3,
  PieChart,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getGroups,
  getMentors,
  getGroupNumber,
  Group,
  Mentor,
  getSystemActivities,
  SystemActivity,
  getAllStudentProgress,
  getStudents,
  Student,
  StudentProgress,
  getAllStudentAttendance,
  StudentAttendance,
  getTeachingJournals,
  TeachingJournal,
  getActiveSemesterInfo,
  getRecentWeeksStartDate,
  SemesterInfo,
  subscribeToAllStudentAttendance,
  subscribeToAllStudentProgress,
  subscribeToTeachingJournals,
  subscribeToStudents,
  subscribeToGroups,
  subscribeToMentors,
  subscribeToSystemActivities,
  invalidateDbCache,
} from '../../services/db';
import { cn } from '../../utils/cn';
import { ActivityLogModal } from '../modals/ActivityLogModal';
import { AttendanceChartCard, AttendancePeriodStats } from './AttendanceChartCard';
import { GroupProgressBarCard, GroupProgressItem } from './GroupProgressBarCard';
import { GroupSummaryTable, GroupDetailItem, WeeklyProgressPoint } from './GroupSummaryTable';
import { AttentionPanel, AttentionAlert } from './AttentionPanel';
import { RecentActivitiesCard } from './RecentActivitiesCard';
import { CurriculumSyncAlert } from '../CurriculumSyncAlert';
import { WeeklyAttendanceSummaryCard, WeeklyOverallAttendancePoint } from './WeeklyAttendanceSummaryCard';
import { GroupWeeklyAttendanceCard, WeeklyGroupDataPoint, GroupAttendanceDetail } from './GroupWeeklyAttendanceCard';
import { AcademicCalendarCard } from './AcademicCalendarCard';
import { getMeetingRealDate, formatShortDateID, formatLocalDateString } from '../../services/academicCalendar';
import { getAcademicHolidays, subscribeAcademicHolidays, AcademicHoliday } from '../../services/db/calendar';
import { normalizeGroupId } from '../../services/db/groups';
import { sortStudents } from '../../utils/studentUtils';
import {
  computeInstitutionExamReadiness,
  evaluateGroupMeetingCompliance,
  calculateAverageSessionScore,
  MIN_PROGRESS_SCORE_STANDARD,
  MIN_ATTENDANCE_RATE_STANDARD,
} from '../../utils/sessionMetrics';

export type DashboardTimeRange = 'semester' | '8weeks' | '4weeks';
export type AdminAnalyticsTab = 'trends' | 'groups';

export function AdminDashboard() {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('semester');
  const [analyticsTab, setAnalyticsTab] = useState<AdminAnalyticsTab>('trends');
  const [showCalendarSection, setShowCalendarSection] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [allProgress, setAllProgress] = useState<StudentProgress[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [allAttendance, setAllAttendance] = useState<StudentAttendance[]>([]);
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  const semesterInfo: SemesterInfo = useMemo(() => getActiveSemesterInfo(), []);

  const activeRangeConfig = useMemo(() => {
    if (timeRange === '4weeks') {
      const startDate = getRecentWeeksStartDate(4);
      return {
        key: '4weeks' as const,
        label: '4 Pertemuan Terakhir',
        shortLabel: '4 Pertemuan',
        startDate,
        description: `Sejak ${startDate}`,
      };
    }
    if (timeRange === '8weeks') {
      const startDate = getRecentWeeksStartDate(8);
      return {
        key: '8weeks' as const,
        label: '8 Pertemuan Terakhir',
        shortLabel: '8 Pertemuan',
        startDate,
        description: `Sejak ${startDate}`,
      };
    }
    return {
      key: 'semester' as const,
      label: `Semester ${semesterInfo.semesterName} (${semesterInfo.academicYear})`,
      shortLabel: `Sem. ${semesterInfo.semesterName}`,
      startDate: semesterInfo.startDate,
      description: `Semester Aktif (${semesterInfo.startDate} s/d ${semesterInfo.endDate})`,
    };
  }, [timeRange, semesterInfo]);

  const markSyncedNow = useCallback(() => {
    const now = new Date();
    setLastSyncTime(
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  // Fungsi pemanggilan data murni dari Cloud Firestore (forceFresh: true)
  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      try {
        if (isManualRefresh) {
          invalidateDbCache();
        }
        const [
          groupsData,
          mentorsData,
          activitiesData,
          progressData,
          studentsData,
          journalsRes,
          attendanceData,
          holidaysData,
        ] = await Promise.all([
          getGroups(true),
          getMentors(true),
          getSystemActivities(60),
          getAllStudentProgress(2000, true),
          getStudents(true),
          getTeachingJournals(undefined, 100),
          getAllStudentAttendance(activeRangeConfig.startDate, 2000, true),
          getAcademicHolidays(true),
        ]);

        const sortedGroups = [...groupsData].sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
        const activeStudents = studentsData.filter((s) => s.status !== 'Nonaktif');

        setGroups(sortedGroups);
        setMentors(mentorsData);
        setActivities(activitiesData);
        setAllProgress(progressData);
        setStudents(activeStudents);
        setJournals(journalsRes?.data || []);
        setAllAttendance(attendanceData || []);
        setHolidays(holidaysData || []);
        markSyncedNow();
      } catch (error) {
        console.error('Error fetching live dashboard data:', error);
      } finally {
        setLoading(false);
        if (isManualRefresh) setIsRefreshing(false);
      }
    },
    [activeRangeConfig.startDate, markSyncedNow]
  );

  useEffect(() => {
    let isMounted = true;

    // 1. Pemuatan awal data murni dari Cloud Firestore
    loadData(false);

    // 2. Real-time Firestore Subscriptions (100% 8 Koleksi Utama)
    const unsubAttendance = subscribeToAllStudentAttendance((freshAttendance) => {
      if (!isMounted) return;
      const filtered = activeRangeConfig.startDate
        ? freshAttendance.filter((a) => !a.date || a.date >= activeRangeConfig.startDate!)
        : freshAttendance;
      setAllAttendance(filtered);
      markSyncedNow();
    });

    const unsubProgress = subscribeToAllStudentProgress((freshProgress) => {
      if (!isMounted) return;
      setAllProgress(freshProgress);
      markSyncedNow();
    });

    const unsubJournals = subscribeToTeachingJournals((freshJournals) => {
      if (!isMounted) return;
      const filtered = activeRangeConfig.startDate
        ? freshJournals.filter((j) => !j.date || j.date >= activeRangeConfig.startDate!)
        : freshJournals;
      setJournals(filtered);
      markSyncedNow();
    });

    const unsubStudents = subscribeToStudents((freshStudents) => {
      if (!isMounted) return;
      const activeOnly = freshStudents.filter((s) => s.status !== 'Nonaktif');
      setStudents(activeOnly);
      markSyncedNow();
    });

    const unsubGroups = subscribeToGroups((freshGroups) => {
      if (!isMounted) return;
      setGroups(freshGroups);
      markSyncedNow();
    });

    const unsubMentors = subscribeToMentors((freshMentors) => {
      if (!isMounted) return;
      setMentors(freshMentors);
      markSyncedNow();
    });

    const unsubActivities = subscribeToSystemActivities((freshActivities) => {
      if (!isMounted) return;
      setActivities(freshActivities);
      markSyncedNow();
    }, 50);

    const unsubHolidays = subscribeAcademicHolidays((freshHolidays) => {
      if (!isMounted) return;
      setHolidays(freshHolidays);
      markSyncedNow();
    });

    const handleDataUpdated = () => {
      loadData(false);
    };

    window.addEventListener('attendance-updated', handleDataUpdated);
    window.addEventListener('progress-updated', handleDataUpdated);
    window.addEventListener('journal-updated', handleDataUpdated);
    window.addEventListener('db-cache-invalidated', handleDataUpdated);
    window.addEventListener('user_profile_updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);

    return () => {
      isMounted = false;
      unsubAttendance();
      unsubProgress();
      unsubJournals();
      unsubStudents();
      unsubGroups();
      unsubMentors();
      unsubActivities();
      unsubHolidays();
      window.removeEventListener('attendance-updated', handleDataUpdated);
      window.removeEventListener('progress-updated', handleDataUpdated);
      window.removeEventListener('journal-updated', handleDataUpdated);
      window.removeEventListener('db-cache-invalidated', handleDataUpdated);
      window.removeEventListener('user_profile_updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
    };
  }, [loadData, activeRangeConfig.startDate, markSyncedNow]);

  // Memperbarui presensi & jurnal ketika rentang waktu rekap diubah oleh admin
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    let isSubscribed = true;
    async function updateRangeData() {
      setRangeLoading(true);
      try {
        const [journalsRes, attendanceData] = await Promise.all([
          getTeachingJournals(undefined, 80, undefined, activeRangeConfig.startDate),
          getAllStudentAttendance(activeRangeConfig.startDate, 2000),
        ]);
        if (!isSubscribed) return;
        setJournals(journalsRes?.data || []);
        setAllAttendance(attendanceData || []);
      } catch (err) {
        console.error('Gagal memperbarui rentang rekap dashboard:', err);
      } finally {
        if (isSubscribed) setRangeLoading(false);
      }
    }
    updateRangeData();
    return () => {
      isSubscribed = false;
    };
  }, [activeRangeConfig.startDate]);

  // Memoize O(1) mentor lookup map
  const mentorMap = useMemo(() => {
    const map = new Map<string, string>();
    mentors.forEach((m) => {
      map.set(m.id, m.name);
    });
    return map;
  }, [mentors]);

  // Hitung santri aktif per kelompok secara reaktif
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach((g) => {
      const gNorm = normalizeGroupId(g.id);
      counts[g.id] = students.filter((s) => normalizeGroupId(s.groupId) === gNorm).length;
    });
    return counts;
  }, [groups, students]);

  // Evaluasi kesiapan ujian institusi (Standar Ganda: Rata-rata Nilai >= 75 DAN Kehadiran >= 75%)
  const examReadinessSummary = useMemo(() => {
    return computeInstitutionExamReadiness(students, allProgress, allAttendance);
  }, [students, allProgress, allAttendance]);

  // Deteksi nomor pertemuan aktif tertinggi di institusi
  const activeMeetingNumber = useMemo(() => {
    const extractSessionNumber = (p: StudentProgress): number => {
      if (p.meetingNumber && p.meetingNumber > 0) return p.meetingNumber;
      if (p.sessionId) {
        const match = p.sessionId.match(/(?:s|session_?)(\d+)/i) || p.sessionId.match(/(\d+)$/);
        if (match) return parseInt(match[1] || match[0], 10);
      }
      return 1;
    };

    const journalMax = journals.reduce((max, j) => Math.max(max, j.meetingNumber || 0), 0);
    const progressMax = allProgress.reduce((max, p) => Math.max(max, extractSessionNumber(p)), 0);
    const attendanceMax = allAttendance.reduce((max, a) => Math.max(max, a.meetingNumber || 0), 0);
    return Math.max(1, journalMax, progressMax, attendanceMax);
  }, [journals, allProgress, allAttendance]);

  // Evaluasi kepatuhan pengisian sesi KBM & jurnal mentor pada pertemuan aktif
  const meetingCompliance = useMemo(() => {
    const mappedGroups = groups.map((g) => ({
      id: g.id,
      name: g.name,
      mentorName: mentorMap.get(g.mentorId) || 'Ustadz / Ustadzah',
    }));
    return evaluateGroupMeetingCompliance({
      meetingNumber: activeMeetingNumber,
      groups: mappedGroups,
      attendanceRecords: allAttendance,
      progressRecords: allProgress,
      journalRecords: journals,
    });
  }, [activeMeetingNumber, groups, mentorMap, allAttendance, allProgress, journals]);

  // Transformasi rincian kelompok tersinkronisasi dengan data riil
  const groupDetails: GroupDetailItem[] = useMemo(() => {
    const studentsByGroup = new Map<string, Student[]>();
    students.forEach((s) => {
      const gNorm = normalizeGroupId(s.groupId);
      const list = studentsByGroup.get(gNorm) || [];
      list.push(s);
      studentsByGroup.set(gNorm, list);
    });

    const progressByGroup = new Map<string, StudentProgress[]>();
    allProgress.forEach((p) => {
      const rawGId = p.groupId || students.find((s) => s.id === p.studentId)?.groupId;
      const gNorm = normalizeGroupId(rawGId);
      if (gNorm) {
        const list = progressByGroup.get(gNorm) || [];
        list.push(p);
        progressByGroup.set(gNorm, list);
      }
    });

    const extractSessionNumber = (p: StudentProgress): number => {
      if (p.meetingNumber && p.meetingNumber > 0) return p.meetingNumber;
      if (p.sessionId) {
        const match = p.sessionId.match(/(?:s|session_?)(\d+)/i) || p.sessionId.match(/(\d+)$/);
        if (match) return parseInt(match[1] || match[0], 10);
      }
      return 1;
    };

    const activeWeeksList: number[] = [];
    for (let w = 1; w <= activeMeetingNumber; w++) {
      activeWeeksList.push(w);
    }

    const groupAttendanceMap = new Map<string, { present: number; total: number }>();
    allAttendance.forEach((att) => {
      const gNorm = normalizeGroupId(att.groupId);
      if (!gNorm) return;
      const cur = groupAttendanceMap.get(gNorm) || { present: 0, total: 0 };
      cur.total += 1;
      if (att.status === 'Hadir') cur.present += 1;
      groupAttendanceMap.set(gNorm, cur);
    });

    return groups.map((g) => {
      const gNorm = normalizeGroupId(g.id);
      const mentorName = mentorMap.get(g.mentorId) || 'Ustadz / Ustadzah';
      const gStudents = sortStudents(studentsByGroup.get(gNorm) || []);
      const studentsCount = gStudents.length || groupCounts[g.id] || 0;
      const gProgs = progressByGroup.get(gNorm) || [];

      const progsByWeek = new Map<number, number[]>();
      gProgs.forEach((p) => {
        const sNum = extractSessionNumber(p);
        const scores = progsByWeek.get(sNum) || [];
        if (typeof p.total === 'number' && !isNaN(p.total) && p.total > 0) {
          scores.push(p.total);
        }
        progsByWeek.set(sNum, scores);
      });

      const weeklyProgress: WeeklyProgressPoint[] = activeWeeksList.map((weekNum, wIdx) => {
        const weekScores = progsByWeek.get(weekNum) || [];
        const hasScores = weekScores.length > 0;
        const weekAvg = hasScores
          ? Math.round(weekScores.reduce((acc, c) => acc + c, 0) / weekScores.length)
          : 0;

        const prevWeekScores = wIdx > 0 ? progsByWeek.get(activeWeeksList[wIdx - 1]) || [] : [];
        const prevAvg =
          prevWeekScores.length > 0
            ? Math.round(prevWeekScores.reduce((acc, c) => acc + c, 0) / prevWeekScores.length)
            : 0;

        const delta = hasScores && prevAvg > 0 ? weekAvg - prevAvg : 0;

        return {
          week: weekNum,
          label: `P${weekNum}`,
          progress: weekAvg,
          target: MIN_PROGRESS_SCORE_STANDARD,
          delta,
          isCurrent: weekNum === activeMeetingNumber,
        };
      });

      // Rata-rata kumulatif seluruh pertemuan yang telah memiliki nilai
      const validPoints = weeklyProgress.filter((p) => p.progress > 0);
      const currentProgress =
        validPoints.length > 0
          ? calculateAverageSessionScore(validPoints.map((p) => p.progress))
          : 0;

      const groupAtt = groupAttendanceMap.get(gNorm);
      const attendance =
        groupAtt && groupAtt.total > 0 ? Math.round((groupAtt.present / groupAtt.total) * 100) : 0;

      // Evaluasi status kelompok berdasarkan capaian nilai DAN kehadiran
      let statusLabel: 'Baik' | 'Perlu Dipantau' | 'Perlu Pendampingan' | 'Belum Diinput' =
        'Belum Diinput';
      if (currentProgress > 0 || attendance > 0) {
        if (
          (currentProgress > 0 && currentProgress < 65) ||
          (attendance > 0 && attendance < 65)
        ) {
          statusLabel = 'Perlu Pendampingan';
        } else if (
          currentProgress < MIN_PROGRESS_SCORE_STANDARD ||
          (attendance > 0 && attendance < MIN_ATTENDANCE_RATE_STANDARD)
        ) {
          statusLabel = 'Perlu Dipantau';
        } else {
          statusLabel = 'Baik';
        }
      }

      return {
        id: g.id,
        name: g.name,
        mentorName,
        studentsCount,
        progress: currentProgress,
        attendance,
        status: statusLabel,
        weeklyProgress,
      };
    });
  }, [groups, mentorMap, groupCounts, students, allProgress, allAttendance, activeMeetingNumber]);

  const computeAttendanceStats = (records: StudentAttendance[]): AttendancePeriodStats => {
    let present = 0;
    let permission = 0;
    let sick = 0;
    let absent = 0;

    records.forEach((att) => {
      if (att.status === 'Hadir') present++;
      else if (att.status === 'Izin') permission++;
      else if (att.status === 'Sakit') sick++;
      else if (att.status === 'Alpa') absent++;
    });

    const total = present + permission + sick + absent;
    if (total === 0) {
      return {
        rate: 0,
        present: 0,
        permission: 0,
        sick: 0,
        absent: 0,
        total: 0,
        slices: [
          { name: 'Hadir', value: 0, count: 0, color: '#0362D0' },
          { name: 'Izin', value: 0, count: 0, color: '#C99A2E' },
          { name: 'Sakit', value: 0, count: 0, color: '#94A3B8' },
          { name: 'Alpa', value: 0, count: 0, color: '#950415' },
        ],
      };
    }

    const pHadir = Math.round((present / total) * 100);
    const pIzin = Math.round((permission / total) * 100);
    const pSakit = Math.round((sick / total) * 100);
    const pAlpa = Math.max(0, 100 - (pHadir + pIzin + pSakit));

    return {
      rate: pHadir,
      present,
      permission,
      sick,
      absent,
      total,
      slices: [
        { name: 'Hadir', value: pHadir, count: present, color: '#0362D0' },
        { name: 'Izin', value: pIzin, count: permission, color: '#C99A2E' },
        { name: 'Sakit', value: pSakit, count: sick, color: '#94A3B8' },
        { name: 'Alpa', value: pAlpa, count: absent, color: '#950415' },
      ],
    };
  };

  const { thisWeekRecords, thisWeekLabel } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const isSaturdayToday = currentDay === 6;
    const todayStr = formatLocalDateString(now);

    if (isSaturdayToday) {
      const todayMatches = allAttendance.filter((a) => a.date && a.date.startsWith(todayStr));
      if (todayMatches.length > 0) {
        return {
          thisWeekRecords: todayMatches,
          thisWeekLabel: 'pertemuan Sabtu hari ini',
        };
      }
    }

    let maxMeetingNumber = 0;
    allAttendance.forEach((a) => {
      if (a.meetingNumber && a.meetingNumber > maxMeetingNumber) {
        maxMeetingNumber = a.meetingNumber;
      }
    });

    if (maxMeetingNumber > 0) {
      const latestMeetingRecords = allAttendance.filter((a) => a.meetingNumber === maxMeetingNumber);
      if (latestMeetingRecords.length > 0) {
        const matchedRecord = latestMeetingRecords.find((r) => r.date);
        const realDateLabel = matchedRecord?.date
          ? formatShortDateID(matchedRecord.date)
          : getMeetingRealDate(maxMeetingNumber)
          ? formatShortDateID(getMeetingRealDate(maxMeetingNumber)!)
          : '';
        const labelSuffix = realDateLabel ? ` (${realDateLabel})` : '';

        return {
          thisWeekRecords: latestMeetingRecords,
          thisWeekLabel: isSaturdayToday
            ? 'pertemuan Sabtu hari ini'
            : `Pertemuan Ke-${maxMeetingNumber}${labelSuffix}`,
        };
      }
    }

    const daysSinceLastSaturday = (currentDay + 1) % 7;
    const lastSaturdayDate = new Date(now.getTime() - daysSinceLastSaturday * 24 * 60 * 60 * 1000);
    const lastSaturdayStr = formatLocalDateString(lastSaturdayDate);

    const lastSaturdayMatches = allAttendance.filter(
      (a) => a.date && a.date.startsWith(lastSaturdayStr)
    );
    if (lastSaturdayMatches.length > 0) {
      return {
        thisWeekRecords: lastSaturdayMatches,
        thisWeekLabel: isSaturdayToday ? 'pertemuan Sabtu hari ini' : 'pertemuan Sabtu lalu',
      };
    }

    const dateStrings = Array.from(
      new Set(allAttendance.map((a) => (a.date ? a.date.split('T')[0] : '')))
    )
      .filter(Boolean)
      .sort()
      .reverse();

    const latestDate = dateStrings[0];
    const latestMatches = latestDate
      ? allAttendance.filter((a) => a.date && a.date.startsWith(latestDate))
      : [];

    return {
      thisWeekRecords: latestMatches.length > 0 ? latestMatches : allAttendance,
      thisWeekLabel: isSaturdayToday ? 'pertemuan Sabtu hari ini' : 'pertemuan Sabtu lalu',
    };
  }, [allAttendance]);

  const attendancePeriodData = useMemo<
    Record<'thisWeek' | 'month' | 'sixMonths' | 'all', AttendancePeriodStats>
  >(() => {
    if (!allAttendance || allAttendance.length === 0) {
      return {
        thisWeek: computeAttendanceStats([]),
        month: computeAttendanceStats([]),
        sixMonths: computeAttendanceStats([]),
        all: computeAttendanceStats([]),
      };
    }

    const dateStrings = Array.from(
      new Set(allAttendance.map((a) => (a.date ? a.date.split('T')[0] : '')))
    )
      .filter(Boolean)
      .sort()
      .reverse();

    const latestDate = dateStrings[0];
    const latestDateObj = latestDate ? new Date(latestDate) : new Date();

    const thirtyDaysAgo = new Date(latestDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthRecords = allAttendance.filter((a) => {
      if (!a.date) return false;
      const d = new Date(a.date.split('T')[0]);
      return d >= thirtyDaysAgo && d <= latestDateObj;
    });

    const sixMonthsAgo = new Date(latestDateObj.getTime() - 180 * 24 * 60 * 60 * 1000);
    const sixMonthsRecords = allAttendance.filter((a) => {
      if (!a.date) return false;
      const d = new Date(a.date.split('T')[0]);
      return d >= sixMonthsAgo && d <= latestDateObj;
    });

    return {
      thisWeek: computeAttendanceStats(thisWeekRecords),
      month: computeAttendanceStats(monthRecords),
      sixMonths: computeAttendanceStats(sixMonthsRecords),
      all: computeAttendanceStats(allAttendance),
    };
  }, [allAttendance, thisWeekRecords]);

  const groupProgressBarData: GroupProgressItem[] = useMemo(() => {
    return groupDetails.map((gd) => ({
      name: gd.name,
      progress: gd.progress,
    }));
  }, [groupDetails]);

  // 4-Card Bento KPI Metrics
  const kpiSummary = useMemo(() => {
    const activeStudentsCount = students.length;
    const totalKelompokVal = groups.length;
    const totalMentorVal = mentors.length;
    const attendanceThisWeekVal = attendancePeriodData.thisWeek.rate;
    const attendanceAvgVal = attendancePeriodData.sixMonths.rate;
    const groupsWithProg = groupDetails.filter((g) => g.progress > 0);
    const progressAvgVal = groupsWithProg.length
      ? Math.round(groupsWithProg.reduce((sum, g) => sum + g.progress, 0) / groupsWithProg.length)
      : 0;
    const groupsOnTarget = groupDetails.filter(
      (g) => g.progress >= MIN_PROGRESS_SCORE_STANDARD
    ).length;

    return {
      activeStudentsCount,
      totalKelompokVal,
      totalMentorVal,
      attendanceThisWeekVal,
      attendanceAvgVal,
      hasAttendanceThisWeek: attendancePeriodData.thisWeek.total > 0,
      hasAttendanceSemester: attendancePeriodData.sixMonths.total > 0,
      progressAvgVal,
      groupsWithProgCount: groupsWithProg.length,
      groupsOnTarget,
    };
  }, [students.length, groups.length, mentors.length, attendancePeriodData, groupDetails]);

  const {
    weeklyOverallAttendanceData,
    weeklyGroupAttendanceData,
    cumulativeGroupAttendanceData,
    overallAverageRate,
    overallLatestRate,
  } = useMemo(() => {
    const uniqueDates = Array.from(
      new Set(allAttendance.map((a) => (a.date ? a.date.split('T')[0] : '')))
    )
      .filter(Boolean)
      .sort();

    const dateToJournalMeeting = new Map<string, number>();
    journals.forEach((j) => {
      if (j.date && j.meetingNumber) {
        dateToJournalMeeting.set(j.date.split('T')[0], j.meetingNumber);
      }
    });

    const dateToWeekMap = new Map<string, number>();
    dateToWeekMap.set('2026-08-15', 1);
    dateToWeekMap.set('2026-08-22', 2);

    journals.forEach((j) => {
      if (j.date && j.meetingNumber) {
        dateToWeekMap.set(j.date.split('T')[0], j.meetingNumber);
      }
    });

    uniqueDates.forEach((dateStr, idx) => {
      if (!dateToWeekMap.has(dateStr)) {
        const fromJournal = dateToJournalMeeting.get(dateStr);
        if (fromJournal) {
          dateToWeekMap.set(dateStr, fromJournal);
        } else {
          dateToWeekMap.set(dateStr, idx + 1);
        }
      }
    });

    const allWeekNumbersSet = new Set<number>();
    allAttendance.forEach((a) => {
      if (a.meetingNumber && a.meetingNumber > 0) {
        allWeekNumbersSet.add(a.meetingNumber);
      } else if (a.date) {
        const dStr = a.date.split('T')[0];
        const wNum = dateToWeekMap.get(dStr);
        if (wNum) allWeekNumbersSet.add(wNum);
      }
    });

    journals.forEach((j) => {
      if (j.meetingNumber && j.meetingNumber > 0) {
        allWeekNumbersSet.add(j.meetingNumber);
      }
    });

    const sortedWeeks = Array.from(allWeekNumbersSet).sort((a, b) => a - b);

    const formatShortDate = (dStr: string) => {
      try {
        const d = new Date(dStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      } catch {
        return dStr;
      }
    };

    const getWeekDateLabel = (weekNum: number): string | undefined => {
      const matchedRecord = allAttendance.find((a) => a.meetingNumber === weekNum && a.date);
      if (matchedRecord && matchedRecord.date) return formatShortDate(matchedRecord.date);

      const matchedJournal = journals.find((j) => j.meetingNumber === weekNum && j.date);
      if (matchedJournal && matchedJournal.date) return formatShortDate(matchedJournal.date);

      for (const [dStr, wNum] of dateToWeekMap.entries()) {
        if (wNum === weekNum) return formatShortDate(dStr);
      }

      const fallbackDate = getMeetingRealDate(weekNum, [], holidays);
      if (fallbackDate) return formatShortDate(fallbackDate);

      return undefined;
    };

    const weeklyOverall: WeeklyOverallAttendancePoint[] = sortedWeeks.map((weekNum) => {
      const weekRecords = allAttendance.filter((a) => {
        if (a.meetingNumber && a.meetingNumber === weekNum) return true;
        if (a.date) {
          const dStr = a.date.split('T')[0];
          return dateToWeekMap.get(dStr) === weekNum;
        }
        return false;
      });

      let present = 0;
      let permission = 0;
      let sick = 0;
      let absent = 0;
      const total = weekRecords.length;

      weekRecords.forEach((r) => {
        if (r.status === 'Hadir') present++;
        else if (r.status === 'Izin') permission++;
        else if (r.status === 'Sakit') sick++;
        else if (r.status === 'Alpa') absent++;
      });

      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      const dLabel = getWeekDateLabel(weekNum);
      const displayLabel = dLabel ? `Pertemuan ${weekNum} (${dLabel})` : `Pertemuan ${weekNum}`;

      return {
        week: weekNum,
        label: displayLabel,
        dateLabel: dLabel,
        rate,
        present,
        permission,
        sick,
        absent,
        total,
        target: 80,
      };
    });

    const weeklyGroups: WeeklyGroupDataPoint[] = sortedWeeks.map((weekNum) => {
      const groupDataList: GroupAttendanceDetail[] = groups.map((g) => {
        const gNorm = normalizeGroupId(g.id);
        const mentorName = mentorMap.get(g.mentorId) || 'Ustadz / Ustadzah';
        const gRecords = allAttendance.filter((a) => {
          if (normalizeGroupId(a.groupId) !== gNorm) return false;
          if (a.meetingNumber && a.meetingNumber === weekNum) return true;
          if (a.date) {
            const dStr = a.date.split('T')[0];
            return dateToWeekMap.get(dStr) === weekNum;
          }
          return false;
        });

        let gPresent = 0;
        let gPerm = 0;
        let gSick = 0;
        let gAbs = 0;
        const gTotal = gRecords.length;

        gRecords.forEach((r) => {
          if (r.status === 'Hadir') gPresent++;
          else if (r.status === 'Izin') gPerm++;
          else if (r.status === 'Sakit') gSick++;
          else if (r.status === 'Alpa') gAbs++;
        });

        const gRate = gTotal > 0 ? Math.round((gPresent / gTotal) * 100) : 0;

        return {
          groupId: g.id,
          groupName: g.name,
          mentorName,
          rate: gRate,
          present: gPresent,
          permission: gPerm,
          sick: gSick,
          absent: gAbs,
          total: gTotal,
        };
      });

      const dLabel = getWeekDateLabel(weekNum);
      const displayLabel = dLabel ? `Pertemuan ${weekNum} (${dLabel})` : `Pertemuan ${weekNum}`;

      return {
        week: weekNum,
        label: displayLabel,
        dateLabel: dLabel,
        groups: groupDataList,
      };
    });

    const cumulativeGroups: GroupAttendanceDetail[] = groups.map((g) => {
      const gNorm = normalizeGroupId(g.id);
      const mentorName = mentorMap.get(g.mentorId) || 'Ustadz / Ustadzah';
      const gRecords = allAttendance.filter((a) => normalizeGroupId(a.groupId) === gNorm);

      let gPresent = 0;
      let gPerm = 0;
      let gSick = 0;
      let gAbs = 0;
      const gTotal = gRecords.length;

      gRecords.forEach((r) => {
        if (r.status === 'Hadir') gPresent++;
        else if (r.status === 'Izin') gPerm++;
        else if (r.status === 'Sakit') gSick++;
        else if (r.status === 'Alpa') gAbs++;
      });

      const gRate = gTotal > 0 ? Math.round((gPresent / gTotal) * 100) : 0;

      return {
        groupId: g.id,
        groupName: g.name,
        mentorName,
        rate: gRate,
        present: gPresent,
        permission: gPerm,
        sick: gSick,
        absent: gAbs,
        total: gTotal,
      };
    });

    const validOverallWeeks = weeklyOverall.filter((w) => w.total > 0);
    const avgRate = validOverallWeeks.length
      ? Math.round(validOverallWeeks.reduce((sum, w) => sum + w.rate, 0) / validOverallWeeks.length)
      : 0;
    const latRate = validOverallWeeks.length
      ? validOverallWeeks[validOverallWeeks.length - 1].rate
      : 0;

    return {
      weeklyOverallAttendanceData: weeklyOverall,
      weeklyGroupAttendanceData: weeklyGroups,
      cumulativeGroupAttendanceData: cumulativeGroups,
      overallAverageRate: avgRate,
      overallLatestRate: latRate,
    };
  }, [allAttendance, journals, groups, mentorMap, holidays]);

  // Dynamically compute real attention alerts based on actual database data
  const attentionAlerts: AttentionAlert[] = useMemo(() => {
    const alerts: AttentionAlert[] = [];

    const lowProgressGroups = [...groupDetails]
      .filter((g) => g.progress > 0 && g.progress < MIN_PROGRESS_SCORE_STANDARD)
      .sort((a, b) => a.progress - b.progress);

    if (lowProgressGroups.length > 0) {
      const lowest = lowProgressGroups[0];
      alerts.push({
        id: `progress-${lowest.id}`,
        type: lowest.progress < 65 ? 'danger' : 'warning',
        title: lowest.name,
        description: `Rata-rata nilai BTQ ${lowest.progress} — di bawah target KKM (${MIN_PROGRESS_SCORE_STANDARD}).`,
        link: '/groups',
        badge: `KKM ${MIN_PROGRESS_SCORE_STANDARD}`,
      });
    }

    const lowAttendanceGroups = [...groupDetails]
      .filter((g) => g.attendance > 0 && g.attendance < MIN_ATTENDANCE_RATE_STANDARD)
      .sort((a, b) => a.attendance - b.attendance);

    if (lowAttendanceGroups.length > 0) {
      const lowestAtt = lowAttendanceGroups[0];
      alerts.push({
        id: `attendance-${lowestAtt.id}`,
        type: 'warning',
        title: lowestAtt.name,
        description: `Kehadiran kelompok menyentuh ${lowestAtt.attendance}% (di bawah standar ${MIN_ATTENDANCE_RATE_STANDARD}%).`,
        link: '/attendance/students',
        badge: 'Presensi',
      });
    }

    if (examReadinessSummary.needsGuidanceCount > 0) {
      alerts.push({
        id: 'at-risk-students',
        type: 'warning',
        title: `${examReadinessSummary.needsGuidanceCount} santri perlu bimbingan`,
        description: `Nilai rata-rata atau kehadiran di bawah standar minimal (${MIN_PROGRESS_SCORE_STANDARD}%).`,
        link: '/progress',
        badge: 'Evaluasi',
      });
    }

    const incompleteGroups = meetingCompliance.items.filter((i) => !i.isComplete);
    if (incompleteGroups.length > 0) {
      alerts.push({
        id: 'mentor-checkin-missing',
        type: 'warning',
        title: `${incompleteGroups.length} kelompok belum lengkap`,
        description: `${incompleteGroups
          .slice(0, 2)
          .map((g) => g.groupName)
          .join(', ')}${
          incompleteGroups.length > 2 ? ' dll.' : ''
        } belum merampungkan presensi/nilai/jurnal P-${activeMeetingNumber}.`,
        link: '/session',
        badge: `Pertemuan ${activeMeetingNumber}`,
      });
    }

    return alerts;
  }, [groupDetails, examReadinessSummary.needsGuidanceCount, meetingCompliance, activeMeetingNumber]);

  const todayDateString = useMemo(() => {
    const date = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }, []);

  const handleOpenLogModal = useCallback(() => setIsLogModalOpen(true), []);
  const handleCloseLogModal = useCallback(() => setIsLogModalOpen(false), []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full py-16 bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-bold text-[#172033] text-sm">Memuat Dashboard Administrator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full pb-6">
      {/* 1. EXECUTIVE COMMAND HERO (#172033) */}
      <section className="relative overflow-hidden rounded-2xl bg-[#172033] text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#0362D0]/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-[#C99A2E]/15 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-3.5">
          {/* Top Bar: Live Firestore Sync Badge, Date, & Time Range Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Real-Time Cloud{lastSyncTime ? ` • ${lastSyncTime}` : ''}</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-[11px] font-semibold">
                <Calendar size={12} className="text-[#60A5FA]" />
                <span>{todayDateString}</span>
              </span>
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-lg text-[11px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Ambil data terbaru langsung dari Cloud Firestore"
              >
                <RefreshCw size={12} className={cn('text-[#60A5FA]', isRefreshing && 'animate-spin')} />
                <span>{isRefreshing ? 'Sinkron...' : 'Sinkronkan'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#C99A2E]/20 border border-[#C99A2E]/30 text-[#FDE68A] text-[11px] font-bold">
                <span>TA {semesterInfo.academicYear} • {semesterInfo.semesterName}</span>
              </span>

              {/* Time Range Filter */}
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1">
                <Clock size={12} className="text-[#60A5FA]" />
                <select
                  id="admin-dashboard-timerange-select"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as DashboardTimeRange)}
                  aria-label="Filter Batasan Rentang Waktu Rekap Dashboard"
                  className="text-[11px] font-bold text-white bg-transparent outline-none cursor-pointer border-none p-0 focus:ring-0 [&>option]:text-[#172033]"
                >
                  <option value="semester">Semester Aktif ({semesterInfo.semesterName})</option>
                  <option value="8weeks">8 Pertemuan Terakhir</option>
                  <option value="4weeks">4 Pertemuan Terakhir</option>
                </select>
                {rangeLoading && <Loader2 size={11} className="animate-spin text-[#60A5FA]" />}
              </div>

              {/* Manual Cloud Sync Button (Desktop/Tablet) */}
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Ambil data terbaru langsung dari Cloud Firestore"
              >
                <RefreshCw size={13} className={cn('text-[#60A5FA]', isRefreshing && 'animate-spin')} />
                <span>{isRefreshing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
              </button>
            </div>
          </div>

          {/* Middle Row: Title + Quick Action Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#0362D0] text-white">
                  Pusat Kendali Institusi
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  Pertemuan Ke-{activeMeetingNumber}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1">
                Assalamu'alaikum, Administrator BTQ
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-2xl">
                Pantau kehadiran santri, capaian nilai kurikulum, kesiapan ujian, dan kepatuhan jurnal 10 kelompok secara real-time.
              </p>
            </div>

            {/* Integrated Compact Quick Actions */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
              <Link
                to="/session"
                className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl bg-[#0362D0] hover:bg-[#024B9E] text-white font-bold text-xs shadow-sm transition-all"
              >
                <UserCheck size={14} />
                <span>Sesi Mengajar</span>
              </Link>
              <Link
                to="/reports"
                className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-all"
              >
                <Edit3 size={14} className="text-[#FDE68A]" />
                <span>Cetak Rapor</span>
              </Link>
              <Link
                to="/attendance/mentors"
                className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-all"
              >
                <Users size={14} className="text-emerald-300" />
                <span>Presensi Mentor</span>
              </Link>
              <Link
                to="/students"
                className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-all"
              >
                <PlusCircle size={14} className="text-sky-300" />
                <span>Data Santri</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4-CARD BENTO INSTITUTIONAL KPI GRID (2x2 on Mobile, 4 Cols on Desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Kapasitas Institusi */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 border-t-4 border-t-[#0362D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Santri Aktif
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#172033] tabular-nums">
                  {kpiSummary.activeStudentsCount}
                </span>
                <span className="text-xs font-bold text-slate-500">Santri</span>
              </div>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold">
            <span className="text-[#0362D0] bg-[#0362D0]/10 px-2 py-0.5 rounded-md">
              {kpiSummary.totalKelompokVal} Kelompok
            </span>
            <span className="text-slate-600">{kpiSummary.totalMentorVal} Mentor Binaan</span>
          </div>
        </div>

        {/* KPI 2: Kehadiran Institusi */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 border-t-4 border-t-emerald-600 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Kehadiran Sesi Ini
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#172033] tabular-nums">
                  {kpiSummary.hasAttendanceThisWeek ? `${kpiSummary.attendanceThisWeekVal}%` : '-'}
                </span>
                {kpiSummary.hasAttendanceSemester && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Sem: {kpiSummary.attendanceAvgVal}%
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-500">
            <span className="truncate">{thisWeekLabel}</span>
            <span className="text-emerald-700 font-bold shrink-0">Standar ≥ 75%</span>
          </div>
        </div>

        {/* KPI 3: Rata-rata Nilai & Progres KBM */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 border-t-4 border-t-[#C99A2E] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Rata-rata Nilai BTQ
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#172033] tabular-nums">
                  {kpiSummary.groupsWithProgCount > 0 ? kpiSummary.progressAvgVal : '-'}
                </span>
                <span className="text-xs font-bold text-slate-400">/ 100</span>
              </div>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#C99A2E]/10 text-[#C99A2E] flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px] font-bold">
            <span className="text-[#C99A2E] bg-[#C99A2E]/10 px-2 py-0.5 rounded-md">
              {kpiSummary.groupsOnTarget}/{kpiSummary.totalKelompokVal} Halaqah ≥ KKM
            </span>
            <span className="text-slate-500">KKM 75</span>
          </div>
        </div>

        {/* KPI 4: Kesiapan Ujian Institusi (Nilai >= 75 & Kehadiran >= 75%) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 border-t-4 border-t-indigo-600 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Santri Siap Ujian
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#172033] tabular-nums">
                  {examReadinessSummary.examReadyCount}
                </span>
                <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {examReadinessSummary.examReadyRatePercent}%
                </span>
              </div>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px] font-bold">
            <span className="text-slate-500 truncate" title="Wajib Rata-rata Nilai ≥ 75 & Kehadiran ≥ 75%">
              Nilai & Hadir ≥ 75%
            </span>
            {examReadinessSummary.needsGuidanceCount > 0 ? (
              <span className="text-[#950415] bg-[#950415]/10 px-2 py-0.5 rounded-md shrink-0">
                {examReadinessSummary.needsGuidanceCount} Bimbingan
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                Tuntas
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ADMIN CURRICULUM & SESSION CONSISTENCY ALERT */}
      <CurriculumSyncAlert />

      {/* 3. TRACKER KEPATUHAN INPUT SESI & JURNAL MENTOR (PERTEMUAN AKTIF) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-[#172033] text-sm sm:text-base">
                  Status Kepatuhan Input KBM Mentor — Pertemuan Ke-{activeMeetingNumber}
                </h2>
                <span
                  className={cn(
                    'text-[10px] font-black uppercase px-2 py-0.5 rounded-md border',
                    meetingCompliance.compliancePercent === 100
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  )}
                >
                  {meetingCompliance.completedGroupsCount}/{meetingCompliance.totalGroups} Kelompok Selesai Lengkap
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Indikator kelengkapan 3 tahapan wajib setiap pertemuan: Presensi Kehadiran, Input Nilai, dan Jurnal Pengajaran
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowCalendarSection((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-[#172033] text-xs font-bold transition-colors cursor-pointer"
            >
              <Calendar size={13} className="text-[#0362D0]" />
              <span>{showCalendarSection ? 'Tutup Kalender' : 'Kalender Akademik'}</span>
              {showCalendarSection ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <Link
              to="/journals"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0362D0]/10 hover:bg-[#0362D0]/15 text-[#0362D0] text-xs font-bold transition-colors"
            >
              <span>Cek Jurnal</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* 10 Groups Compliance Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-3.5">
          {meetingCompliance.items.map((item) => {
            const badgeStyle = item.isComplete
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : item.completedSteps > 0
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-600';

            return (
              <div
                key={item.groupId}
                className={cn(
                  'rounded-xl border p-2.5 flex flex-col justify-between gap-1.5 transition-all',
                  badgeStyle
                )}
                title={`${item.groupName} (${item.mentorName}): ${item.statusLabel}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-xs text-[#172033] truncate">
                    {item.groupName.replace('Kelompok ', 'Kel. ')}
                  </span>
                  {item.isComplete ? (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle
                      size={13}
                      className={cn(
                        'shrink-0',
                        item.completedSteps > 0 ? 'text-amber-600' : 'text-slate-400'
                      )}
                    />
                  )}
                </div>
                <p className="text-[10px] font-medium text-slate-500 truncate">{item.mentorName}</p>
                {/* 3 Step Dots: Presensi (P), Nilai (N), Jurnal (J) */}
                <div className="flex items-center gap-1 pt-1 border-t border-black/5">
                  <span
                    className={cn(
                      'flex-1 text-center text-[9px] font-black py-0.5 rounded',
                      item.hasAttendance
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    )}
                    title="Presensi Kehadiran"
                  >
                    Absen
                  </span>
                  <span
                    className={cn(
                      'flex-1 text-center text-[9px] font-black py-0.5 rounded',
                      item.hasProgress
                        ? 'bg-[#0362D0] text-white'
                        : 'bg-slate-200 text-slate-500'
                    )}
                    title="Input Nilai BTQ"
                  >
                    Nilai
                  </span>
                  <span
                    className={cn(
                      'flex-1 text-center text-[9px] font-black py-0.5 rounded',
                      item.hasJournal
                        ? 'bg-[#C99A2E] text-white'
                        : 'bg-slate-200 text-slate-500'
                    )}
                    title="Jurnal Pengajaran"
                  >
                    Jurnal
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COLLAPSIBLE ACADEMIC CALENDAR */}
      {showCalendarSection && (
        <AcademicCalendarCard allAttendance={allAttendance} journals={journals} />
      )}

      {/* MOBILE ONLY: PANEL PERLU PERHATIAN */}
      <div className="block lg:hidden">
        <AttentionPanel alerts={attentionAlerts} isLoading={loading} />
      </div>

      {/* 4. UNIFIED INTERACTIVE ANALYTICS HUB (MENGURANGI TUMPUKAN GRAFIK BERLEBIH) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="font-extrabold text-[#172033] text-sm sm:text-base flex items-center gap-2">
              <BarChart3 size={18} className="text-[#0362D0]" />
              <span>Analitik Kehadiran & Capaian Kelompok</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih tampilan analitik untuk memantau tren pertemuan atau membandingkan performa antar kelompok
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setAnalyticsTab('trends')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer',
                analyticsTab === 'trends'
                  ? 'bg-[#172033] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#172033]'
              )}
            >
              <PieChart size={14} />
              <span>Tren & Distribusi Hadir</span>
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsTab('groups')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer',
                analyticsTab === 'groups'
                  ? 'bg-[#172033] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#172033]'
              )}
            >
              <Layers size={14} />
              <span>Perbandingan 10 Kelompok</span>
            </button>
          </div>
        </div>

        {analyticsTab === 'trends' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <WeeklyAttendanceSummaryCard
              data={weeklyOverallAttendanceData}
              averageRate={overallAverageRate}
              latestRate={overallLatestRate}
            />
            <AttendanceChartCard
              periodData={attendancePeriodData}
              totalStudents={students.length || 155}
              thisWeekMeetingLabel={thisWeekLabel}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GroupProgressBarCard data={groupProgressBarData} />
            <GroupWeeklyAttendanceCard
              weeklyData={weeklyGroupAttendanceData}
              cumulativeGroups={cumulativeGroupAttendanceData}
            />
          </div>
        )}
      </section>

      {/* 5. MAIN CONTENT & SIDEBAR: TABEL RINGKASAN KELOMPOK + PERLU PERHATIAN + AKTIVITAS REALTIME */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GroupSummaryTable groups={groupDetails} />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="hidden lg:block">
            <AttentionPanel alerts={attentionAlerts} isLoading={loading} />
          </div>

          <RecentActivitiesCard activities={activities} onOpenModal={handleOpenLogModal} />
        </div>
      </section>

      <ActivityLogModal isOpen={isLogModalOpen} onClose={handleCloseLogModal} />
    </div>
  );
}
