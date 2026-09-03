import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Layers, 
  UserCheck, 
  TrendingUp, 
  Loader2, 
  Calendar, 
  Edit3, 
  PlusCircle, 
  UserCheck2,
  CheckSquare
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
  SystemActivity 
} from '../../services/db';
import { ActivityLogModal } from '../modals/ActivityLogModal';
import { theme } from '../../theme';
import { StatCardsGrid, StatCardItem } from './StatCardsGrid';
import { AttendanceChartCard } from './AttendanceChartCard';
import { GroupProgressBarCard, GroupProgressItem } from './GroupProgressBarCard';
import { GroupSummaryTable, GroupDetailItem } from './GroupSummaryTable';
import { AttentionPanel } from './AttentionPanel';
import { RecentActivitiesCard } from './RecentActivitiesCard';
import { CurriculumSyncAlert } from '../CurriculumSyncAlert';

const INITIAL_GROUP_PROGRESS: GroupProgressItem[] = [
  { name: 'Kelompok 1', progress: 82 },
  { name: 'Kelompok 2', progress: 76 },
  { name: 'Kelompok 3', progress: 74 },
  { name: 'Kelompok 4', progress: 72 },
  { name: 'Kelompok 5', progress: 69 },
  { name: 'Kelompok 6', progress: 67 },
  { name: 'Kelompok 7', progress: 61 },
  { name: 'Kelompok 8', progress: 58 },
  { name: 'Kelompok 9', progress: 55 },
  { name: 'Kelompok 10', progress: 52 },
];

export function AdminDashboard() {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [groupsData, totalStudentsData, mentorsData, activitiesData] = await Promise.all([
          getGroups(),
          getTotalStudentsCount(),
          getMentors(),
          getSystemActivities()
        ]);
        
        if (!isMounted) return;

        const sortedGroups = [...groupsData].sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
        setGroups(sortedGroups);
        setTotalStudents(totalStudentsData);
        setMentors(mentorsData);
        setActivities(activitiesData);

        // Fetch group counts concurrently
        const counts: Record<string, number> = {};
        await Promise.all(sortedGroups.map(async (g) => {
          counts[g.id] = await getGroupStudentsCount(g.id);
        }));

        if (isMounted) {
          setGroupCounts(counts);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize O(1) mentor lookup map
  const mentorMap = useMemo(() => {
    const map = new Map<string, string>();
    mentors.forEach((m) => {
      map.set(m.id, m.name);
    });
    return map;
  }, [mentors]);

  // Memoize group details transformation
  const groupDetails: GroupDetailItem[] = useMemo(() => {
    return groups.map((g, idx) => {
      const mentorName = mentorMap.get(g.mentorId) || 'Ustadz / Ustadzah';
      const studentsCount = groupCounts[g.id] || 12;
      const progressVal = INITIAL_GROUP_PROGRESS[idx]?.progress || 68;
      
      let statusLabel: 'Baik' | 'Perlu Dipantau' | 'Perlu Pendampingan' = 'Baik';
      if (progressVal < 60) {
        statusLabel = 'Perlu Pendampingan';
      } else if (progressVal < 70) {
        statusLabel = 'Perlu Dipantau';
      }

      return {
        id: g.id,
        name: g.name,
        mentorName,
        studentsCount,
        progress: progressVal,
        attendance: idx === 6 ? 72 : 85 + (idx % 3) * 5,
        status: statusLabel
      };
    });
  }, [groups, mentorMap, groupCounts]);

  // Memoize summary statistics cards for Admin
  const statCards: StatCardItem[] = useMemo(() => {
    const totalSiswaVal = totalStudents || 126;
    const totalKelompokVal = groups.length || 10;
    const totalMentorVal = mentors.length || 10;
    const attendanceTodayVal = 91;
    const attendanceAvgVal = 89;
    const progressAvgVal = 73;

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
        label: 'Kehadiran Hari Ini', 
        value: `${attendanceTodayVal}%`, 
        sub: 'Siswa hadir kelas',
        trend: '↑ 4.2% dari minggu lalu',
        icon: UserCheck, 
        color: 'text-[#0362D0]', 
        bg: 'bg-[#0362D0]/10', 
        border: 'border-[#0362D0]/20' 
      },
      { 
        label: 'Rata-rata Kehadiran', 
        value: `${attendanceAvgVal}%`, 
        sub: 'Akumulasi semester',
        trend: 'Konsisten di atas target',
        icon: TrendingUp, 
        color: 'text-[#0362D0]', 
        bg: 'bg-[#0362D0]/10', 
        border: 'border-[#0362D0]/20' 
      },
      { 
        label: 'Rata-rata Progress', 
        value: `${progressAvgVal}%`, 
        sub: 'Pencapaian silabus',
        trend: 'Sesuai timeline kurikulum',
        icon: CheckSquare, 
        color: 'text-[#C99A2E]', 
        bg: 'bg-[#C99A2E]/10', 
        border: 'border-[#C99A2E]/20' 
      },
    ];
  }, [totalStudents, groups.length, mentors.length]);

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
      <div className="flex-1 flex items-center justify-center h-full py-16 bg-[#F5F6F8]">
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-[#E6E8EC]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👋</span>
            <h1 className={theme.typography.h1}>
              Assalamu'alaikum, Admin
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#950415]/10 text-[#950415] border border-[#950415]/20">
              Panel Pengelola
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Pantau kehadiran institusi dan perkembangan pembelajaran BTQ seluruh siswa SMP Negeri 102 Jakarta.
          </p>
        </div>

        {/* Calendar & Semester info */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-stretch md:self-auto bg-white p-2 rounded-2xl border border-[#E6E8EC]">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F5F6F8] rounded-xl text-[11px] font-bold text-[#172033] border border-[#E6E8EC]/80">
            <Calendar size={13} className="text-[#0362D0]" />
            <span>{todayDateString}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F5F6F8] rounded-xl text-[11px] font-bold text-[#172033] border border-[#E6E8EC]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E]" />
            <span>Tahun Pelajaran 2026/2027 • Ganjil</span>
          </div>
        </div>
      </header>

      {/* ADMIN-ONLY CURRICULUM & SESSION CONSISTENCY ALERT */}
      <CurriculumSyncAlert />

      {/* 2. SUMMARY STATISTICS INSTITUSI */}
      <StatCardsGrid cards={statCards} />

      {/* MOBILE ONLY: PANEL PERLU PERHATIAN */}
      <div className="block lg:hidden">
        <AttentionPanel />
      </div>

      {/* 3 & 4. CHARTS SECTION (KEHADIRAN & PROGRES SEMUA KELOMPOK) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceChartCard />
        <GroupProgressBarCard data={INITIAL_GROUP_PROGRESS} />
      </section>

      {/* 5. MAIN CONTENT & SIDEBAR */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / LARGE COLUMN: RINGKASAN SEMUA KELOMPOK BTQ */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GroupSummaryTable groups={groupDetails} />
        </div>

        {/* RIGHT / SIDEBAR COLUMN (QUICK ACTIONS, ATTENTION, RECENT ACTIVITIES) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* QUICK ACTIONS ADMIN */}
          <section id="admin-quick-actions" className="bg-white rounded-2xl border border-[#E6E8EC] p-4 shadow-xs">
            <h3 className="font-extrabold text-[#172033] text-xs uppercase tracking-wider mb-3 pb-2 border-b border-[#F5F6F8]">
              Aksi Cepat Admin
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link 
                to="/session"
                id="quick-action-start-session"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <UserCheck size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Mulai Sesi</span>
              </Link>

              <Link 
                to="/reports"
                id="quick-action-reports"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <Edit3 size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Laporan</span>
              </Link>

              <Link 
                to="/attendance/mentors"
                id="quick-action-mentor-attendance"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <Users size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Presensi Mentor</span>
              </Link>

              <Link 
                to="/students"
                id="quick-action-add-students"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <PlusCircle size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Tambah Siswa</span>
              </Link>
            </div>
          </section>

          {/* DESKTOP ONLY: PANEL PERLU PERHATIAN */}
          <div className="hidden lg:block">
            <AttentionPanel />
          </div>

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
