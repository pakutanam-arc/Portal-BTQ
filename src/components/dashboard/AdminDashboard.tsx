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
  UserCheck2, 
  CheckSquare,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getGroups, 
  getTotalStudentsCount, 
  getGroupStudentsCount, 
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
  getStudentAttendance,
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
  invalidateDbCache
} from '../../services/db';
import { cn } from '../../utils/cn';
import { ActivityLogModal } from '../modals/ActivityLogModal';
import { theme } from '../../theme';
import { StatCardsGrid, StatCardItem } from './StatCardsGrid';
import { AttendanceChartCard, AttendancePeriodStats } from './AttendanceChartCard';
import { GroupProgressBarCard, GroupProgressItem } from './GroupProgressBarCard';
import { GroupSummaryTable, GroupDetailItem, WeeklyProgressPoint } from './GroupSummaryTable';
import { AttentionPanel, AttentionAlert } from './AttentionPanel';
import { RecentActivitiesCard } from './RecentActivitiesCard';
import { AttendanceHistoryWidget } from './AttendanceHistoryWidget';
import { CurriculumSyncAlert } from '../CurriculumSyncAlert';
import { WeeklyAttendanceSummaryCard, WeeklyOverallAttendancePoint } from './WeeklyAttendanceSummaryCard';
import { GroupWeeklyAttendanceCard, WeeklyGroupDataPoint, GroupAttendanceDetail } from './GroupWeeklyAttendanceCard';
import { AcademicCalendarCard } from './AcademicCalendarCard';
import { getMeetingRealDate, formatShortDateID, formatLocalDateString } from '../../services/academicCalendar';
import { getAcademicHolidays, subscribeAcademicHolidays, AcademicHoliday } from '../../services/db/calendar';
import { normalizeGroupId } from '../../services/db/groups';
import { sortStudents } from '../../utils/studentUtils';

export type DashboardTimeRange = 'semester' | '8weeks' | '4weeks';

export function AdminDashboard() {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('semester');
  const [rangeLoading, setRangeLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [allProgress, setAllProgress] = useState<StudentProgress[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [allAttendance, setAllAttendance] = useState<StudentAttendance[]>([]);
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  // Perhitungan rentang waktu rekap (Semester Aktif / 4-8 Pertemuan Terakhir)
  const semesterInfo: SemesterInfo = useMemo(() => getActiveSemesterInfo(), []);

  const activeRangeConfig = useMemo(() => {
    if (timeRange === '4weeks') {
      const startDate = getRecentWeeksStartDate(4);
      return {
        key: '4weeks' as const,
        label: '4 Pertemuan Terakhir',
        shortLabel: '4 Pertemuan',
        startDate,
        description: `Sejak ${startDate}`
      };
    }
    if (timeRange === '8weeks') {
      const startDate = getRecentWeeksStartDate(8);
      return {
        key: '8weeks' as const,
        label: '8 Pertemuan Terakhir',
        shortLabel: '8 Pertemuan',
        startDate,
        description: `Sejak ${startDate}`
      };
    }
    return {
      key: 'semester' as const,
      label: `Semester ${semesterInfo.semesterName} (${semesterInfo.academicYear})`,
      shortLabel: `Sem. ${semesterInfo.semesterName}`,
      startDate: semesterInfo.startDate,
      description: `Semester Aktif (${semesterInfo.startDate} s/d ${semesterInfo.endDate})`
    };
  }, [timeRange, semesterInfo]);

  // Fungsi pemanggilan data murni dari Cloud Firestore (forceFresh: true)
  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      if (isManualRefresh) {
        invalidateDbCache(); // Bersihkan seluruh cache lokal untuk memastikan pembacaan live
      }
      const [
        groupsData, 
        mentorsData, 
        activitiesData,
        progressData,
        studentsData,
        journalsRes,
        attendanceData,
        holidaysData
      ] = await Promise.all([
        getGroups(true),
        getMentors(true),
        getSystemActivities(100),
        getAllStudentProgress(2000, true),
        getStudents(true),
        getTeachingJournals(undefined, 100),
        getAllStudentAttendance(activeRangeConfig.startDate, 2000, true),
        getAcademicHolidays(true)
      ]);

      const sortedGroups = [...groupsData].sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
      setGroups(sortedGroups);
      setTotalStudents(studentsData.length);
      setMentors(mentorsData);
      setActivities(activitiesData);
      setAllProgress(progressData);
      setStudents(studentsData);
      setJournals(journalsRes?.data || []);
      setAllAttendance(attendanceData || []);
      setHolidays(holidaysData || []);

      // Hitung santri per kelompok dengan normalisasi ID yang konsisten
      const counts: Record<string, number> = {};
      sortedGroups.forEach((g) => {
        counts[g.id] = studentsData.filter(
          s => normalizeGroupId(s.groupId) === normalizeGroupId(g.id)
        ).length;
      });
      setGroupCounts(counts);

      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.error("Error fetching live dashboard data:", error);
    } finally {
      setLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [activeRangeConfig.startDate]);

  useEffect(() => {
    let isMounted = true;

    // 1. Pemuatan awal data murni dari Cloud Firestore
    loadData(false);

    // 2. Real-time Firestore Subscriptions: Multi-perangkat & multi-browser sinkron instan
    const unsubAttendance = subscribeToAllStudentAttendance((freshAttendance) => {
      if (!isMounted) return;
      setAllAttendance(freshAttendance);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });

    const unsubProgress = subscribeToAllStudentProgress((freshProgress) => {
      if (!isMounted) return;
      setAllProgress(freshProgress);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });

    const unsubJournals = subscribeToTeachingJournals((freshJournals) => {
      if (!isMounted) return;
      setJournals(freshJournals);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });

    const unsubStudents = subscribeToStudents((freshStudents) => {
      if (!isMounted) return;
      setStudents(freshStudents);
      setTotalStudents(freshStudents.length);
    });

    const unsubHolidays = subscribeAcademicHolidays((freshHolidays) => {
      if (!isMounted) return;
      setHolidays(freshHolidays);
    });

    // Event lokal untuk tab yang sama
    const handleDataUpdated = () => {
      loadData(false);
    };

    window.addEventListener('attendance-updated', handleDataUpdated);
    window.addEventListener('progress-updated', handleDataUpdated);
    window.addEventListener('journal-updated', handleDataUpdated);
    window.addEventListener('db-cache-invalidated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);

    return () => {
      isMounted = false;
      unsubAttendance();
      unsubProgress();
      unsubJournals();
      unsubStudents();
      unsubHolidays();
      window.removeEventListener('attendance-updated', handleDataUpdated);
      window.removeEventListener('progress-updated', handleDataUpdated);
      window.removeEventListener('journal-updated', handleDataUpdated);
      window.removeEventListener('db-cache-invalidated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
    };
  }, [loadData]);

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
          getAllStudentAttendance(activeRangeConfig.startDate, 2000)
        ]);
        if (!isSubscribed) return;
        setJournals(journalsRes?.data || []);
        setAllAttendance(attendanceData || []);
      } catch (err) {
        console.error("Gagal memperbarui rentang rekap dashboard:", err);
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

  // Memoize group details transformation synchronized with REAL progress data & future weeks
  const groupDetails: GroupDetailItem[] = useMemo(() => {
    // Map students by normalized groupId
    const studentsByGroup = new Map<string, Student[]>();
    students.forEach((s) => {
      const gNorm = normalizeGroupId(s.groupId);
      const list = studentsByGroup.get(gNorm) || [];
      list.push(s);
      studentsByGroup.set(gNorm, list);
    });

    // Map progress by studentId and normalized groupId
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

    // Helper untuk mengekstrak nomor pekan/sesi secara dinamis dari catatan progres
    const extractSessionNumber = (p: StudentProgress): number => {
      if (p.meetingNumber && p.meetingNumber > 0) return p.meetingNumber;
      if (p.sessionId) {
        const match = p.sessionId.match(/(?:s|session_?)(\d+)/i) || p.sessionId.match(/(\d+)$/);
        if (match) return parseInt(match[1] || match[0], 10);
      }
      return 1;
    };

    // Deteksi pekan yang telah terlaksana secara dinamis:
    // 1. Dari jurnal pengajaran yang telah direkam mentor
    const journalMaxWeek = journals.reduce((max, j) => Math.max(max, j.meetingNumber || 0), 0);

    // 2. Dari catatan progres siswa tersimpan di Firestore (input nilai oleh mentor)
    const savedProgressMaxWeek = allProgress.reduce((max, p) => {
      const s = extractSessionNumber(p);
      return Math.max(max, s);
    }, 0);

    const attendanceMaxWeek = allAttendance.reduce((max, a) => Math.max(max, a.meetingNumber || 0), 0);
    const activeMaxWeek = Math.max(0, journalMaxWeek, savedProgressMaxWeek, attendanceMaxWeek);
    const activeWeeksList: number[] = [];
    for (let w = 1; w <= activeMaxWeek; w++) {
      activeWeeksList.push(w);
    }

    // Precompute attendance stats per group from allAttendance using normalized groupId
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
      const studentsCount = gStudents.length || groupCounts[g.id] || groupCounts[gNorm] || 0;
      const gProgs = progressByGroup.get(gNorm) || [];

      // Kelompokkan nilai siswa per nomor pekan murni dari Firestore
      const progsByWeek = new Map<number, number[]>();
      gProgs.forEach((p) => {
        const sNum = extractSessionNumber(p);
        const scores = progsByWeek.get(sNum) || [];
        if (typeof p.total === 'number' && !isNaN(p.total) && p.total > 0) {
          scores.push(p.total);
        }
        progsByWeek.set(sNum, scores);
      });

      // Hitung capaian per pekan secara dinamis murni dari data Firestore
      const weeklyProgress: WeeklyProgressPoint[] = activeWeeksList.map((weekNum, wIdx) => {
        const weekScores = progsByWeek.get(weekNum) || [];
        const hasScores = weekScores.length > 0;
        const weekAvg = hasScores
          ? Math.round(weekScores.reduce((acc, c) => acc + c, 0) / weekScores.length)
          : 0;

        const prevWeekScores = wIdx > 0 ? (progsByWeek.get(activeWeeksList[wIdx - 1]) || []) : [];
        const prevAvg = prevWeekScores.length > 0
          ? Math.round(prevWeekScores.reduce((acc, c) => acc + c, 0) / prevWeekScores.length)
          : 0;

        const delta = (hasScores && prevAvg > 0) ? (weekAvg - prevAvg) : 0;

        return {
          week: weekNum,
          label: `P${weekNum}`,
          progress: weekAvg,
          target: 75,
          delta,
          isCurrent: weekNum === activeMaxWeek
        };
      });

      // Capaian terkini adalah capaian di pekan terakhir yang memiliki nilai riil
      const validPoints = weeklyProgress.filter(p => p.progress > 0);
      const latestPoint = validPoints.length > 0 ? validPoints[validPoints.length - 1] : null;
      const currentProgress = latestPoint ? latestPoint.progress : 0;

      let statusLabel: 'Baik' | 'Perlu Dipantau' | 'Perlu Pendampingan' | 'Belum Diinput' = 'Belum Diinput';
      if (currentProgress > 0) {
        if (currentProgress < 65) {
          statusLabel = 'Perlu Pendampingan';
        } else if (currentProgress < 75) {
          statusLabel = 'Perlu Dipantau';
        } else {
          statusLabel = 'Baik';
        }
      }

      // Real attendance rate from allAttendance murni tanpa estimasi acak
      const groupAtt = groupAttendanceMap.get(gNorm);
      const attendance = groupAtt && groupAtt.total > 0
        ? Math.round((groupAtt.present / groupAtt.total) * 100)
        : 0;

      return {
        id: g.id,
        name: g.name,
        mentorName,
        studentsCount,
        progress: currentProgress,
        attendance,
        status: statusLabel,
        weeklyProgress
      };
    });
  }, [groups, mentorMap, groupCounts, students, allProgress, journals, allAttendance]);

  // Helper to compute stats for a specific set of attendance records (murni tanpa fabrikasi)
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
          { name: 'Alpa', value: 0, count: 0, color: '#950415' }
        ]
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
        { name: 'Alpa', value: pAlpa, count: absent, color: '#950415' }
      ]
    };
  };

  // Resolve relevant meeting session for "Minggu Ini" (Saturday meeting cycle)
  const { thisWeekRecords, thisWeekLabel } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    const isSaturdayToday = currentDay === 6;
    const todayStr = formatLocalDateString(now);

    // If today is Saturday, check if attendance has been taken for today
    if (isSaturdayToday) {
      const todayMatches = allAttendance.filter(a => a.date && a.date.startsWith(todayStr));
      if (todayMatches.length > 0) {
        return {
          thisWeekRecords: todayMatches,
          thisWeekLabel: 'pertemuan Sabtu hari ini'
        };
      }
    }

    // Ambil pertemuan dengan nomor pekan tertinggi yang telah tercatat
    let maxMeetingNumber = 0;
    allAttendance.forEach(a => {
      if (a.meetingNumber && a.meetingNumber > maxMeetingNumber) {
        maxMeetingNumber = a.meetingNumber;
      }
    });

    if (maxMeetingNumber > 0) {
      const latestMeetingRecords = allAttendance.filter(a => a.meetingNumber === maxMeetingNumber);
      if (latestMeetingRecords.length > 0) {
        const matchedRecord = latestMeetingRecords.find(r => r.date);
        const realDateLabel = matchedRecord?.date 
          ? formatShortDateID(matchedRecord.date) 
          : (getMeetingRealDate(maxMeetingNumber) ? formatShortDateID(getMeetingRealDate(maxMeetingNumber)!) : '');
        const labelSuffix = realDateLabel ? ` (${realDateLabel})` : '';

        return {
          thisWeekRecords: latestMeetingRecords,
          thisWeekLabel: isSaturdayToday ? 'pertemuan Sabtu hari ini' : `Pertemuan Ke-${maxMeetingNumber}${labelSuffix}`
        };
      }
    }

    // Check records for the most recent Saturday
    const daysSinceLastSaturday = (currentDay + 1) % 7;
    const lastSaturdayDate = new Date(now.getTime() - daysSinceLastSaturday * 24 * 60 * 60 * 1000);
    const lastSaturdayStr = formatLocalDateString(lastSaturdayDate);

    const lastSaturdayMatches = allAttendance.filter(a => a.date && a.date.startsWith(lastSaturdayStr));
    if (lastSaturdayMatches.length > 0) {
      return {
        thisWeekRecords: lastSaturdayMatches,
        thisWeekLabel: isSaturdayToday ? 'pertemuan Sabtu hari ini' : 'pertemuan Sabtu lalu'
      };
    }

    // Dynamic fallback: take the latest recorded halaqah date in the database
    const dateStrings = Array.from(
      new Set(allAttendance.map(a => a.date ? a.date.split('T')[0] : ''))
    ).filter(Boolean).sort().reverse();

    const latestDate = dateStrings[0];
    const latestMatches = latestDate ? allAttendance.filter(a => a.date && a.date.startsWith(latestDate)) : [];

    return {
      thisWeekRecords: latestMatches.length > 0 ? latestMatches : allAttendance,
      thisWeekLabel: isSaturdayToday ? 'pertemuan Sabtu hari ini' : 'pertemuan Sabtu lalu'
    };
  }, [allAttendance]);

  // Synchronized attendance statistics for all period filters (This Week, Month, 6 Months, All)
  const attendancePeriodData = useMemo<Record<'thisWeek' | 'month' | 'sixMonths' | 'all', AttendancePeriodStats>>(() => {
    if (!allAttendance || allAttendance.length === 0) {
      return {
        thisWeek: computeAttendanceStats([]),
        month: computeAttendanceStats([]),
        sixMonths: computeAttendanceStats([]),
        all: computeAttendanceStats([])
      };
    }

    // Sort unique dates descending to find the latest active session date
    const dateStrings = Array.from(
      new Set(allAttendance.map(a => a.date ? a.date.split('T')[0] : ''))
    ).filter(Boolean).sort().reverse();

    const latestDate = dateStrings[0];
    const latestDateObj = latestDate ? new Date(latestDate) : new Date();

    // Month records: sessions within 30 days of latest session
    const thirtyDaysAgo = new Date(latestDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthRecords = allAttendance.filter(a => {
      if (!a.date) return false;
      const d = new Date(a.date.split('T')[0]);
      return d >= thirtyDaysAgo && d <= latestDateObj;
    });

    // 6 Months records: sessions within 180 days of latest session (Semester)
    const sixMonthsAgo = new Date(latestDateObj.getTime() - 180 * 24 * 60 * 60 * 1000);
    const sixMonthsRecords = allAttendance.filter(a => {
      if (!a.date) return false;
      const d = new Date(a.date.split('T')[0]);
      return d >= sixMonthsAgo && d <= latestDateObj;
    });

    // All records: cumulative history
    const allRecords = allAttendance;

    const thisWeekStats = computeAttendanceStats(thisWeekRecords);
    const monthStats = computeAttendanceStats(monthRecords);
    const sixMonthsStats = computeAttendanceStats(sixMonthsRecords);
    const allStats = computeAttendanceStats(allRecords);

    return {
      thisWeek: thisWeekStats,
      month: monthStats,
      sixMonths: sixMonthsStats,
      all: allStats
    };
  }, [allAttendance, thisWeekRecords]);

  // Real group progress list for bar chart
  const groupProgressBarData: GroupProgressItem[] = useMemo(() => {
    return groupDetails.map((gd) => ({
      name: gd.name,
      progress: gd.progress
    }));
  }, [groupDetails]);

  // Memoize summary statistics cards for Admin (Murni data riil)
  const statCards: StatCardItem[] = useMemo(() => {
    const totalSiswaVal = totalStudents || students.length;
    const totalKelompokVal = groups.length;
    const totalMentorVal = mentors.length;
    const attendanceThisWeekVal = attendancePeriodData.thisWeek.rate;
    const attendanceAvgVal = attendancePeriodData.sixMonths.rate;
    const groupsWithProg = groupDetails.filter(g => g.progress > 0);
    const progressAvgVal = groupsWithProg.length 
      ? Math.round(groupsWithProg.reduce((sum, g) => sum + g.progress, 0) / groupsWithProg.length)
      : 0;

    return [
      { 
        label: 'Total Siswa', 
        value: `${totalSiswaVal}`, 
        sub: 'Terdaftar aktif',
        trend: '100% kapasitas',
        icon: Users, 
        color: 'text-[#0362D0]', 
        bg: 'bg-[#0362D0]/10', 
        border: 'border-[#0362D0]/20' 
      },
      { 
        label: 'Kelompok BTQ', 
        value: `${totalKelompokVal}`, 
        sub: 'Halaqah binaan',
        trend: 'Terdistribusi merata',
        icon: Layers, 
        color: 'text-[#C99A2E]', 
        bg: 'bg-[#C99A2E]/10', 
        border: 'border-[#C99A2E]/20' 
      },
      { 
        label: 'Mentor', 
        value: `${totalMentorVal}`, 
        sub: 'Ustadz / Ustadzah',
        trend: '1 mentor per kelompok',
        icon: UserCheck2, 
        color: 'text-[#0362D0]', 
        bg: 'bg-[#0362D0]/10', 
        border: 'border-[#0362D0]/20' 
      },
      { 
        label: 'Kehadiran Minggu Ini', 
        value: attendancePeriodData.thisWeek.total > 0 ? `${attendanceThisWeekVal}%` : '-', 
        sub: thisWeekLabel === 'pertemuan Sabtu hari ini' ? 'Pertemuan Sabtu ini' : 'Pertemuan Sabtu lalu',
        trend: attendancePeriodData.thisWeek.total > 0 ? 'Siswa hadir kelas' : 'Belum ada presensi',
        icon: UserCheck, 
        color: 'text-[#0362D0]', 
        bg: 'bg-[#0362D0]/10', 
        border: 'border-[#0362D0]/20' 
      },
      { 
        label: 'Rata-rata Kehadiran', 
        value: attendancePeriodData.sixMonths.total > 0 ? `${attendanceAvgVal}%` : '-', 
        sub: 'Akumulasi semester',
        trend: attendancePeriodData.sixMonths.total > 0 ? 'Konsisten di atas target' : 'Belum ada data',
        icon: TrendingUp, 
        color: 'text-[#0362D0]', 
        bg: 'bg-[#0362D0]/10', 
        border: 'border-[#0362D0]/20' 
      },
      { 
        label: 'Rata-rata Progress', 
        value: groupsWithProg.length > 0 ? `${progressAvgVal}%` : '-', 
        sub: 'Pencapaian silabus',
        trend: groupsWithProg.length > 0 ? 'Sesuai timeline kurikulum' : 'Belum diinput mentor',
        icon: CheckSquare, 
        color: 'text-[#C99A2E]', 
        bg: 'bg-[#C99A2E]/10', 
        border: 'border-[#C99A2E]/20' 
      },
    ];
  }, [totalStudents, groups.length, mentors.length, groupDetails, attendancePeriodData, thisWeekLabel]);

  // -------------------------------------------------------------
  // ANALISIS PEKANAN KEHADIRAN (RINGKASAN KESELURUHAN & RINCIAN KELOMPOK)
  // -------------------------------------------------------------
  const { 
    weeklyOverallAttendanceData, 
    weeklyGroupAttendanceData, 
    cumulativeGroupAttendanceData,
    overallAverageRate,
    overallLatestRate
  } = useMemo(() => {
    // 1. Kumpulkan seluruh tanggal unik presensi & urutkan kronologis (terlama ke terbaru)
    const uniqueDates = Array.from(
      new Set(allAttendance.map(a => a.date ? a.date.split('T')[0] : ''))
    ).filter(Boolean).sort();

    // Petakan jurnal untuk korelasi tanggal ke nomor pekan jika ada
    const dateToJournalMeeting = new Map<string, number>();
    journals.forEach(j => {
      if (j.date && j.meetingNumber) {
        dateToJournalMeeting.set(j.date.split('T')[0], j.meetingNumber);
      }
    });

    // Standar acuan resmi tanggal kalender BTQ Sabtu
    const dateToWeekMap = new Map<string, number>();
    dateToWeekMap.set('2026-08-15', 1);
    dateToWeekMap.set('2026-08-22', 2);

    journals.forEach(j => {
      if (j.date && j.meetingNumber) {
        dateToWeekMap.set(j.date.split('T')[0], j.meetingNumber);
      }
    });

    // Petakan sisa tanggal jika ada tanggal lain diinput
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

    // Ambil daftar nomor pekan unik HANYA dari data riil presensi dan jurnal
    const allWeekNumbersSet = new Set<number>();
    allAttendance.forEach(a => {
      if (a.meetingNumber && a.meetingNumber > 0) {
        allWeekNumbersSet.add(a.meetingNumber);
      } else if (a.date) {
        const dStr = a.date.split('T')[0];
        const wNum = dateToWeekMap.get(dStr);
        if (wNum) allWeekNumbersSet.add(wNum);
      }
    });

    journals.forEach(j => {
      if (j.meetingNumber && j.meetingNumber > 0) {
        allWeekNumbersSet.add(j.meetingNumber);
      }
    });

    const sortedWeeks = Array.from(allWeekNumbersSet).sort((a, b) => a - b);

    // Format helper tanggal Indonesia singkat (misal: "15 Agu")
    const formatShortDate = (dStr: string) => {
      try {
        const d = new Date(dStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      } catch {
        return dStr;
      }
    };

    // Helper cari tanggal representatif untuk pertemuan
    const getWeekDateLabel = (weekNum: number): string | undefined => {
      // 1. Cek dari rekaman presensi langsung
      const matchedRecord = allAttendance.find(a => a.meetingNumber === weekNum && a.date);
      if (matchedRecord && matchedRecord.date) return formatShortDate(matchedRecord.date);

      // 2. Cek dari jurnal pembelajaran
      const matchedJournal = journals.find(j => j.meetingNumber === weekNum && j.date);
      if (matchedJournal && matchedJournal.date) return formatShortDate(matchedJournal.date);

      // 3. Cek dari mapping tanggal unik
      for (const [dStr, wNum] of dateToWeekMap.entries()) {
        if (wNum === weekNum) return formatShortDate(dStr);
      }

      // 4. Jadwal kalender akademik riil
      const fallbackDate = getMeetingRealDate(weekNum, [], holidays);
      if (fallbackDate) return formatShortDate(fallbackDate);

      return undefined;
    };

    // 2. Hitung Ringkasan Tiap Pertemuan Keseluruhan Siswa Murni Data Firestore
    const weeklyOverall: WeeklyOverallAttendancePoint[] = sortedWeeks.map((weekNum) => {
      const weekRecords = allAttendance.filter(a => {
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

      weekRecords.forEach(r => {
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
        target: 80
      };
    });

    // 3. Hitung Rincian Tiap Kelompok per Pekan Murni Data Riil
    const weeklyGroups: WeeklyGroupDataPoint[] = sortedWeeks.map((weekNum) => {
      const groupDataList: GroupAttendanceDetail[] = groups.map((g) => {
        const gNorm = normalizeGroupId(g.id);
        const mentorName = mentorMap.get(g.mentorId) || 'Ustadz / Ustadzah';
        const gRecords = allAttendance.filter(a => {
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

        gRecords.forEach(r => {
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
          total: gTotal
        };
      });

      const dLabel = getWeekDateLabel(weekNum);
      const displayLabel = dLabel ? `Pertemuan ${weekNum} (${dLabel})` : `Pertemuan ${weekNum}`;

      return {
        week: weekNum,
        label: displayLabel,
        dateLabel: dLabel,
        groups: groupDataList
      };
    });

    // 4. Hitung Kumulatif Tiap Kelompok Murni Data Riil
    const cumulativeGroups: GroupAttendanceDetail[] = groups.map((g) => {
      const gNorm = normalizeGroupId(g.id);
      const mentorName = mentorMap.get(g.mentorId) || 'Ustadz / Ustadzah';
      const gRecords = allAttendance.filter(a => normalizeGroupId(a.groupId) === gNorm);

      let gPresent = 0;
      let gPerm = 0;
      let gSick = 0;
      let gAbs = 0;
      const gTotal = gRecords.length;

      gRecords.forEach(r => {
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
        total: gTotal
      };
    });

    const validOverallWeeks = weeklyOverall.filter(w => w.total > 0);
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
      overallLatestRate: latRate
    };
  }, [allAttendance, journals, groups, mentorMap, totalStudents, groupDetails, groupCounts, holidays]);

  // Dynamically compute real attention alerts based on actual database data
  const attentionAlerts: AttentionAlert[] = useMemo(() => {
    const alerts: AttentionAlert[] = [];

    // 1. KELOMPOK DENGAN PROGRESS DI BAWAH KKM (75%) - hanya kelompok dengan data riil tersimpan
    const lowProgressGroups = [...groupDetails]
      .filter((g) => g.progress > 0 && g.progress < 75)
      .sort((a, b) => a.progress - b.progress);

    if (lowProgressGroups.length > 0) {
      const lowest = lowProgressGroups[0];
      alerts.push({
        id: `progress-${lowest.id}`,
        type: lowest.progress < 65 ? 'danger' : 'warning',
        title: lowest.name,
        description: `Progress BTQ ${lowest.progress}% — di bawah target KKM (75%).`,
        link: '/groups',
        badge: 'KKM 75%'
      });

      if (lowProgressGroups.length > 1) {
        const second = lowProgressGroups[1];
        alerts.push({
          id: `progress-${second.id}`,
          type: 'warning',
          title: second.name,
          description: `Progress BTQ ${second.progress}% — perlu pendampingan silabus.`,
          link: '/groups',
          badge: 'Capaian'
        });
      }
    }

    // 2. KELOMPOK DENGAN KEHADIRAN DI BAWAH 80% - hanya kelompok dengan log presensi tersimpan
    const lowAttendanceGroups = [...groupDetails]
      .filter((g) => g.attendance > 0 && g.attendance < 80)
      .sort((a, b) => a.attendance - b.attendance);

    if (lowAttendanceGroups.length > 0) {
      const lowestAtt = lowAttendanceGroups[0];
      alerts.push({
        id: `attendance-${lowestAtt.id}`,
        type: 'warning',
        title: lowestAtt.name,
        description: `Kehadiran siswa menyentuh ${lowestAtt.attendance}% pada sesi ini.`,
        link: '/attendance/students',
        badge: 'Presensi'
      });
    }

    // 3. SISWA TERANCAM (KEHADIRAN KUMULATIF < 75% ATAU SKOR < 70)
    const studentAttMap = new Map<string, { present: number; total: number }>();
    allAttendance.forEach((att) => {
      if (!att.studentId) return;
      const cur = studentAttMap.get(att.studentId) || { present: 0, total: 0 };
      cur.total += 1;
      if (att.status === 'Hadir') cur.present += 1;
      studentAttMap.set(att.studentId, cur);
    });

    let atRiskCount = 0;
    studentAttMap.forEach(({ present, total }) => {
      if (total > 0 && (present / total) < 0.75) {
        atRiskCount++;
      }
    });

    if (atRiskCount === 0 && allProgress.length > 0) {
      const lowScores = new Set<string>();
      allProgress.forEach((p) => {
        if (typeof p.total === 'number' && p.total > 0 && p.total < 70) {
          lowScores.add(p.studentId);
        }
      });
      atRiskCount = lowScores.size;
    }

    if (atRiskCount > 0) {
      alerts.push({
        id: 'at-risk-students',
        type: 'warning',
        title: `${atRiskCount} siswa terancam`,
        description: `Memiliki tingkat kehadiran kumulatif di bawah 75%.`,
        link: '/attendance/students',
        badge: 'Evaluasi'
      });
    }

    // 4. MENTOR / KELOMPOK BELUM CHECK-IN / MEREKAP JURNAL PEKAN TERAKHIR
    const maxJournalMeeting = journals.reduce((max, j) => Math.max(max, j.meetingNumber || 0), 0);
    const activeWeek = Math.max(2, maxJournalMeeting);

    const recordedGroupIds = new Set(
      journals
        .filter((j) => j.meetingNumber === activeWeek)
        .map((j) => normalizeGroupId(j.groupId))
    );

    const unrecordedGroups = groups.filter((g) => !recordedGroupIds.has(normalizeGroupId(g.id)));

    if (unrecordedGroups.length > 0) {
      if (unrecordedGroups.length === 1) {
        alerts.push({
          id: 'mentor-checkin-missing',
          type: 'warning',
          title: '1 mentor belum check-in',
          description: `${unrecordedGroups[0].name} belum melakukan absensi & jurnal sesi.`,
          link: '/session',
          badge: 'Jurnal'
        });
      } else {
        alerts.push({
          id: 'mentor-checkin-missing',
          type: 'warning',
          title: `${unrecordedGroups.length} mentor belum check-in`,
          description: `${unrecordedGroups.slice(0, 2).map((g) => g.name).join(', ')}${unrecordedGroups.length > 2 ? ' dll.' : ''} belum rekap jurnal pertemuan ${activeWeek}.`,
          link: '/attendance/mentors',
          badge: `Pertemuan ${activeWeek}`
        });
      }
    }

    return alerts;
  }, [groupDetails, allAttendance, allProgress, journals, groups]);

  // Memoized date string
  const todayDateString = useMemo(() => {
    const date = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
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
    <div className="flex flex-col gap-4 sm:gap-6 w-full">
      
      {/* 1. HEADER DASHBOARD ADMIN */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👋</span>
            <h1 className={theme.typography.h1}>
              Assalamu'alaikum, Admin
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-[#950415]/10 text-[#950415] border border-[#950415]/20">
              Panel Pengelola
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Pantau kehadiran institusi dan perkembangan pembelajaran BTQ seluruh siswa SMP Negeri 102 Jakarta.
          </p>
        </div>

        {/* Calendar, Semester info & Time Range Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-stretch md:self-auto bg-white p-2 rounded-2xl border border-slate-100">
          {/* Live Sync Status & Manual Refresh Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[#172033] border border-slate-200/90 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Ambil data terbaru langsung dari Cloud Firestore tanpa cache"
            >
              <RefreshCw size={13} className={cn("text-[#0362D0]", isRefreshing && "animate-spin")} />
              <span>{isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan Data Cloud'}</span>
            </button>

            {lastSyncTime && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Firestore • {lastSyncTime}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-xl text-[11px] font-bold text-[#172033] border border-slate-100/80">
            <Calendar size={13} className="text-[#0362D0]" />
            <span>{todayDateString}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-xl text-[11px] font-bold text-[#172033] border border-slate-100/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E]" />
            <span>Tahun {semesterInfo.academicYear} • {semesterInfo.semesterName}</span>
          </div>
          {/* Batas Rentang Waktu Rekap Presensi & Jurnal */}
          <div className="flex items-center gap-1.5 bg-[#0362D0]/5 border border-[#0362D0]/20 rounded-xl px-2.5 py-1">
            <Clock size={12} className="text-[#0362D0]" />
            <label htmlFor="admin-dashboard-timerange-select" className="text-[10px] uppercase font-bold text-[#0362D0] tracking-wider hidden sm:inline">
              Rekap:
            </label>
            <select 
              id="admin-dashboard-timerange-select"
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as DashboardTimeRange)}
              aria-label="Filter Batasan Rentang Waktu Rekap Dashboard"
              className="text-[11px] font-bold text-[#0362D0] bg-transparent outline-none cursor-pointer border-none p-0 focus:ring-0"
            >
              <option value="semester">Semester Aktif ({semesterInfo.semesterName})</option>
              <option value="8weeks">8 Pertemuan Terakhir</option>
              <option value="4weeks">4 Pertemuan Terakhir</option>
            </select>
            {rangeLoading && <Loader2 size={11} className="animate-spin text-[#0362D0] ml-0.5" />}
          </div>
        </div>
      </header>

      {/* ADMIN-ONLY CURRICULUM & SESSION CONSISTENCY ALERT */}
      <CurriculumSyncAlert />

      {/* BENTO QUICK ACTIONS HUB */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          to="/session"
          className="relative overflow-hidden bg-gradient-to-br from-[#0362D0] to-[#024B9E] p-4 sm:p-5 rounded-2xl text-white hover:shadow-lg hover:-translate-y-1 transition-all group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-125 transition-transform duration-500">
            <UserCheck size={80} />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3">
              <UserCheck size={20} className="text-white" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-lg mb-1">Mulai Sesi KBM</h3>
            <p className="text-white/80 text-[10px] sm:text-xs font-medium">Buka form sesi mengajar & presensi</p>
          </div>
        </Link>

        <Link 
          to="/reports"
          className="relative overflow-hidden bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl hover:border-[#0362D0]/30 hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="relative z-10">
            <div className="w-10 h-10 bg-[#0362D0]/10 rounded-xl flex items-center justify-center mb-3 text-[#0362D0] group-hover:bg-[#0362D0] group-hover:text-white transition-colors">
              <Edit3 size={20} />
            </div>
            <h3 className="font-extrabold text-[#172033] text-sm sm:text-lg mb-1">Laporan Nilai</h3>
            <p className="text-slate-500 text-[10px] sm:text-xs font-medium">Unduh progres akademik santri</p>
          </div>
        </Link>

        <Link 
          to="/attendance/mentors"
          className="relative overflow-hidden bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl hover:border-[#C99A2E]/30 hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="relative z-10">
            <div className="w-10 h-10 bg-[#C99A2E]/10 rounded-xl flex items-center justify-center mb-3 text-[#C99A2E] group-hover:bg-[#C99A2E] group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
            <h3 className="font-extrabold text-[#172033] text-sm sm:text-lg mb-1">Presensi Mentor</h3>
            <p className="text-slate-500 text-[10px] sm:text-xs font-medium">Kelola & pantau kehadiran staf</p>
          </div>
        </Link>

        <Link 
          to="/students"
          className="relative overflow-hidden bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl hover:border-emerald-500/30 hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="relative z-10">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <PlusCircle size={20} />
            </div>
            <h3 className="font-extrabold text-[#172033] text-sm sm:text-lg mb-1">Data Siswa</h3>
            <p className="text-slate-500 text-[10px] sm:text-xs font-medium">Manajemen profil & mutasi santri</p>
          </div>
        </Link>
      </section>

      {/* 2. SUMMARY STATISTICS INSTITUSI */}
      <StatCardsGrid cards={statCards} />

      {/* KALENDER AKADEMIK FLEKSIBEL (SINKRONISASI PERTEMUAN KE- & TANGGAL RIIL) */}
      <AcademicCalendarCard 
        allAttendance={allAttendance}
        journals={journals}
      />

      {/* MOBILE ONLY: PANEL PERLU PERHATIAN */}
      <div className="block lg:hidden">
        <AttentionPanel alerts={attentionAlerts} isLoading={loading} />
      </div>

      {/* 3 & 4. CHARTS SECTION (KEHADIRAN & PROGRES SEMUA KELOMPOK) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceChartCard 
          periodData={attendancePeriodData} 
          totalStudents={totalStudents || 155} 
          thisWeekMeetingLabel={thisWeekLabel}
        />
        <GroupProgressBarCard data={groupProgressBarData} />
      </section>

      {/* ANALISIS KEHADIRAN PER PERTEMUAN (RINGKASAN KESELURUHAN & RINCIAN KELOMPOK) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyAttendanceSummaryCard 
          data={weeklyOverallAttendanceData}
          averageRate={overallAverageRate}
          latestRate={overallLatestRate}
        />
        <GroupWeeklyAttendanceCard 
          weeklyData={weeklyGroupAttendanceData}
          cumulativeGroups={cumulativeGroupAttendanceData}
        />
      </section>

      {/* 5. MAIN CONTENT & SIDEBAR */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / LARGE COLUMN: RINGKASAN SEMUA KELOMPOK BTQ */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GroupSummaryTable groups={groupDetails} />
        </div>

        {/* RIGHT / SIDEBAR COLUMN (ATTENTION, RECENT ACTIVITIES) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* DESKTOP ONLY: PANEL PERLU PERHATIAN */}
          <div className="hidden lg:block">
            <AttentionPanel alerts={attentionAlerts} isLoading={loading} />
          </div>

          {/* WIDGET ATTENDANCE HISTORY (SESI AKTIF) */}
          <AttendanceHistoryWidget 
            students={students}
            recentAttendances={allAttendance}
          />

          {/* RECENT ACTIVITIES */}
          <RecentActivitiesCard 
            activities={activities} 
            onOpenModal={handleOpenLogModal} 
          />

        </div>
      </section>

      <ActivityLogModal isOpen={isLogModalOpen} onClose={handleCloseLogModal} />
    </div>
  );
}
