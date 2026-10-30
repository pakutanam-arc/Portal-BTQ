import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  UserCheck, 
  Award, 
  BookOpen, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Search, 
  ArrowRight,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  LineChart as LineChartIcon,
  MessageCircle,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getGroups, 
  getMentors, 
  getStudentsByGroup, 
  getStudentProgressByGroup,
  getStudentAttendanceByGroup,
  getTeachingJournals,
  Group, 
  Mentor, 
  StudentProgress,
  TeachingJournal 
} from '../../services/db';
import { masterGrades, masterSessions, CURRICULUM_CONFIG, getGradeForGroup } from '../../services/curriculumData';
import { 
  StudentProgressChartModal, 
  StudentWithStats, 
  SessionHistoryItem,
  StudentAttendanceHistoryItem
} from './StudentProgressChartModal';
import { useDebounce } from '../../hooks/useDebounce';
import { sortStudents } from '../../utils/studentUtils';
import { normalizeGroupId } from '../../services/db/groups';
import { 
  selectPriorityStudents, 
  evaluateStudentExamReadiness, 
  MIN_PROGRESS_SCORE_STANDARD, 
  MIN_ATTENDANCE_RATE_STANDARD 
} from '../../utils/sessionMetrics';
import { cn } from '../../utils/cn';

type StudentWithReadiness = StudentWithStats & {
  latestScore: number;
  isExamReady: boolean;
  needsGuidance: boolean;
  meetsScoreStandard: boolean;
  meetsAttendanceStandard: boolean;
  readinessReason: string;
};

function TrendIndicator({ trend, diff, score }: { trend: 'Meningkat' | 'Menurun' | 'Konsisten'; diff: number; score?: number }) {
  if (trend === 'Meningkat' || diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 tabular-nums">
        <TrendingUp size={13} className="stroke-[2.5] shrink-0" />
        <span>+{diff > 0 ? diff : 1} Naik</span>
      </span>
    );
  }
  if (trend === 'Menurun' || diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 tabular-nums">
        <TrendingDown size={13} className="stroke-[2.5] shrink-0" />
        <span>{diff < 0 ? diff : -1} Turun</span>
      </span>
    );
  }

  const isHigh = (score ?? 75) >= MIN_PROGRESS_SCORE_STANDARD;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold tabular-nums", isHigh ? "text-amber-700" : "text-slate-500")}>
      <Minus size={13} className="stroke-[2.5] shrink-0" />
      <span>Konsisten</span>
    </span>
  );
}

function AttendanceBarCell({ 
  history, 
  rate 
}: { 
  history?: StudentAttendanceHistoryItem[]; 
  rate: number; 
}) {
  if (!history || history.length === 0) {
    return <span className="text-slate-400 text-xs font-semibold">Belum tercatat</span>;
  }

  const hadirCount = history.filter(h => h.status === 'Hadir').length;
  const barColor = rate >= 85 ? 'bg-emerald-600' : rate >= MIN_ATTENDANCE_RATE_STANDARD ? 'bg-amber-500' : 'bg-rose-600';
  const textColor = rate >= 85 ? 'text-emerald-700' : rate >= MIN_ATTENDANCE_RATE_STANDARD ? 'text-amber-700' : 'text-rose-700';

  return (
    <div 
      className="flex flex-col gap-1 min-w-[125px]"
      title={`Riwayat Presensi: ${history.map(i => `P${i.meetingNumber}: ${i.status}`).join(' · ')} (${rate}%)`}
    >
      <div className="flex items-center justify-between text-xs tabular-nums">
        <span className={cn("font-extrabold", textColor)}>{rate}%</span>
        <span className="text-[11px] text-slate-500 font-medium">
          {hadirCount}/{history.length} Hadir
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} 
          className={cn("h-full rounded-full transition-all duration-300", barColor)} 
        />
      </div>
    </div>
  );
}

export function MentorDashboard() {
  const { currentUser, userData } = useAuth();
  const tableSectionRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [mentorGroup, setMentorGroup] = useState<Group | null>(null);
  const [mentorProfile, setMentorProfile] = useState<Mentor | null>(null);
  const [students, setStudents] = useState<StudentWithReadiness[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SIAP_UJIAN' | 'PERLU_BIMBINGAN' | 'Sangat Baik' | 'Baik' | 'Perlu Bimbingan'>('ALL');
  const [trendFilter, setTrendFilter] = useState<'ALL' | 'Meningkat' | 'Konsisten' | 'Menurun'>('ALL');
  const [selectedStudentForChart, setSelectedStudentForChart] = useState<StudentWithStats | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMentorDashboardData() {
      try {
        const [groupsData, mentorsData] = await Promise.all([
          getGroups(),
          getMentors()
        ]);

        if (!isMounted) return;

        const userEmailLower = (currentUser?.email || userData?.email || '').toLowerCase();
        const matchAlumni = userEmailLower.match(/alumni\s*(\d+)/i);
        const alumniNum = matchAlumni ? parseInt(matchAlumni[1], 10) : null;
        const inferredGroupId = alumniNum ? `g${alumniNum}` : null;

        const matched = mentorsData.find(
          m => (userData?.id && m.id === userData.id) ||
               (currentUser?.uid && m.id === currentUser.uid) ||
               (userEmailLower && m.email?.toLowerCase() === userEmailLower) ||
               (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase()) ||
               (inferredGroupId && m.groupId === inferredGroupId) ||
               (userData?.groupId && m.groupId === userData.groupId)
        );

        setMentorProfile(matched || null);

        const assignedGroupId = matched?.groupId || userData?.groupId || inferredGroupId || 'g1';
        const targetGroup = groupsData.find(g => 
          g.id === assignedGroupId || 
          (alumniNum && g.name?.toLowerCase().includes(`kelompok ${alumniNum}`)) ||
          g.mentorId === (matched?.id || userData?.id)
        ) || groupsData.find(g => g.id === assignedGroupId) || groupsData[0];

        setMentorGroup(targetGroup);

        if (targetGroup) {
          const [groupStudentsRaw, allProg, journalsRes, groupAttendance] = await Promise.all([
            getStudentsByGroup(targetGroup.id),
            getStudentProgressByGroup(targetGroup.id, 500, true),
            getTeachingJournals(targetGroup.id, 50),
            getStudentAttendanceByGroup(targetGroup.id, 500, true)
          ]);

          if (!isMounted) return;

          const groupStudents = sortStudents(groupStudentsRaw);
          setJournals(journalsRes.data || []);

          const assignedGrade = getGradeForGroup(targetGroup);
          const isGrade3 = assignedGrade.id === 'grade3';

          const studentIds = new Set(groupStudents.map(s => s.id));
          const normTargetGroupId = normalizeGroupId(targetGroup.id);
          const studentProgressMap = new Map<string, StudentProgress[]>();
          allProg
            .filter(p => studentIds.has(p.studentId) || normalizeGroupId(p.groupId) === normTargetGroupId)
            .forEach(p => {
              const list = studentProgressMap.get(p.studentId) || [];
              list.push(p);
              studentProgressMap.set(p.studentId, list);
            });

          const mappedStudents: StudentWithReadiness[] = groupStudents.map((s) => {
            const historyRaw = studentProgressMap.get(s.id) || [];
            
            const sortedRaw = [...historyRaw].sort((a, b) => {
              const numA = parseInt(a.sessionId?.match(/\d+$/)?.[0] || '0', 10);
              const numB = parseInt(b.sessionId?.match(/\d+$/)?.[0] || '0', 10);
              if (numA !== numB) return numA - numB;
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            // Filter out 0-score placeholder records generated when a student was absent (Alpa/Izin/Sakit)
            const validHistory: StudentProgress[] = sortedRaw.filter(rec => (rec.total || 0) > 0);

            const sessionHistory: SessionHistoryItem[] = validHistory.map((rec, sIdx) => {
              const sNum = rec.meetingNumber || parseInt(rec.sessionId?.match(/\d+$/)?.[0] || String(sIdx + 1), 10);
              const matchedSession = masterSessions.find(
                ms => ms.gradeId === assignedGrade.id && ms.sessionNumber === sNum
              );
              const prevRec = sIdx > 0 ? validHistory[sIdx - 1] : null;
              const diff = prevRec ? (rec.total - prevRec.total) : 0;
              const status: 'Meningkat' | 'Menurun' | 'Konsisten' = 
                diff > 0 ? 'Meningkat' : diff < 0 ? 'Menurun' : 'Konsisten';

              return {
                sessionNumber: sNum,
                sessionId: rec.sessionId || `s${sNum}`,
                topic: matchedSession?.topic || `Pertemuan ${sNum}`,
                pageRef: matchedSession?.pageRef,
                date: rec.date,
                reading: rec.reading,
                tajwid: rec.tajwid,
                writing: rec.writing,
                memorization: isGrade3 ? (rec.memorization || 0) : 0,
                memorizedSurah: rec.memorizedSurah,
                total: rec.total,
                diffFromPrev: diff,
                status
              };
            });

            const hasProgress = sessionHistory.length > 0;
            const latestSession = hasProgress ? sessionHistory[sessionHistory.length - 1] : null;
            const prevSession = sessionHistory.length > 1 ? sessionHistory[sessionHistory.length - 2] : null;
            const latestScore: number = latestSession ? latestSession.total : 0;
            const trendDiff = prevSession && latestSession ? (latestSession.total - prevSession.total) : 0;
            const trend: 'Meningkat' | 'Menurun' | 'Konsisten' = 
              trendDiff > 0 ? 'Meningkat' : trendDiff < 0 ? 'Menurun' : 'Konsisten';

            const sAttRecords = (groupAttendance || []).filter(a => a.studentId === s.id);
            const sortedAtt = [...sAttRecords].sort((a, b) => {
              if (a.meetingNumber && b.meetingNumber) return a.meetingNumber - b.meetingNumber;
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            const attendanceHistory: StudentAttendanceHistoryItem[] = sortedAtt.map((rec, aIdx) => ({
              meetingNumber: rec.meetingNumber || (aIdx + 1),
              date: rec.date || '',
              status: (rec.status === 'Hadir' || rec.status === 'Izin' || rec.status === 'Sakit' || rec.status === 'Alpa')
                ? rec.status
                : 'Hadir',
              notes: rec.notes || ''
            }));

            // Evaluate average progress score AND attendance rate across all meetings against minimum standards (>= 75 & >= 75%)
            const readiness = evaluateStudentExamReadiness({
              sessionTotals: sessionHistory.map(item => item.total),
              attendanceStatuses: attendanceHistory.map(item => item.status),
              minScoreStandard: MIN_PROGRESS_SCORE_STANDARD,
              minAttendanceStandard: MIN_ATTENDANCE_RATE_STANDARD,
            });

            const avgScore = readiness.averageScore;
            const att = readiness.attendanceRate;

            let statusCat: 'Sangat Baik' | 'Baik' | 'Perlu Bimbingan' = 'Baik';
            if (hasProgress) {
              if (avgScore >= 85 && (!readiness.hasAttendanceData || att >= MIN_ATTENDANCE_RATE_STANDARD)) {
                statusCat = 'Sangat Baik';
              } else if (avgScore >= MIN_PROGRESS_SCORE_STANDARD && (!readiness.hasAttendanceData || att >= MIN_ATTENDANCE_RATE_STANDARD)) {
                statusCat = 'Baik';
              } else {
                statusCat = 'Perlu Bimbingan';
              }
            }

            let readinessReason = 'Belum Cukup Data';
            if (readiness.isExamReady) {
              readinessReason = 'Siap Ujian';
            } else if (readiness.hasScoreData && avgScore < MIN_PROGRESS_SCORE_STANDARD && readiness.hasAttendanceData && att < MIN_ATTENDANCE_RATE_STANDARD) {
              readinessReason = `Nilai < ${MIN_PROGRESS_SCORE_STANDARD} & Hadir < ${MIN_ATTENDANCE_RATE_STANDARD}%`;
            } else if (readiness.hasScoreData && avgScore < MIN_PROGRESS_SCORE_STANDARD) {
              readinessReason = `Nilai Rata-rata < ${MIN_PROGRESS_SCORE_STANDARD}`;
            } else if (readiness.hasAttendanceData && att < MIN_ATTENDANCE_RATE_STANDARD) {
              readinessReason = `Kehadiran < ${MIN_ATTENDANCE_RATE_STANDARD}%`;
            } else if (readiness.hasScoreData) {
              readinessReason = 'Menunggu Presensi';
            }

            let currentStageText = hasProgress ? `P${latestSession?.sessionNumber}: ${assignedGrade.programName}` : 'Belum Diinput';
            if (latestSession) {
              if (isGrade3) {
                currentStageText = latestSession.memorizedSurah 
                  ? `P${latestSession.sessionNumber}: ${latestSession.memorizedSurah}`
                  : `P${latestSession.sessionNumber}: Target Juz 30`;
              } else if (latestSession.pageRef) {
                const cleanedPage = latestSession.pageRef.replace(/^Halaman\s+/i, '');
                currentStageText = `P${latestSession.sessionNumber}: Hal. ${cleanedPage}`;
              }
            }

            return {
              ...s,
              currentStage: currentStageText,
              progressScore: avgScore,
              latestScore,
              attendanceRate: att,
              attendanceHistory,
              statusCategory: statusCat,
              sessionHistory,
              trend,
              trendDiff,
              latestSessionNumber: latestSession?.sessionNumber || 3,
              isExamReady: readiness.isExamReady,
              needsGuidance: readiness.needsGuidance,
              meetsScoreStandard: readiness.meetsScoreStandard,
              meetsAttendanceStandard: readiness.meetsAttendanceStandard,
              readinessReason,
            };
          });

          setStudents(sortStudents(mappedStudents));
        }
      } catch (err) {
        console.error("Error loading mentor dashboard:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMentorDashboardData();

    const handleDataUpdated = () => {
      loadMentorDashboardData();
    };

    window.addEventListener('attendance-updated', handleDataUpdated);
    window.addEventListener('progress-updated', handleDataUpdated);
    window.addEventListener('journal-updated', handleDataUpdated);
    window.addEventListener('db-cache-invalidated', handleDataUpdated);
    window.addEventListener('user_profile_updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('attendance-updated', handleDataUpdated);
      window.removeEventListener('progress-updated', handleDataUpdated);
      window.removeEventListener('journal-updated', handleDataUpdated);
      window.removeEventListener('db-cache-invalidated', handleDataUpdated);
      window.removeEventListener('user_profile_updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
    };
  }, [currentUser, userData]);

  const defaultRooms: Record<number, string> = {
    1: 'Mushola',
    2: 'Mushola',
    3: 'Mushola',
    4: '9A',
    5: '9B',
    6: '9C',
    7: 'Perpustakaan',
    8: 'Perpustakaan',
    9: '7C lantai 1',
    10: '9D',
  };

  const groupNumber = useMemo(() => {
    const email = currentUser?.email || userData?.email || '';
    const emailMatch = email.toLowerCase().match(/alumni\s*(\d+)/i);
    if (emailMatch) {
      return parseInt(emailMatch[1], 10);
    }

    if (!mentorGroup) return 1;
    const matchName = mentorGroup.name?.match(/\d+/);
    if (matchName) return parseInt(matchName[0], 10);
    const matchId = mentorGroup.id?.match(/\d+/);
    if (matchId) return parseInt(matchId[0], 10);
    return 1;
  }, [mentorGroup, currentUser, userData]);

  const targetGrade = useMemo(() => {
    if (groupNumber === 10) return masterGrades[2];
    if ([4, 5, 6, 9].includes(groupNumber)) return masterGrades[1];
    if ([1, 2, 3, 7, 8].includes(groupNumber)) return masterGrades[0];
    return getGradeForGroup(mentorGroup);
  }, [mentorGroup, groupNumber]);

  const activeCurriculumSession = useMemo(() => {
    const sessions = masterSessions.filter(s => s.gradeId === targetGrade.id && s.semester === 1);
    return (
      sessions.find(s => s.sessionNumber === CURRICULUM_CONFIG.currentActiveSessionNumber) ||
      sessions.find(s => s.sessionNumber === 3) ||
      sessions[0]
    );
  }, [targetGrade]);

  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) {
      return {
        totalStudents: 0,
        avgAttendance: 0,
        avgProgress: 0,
        hasAttendanceData: false,
        hasProgressData: false,
        readyForExam: 0,
        baikCount: 0,
        needAttention: 0,
        scoredStudentsCount: 0,
      };
    }

    const studentsWithAtt = students.filter(s => (s.attendanceHistory || []).length > 0);
    const totalAtt = studentsWithAtt.reduce((acc, s) => acc + s.attendanceRate, 0);
    const studentsWithProg = students.filter(s => s.sessionHistory && s.sessionHistory.length > 0);
    const totalProg = studentsWithProg.reduce((acc, s) => acc + s.progressScore, 0);

    // Siap Ujian: Rata-rata nilai >= 75 DAN Kehadiran >= 75%
    const ready = students.filter(s => s.isExamReady).length;
    // Perlu Pendampingan: Rata-rata nilai < 75 ATAU Kehadiran < 75%
    const attention = students.filter(s => s.needsGuidance).length;
    // Santri lainnya yang sudah dinilai
    const baik = Math.max(0, studentsWithProg.length - ready - studentsWithProg.filter(s => s.needsGuidance).length);

    return {
      totalStudents: total,
      avgAttendance: studentsWithAtt.length > 0 ? Math.round(totalAtt / studentsWithAtt.length) : 0,
      avgProgress: studentsWithProg.length > 0 ? Math.round(totalProg / studentsWithProg.length) : 0,
      hasAttendanceData: studentsWithAtt.length > 0,
      hasProgressData: studentsWithProg.length > 0,
      readyForExam: ready,
      baikCount: baik,
      needAttention: attention,
      scoredStudentsCount: studentsWithProg.length,
    };
  }, [students]);

  const priorityStudents = useMemo(() => {
    return selectPriorityStudents(students, 4);
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    const res = students.filter(s => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.class.toLowerCase().includes(q) || (s.nis && s.nis.includes(q));
      let matchStatus = true;
      if (statusFilter === 'SIAP_UJIAN') {
        matchStatus = s.isExamReady;
      } else if (statusFilter === 'PERLU_BIMBINGAN') {
        matchStatus = s.needsGuidance;
      } else if (statusFilter !== 'ALL') {
        matchStatus = s.statusCategory === statusFilter;
      }
      const matchTrend = trendFilter === 'ALL' || s.trend === trendFilter;
      return matchSearch && matchStatus && matchTrend;
    });
    return sortStudents(res);
  }, [students, debouncedSearchQuery, statusFilter, trendFilter]);

  const todayDateString = useMemo(() => {
    const date = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }, []);

  const mentorDisplayName = useMemo(() => {
    const customName = (userData?.name || mentorProfile?.name || '').trim();
    if (customName && !customName.match(/^(?:kak\s+)?alumni\s*\d+$/i) && customName !== 'User' && customName !== 'Pengguna') {
      return customName;
    }
    if (customName) {
      return customName;
    }
    const email = currentUser?.email || userData?.email || '';
    const emailMatch = email.toLowerCase().match(/alumni\s*(\d+)/i);
    if (emailMatch) {
      return `Kak Alumni ${emailMatch[1]}`;
    }
    if (groupNumber >= 1 && groupNumber <= 10) {
      return `Kak Alumni ${groupNumber}`;
    }
    return 'Kak Alumni';
  }, [mentorProfile, userData, currentUser, groupNumber]);

  const groupTitle = `Kelompok ${groupNumber}`;
  const groupRoom = mentorGroup?.room || defaultRooms[groupNumber] || 'Mushola';
  const groupSchedule = mentorGroup?.schedule || 'Sabtu, 07:15 - 08:00';
  const nextMeetingNum = Math.max(journals.length + 1, activeCurriculumSession?.sessionNumber || 1);

  const handleCardFilterClick = (targetStatus: 'ALL' | 'SIAP_UJIAN' | 'PERLU_BIMBINGAN') => {
    setStatusFilter(prev => (prev === targetStatus ? 'ALL' : targetStatus));
    if (tableSectionRef.current) {
      tableSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSendStudentWA = (s: StudentWithReadiness) => {
    let text = `Assalamu'alaikum Wr. Wb. Ayah/Bunda wali dari ananda ${s.name} (Kelas ${s.class}).\n\n`;
    text += `Menginformasikan perkembangan bimbingan BTQ (${groupTitle} - ${targetGrade.programName}):\n`;
    text += `• Capaian Materi: ${s.currentStage}\n`;
    text += `• Rata-rata Nilai KBM: ${s.progressScore || '-'} / 100 (Standar Min: ${MIN_PROGRESS_SCORE_STANDARD})\n`;
    text += `• Kehadiran KBM: ${s.attendanceRate}% (Standar Min: ${MIN_ATTENDANCE_RATE_STANDARD}%)\n`;
    text += `• Status Evaluasi: ${s.isExamReady ? 'Siap Ujian' : s.readinessReason}\n\n`;
    text += `Mohon dukungan dan motivasi di rumah agar ananda semakin lancar dan istiqomah dalam belajar Al-Qur'an. Terima kasih.`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full py-16 bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-bold text-[#172033] text-sm">Memuat Beranda Halaqah Binaan...</p>
        </div>
      </div>
    );
  }

  const totalEvaluated = Math.max(1, stats.readyForExam + stats.baikCount + stats.needAttention);

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full pb-12">
      
      {/* 1. COMPACT MOBILE-FRIENDLY COMMAND HERO */}
      <section 
        id="mentor-hero-welcome-banner"
        className="bg-[#172033] rounded-2xl p-4 sm:p-6 text-white border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 font-semibold">
            <span className="text-[#C99A2E] font-bold">Portal Pembina Halaqah</span>
            <span aria-hidden="true">·</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded-md text-white font-bold">{groupTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200">{targetGrade.programName}</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Assalamu'alaikum, {mentorDisplayName}
          </h1>

          {/* Compact horizontal metadata pills on mobile & desktop */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] sm:text-xs text-slate-300">
            <span className="inline-flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
              <MapPin size={12} className="text-[#C99A2E] shrink-0" />
              <span>Ruang: <strong className="text-white">{groupRoom}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
              <Clock size={12} className="text-sky-400 shrink-0" />
              <strong className="text-white">{groupSchedule}</strong>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
              <Calendar size={12} className="text-slate-400 shrink-0" />
              <span>{todayDateString}</span>
            </span>
          </div>
        </div>

        {/* Right: Primary & Secondary Actions (Compact side-by-side on mobile) */}
        <div className="grid grid-cols-1 sm:flex items-stretch sm:items-center gap-2.5 shrink-0">
          <Link 
            to="/session"
            id="mentor-hero-btn-start-session"
            className="bg-[#0362D0] hover:bg-[#0250AA] text-white rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 font-bold text-xs sm:text-sm transition-colors flex items-center justify-between sm:justify-center gap-3 shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck size={18} className="shrink-0" />
              <div className="text-left">
                <div className="font-bold text-xs sm:text-sm leading-tight">Buka Sesi Mengajar</div>
                <div className="text-[11px] text-blue-100 font-medium tabular-nums">
                  Presensi, Nilai & Jurnal ({journals.length}x Selesai)
                </div>
              </div>
            </div>
            <ArrowRight size={16} className="shrink-0" />
          </Link>

          <Link
            to="/certifications"
            id="mentor-hero-btn-exam"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl px-4 py-2.5 sm:py-3.5 font-bold text-xs transition-colors flex items-center justify-between sm:justify-center gap-2.5 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Award size={16} className="text-[#C99A2E] shrink-0" />
              <div className="text-left">
                <div className="text-white font-bold text-xs leading-tight">Evaluasi & Ujian</div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-normal">Sertifikasi Jilid</div>
              </div>
            </div>
            <ChevronRight size={14} className="sm:hidden text-slate-400" />
          </Link>
        </div>
      </section>

      {/* 2. 2x2 MOBILE BENTO KPI GRID (4 Clickable Cards) */}
      <section id="mentor-group-statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: Total Santri & Kehadiran */}
        <button
          type="button"
          onClick={() => handleCardFilterClick('ALL')}
          className={cn(
            "bg-white p-3.5 sm:p-5 rounded-2xl border border-t-4 border-t-[#0362D0] text-left transition-all cursor-pointer flex flex-col justify-between",
            statusFilter === 'ALL' ? "border-slate-200 shadow-2xs" : "border-slate-200 opacity-85 hover:opacity-100"
          )}
        >
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Santri & Kehadiran</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between gap-1">
            <div>
              <span className="text-xl sm:text-3xl font-black text-[#172033] tabular-nums">
                {stats.totalStudents}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 font-semibold ml-1">Santri</span>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-sm sm:text-lg font-black tabular-nums",
                stats.avgAttendance >= MIN_ATTENDANCE_RATE_STANDARD ? "text-emerald-700" : "text-amber-700"
              )}>
                {stats.hasAttendanceData ? `${stats.avgAttendance}%` : '-'}
              </span>
              <span className="block text-[10px] text-slate-400">Rerata Hadir</span>
            </div>
          </div>

          <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
            <span className="truncate">Min. Hadir ≥ {MIN_ATTENDANCE_RATE_STANDARD}%</span>
            <span className="font-bold text-[#0362D0] shrink-0">Semua</span>
          </div>
        </button>

        {/* Card 2: Rata-rata Nilai & Standar KKM */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 border-t-4 border-t-[#C99A2E] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Rata-rata Nilai</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#C99A2E]/10 text-[#C99A2E] flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>

          <div className="my-2 space-y-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <div>
                <span className="text-xl sm:text-3xl font-black text-[#172033] tabular-nums">
                  {stats.hasProgressData ? stats.avgProgress : '-'}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold ml-0.5">/100</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tabular-nums">
                {stats.scoredStudentsCount}/{stats.totalStudents} Dinilai
              </span>
            </div>

            {/* Horizontal Stacked Quality Distribution Bar */}
            <div className="w-full h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden flex">
              {(stats.readyForExam + stats.baikCount + stats.needAttention) > 0 && (
                <>
                  <div
                    style={{ width: `${(stats.readyForExam / totalEvaluated) * 100}%` }}
                    className="bg-emerald-600"
                    title={`Siap Ujian: ${stats.readyForExam}`}
                  />
                  <div
                    style={{ width: `${(stats.baikCount / totalEvaluated) * 100}%` }}
                    className="bg-[#C99A2E]"
                    title={`Proses: ${stats.baikCount}`}
                  />
                  <div
                    style={{ width: `${(stats.needAttention / totalEvaluated) * 100}%` }}
                    className="bg-[#950415]"
                    title={`Perlu Bimbingan: ${stats.needAttention}`}
                  />
                </>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 tabular-nums">
            <span>Standar KKM ≥ <strong className="text-[#172033]">{MIN_PROGRESS_SCORE_STANDARD}</strong></span>
            <span className="font-bold text-emerald-700">{stats.avgProgress >= MIN_PROGRESS_SCORE_STANDARD ? 'Tuntas' : 'Evaluasi'}</span>
          </div>
        </div>

        {/* Card 3: Siap Ujian (Wajib Nilai >= 75 DAN Kehadiran >= 75%) */}
        <button
          type="button"
          onClick={() => handleCardFilterClick('SIAP_UJIAN')}
          className={cn(
            "bg-white p-3.5 sm:p-5 rounded-2xl border border-t-4 border-t-emerald-600 text-left transition-all cursor-pointer flex flex-col justify-between",
            statusFilter === 'SIAP_UJIAN'
              ? "border-emerald-600 ring-2 ring-emerald-600/15 bg-emerald-50/20"
              : "border-slate-200 hover:border-emerald-400 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Siap Ujian</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Award size={15} />
            </div>
          </div>

          <div className="my-2 sm:my-3">
            <span className="text-xl sm:text-3xl font-black text-emerald-700 tabular-nums">
              {stats.readyForExam}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-600 font-semibold ml-1.5">Santri Layak</span>
          </div>

          <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
            <span className="text-emerald-800 font-bold" title="Syarat: Rata-rata Nilai ≥ 75 dan Kehadiran ≥ 75%">
              Nilai &amp; Hadir ≥{MIN_PROGRESS_SCORE_STANDARD}%
            </span>
            <span className="font-bold text-slate-500 shrink-0">
              {statusFilter === 'SIAP_UJIAN' ? 'Aktif ✓' : 'Filter →'}
            </span>
          </div>
        </button>

        {/* Card 4: Perlu Pendampingan (Nilai < 75 ATAU Kehadiran < 75%) */}
        <button
          type="button"
          onClick={() => handleCardFilterClick('PERLU_BIMBINGAN')}
          className={cn(
            "bg-white p-3.5 sm:p-5 rounded-2xl border border-t-4 border-t-[#950415] text-left transition-all cursor-pointer flex flex-col justify-between",
            statusFilter === 'PERLU_BIMBINGAN'
              ? "border-[#950415] ring-2 ring-[#950415]/15 bg-rose-50/20"
              : "border-slate-200 hover:border-rose-300 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Perlu Bimbingan</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#950415]/10 text-[#950415] flex items-center justify-center shrink-0">
              <AlertCircle size={15} />
            </div>
          </div>

          <div className="my-2 sm:my-3">
            <span className="text-xl sm:text-3xl font-black text-[#950415] tabular-nums">
              {stats.needAttention}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-600 font-semibold ml-1.5">Santri</span>
          </div>

          <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
            <span className="text-[#950415] font-bold" title="Rata-rata Nilai < 75 atau Kehadiran < 75%">
              Nilai / Hadir &lt;{MIN_PROGRESS_SCORE_STANDARD}%
            </span>
            <span className="font-bold text-slate-500 shrink-0">
              {statusFilter === 'PERLU_BIMBINGAN' ? 'Aktif ✓' : 'Filter →'}
            </span>
          </div>
        </button>

      </section>

      {/* 3. CONTINUITY & PRIORITY SPOTLIGHT GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Left (7 cols): Session Continuity Card (Jurnal Lalu -> Target Silabus Hari Ini) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#172033]">
                Kesinambungan Materi & Target Mengajar
              </h2>
              <p className="text-xs text-slate-500">
                Tindak lanjut pertemuan lalu menuju target silabus {groupTitle}
              </p>
            </div>
            <Link 
              to="/curriculum" 
              className="text-xs font-bold text-[#0362D0] hover:underline flex items-center gap-1"
            >
              <span>Silabus Lengkap</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
            {/* Previous Journal Summary */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500 shrink-0" />
                    <span>Pertemuan Terakhir</span>
                  </span>
                  {journals.length > 0 && (
                    <span className="tabular-nums text-[11px]">{journals[0].date}</span>
                  )}
                </div>

                {journals.length > 0 ? (
                  <>
                    <div className="text-xs font-bold text-[#172033] pt-0.5">
                      {journals[0].materialTaught}
                    </div>
                    {journals[0].pagesCovered && (
                      <div className="text-xs text-slate-600">
                        Capaian: <strong>{journals[0].pagesCovered}</strong>
                      </div>
                    )}
                    {journals[0].nextPlan && (
                      <div className="text-xs text-[#0362D0] font-semibold pt-0.5">
                        Rencana lanjut: &ldquo;{journals[0].nextPlan}&rdquo;
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500 pt-1">
                    Belum ada catatan jurnal tersimpan untuk kelompok ini.
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Total Jurnal: <strong className="text-[#172033] tabular-nums">{journals.length}x</strong></span>
                <Link to="/session" className="text-[#0362D0] font-bold hover:underline">
                  Perbarui Jurnal →
                </Link>
              </div>
            </div>

            {/* Current Active Syllabus Target */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/50 border border-[#0362D0]/20 flex flex-col justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#0362D0] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <BookOpen size={14} className="shrink-0" />
                    <span>Target Silabus Sesi {activeCurriculumSession?.sessionNumber || nextMeetingNum}</span>
                  </span>
                  <span className="text-slate-600 font-semibold whitespace-nowrap shrink-0 text-[11px]">
                    {targetGrade.id === 'grade3'
                      ? (activeCurriculumSession?.pageRef || 'Juz 30')
                      : (activeCurriculumSession?.pageRef ? `Hal. ${activeCurriculumSession.pageRef.replace(/^Halaman\s+/i, '')}` : 'Sesuai Buku')}
                  </span>
                </div>

                <div className="text-xs font-bold text-[#172033] pt-0.5">
                  {activeCurriculumSession?.topic || 'Pembelajaran Materi Kurikulum'}
                </div>

                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {targetGrade.id === 'grade3'
                    ? 'Fokus bimbingan kelancaran membaca Al-Qur\'an, talaqqi, dan setoran hafalan Juz 30.'
                    : `Pedoman: ${targetGrade.bookTitle}. Fokus ketepatan makhraj & tajwid.`}
                </p>
              </div>

              <div className="pt-2 border-t border-[#0362D0]/15 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">{targetGrade.programName}</span>
                <Link to="/session" className="font-bold text-[#0362D0] hover:underline flex items-center gap-1">
                  <span>Isi Sesi Ini</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right (5 cols): Actionable Priority Students Spotlight */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3.5">
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#172033]">
                Santri Perlu Perhatian Prioritas
              </h2>
              <p className="text-xs text-slate-500">
                Rata-rata nilai &lt; {MIN_PROGRESS_SCORE_STANDARD}, tren turun, atau kehadiran &lt; {MIN_ATTENDANCE_RATE_STANDARD}%
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold tabular-nums whitespace-nowrap shrink-0">
              {priorityStudents.length} Santri
            </span>
          </div>

          {priorityStudents.length > 0 ? (
            <div className="divide-y divide-slate-100 flex-1">
              {priorityStudents.map((item) => {
                const fullStudent = students.find(st => st.id === item.id);
                return (
                  <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#172033] truncate">{item.name}</span>
                        <span className="text-[11px] text-slate-500 shrink-0">({item.className})</span>
                      </div>
                      <div className="text-[11px] text-rose-700 font-medium mt-0.5 tabular-nums">
                        {item.reason} · Rata-rata: {item.progressScore > 0 ? item.progressScore : '-'} · Hadir: {item.attendanceRate}%
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {fullStudent && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSendStudentWA(fullStudent)}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            title={`Kirim pesan WA ke orang tua ${item.name}`}
                            aria-label={`Kirim WA ke wali ${item.name}`}
                          >
                            <MessageCircle size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForChart(fullStudent)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-[#0362D0] text-slate-700 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Detail
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 px-4 text-center bg-emerald-50/50 rounded-xl border border-emerald-200/60 my-auto">
              <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-[#172033]">
                Seluruh Santri Memenuhi Standar Minimal
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rata-rata nilai progres ≥ {MIN_PROGRESS_SCORE_STANDARD} dan tingkat kehadiran ≥ {MIN_ATTENDANCE_RATE_STANDARD}%.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Standar: Nilai ≥ {MIN_PROGRESS_SCORE_STANDARD} & Hadir ≥ {MIN_ATTENDANCE_RATE_STANDARD}%</span>
            {statusFilter !== 'PERLU_BIMBINGAN' ? (
              <button
                type="button"
                onClick={() => handleCardFilterClick('PERLU_BIMBINGAN')}
                className="font-bold text-[#0362D0] hover:underline cursor-pointer text-xs whitespace-nowrap"
              >
                Lihat Semua →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="font-bold text-slate-600 hover:underline cursor-pointer text-xs whitespace-nowrap"
              >
                Reset Filter ✕
              </button>
            )}
          </div>
        </div>

      </section>

      {/* 4. STUDENT PROGRESS & EXAM READINESS LIST (Mobile Cards + Desktop Table) */}
      <section ref={tableSectionRef} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        
        {/* Unified Table Header & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <h2 className="font-bold text-[#172033] text-sm sm:text-base">
              Daftar Capaian & Kesiapan Ujian Santri {groupTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Syarat <strong>Siap Ujian</strong>: Rata-rata Nilai Progres ≥ <strong>{MIN_PROGRESS_SCORE_STANDARD}</strong> dan Kehadiran ≥ <strong>{MIN_ATTENDANCE_RATE_STANDARD}%</strong> di setiap pertemuan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56 min-w-[160px]">
              <input 
                id="mentor-student-search-input"
                type="text" 
                placeholder="Cari nama santri / kelas / NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 h-9 bg-white border border-slate-200 rounded-xl text-xs text-[#172033] focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none w-full placeholder:text-slate-400 font-medium"
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Readiness / Quality Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl h-9 px-2.5">
              <Filter size={12} className="text-slate-400 shrink-0" />
              <select 
                id="mentor-student-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter kesiapan ujian dan mutu santri"
                className="text-xs font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 pr-1 focus:ring-0"
              >
                <option value="ALL">Semua Santri ({students.length})</option>
                <option value="SIAP_UJIAN">Siap Ujian (Nilai ≥75 & Hadir ≥75%)</option>
                <option value="PERLU_BIMBINGAN">Perlu Bimbingan (Nilai &lt;75 / Hadir &lt;75%)</option>
                <option value="Sangat Baik">Mutu Sangat Baik (A)</option>
                <option value="Baik">Mutu Baik (B)</option>
              </select>
            </div>

            {/* Trend Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl h-9 px-2.5">
              <select 
                id="mentor-student-trend-filter"
                value={trendFilter}
                onChange={(e) => setTrendFilter(e.target.value as any)}
                aria-label="Filter tren perkembangan santri"
                className="text-xs font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 pr-1 focus:ring-0"
              >
                <option value="ALL">Semua Tren</option>
                <option value="Meningkat">Tren Meningkat</option>
                <option value="Konsisten">Tren Konsisten</option>
                <option value="Menurun">Tren Menurun</option>
              </select>
            </div>

            {(statusFilter !== 'ALL' || trendFilter !== 'ALL' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setTrendFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-3 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Desktop & Tablet Clean Table */}
        <div className="hidden md:block overflow-x-auto w-full">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-semibold">
              Tidak ada santri binaan yang cocok dengan kata kunci atau filter aktif.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 bg-slate-50/60 font-bold whitespace-nowrap">
                  <th className="py-3 px-4 w-10 text-center">#</th>
                  <th className="py-3 px-4">Nama Santri</th>
                  <th className="py-3 px-4">Materi Terakhir</th>
                  <th className="py-3 px-4">Rata-rata Nilai (Min {MIN_PROGRESS_SCORE_STANDARD})</th>
                  <th className="py-3 px-4">Kehadiran (Min {MIN_ATTENDANCE_RATE_STANDARD}%)</th>
                  <th className="py-3 px-4">Status Kesiapan Ujian</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s, idx) => {
                  const hasHistory = s.sessionHistory && s.sessionHistory.length > 0;
                  const recentTrail = hasHistory
                    ? s.sessionHistory.slice(-3).map(h => `P${h.sessionNumber}: ${h.total}`).join(' → ')
                    : 'Belum ada nilai';

                  return (
                    <tr key={`student_tr_${s.id}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#172033] text-xs sm:text-sm">{s.name}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          Kelas {s.class} · {s.nis ? `NIS ${s.nis}` : 'Aktif'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-[#172033] block">
                          {s.currentStage}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">{recentTrail}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasHistory ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className={cn(
                                "font-black text-sm tabular-nums",
                                s.meetsScoreStandard ? "text-[#172033]" : "text-rose-700"
                              )}>
                                {s.progressScore}
                              </span>
                              <span className="text-[11px] text-slate-400">/ 100</span>
                            </div>
                            <TrendIndicator trend={s.trend} diff={s.trendDiff} score={s.progressScore} />
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Belum Dinilai</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <AttendanceBarCell history={s.attendanceHistory} rate={s.attendanceRate} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {s.isExamReady ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            <span>Siap Ujian</span>
                          </span>
                        ) : s.needsGuidance ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs w-fit">
                              <AlertCircle size={13} className="text-rose-600 shrink-0" />
                              <span>Belum Siap</span>
                            </span>
                            <span className="text-[10px] text-rose-700 font-semibold mt-0.5">
                              {s.readinessReason}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs">
                            {s.readinessReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendStudentWA(s)}
                            title={`Kirim laporan WA ke orang tua ${s.name}`}
                            aria-label={`Kirim laporan WA ${s.name}`}
                            className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageCircle size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForChart(s)}
                            title="Buka grafik detail capaian & presensi santri"
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#0362D0] text-[#172033] hover:text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <LineChartIcon size={13} />
                            <span>Grafik</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Eye-Catching Student Cards (md:hidden) */}
        <div className="md:hidden p-3 space-y-2.5 bg-slate-50/60">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold bg-white rounded-xl border border-slate-200">
              Tidak ada santri yang cocok dengan filter.
            </div>
          ) : (
            filteredStudents.map((s, idx) => {
              const hasHistory = s.sessionHistory && s.sessionHistory.length > 0;
              const hasAtt = (s.attendanceHistory || []).length > 0;
              const hadirCount = (s.attendanceHistory || []).filter(a => a.status === 'Hadir').length;

              return (
                <div
                  key={`student_mobile_${s.id}_${idx}`}
                  className={cn(
                    "bg-white rounded-xl border border-slate-200 border-l-4 p-3.5 shadow-2xs space-y-3",
                    s.isExamReady
                      ? "border-l-emerald-600"
                      : s.needsGuidance
                      ? "border-l-rose-600"
                      : "border-l-[#0362D0]"
                  )}
                >
                  {/* Bagian Atas Kartu Siswa (Card Header) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-[#172033] text-sm leading-snug truncate">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          Kelas {s.class} · {s.currentStage}
                        </div>
                      </div>
                    </div>

                    {/* Readiness Status Badge on Top Right */}
                    {s.isExamReady ? (
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold whitespace-nowrap shrink-0">
                        ✓ Siap Ujian
                      </span>
                    ) : s.needsGuidance ? (
                      <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold whitespace-nowrap shrink-0">
                        {s.readinessReason}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold whitespace-nowrap shrink-0">
                        {s.readinessReason}
                      </span>
                    )}
                  </div>

                  {/* Bagian Tengah Kartu Siswa: 3-Column Metrics (Nilai, Kehadiran, Tren) */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Rata-rata Nilai</span>
                      <span className={cn(
                        "text-sm font-black tabular-nums",
                        !hasHistory ? "text-slate-400" : s.meetsScoreStandard ? "text-emerald-700" : "text-rose-700"
                      )}>
                        {hasHistory ? `${s.progressScore}/100` : '-'}
                      </span>
                      <span className="block text-[9px] text-slate-400">Min ≥ {MIN_PROGRESS_SCORE_STANDARD}</span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Kehadiran</span>
                      <span className={cn(
                        "text-sm font-black tabular-nums",
                        !hasAtt ? "text-slate-400" : s.meetsAttendanceStandard ? "text-emerald-700" : "text-rose-700"
                      )}>
                        {hasAtt ? `${s.attendanceRate}%` : '-'}
                      </span>
                      <span className="block text-[9px] text-slate-400 tabular-nums">
                        {hasAtt ? `${hadirCount}/${s.attendanceHistory?.length} Hadir` : `Min ≥ ${MIN_ATTENDANCE_RATE_STANDARD}%`}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center items-center">
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Tren Sesi</span>
                      <TrendIndicator trend={s.trend} diff={s.trendDiff} score={s.progressScore} />
                    </div>
                  </div>

                  {/* Bagian Bawah Kartu Siswa: Quick Action Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendStudentWA(s)}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle size={13} />
                      <span>Kirim WA Wali</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForChart(s)}
                      className="flex-1 py-2 px-3 bg-[#172033] hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LineChartIcon size={13} />
                      <span>Grafik Detail</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </section>

      {/* MODAL GRAFIK PERKEMBANGAN SANTRI PER PERTEMUAN */}
      <StudentProgressChartModal
        student={selectedStudentForChart}
        onClose={() => setSelectedStudentForChart(null)}
        targetGrade={targetGrade}
        groupName={groupTitle}
      />

    </div>
  );
}
