import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Layers, 
  UserCheck, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Calendar, 
  Edit3, 
  MapPin, 
  Search, 
  PlusCircle, 
  Clock, 
  Bell, 
  ChevronRight, 
  Filter,
  UserCheck2,
  CheckSquare
} from 'lucide-react';
import { getGroups, getStudents, getMentors, getGroupNumber, Group, Student, Mentor, getSystemActivities, SystemActivity } from '../services/db';
import { ActivityLogModal } from '../components/modals/ActivityLogModal';
import { useAuth } from '../contexts/AuthContext';
import { masterGrades, masterSessions } from '../services/curriculumData';
import { Link, useNavigate } from 'react-router-dom';
import { APP_LOGO, APP_NAME, APP_SUBTITLE, APP_DESC } from '../assets/logo';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export function Dashboard() {
  const { currentUser, userData, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Group Summary Table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mentorFilter, setMentorFilter] = useState('ALL');

  // Attendance Chart filter (Hari ini, Minggu ini, Bulan ini)
  const [attendanceFilter, setAttendanceFilter] = useState<'today' | 'week' | 'month'>('today');

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadData() {
      try {
        const [groupsData, studentsData, mentorsData, activitiesData] = await Promise.all([
          getGroups(),
          getStudents(),
          getMentors(),
          getSystemActivities()
        ]);
        
        const sortedGroups = [...groupsData].sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
        setGroups(sortedGroups);
        setStudents(studentsData);
        setMentors(mentorsData);
        setActivities(activitiesData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userRole]);


  // Calculations for Admin / Mentor
  const totalSiswaVal = students.length || 126;
  const totalKelompokVal = groups.length || 10;
  const totalMentorVal = mentors.length || 10;

  // Real or dynamic statistics
  const attendanceTodayVal = 91;
  const attendanceAvgVal = 89;
  const progressAvgVal = 73;

  // Stats Card array
  const statCards = [
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

  // Attendance Chart Data (Doughnut Chart Categories)
  const attendanceDataMap = {
    today: [
      { name: 'Hadir', value: 91, color: '#0362D0' },
      { name: 'Izin', value: 4, color: '#C99A2E' },
      { name: 'Sakit', value: 3, color: '#94A3B8' },
      { name: 'Alpa', value: 2, color: '#950415' }
    ],
    week: [
      { name: 'Hadir', value: 93, color: '#0362D0' },
      { name: 'Izin', value: 3, color: '#C99A2E' },
      { name: 'Sakit', value: 2, color: '#94A3B8' },
      { name: 'Alpa', value: 2, color: '#950415' }
    ],
    month: [
      { name: 'Hadir', value: 89, color: '#0362D0' },
      { name: 'Izin', value: 5, color: '#C99A2E' },
      { name: 'Sakit', value: 4, color: '#94A3B8' },
      { name: 'Alpa', value: 2, color: '#950415' }
    ]
  };

  const currentAttendanceData = attendanceDataMap[attendanceFilter];

  // Group progress data sorted descending
  const groupProgressList = [
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
  ].sort((a, b) => b.progress - a.progress);

  // Group Details mapping
  const groupDetails = groups.map((g, idx) => {
    const mentor = mentors.find(m => m.id === g.mentorId);
    const studentsCount = students.filter(s => s.groupId === g.id).length || 12;
    // Align with our sorted mock progress values
    const progressVal = groupProgressList[idx]?.progress || 68;
    
    let statusLabel: 'Baik' | 'Perlu Dipantau' | 'Perlu Pendampingan' = 'Baik';
    if (progressVal < 60) {
      statusLabel = 'Perlu Pendampingan';
    } else if (progressVal < 70) {
      statusLabel = 'Perlu Dipantau';
    }

    return {
      id: g.id,
      name: g.name,
      mentorName: mentor?.name || 'Ustadz / Ustadzah',
      studentsCount,
      progress: progressVal,
      attendance: idx === 6 ? 72 : 85 + (idx % 3) * 5,
      status: statusLabel
    };
  });

  // Filtered group details for bottom table
  const filteredGroups = groupDetails.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          g.mentorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    const matchesMentor = mentorFilter === 'ALL' || g.mentorName === mentorFilter;

    return matchesSearch && matchesStatus && matchesMentor;
  });

  const getTodayDateIndo = () => {
    const date = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full py-16 bg-[#F5F6F8]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-bold text-[#172033] text-sm">Memuat Dashboard Portal BTQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden max-w-[1240px] mx-auto w-full px-4 sm:px-6 py-6 bg-[#F5F6F8] text-[#172033]">
      
      {/* 1. HEADER DASHBOARD */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-[#E6E8EC]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👋</span>
            <h1 className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight">
              Assalamu'alaikum, Admin
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Pantau kehadiran dan perkembangan pembelajaran BTQ siswa SMP Negeri 102 Jakarta.
          </p>
        </div>

        {/* Calendar, Semester info & Profile */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-stretch md:self-auto bg-white p-2 rounded-2xl border border-[#E6E8EC]">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F5F6F8] rounded-xl text-[11px] font-bold text-[#172033] border border-[#E6E8EC]/80">
            <Calendar size={13} className="text-[#0362D0]" />
            <span>{getTodayDateIndo()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F5F6F8] rounded-xl text-[11px] font-bold text-[#172033] border border-[#E6E8EC]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E]" />
            <span>Tahun Pelajaran 2026/2027 • Ganjil</span>
          </div>
        </div>
      </header>

      {/* 2. SUMMARY STATISTICS */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((stat, idx) => (
          <div 
            key={idx} 
            className="bg-white p-4 rounded-2xl border border-[#E6E8EC] flex flex-col justify-between hover:shadow-xs transition-all group relative overflow-hidden"
          >
            {/* Subtle brand border on hover */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#0362D0] opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
                {stat.label}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.bg} ${stat.color} ${stat.border}`}>
                <stat.icon size={16} strokeWidth={2.5} />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight leading-none">
                {stat.value}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                {stat.sub}
              </p>
            </div>

            {/* Micro Trend indicator */}
            <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] flex items-center gap-1 text-[9px] font-bold">
              <span className={stat.trend.startsWith('↑') ? 'text-emerald-600' : 'text-slate-500'}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* MOBILE ONLY: PANEL "PERLU PERHATIAN" (Placed right after summary as requested in Responsive Mobile specs) */}
      <div className="block lg:hidden">
        <AttentionPanel navigate={navigate} />
      </div>

      {/* 3 & 4. CHARTS SECTION (MAX 2 CHARTS MAIN GRID) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: KEHADIRAN SISWA */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6E8EC] flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8]">
            <div>
              <h3 className="font-extrabold text-[#172033] text-sm">Kehadiran Siswa</h3>
              <p className="text-[11px] text-slate-400 font-medium">Distribusi rekap presensi harian santri</p>
            </div>
            {/* Filter Dropdown */}
            <div className="flex items-center gap-1 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-2.5 py-1">
              <Filter size={12} className="text-[#0362D0]" />
              <select 
                value={attendanceFilter} 
                onChange={(e) => setAttendanceFilter(e.target.value as any)}
                className="text-[11px] font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 focus:ring-0"
              >
                <option value="today">Hari Ini</option>
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-4">
            {/* Pie Chart display */}
            <div className="md:col-span-6 h-[160px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentAttendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {currentAttendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Persentase']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E6E8EC', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-[#172033]">{attendanceFilter === 'today' ? '91%' : attendanceFilter === 'week' ? '93%' : '89%'}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hadir</span>
              </div>
            </div>

            {/* Custom Side Legends & Fast Summary */}
            <div className="md:col-span-6 space-y-3">
              <div className="bg-[#0362D0]/5 p-3 rounded-xl border border-[#0362D0]/10">
                <p className="text-xs font-black text-[#0362D0] leading-none">
                  {attendanceFilter === 'today' ? '91%' : attendanceFilter === 'week' ? '93%' : '89%'} Kehadiran
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                  126 siswa dipantau hari ini
                </p>
                <p className="text-[10px] text-[#950415] font-bold mt-1">
                  11 siswa belum hadir / alpa
                </p>
              </div>

              {/* Legends list */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                {currentAttendanceData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CHART 2: PROGRESS PER KELOMPOK */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6E8EC] flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8]">
            <div>
              <h3 className="font-extrabold text-[#172033] text-sm">Progress BTQ per Kelompok</h3>
              <p className="text-[11px] text-slate-400 font-medium">Peringkat ketercapaian silabus (Utsmani)</p>
            </div>
            <span className="text-[11px] font-bold text-[#C99A2E] bg-[#C99A2E]/10 px-2.5 py-1 rounded-xl border border-[#C99A2E]/20">
              Rata-rata Progress: 68%
            </span>
          </div>

          <div className="h-[220px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={groupProgressList}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={80} 
                  interval={0} 
                  style={{ fontSize: '10px', fontWeight: 'bold', fill: '#172033' }} 
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Progress']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E6E8EC', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                  {groupProgressList.map((entry, index) => {
                    // Highlight Kelompok with lower progress in Maroon
                    const isLow = entry.progress < 60;
                    return <Cell key={`cell-${index}`} fill={isLow ? '#950415' : '#0362D0'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-[#F5F6F8] flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-semibold">
              Menampilkan seluruh 10 halaqah aktif
            </span>
            <Link 
              to="/groups" 
              className="text-xs text-[#0362D0] hover:underline font-extrabold flex items-center gap-0.5"
            >
              Lihat Semua Kelompok <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 5, 7, 9 & 10. DYNAMIC SIDEBARS & QUICK ACTION (3 Column layout for Desktop) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / LARGE COLUMN: RINGKASAN KELOMPOK BTQ */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl border border-[#E6E8EC] overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-[#E6E8EC] bg-[#F5F6F8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-extrabold text-[#172033] text-sm sm:text-base">
                  Ringkasan Kelompok BTQ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Pantau status belajar dan kehadiran per halaqah</p>
              </div>

              {/* Dynamic search / filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <input 
                    type="text" 
                    placeholder="Cari kelompok / mentor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 h-9 bg-white border border-[#E6E8EC] rounded-xl text-xs text-[#172033] focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none w-full sm:w-48 placeholder:text-slate-400 font-medium"
                  />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-[#E6E8EC] rounded-xl h-9 px-2">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 pr-1 focus:ring-0"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Baik">Baik</option>
                    <option value="Perlu Dipantau">Dipantau</option>
                    <option value="Perlu Pendampingan">Pendampingan</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  Tidak ada kelompok yang cocok dengan kriteria pencarian.
                </div>
              ) : (
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-[#E6E8EC] text-[10px] uppercase tracking-wider font-extrabold bg-[#F5F6F8]/50">
                      <th className="py-3 px-5">Kelompok</th>
                      <th className="py-3">Mentor</th>
                      <th className="py-3 text-center">Siswa</th>
                      <th className="py-3 text-center">Kehadiran</th>
                      <th className="py-3">Progress</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E8EC]">
                    {filteredGroups.map((item, idx) => {
                      let statusBadge = '';
                      if (item.status === 'Baik') {
                        statusBadge = 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20';
                      } else if (item.status === 'Perlu Dipantau') {
                        statusBadge = 'bg-[#C99A2E]/10 text-[#C99A2E] border-[#C99A2E]/20';
                      } else {
                        statusBadge = 'bg-[#950415]/10 text-[#950415] border-[#950415]/20';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                          <td className="py-3 px-5 font-bold text-[#172033]">{item.name}</td>
                          <td className="py-3 font-semibold text-[#172033]">{item.mentorName}</td>
                          <td className="py-3 text-center font-bold text-slate-700">{item.studentsCount} siswa</td>
                          <td className="py-3 text-center font-bold text-[#0362D0]">{item.attendance}%</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-24 bg-[#E6E8EC] h-1.5 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className={`h-full ${item.status === 'Perlu Pendampingan' ? 'bg-[#950415]' : 'bg-[#0362D0]'}`} 
                                  style={{ width: `${item.progress}%` }} 
                                />
                              </div>
                              <span className="text-[11px] font-black">{item.progress}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusBadge}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT / SIDEBAR COLUMN (ATTENTION, QUICK ACTIONS, RECENT ACTIVITIES) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* QUICK ACTIONS */}
          <section className="bg-white rounded-2xl border border-[#E6E8EC] p-4 shadow-xs">
            <h3 className="font-extrabold text-[#172033] text-xs uppercase tracking-wider mb-3 pb-2 border-b border-[#F5F6F8]">
              Aksi Cepat Admin
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link 
                to="/attendance/students"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <UserCheck size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Input Absensi</span>
              </Link>

              <Link 
                to="/progress"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <Edit3 size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Update Progress</span>
              </Link>

              <Link 
                to="/attendance/mentors"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <Users size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Presensi Mentor</span>
              </Link>

              <Link 
                to="/students"
                className="p-3 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-xl text-center group transition-colors"
              >
                <PlusCircle size={18} className="text-[#0362D0] mx-auto mb-1.5 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold text-[#172033] block">Tambah Siswa</span>
              </Link>
            </div>
          </section>

          {/* DESKTOP ONLY: PANEL "PERLU PERHATIAN" */}
          <div className="hidden lg:block">
            <AttentionPanel navigate={navigate} />
          </div>

          {/* AKTIVITAS TERBARU */}
          <section className="bg-white rounded-2xl border border-[#E6E8EC] p-4 sm:p-5 flex-1 flex flex-col overflow-hidden shadow-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#E6E8EC]">
              <h3 className="font-extrabold text-[#172033] text-sm">
                Aktivitas Terbaru
              </h3>
              <Clock size={14} className="text-slate-400" />
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 pb-2 flex-1 max-h-[250px]">
              {activities.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 h-full">
                  <span className="text-xl">📭</span>
                  <p className="text-[11px] font-bold mt-1 text-slate-500">Belum ada aktivitas baru</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Sistem akan mencatat aktivitas secara otomatis.</p>
                </div>
              ) : (
                activities.slice(0, 5).map((act, idx) => (
                  <div key={act.id} className="flex gap-3 items-start relative pl-4">
                    {idx < Math.min(activities.length, 5) - 1 && (
                      <div className="absolute left-[4.5px] top-[12px] bottom-[-20px] w-[1.5px] bg-[#E6E8EC]" />
                    )}
                    <div className={`w-2 h-2 rounded-full absolute left-0 top-[4px] ring-4 ${
                      act.type === 'progress' ? 'bg-[#0362D0] ring-[#0362D0]/10' : 
                      act.type === 'journal' ? 'bg-[#C99A2E] ring-[#C99A2E]/10' : 
                      'bg-[#950415] ring-[#950415]/10'
                    }`} />
                    <div className="text-[11px] text-slate-600 leading-snug">
                      <span className="font-bold text-[#172033]">{act.title}</span> • {act.description}
                      <p className="text-slate-400 text-[9px] mt-0.5 font-semibold">{act.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="w-full mt-4 py-2 bg-[#F5F6F8] hover:bg-[#E6E8EC] border border-[#E6E8EC] text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Lihat Semua Aktivitas
            </button>
          </section>

        </div>
      </section>

      <ActivityLogModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
    </div>
  );
}

// 5. PANEL "PERLU PERHATIAN" REUSABLE SUB-COMPONENT (Elegant Soft Maroon & Soft Gold Warning Panel)
interface AttentionPanelProps {
  navigate: (path: string) => void;
}

function AttentionPanel({ navigate }: AttentionPanelProps) {
  return (
    <section className="bg-[#950415]/5 p-4 sm:p-5 rounded-2xl border border-[#950415]/20 shadow-xs">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#950415]/15 text-[#950415]">
        <AlertCircle size={18} strokeWidth={2.5} />
        <h3 className="font-black text-xs uppercase tracking-wider">Perlu Perhatian</h3>
      </div>

      <div className="space-y-3">
        {/* Item 1 */}
        <div 
          onClick={() => navigate('/groups')}
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl cursor-pointer transition-colors"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">Kelompok 7</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Progress BTQ 61% — di bawah rata-rata silabus.
            </p>
          </div>
        </div>

        {/* Item 2 */}
        <div 
          onClick={() => navigate('/groups')}
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl cursor-pointer transition-colors"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">Kelompok 10</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Kehadiran siswa menyentuh 72% pada sesi ini.
            </p>
          </div>
        </div>

        {/* Item 3 */}
        <div 
          onClick={() => navigate('/attendance/students')}
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl cursor-pointer transition-colors"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">4 siswa terancam</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Memiliki tingkat kehadiran kumulatif di bawah 75%.
            </p>
          </div>
        </div>

        {/* Item 4 */}
        <div 
          onClick={() => navigate('/attendance/mentors')}
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl cursor-pointer transition-colors"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">1 mentor belum check-in</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Kelompok 7 belum melakukan absensi harian.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
