import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  LineChart as LineChartIcon,
  BarChart2,
  Activity,
  Bookmark
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getGroups, 
  getMentors, 
  getStudentsByGroup, 
  getAllStudentProgress,
  getAllStudentAttendance,
  getTeachingJournals,
  Group, 
  Mentor, 
  Student, 
  StudentProgress,
  TeachingJournal 
} from '../../services/db';
import { masterGrades, masterSessions, CURRICULUM_CONFIG, getGradeForGroup } from '../../services/curriculumData';
import { theme } from '../../theme';
import { 
  StudentProgressChartModal, 
  StudentWithStats, 
  SessionHistoryItem 
} from './StudentProgressChartModal';

// Mini grafik sparkline nilai per tahap untuk baris tabel
function SparklineProgress({ history, score }: { history: SessionHistoryItem[]; score?: number }) {
  if (!history || history.length === 0) {
    return <span className="text-slate-400 text-[10px]">-</span>;
  }

  const width = 96;
  const height = 38;
  const paddingX = 16;
  const paddingTop = 6;
  const graphBottom = 22;
  const minVal = 55;
  const maxVal = 100;

  const points = history.map((item, idx) => {
    const x = history.length === 1 
      ? width / 2 
      : paddingX + (idx / (history.length - 1)) * (width - 2 * paddingX);
    const normalized = Math.max(0, Math.min(1, (item.total - minVal) / (maxVal - minVal)));
    const y = graphBottom - normalized * (graphBottom - paddingTop);
    return { x, y, val: item.total, num: item.sessionNumber };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const lastVal = score ?? (history[history.length - 1]?.total ?? 75);
  // Rule: jika diatas nilai 75 warna grafik hijau meskipun turun, jika dibawah 75 warna grafik merah meskipun naik
  const strokeColor = lastVal >= 75 ? '#10b981' : '#ef4444';

  return (
    <div 
      className="inline-flex flex-col items-center" 
      title={`Riwayat Tahap: ${history.map(h => `T${h.sessionNumber}: ${h.total}`).join(' → ')}`}
    >
      <svg width={width} height={height} className="overflow-visible">
        {/* Garis tren grafik */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Titik tahap dan angka nilai tepat di bawah masing-masing titik */}
        {points.map((p, i) => {
          const isLatest = i === points.length - 1;
          return (
            <g key={i}>
              <title>{`Tahap ${p.num}: ${p.val}`}</title>
              {/* Garis panduan halus dari titik ke angka */}
              <line 
                x1={p.x} 
                y1={p.y + 4} 
                x2={p.x} 
                y2={25} 
                stroke={strokeColor} 
                strokeWidth="1" 
                strokeDasharray="1.5 1.5" 
                opacity="0.35" 
              />
              {/* Titik node tahap */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r={isLatest ? 3.5 : 2.5} 
                fill={isLatest ? strokeColor : '#ffffff'} 
                stroke={strokeColor} 
                strokeWidth="2" 
              />
              {/* Angka nilai tepat di bawah titik tahap */}
              <text 
                x={p.x} 
                y={36} 
                textAnchor="middle" 
                fontSize="10" 
                fontWeight={isLatest ? '900' : '700'} 
                fill={isLatest ? strokeColor : '#475569'}
                className="select-none font-mono"
              >
                {p.val}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Badge status tren pertemuan (Meningkat, Menurun, Konsisten)
function TrendBadge({ trend, diff, score }: { trend: 'Meningkat' | 'Menurun' | 'Konsisten'; diff: number; score?: number }) {
  if (trend === 'Meningkat' || diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
        <TrendingUp size={11} className="stroke-[2.5]" />
        <span>+{diff > 0 ? diff : 1} Naik</span>
      </span>
    );
  }
  if (trend === 'Menurun' || diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
        <TrendingDown size={11} className="stroke-[2.5]" />
        <span>{diff < 0 ? diff : -1} Turun</span>
      </span>
    );
  }

  // Konsisten (diff == 0)
  // Rule: jika diatas 75 warna kuning, jika dibawah 75 warna abu-abu
  const isHigh = (score ?? 75) >= 75;
  const badgeClass = isHigh
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}`}>
      <Minus size={11} className="stroke-[2.5]" />
      <span>— Konsisten</span>
    </span>
  );
}

export function MentorDashboard() {
  const { currentUser, userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mentorGroup, setMentorGroup] = useState<Group | null>(null);
  const [mentorProfile, setMentorProfile] = useState<Mentor | null>(null);
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Sangat Baik' | 'Baik' | 'Perlu Bimbingan'>('ALL');
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

        // Identify currently logged-in mentor
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

        // Find the mentor's assigned group ONLY
        const assignedGroupId = matched?.groupId || userData?.groupId || inferredGroupId || 'g1';
        const targetGroup = groupsData.find(g => 
          g.id === assignedGroupId || 
          (alumniNum && g.name?.toLowerCase().includes(`kelompok ${alumniNum}`)) ||
          g.mentorId === (matched?.id || userData?.id)
        ) || groupsData.find(g => g.id === assignedGroupId) || groupsData[0];

        setMentorGroup(targetGroup);

        if (targetGroup) {
          // Fetch students ONLY for this mentor's group
          const [groupStudents, allProg, journalsRes, groupAttendance] = await Promise.all([
            getStudentsByGroup(targetGroup.id),
            getAllStudentProgress(),
            getTeachingJournals(targetGroup.id, 5),
            getAllStudentAttendance()
          ]);

          if (!isMounted) return;

          setJournals(journalsRes.data || []);

          // Kurikulum Seragam Berdasarkan Kelompok (Grade 1: Utsmani Jilid 1, Grade 2: Utsmani Jilid 2, Grade 3: Al-Qur'an & Hafalan Juz 30)
          const assignedGrade = getGradeForGroup(targetGroup);
          const isGrade3 = assignedGrade.id === 'grade3';
          const prefix = isGrade3 ? 'g3' : (assignedGrade.id === 'grade2' ? 'g2' : 'g1');

          // Kumpulkan riwayat capaian per santri untuk SEMUA tahap yang pernah dijalani
          const studentProgressMap = new Map<string, StudentProgress[]>();
          allProg
            .filter(p => p.groupId === targetGroup.id)
            .forEach(p => {
              const list = studentProgressMap.get(p.studentId) || [];
              list.push(p);
              studentProgressMap.set(p.studentId, list);
            });

          const mappedStudents: StudentWithStats[] = groupStudents.map((s, idx) => {
            const historyRaw = studentProgressMap.get(s.id) || [];
            
            // Urutkan riwayat berdasarkan nomor sesi tahap / tanggal
            const sortedRaw = [...historyRaw].sort((a, b) => {
              const numA = parseInt(a.sessionId?.match(/\d+$/)?.[0] || '0', 10);
              const numB = parseInt(b.sessionId?.match(/\d+$/)?.[0] || '0', 10);
              if (numA !== numB) return numA - numB;
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            // Baseline fallback jika belum ada data di db
            let validHistory: StudentProgress[] = sortedRaw;
            if (validHistory.length === 0) {
              const studentNum = idx + 1;
              const trendType = (studentNum % 5 === 0) ? 'menurun' : (studentNum % 4 === 0) ? 'konsisten' : 'meningkat';
              const s1 = 70 + (studentNum % 14);
              const s2 = trendType === 'menurun' ? s1 - 3 : trendType === 'konsisten' ? s1 : s1 + 5;

              validHistory = [
                {
                  studentId: s.id,
                  groupId: targetGroup.id,
                  sessionId: `${prefix}-s1`,
                  semester: 1,
                  meetingNumber: 1,
                  date: '2026-08-15',
                  reading: isGrade3 ? s1 : 0,
                  tajwid: Math.max(60, s1 - 2),
                  writing: Math.min(95, s1 + 1),
                  memorization: isGrade3 ? s1 : 0,
                  total: isGrade3 ? s1 : Math.round((Math.max(60, s1 - 2) + Math.min(95, s1 + 1)) / 2),
                },
                {
                  studentId: s.id,
                  groupId: targetGroup.id,
                  sessionId: `${prefix}-s2`,
                  semester: 1,
                  meetingNumber: 2,
                  date: '2026-08-22',
                  reading: isGrade3 ? s2 : 0,
                  tajwid: Math.max(60, s2 - 2),
                  writing: Math.min(95, s2 + 1),
                  memorization: isGrade3 ? s2 : 0,
                  total: isGrade3 ? s2 : Math.round((Math.max(60, s2 - 2) + Math.min(95, s2 + 1)) / 2),
                }
              ];
            }

            // Format ke item riwayat sesi
            const sessionHistory: SessionHistoryItem[] = validHistory.map((rec, sIdx) => {
              const sNum = parseInt(rec.sessionId?.match(/\d+$/)?.[0] || String(sIdx + 1), 10);
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

            const latestSession = sessionHistory[sessionHistory.length - 1];
            const prevSession = sessionHistory.length > 1 ? sessionHistory[sessionHistory.length - 2] : null;
            const score = latestSession ? latestSession.total : 75;
            const trendDiff = prevSession ? (latestSession.total - prevSession.total) : 0;
            const trend: 'Meningkat' | 'Menurun' | 'Konsisten' = 
              trendDiff > 0 ? 'Meningkat' : trendDiff < 0 ? 'Menurun' : 'Konsisten';

            let statusCat: 'Sangat Baik' | 'Baik' | 'Perlu Bimbingan' = 'Baik';
            if (score >= 85) {
              statusCat = 'Sangat Baik';
            } else if (score >= 75) {
              statusCat = 'Baik';
            } else {
              statusCat = 'Perlu Bimbingan';
            }

            // Hitung persentase kehadiran nyata dari data presensi santri
            const sAttRecords = (groupAttendance || []).filter(a => a.studentId === s.id);
            let att = 85;
            if (sAttRecords.length > 0) {
              const hadirCount = sAttRecords.filter(a => a.status === 'Hadir').length;
              att = Math.round((hadirCount / sAttRecords.length) * 100);
            }

            // Capaian materi sesi terkini berdasarkan silabus
            let currentStageText = `P${latestSession?.sessionNumber || 2}: ${assignedGrade.programName}`;
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
              progressScore: score,
              attendanceRate: att,
              statusCategory: statusCat,
              sessionHistory,
              trend,
              trendDiff,
              latestSessionNumber: latestSession?.sessionNumber || 3,
            };
          });

          setStudents(mappedStudents);
        }
      } catch (err) {
        console.error("Error loading mentor dashboard:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMentorDashboardData();

    // Dengarkan event pembaruan presensi agar otomatis sinkron saat sesi/pekan baru diinput
    const handleAttendanceUpdated = () => {
      loadMentorDashboardData();
    };

    window.addEventListener('attendance-updated', handleAttendanceUpdated);
    window.addEventListener('storage', handleAttendanceUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('attendance-updated', handleAttendanceUpdated);
      window.removeEventListener('storage', handleAttendanceUpdated);
    };
  }, [currentUser, userData]);

  // Room fallback mapping per group number
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

  // Group number and dynamic title
  const groupNumber = useMemo(() => {
    // 1. Check if mentor email gives the alumni number (e.g. alumni2 -> 2)
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

  // Target Grade & Active Curriculum Session for this Mentor's Group
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

  // Derived statistics for the mentor's group
  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) {
      return {
        totalStudents: 0,
        avgAttendance: 0,
        avgProgress: 0,
        readyForExam: 0,
        needAttention: 0
      };
    }

    const totalAtt = students.reduce((acc, s) => acc + s.attendanceRate, 0);
    const totalProg = students.reduce((acc, s) => acc + s.progressScore, 0);
    const ready = students.filter(s => s.progressScore >= 85).length;
    const attention = students.filter(s => s.statusCategory === 'Perlu Bimbingan').length;

    return {
      totalStudents: total,
      avgAttendance: Math.round(totalAtt / total),
      avgProgress: Math.round(totalProg / total),
      readyForExam: ready,
      needAttention: attention
    };
  }, [students]);

  // Quality distribution for Chart (Distribusi Mutu Kualitas Bacaan Santri)
  const qualityDistribution = useMemo(() => {
    let sangatBaik = 0; // Nilai >= 85
    let baik = 0;       // Nilai 75 - 84
    let perluBimbingan = 0; // Nilai < 75

    students.forEach((s) => {
      if (s.progressScore >= 85) {
        sangatBaik++;
      } else if (s.progressScore >= 75) {
        baik++;
      } else {
        perluBimbingan++;
      }
    });

    return [
      { name: 'Sangat Baik (A)', count: sangatBaik, color: '#0362D0', desc: 'Fasih & Tartil (Skor ≥ 85)' },
      { name: 'Baik (B)', count: baik, color: '#C99A2E', desc: 'Cukup Lancar (Skor 75 - 84)' },
      { name: 'Perlu Bimbingan (C)', count: perluBimbingan, color: '#950415', desc: 'Butuh Pengulangan (Skor < 75)' },
    ];
  }, [students]);

  // Statistik Tren Nilai Antar Pertemuan
  const trendCounts = useMemo(() => {
    let meningkat = 0;
    let konsisten = 0;
    let menurun = 0;
    students.forEach(s => {
      if (s.trend === 'Meningkat') meningkat++;
      else if (s.trend === 'Menurun') menurun++;
      else konsisten++;
    });
    return { meningkat, konsisten, menurun };
  }, [students]);

  // Filtered students in this group (berdasarkan kata kunci, kualitas, dan tren)
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.class.toLowerCase().includes(q) || (s.nis && s.nis.includes(q));
      const matchStatus = statusFilter === 'ALL' || s.statusCategory === statusFilter;
      const matchTrend = trendFilter === 'ALL' || s.trend === trendFilter;
      return matchSearch && matchStatus && matchTrend;
    });
  }, [students, searchQuery, statusFilter, trendFilter]);

  // Indonesian Date Formatting
  const todayDateString = useMemo(() => {
    const date = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }, []);

  // Dynamic Mentor Name for Alumni 1 - 10
  const mentorDisplayName = useMemo(() => {
    // 1. Check email pattern first (e.g. alumni1@smpn102.sch.id -> Alumni 1)
    const email = currentUser?.email || userData?.email || '';
    const emailMatch = email.toLowerCase().match(/alumni\s*(\d+)/i);
    if (emailMatch) {
      return `Alumni ${emailMatch[1]}`;
    }

    // 2. Check mentorProfile name or userData name (e.g. "Kak Alumni 1" or "Alumni 1")
    const raw = mentorProfile?.name || userData?.name || currentUser?.displayName || '';
    const stripped = raw.trim();
    const matchAlumni = stripped.match(/(?:kak\s+)?alumni\s*(\d+)/i);
    if (matchAlumni) {
      return `Alumni ${matchAlumni[1]}`;
    }

    // 3. Match from group number
    if (groupNumber >= 1 && groupNumber <= 10) {
      return `Alumni ${groupNumber}`;
    }

    return stripped.replace(/^(kak|ustadz|ustadzah|ustadz\/ah)\s+/i, '').trim() || 'Alumni 1';
  }, [mentorProfile, userData, currentUser, groupNumber]);

  const groupTitle = `Kelompok ${groupNumber}`;
  const groupRoom = mentorGroup?.room || defaultRooms[groupNumber] || 'Mushola';
  const groupSchedule = mentorGroup?.schedule || 'Sabtu, 07:15 - 08:00';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full py-16 bg-[#F5F6F8]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-bold text-[#172033] text-sm">Memuat Beranda Halaqah Binaan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full pb-12">
      
      {/* 1. MENTOR HERO & WELCOME BANNER (REDESIGNED: FOCUSED FIRST STEP & DYNAMIC DATA) */}
      <section 
        id="mentor-hero-welcome-banner"
        className="bg-gradient-to-br from-[#0B1528] via-[#111C33] to-[#0A1324] rounded-3xl p-6 sm:p-8 lg:p-9 text-white shadow-xl border border-slate-700/60 relative overflow-hidden"
      >
        {/* Subtle decorative gold & blue atmospheric auras */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0362D0]/20 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#C99A2E]/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Top Row: Brand Badges & Dynamic Identification */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-[#C99A2E]/15 text-[#E5B544] border border-[#C99A2E]/30 flex items-center gap-1.5 shadow-2xs">
                <Sparkles size={12} className="text-[#E5B544]" />
                PORTAL PEMBINA HALAQAH
              </span>
              <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold bg-white/10 text-slate-200 border border-white/15">
                Kelompok {groupNumber}
              </span>
            </div>

            {/* Teaching Flow Micro-Indicator (Desktop & Tablet) */}
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <span className="text-slate-300">Login</span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-300">Lihat Jadwal</span>
              <span className="text-slate-500">→</span>
              <span className="text-[#38BDF8] font-black underline underline-offset-2">Buka Sesi</span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-400">Presensi</span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-400">Mengajar</span>
            </div>
          </div>

          {/* Core Identity & Welcome Message */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Assalamu'alaikum, Kak {mentorDisplayName}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Selamat bertugas membina santri <strong className="text-white font-extrabold">Kelompok {groupNumber}</strong>. Seluruh data, absensi, dan capaian di halaman ini terisolasi khusus untuk kelompok binaan Anda.
            </p>
          </div>

          {/* Dynamic Information Chips (Ruang, Jadwal, Tanggal) */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-semibold text-slate-300">
            {/* Dynamic Room */}
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-xl border border-white/15 transition-colors">
              <MapPin size={14} className="text-[#E5B544] shrink-0" />
              <span>Ruang: <strong className="text-white font-bold">{groupRoom}</strong></span>
            </div>

            {/* Dynamic Schedule */}
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-xl border border-white/15 transition-colors">
              <Clock size={14} className="text-[#38BDF8] shrink-0" />
              <span>Jadwal: <strong className="text-white font-bold">{groupSchedule}</strong></span>
            </div>

            {/* Dynamic Date */}
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-xl border border-white/15 transition-colors">
              <Calendar size={14} className="text-slate-300 shrink-0" />
              <span>{todayDateString}</span>
            </div>
          </div>

          {/* Action Zone: Microcopy Prompt + Dominant Primary CTA + Secondary Action */}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-3">
            {/* Guiding Microcopy */}
            <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-semibold text-slate-200">
                Siap memulai sesi hari ini? Buka sesi terlebih dahulu untuk memulai presensi santri.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              {/* PRIMARY CTA: BUKA SESI MENGAJAR (DOMINANT & HIGH CONTRAST) */}
              <Link 
                to="/session"
                id="mentor-hero-btn-start-session"
                className="group relative flex-1 bg-gradient-to-r from-[#0362D0] via-[#026EE6] to-[#0250AA] hover:from-[#0250AA] hover:to-[#0362D0] text-white rounded-2xl p-4 sm:px-6 sm:py-4.5 shadow-xl shadow-[#0362D0]/30 hover:shadow-[#0362D0]/50 border border-white/25 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20 group-hover:scale-105 transition-transform shadow-inner">
                    <UserCheck size={24} className="text-white" />
                  </div>
                  <div className="text-left space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                        LANGKAH PERTAMA
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                      Buka Sesi Mengajar
                    </div>
                    <div className="text-xs text-blue-100 font-medium">
                      Mulai sesi pembelajaran & presensi
                    </div>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center shrink-0 border border-white/15 group-hover:translate-x-1 transition-all">
                  <ArrowRight size={20} className="text-white" />
                </div>
              </Link>
              
              {/* SECONDARY ACTION: EVALUASI & UJIAN SANTRI */}
              <Link
                to="/certifications"
                id="mentor-hero-btn-exam"
                className="sm:w-auto bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 hover:border-white/25 rounded-2xl p-4 sm:px-5 sm:py-4.5 font-bold text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-3 transition-all shrink-0 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[#C99A2E]/15 border border-[#C99A2E]/30 flex items-center justify-center shrink-0">
                  <Award size={20} className="text-[#E5B544]" />
                </div>
                <div className="text-left">
                  <div className="text-white font-bold text-xs sm:text-sm">
                    Evaluasi & Ujian Santri
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Sertifikasi & Ujian Mutu
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS KHUSUS KELOMPOK SAYA (6 KARTU TERFOKUS) */}
      <section id="mentor-group-statistics" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Santri */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
              Santri Binaan
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20">
              <Users size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight leading-none">
              {stats.totalStudents}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Santri aktif di {groupTitle}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] text-[9px] font-bold text-emerald-600">
            ✓ Terdaftar lengkap
          </div>
        </div>

        {/* Kehadiran Sesi Terakhir */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
              Kehadiran Kelompok
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20">
              <UserCheck size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight leading-none">
              {stats.avgAttendance}%
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Rata-rata presensi santri
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] text-[9px] font-bold text-slate-500">
            Target standar &gt; 80%
          </div>
        </div>

        {/* Rata-rata Progres Silabus */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
              Rata-rata Progres
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#C99A2E]/10 text-[#C99A2E] border border-[#C99A2E]/20">
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight leading-none">
              {stats.avgProgress}%
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Ketercapaian materi jilid
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] text-[9px] font-bold text-[#C99A2E]">
            ★ Capaian Halaqah
          </div>
        </div>

        {/* Santri Siap Ujian */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
              Siap Ujian / Munaqasyah
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Award size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight leading-none">
              {stats.readyForExam}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Santri tuntas target jilid
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] text-[9px] font-bold text-emerald-600">
            Dapat diajukan sertifikasi
          </div>
        </div>

        {/* Perlu Bimbingan Ekstra */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
              Perlu Pendampingan
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#950415]/10 text-[#950415] border border-[#950415]/20">
              <AlertCircle size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight leading-none">
              {stats.needAttention}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Santri butuh perhatian khusus
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] text-[9px] font-bold text-[#950415]">
            Perlu simak intensif
          </div>
        </div>

        {/* Status Jurnal Halaqah */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
              Jurnal Halaqah
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20">
              <FileText size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight leading-none">
              {journals.length > 0 ? 'Tercatat' : 'Belum Ada'}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              {journals.length > 0 ? `${journals.length} catatan sesi tersimpan` : 'Siap diisi pekan ini'}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] text-[9px] font-bold text-[#0362D0]">
            Update berkala di sesi
          </div>
        </div>

      </section>

      {/* RINGKASAN TREN CAPAIAN ANTAR TAHAP (T1 → T2 → T3) */}
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center shrink-0">
            <Activity size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#172033]">
              Tren Capaian Nilai Santri Antar Tahap
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Dinamika skor kualitas santri dari tahap ke tahap (meningkat, stabil, atau perlu bimbingan)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setTrendFilter(trendFilter === 'Meningkat' ? 'ALL' : 'Meningkat')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
              trendFilter === 'Meningkat' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <TrendingUp size={14} className="stroke-[2.5]" />
            <span>{trendCounts.meningkat} Santri Meningkat</span>
          </button>
          <button 
            onClick={() => setTrendFilter(trendFilter === 'Konsisten' ? 'ALL' : 'Konsisten')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
              trendFilter === 'Konsisten' 
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Minus size={14} className="stroke-[2.5]" />
            <span>{trendCounts.konsisten} Konsisten</span>
          </button>
          <button 
            onClick={() => setTrendFilter(trendFilter === 'Menurun' ? 'ALL' : 'Menurun')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
              trendFilter === 'Menurun' 
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <TrendingDown size={14} className="stroke-[2.5]" />
            <span>{trendCounts.menurun} Perlu Perhatian</span>
          </button>
          {trendFilter !== 'ALL' && (
            <button
              onClick={() => setTrendFilter('ALL')}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-bold underline px-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 3. VISUALISASI KUALITAS & PANDUAN SILABUS HALAQAH SAYA */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DISTRIBUSI KUALITAS BACAAN SANTRI BINAAN (PIE CHART) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8]">
            <div>
              <h3 className="font-extrabold text-[#172033] text-sm">
                Distribusi Kualitas Progres {groupTitle}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Sebaran mutu capaian santri pada materi {targetGrade.programName}
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#0362D0] bg-[#0362D0]/10 px-2.5 py-1 rounded-xl border border-[#0362D0]/20">
              {students.length} Santri
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-4">
            <div className="sm:col-span-6 h-[170px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qualityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {qualityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} Santri`, `${name}`]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E6E8EC', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-[#172033]">{students.length}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Santri</span>
              </div>
            </div>

            <div className="sm:col-span-6 space-y-2">
              {qualityDistribution.map((item, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-[#F5F6F8] border border-[#E6E8EC]">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-extrabold text-[#172033]">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-[#172033]">{item.count} siswa</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium pl-4 block">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#F5F6F8] flex justify-between items-center text-[10px] text-slate-500 font-medium">
            <span className="truncate max-w-[280px]">Buku: <strong>{targetGrade.bookTitle}</strong></span>
            <Link to="/curriculum" className="text-[#0362D0] font-bold hover:underline shrink-0 flex items-center gap-0.5">
              Silabus Lengkap <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* TARGET KURIKULUM & PANDUAN MENGAJAR PEKAN INI */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8]">
            <div>
              <h3 className="font-extrabold text-[#172033] text-sm">
                Target Silabus Pekan Ini
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Materi seragam halaqah {groupTitle}
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#C99A2E] bg-[#C99A2E]/10 px-2.5 py-1 rounded-xl border border-[#C99A2E]/20">
              Sesi {activeCurriculumSession?.sessionNumber || 3} Aktif
            </span>
          </div>

          <div className="space-y-3 my-3">
            <div className="p-3.5 bg-[#0362D0]/5 rounded-xl border border-[#0362D0]/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0362D0]">
                  Materi Pokok • {targetGrade.programName}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {targetGrade.id === 'grade3' ? (activeCurriculumSession?.pageRef ? `Target: ${activeCurriculumSession.pageRef}` : 'Juz 30') : (activeCurriculumSession?.pageRef ? `Halaman ${activeCurriculumSession.pageRef}` : 'Materi Pembuka')}
                </span>
              </div>
              <h4 className="text-xs font-black text-[#172033]">
                {activeCurriculumSession?.topic || 'Pembelajaran Materi Kurikulum'}
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {targetGrade.id === 'grade3' 
                  ? 'Khusus Kelompok 10: Fokus bimbingan kelancaran membaca Al-Qur\'an, talaqqi, setoran hafalan surah baru, murajaah mutqin, dan tasmi\' Juz 30 (bukan materi Jilid 1 atau 2).' 
                  : `Seluruh santri di ${groupTitle} mempelajari materi seragam pada ${activeCurriculumSession?.pageRef ? `halaman ${activeCurriculumSession.pageRef}` : 'buku panduan'}. Fokus bimbingan pada ketepatan makhraj, tanda baca, dan kelancaran kaidah (tanpa hafalan surah).`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <div className="p-2.5 bg-[#F5F6F8] rounded-xl border border-[#E6E8EC]">
                <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Buku / Pedoman</span>
                <span className="text-xs font-black text-[#172033] truncate block" title={targetGrade.bookTitle}>
                  {targetGrade.id === 'grade3' ? 'Mushaf Al-Qur\'an & Juz 30' : targetGrade.programName}
                </span>
              </div>
              <div className="p-2.5 bg-[#F5F6F8] rounded-xl border border-[#E6E8EC]">
                <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
                  {targetGrade.id === 'grade3' ? 'Target Hafalan / Bacaan' : 'Halaman Silabus'}
                </span>
                <span className="text-xs font-black text-[#172033]">
                  {targetGrade.id === 'grade3' 
                    ? (activeCurriculumSession?.pageRef ? `${activeCurriculumSession.pageRef}` : 'Juz 30') 
                    : (activeCurriculumSession?.pageRef ? `Hal. ${activeCurriculumSession.pageRef}` : 'Sesuai Silabus')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F5F6F8] flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-medium">
              {targetGrade.id === 'grade3' 
                ? 'Kurikulum Al-Qur\'an & Hafalan — evaluasi mutqin & setoran' 
                : 'Materi seragam — penilaian difokuskan pada mutu kualitas'}
            </span>
            <Link 
              to="/session" 
              className="text-xs text-[#0362D0] hover:underline font-extrabold flex items-center gap-0.5"
            >
              Mulai Sesi Mengajar <ChevronRight size={14} />
            </Link>
          </div>
        </div>

      </section>

      {/* 4. TABEL SANTRI BINAAN (HANYA KELOMPOK INI) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
        
        {/* TABEL SANTRI BINAAN SAYA */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E8EC] overflow-hidden shadow-xs">
            
            {/* Header Table & Filters */}
            <div className="p-4 sm:p-5 border-b border-[#E6E8EC] bg-[#F5F6F8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-extrabold text-[#172033] text-sm sm:text-base">
                  Daftar Santri Binaan {groupTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Materi seragam: <strong className="text-[#0362D0]">{targetGrade.programName} ({targetGrade.id === 'grade3' ? (activeCurriculumSession?.pageRef || 'Juz 30') : (activeCurriculumSession?.pageRef ? `Hal. ${activeCurriculumSession.pageRef.replace(/^Halaman\s+/i, '')}` : 'Aktif')})</strong> • {students.length} santri
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <input 
                    id="mentor-student-search-input"
                    type="text" 
                    placeholder="Cari santri / kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 h-9 bg-white border border-[#E6E8EC] rounded-xl text-xs text-[#172033] focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none w-full sm:w-48 placeholder:text-slate-400 font-medium"
                  />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-[#E6E8EC] rounded-xl h-9 px-2">
                  <select 
                    id="mentor-student-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    aria-label="Filter status kelancaran santri"
                    className="text-xs font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 pr-1 focus:ring-0"
                  >
                    <option value="ALL">Semua Kualitas</option>
                    <option value="Sangat Baik">Sangat Baik (A)</option>
                    <option value="Baik">Baik (B)</option>
                    <option value="Perlu Bimbingan">Perlu Bimbingan (C)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-[#E6E8EC] rounded-xl h-9 px-2">
                  <select 
                    id="mentor-student-trend-filter"
                    value={trendFilter}
                    onChange={(e) => setTrendFilter(e.target.value as any)}
                    aria-label="Filter tren perkembangan santri"
                    className="text-xs font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 pr-1 focus:ring-0"
                  >
                    <option value="ALL">Semua Tren</option>
                    <option value="Meningkat">▲ Tren Meningkat</option>
                    <option value="Konsisten">▬ Tren Konsisten</option>
                    <option value="Menurun">▼ Perlu Perhatian</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full scrollbar-thin">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  Tidak ada santri binaan yang cocok dengan kata kunci atau filter.
                </div>
              ) : (
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[780px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-[#E6E8EC] text-[10px] uppercase tracking-wider font-extrabold bg-[#F5F6F8]/50 whitespace-nowrap">
                      <th className="py-3 px-4">Santri</th>
                      <th className="py-3 px-3">Kelas</th>
                      <th className="py-3 px-3">Materi Sesi</th>
                      <th className="py-3 px-3">Nilai Kualitas</th>
                      <th className="py-3 px-3">Tren Sesi (P1 → P2 → P3)</th>
                      <th className="py-3 px-3 text-center">Kehadiran</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E8EC]">
                    {filteredStudents.map((s) => {
                      let badgeStyle = '';
                      if (s.statusCategory === 'Sangat Baik') {
                        badgeStyle = 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20';
                      } else if (s.statusCategory === 'Baik') {
                        badgeStyle = 'bg-[#C99A2E]/10 text-[#C99A2E] border-[#C99A2E]/20';
                      } else {
                        badgeStyle = 'bg-[#950415]/10 text-[#950415] border-[#950415]/20';
                      }

                      return (
                        <tr key={s.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-extrabold text-[#172033]">{s.name}</div>
                            <span className="text-[10px] text-slate-400 font-semibold">{s.nis ? `NIS: ${s.nis}` : 'Santri Aktif'}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">{s.class}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold text-[#172033] bg-[#F5F6F8] px-2.5 py-1 rounded-md text-[11px] border border-[#E6E8EC] inline-block whitespace-nowrap">
                              {s.currentStage}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-xs font-black text-[#172033]">{s.progressScore}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border whitespace-nowrap ${badgeStyle}`}>
                                {s.statusCategory}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5 whitespace-nowrap">
                              <SparklineProgress history={s.sessionHistory} score={s.progressScore} />
                              <TrendBadge trend={s.trend} diff={s.trendDiff} score={s.progressScore} />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-black text-[#0362D0] whitespace-nowrap">{s.attendanceRate}%</td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedStudentForChart(s)}
                              title="Buka grafik detail capaian santri per tahap"
                              className="px-2.5 py-1 bg-[#0362D0]/10 hover:bg-[#0362D0] text-[#0362D0] hover:text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5"
                            >
                              <LineChartIcon size={13} />
                              <span>Grafik</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden flex flex-col gap-3 p-3">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                  Tidak ada santri yang cocok.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  let badgeStyle = '';
                  if (s.statusCategory === 'Sangat Baik') {
                    badgeStyle = 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20';
                  } else if (s.statusCategory === 'Baik') {
                    badgeStyle = 'bg-[#C99A2E]/10 text-[#C99A2E] border-[#C99A2E]/20';
                  } else {
                    badgeStyle = 'bg-[#950415]/10 text-[#950415] border-[#950415]/20';
                  }

                  return (
                    <div key={s.id} className="bg-white border border-[#E6E8EC] rounded-xl p-3.5 shadow-xs">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-extrabold text-[#172033] text-xs sm:text-sm">{s.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Kelas {s.class} • NIS: {s.nis || '-'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${badgeStyle}`}>
                          {s.statusCategory}
                        </span>
                      </div>

                      <div className="bg-[#F5F6F8] p-2 rounded-lg text-xs font-bold text-[#172033] mb-2.5 border border-[#E6E8EC] flex justify-between items-center">
                        <span>Materi: {s.currentStage}</span>
                        <span className="text-[#0362D0] font-black">Nilai: {s.progressScore}</span>
                      </div>

                      {/* Sparkline & Trend in Mobile Card */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-[#E6E8EC] mb-2.5">
                        <div className="flex items-center gap-2">
                          <SparklineProgress history={s.sessionHistory} score={s.progressScore} />
                        </div>
                        <TrendBadge trend={s.trend} diff={s.trendDiff} score={s.progressScore} />
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={() => setSelectedStudentForChart(s)}
                          className="w-full py-2 bg-[#0362D0]/10 hover:bg-[#0362D0]/20 text-[#0362D0] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#0362D0]/20"
                        >
                          <LineChartIcon size={14} />
                          <span>Grafik Perkembangan</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* SIDEBAR RIGHT: JURNAL MENGAJAR TERAKHIR & PENGINGAT MENTOR */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 flex flex-col gap-6">

          {/* RIWAYAT JURNAL HALAQAH SAYA */}
          <div className="bg-white rounded-2xl border border-[#E6E8EC] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8] mb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#0362D0]" />
                <h3 className="font-extrabold text-[#172033] text-sm">
                  Jurnal Mengajar Terakhir
                </h3>
              </div>
              <Link to="/session" className="text-[11px] text-[#0362D0] font-bold hover:underline">
                Tulis Jurnal
              </Link>
            </div>

            {journals.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#F5F6F8] rounded-xl border border-[#E6E8EC]">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1">
                    <span>{journals[0].date}</span>
                    <span className="text-[#0362D0] font-black">{journals[0].pagesCovered || 'Sesi Terakhir'}</span>
                  </div>
                  <h4 className="text-xs font-black text-[#172033] leading-snug">
                    {journals[0].materialTaught}
                  </h4>
                  {journals[0].studentObstacles && (
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      <strong>Catatan santri:</strong> {journals[0].studentObstacles}
                    </p>
                  )}
                  {journals[0].nextPlan && (
                    <p className="text-[11px] text-[#0362D0] font-semibold mt-1">
                      <strong>Rencana pekan depan:</strong> {journals[0].nextPlan}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <p className="text-xs font-bold text-slate-600">Belum ada catatan jurnal</p>
                <p className="text-[10px] text-slate-400 mt-1">Jurnal otomatis terisi saat Anda menyelesaikan Sesi Mengajar.</p>
                <Link 
                  to="/session" 
                  className="btn btn-primary btn-sm mt-3"
                >
                  Buka Sesi Mengajar
                </Link>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[#F5F6F8]">
              <Link 
                to="/session" 
                className="w-full py-2 bg-[#F5F6F8] hover:bg-[#E6E8EC] text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors block text-center"
              >
                <span>Lihat Formulir Sesi Lengkap</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* CHECKLIST PERSIAPAN HALAQAH */}
          <div className="bg-[#C99A2E]/5 p-5 rounded-2xl border border-[#C99A2E]/20 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#C99A2E]/20 text-[#C99A2E]">
              <Bookmark size={16} strokeWidth={2.5} />
              <h3 className="font-black text-xs uppercase tracking-wider text-[#172033]">
                Panduan Halaqah Pekanan
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#0362D0] shrink-0 mt-0.5" />
                <span className="font-medium leading-snug">
                  Pastikan tiba 10 menit sebelum pukul 07:15 di <strong>{groupRoom}</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#0362D0] shrink-0 mt-0.5" />
                <span className="font-medium leading-snug">
                  Buka presensi digital di portal sebelum memulai simak bacaan.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#0362D0] shrink-0 mt-0.5" />
                <span className="font-medium leading-snug">
                  Tandai santri yang siap ujian jilid untuk verifikasi tim kurikulum.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#0362D0] shrink-0 mt-0.5" />
                <span className="font-medium leading-snug">
                  Simpan jurnal mengajar sebelum meninggalkan ruangan.
                </span>
              </div>
            </div>
          </div>

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
