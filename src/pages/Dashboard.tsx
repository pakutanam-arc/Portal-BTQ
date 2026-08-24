import React, { useState, useEffect } from 'react';
import { Users, Layers, BookOpen, UserCheck, TrendingUp, AlertCircle, Loader2, Award, ArrowRight, CheckCircle, Calendar, Edit3, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { getGroups, getStudents, getMentors, Group, Student, Mentor } from '../services/db';
import { ActivityLogModal } from '../components/modals/ActivityLogModal';
import { useAuth } from '../contexts/AuthContext';
import { masterGrades, masterSessions } from '../services/curriculumData';
import { Link } from 'react-router-dom';
import { APP_LOGO, APP_NAME, APP_SUBTITLE, APP_DESC } from '../assets/logo';

export function Dashboard() {
  const { currentUser, userData, userRole } = useAuth();
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadData() {
      try {
        const [groupsData, studentsData, mentorsData] = await Promise.all([
          getGroups(),
          getStudents(),
          getMentors()
        ]);
        
        setAllGroups(groupsData);
        setMentors(mentorsData);

        // Identify current mentor ID
        const userEmailLower = currentUser?.email?.toLowerCase();
        const matchedMentor = mentorsData.find(
          m => (userData?.id && m.id === userData.id) ||
               (currentUser?.uid && m.id === currentUser.uid) ||
               (userEmailLower && m.email?.toLowerCase() === userEmailLower) ||
               (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase()) ||
               (userData?.groupId && m.groupId === userData.groupId)
        );
        const mentorId = matchedMentor?.id || userData?.id || currentUser?.uid;
        const assignedGroupId = matchedMentor?.groupId || userData?.groupId;

        let filteredGroups = groupsData;
        let filteredStudents = studentsData;
        
        if (isMentor) {
          const mentorAssigned = groupsData.filter(g => 
            g.mentorId === mentorId || 
            (assignedGroupId && g.id === assignedGroupId)
          );
          filteredGroups = mentorAssigned.length > 0 ? mentorAssigned : groupsData.slice(0, 1);
          const groupIds = filteredGroups.map(g => g.id);
          filteredStudents = studentsData.filter(s => groupIds.includes(s.groupId));
        }

        setGroups(filteredGroups);
        setStudents(filteredStudents);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userRole, userData, currentUser, isMentor]);

  // Specific grade info for the mentor's group
  const mentorGroup = groups[0] || allGroups[0];
  const mentorGrade = mentorGroup ? masterGrades.find(g => g.id === mentorGroup.gradeId) : masterGrades[0];
  const gradeSessions = mentorGrade ? masterSessions.filter(s => s.gradeId === mentorGrade.id) : masterSessions.slice(0, 16);

  const statCards = isMentor ? [
    { label: 'Siswa Kelompok Anda', value: `${students.length} Siswa`, icon: Users, color: 'text-[#0362D0]', bg: 'bg-[#0362D0]/10', border: 'border-[#0362D0]/20' },
    { label: 'Kelompok Binaan', value: mentorGroup?.name || 'Kelompok Anda', icon: Layers, color: 'text-[#C99A2E]', bg: 'bg-[#C99A2E]/10', border: 'border-[#C99A2E]/20' },
    { label: 'Kehadiran Siswa', value: '96%', icon: UserCheck, color: 'text-[#950415]', bg: 'bg-[#950415]/10', border: 'border-[#950415]/20' },
    { label: 'Rata-rata Kelancaran', value: '82%', icon: TrendingUp, color: 'text-[#0362D0]', bg: 'bg-[#0362D0]/10', border: 'border-[#0362D0]/20' },
  ] : [
    { label: 'Total Siswa', value: students.length, icon: Users, color: 'text-[#0362D0]', bg: 'bg-[#0362D0]/10', border: 'border-[#0362D0]/20' },
    { label: 'Total Kelompok', value: groups.length, icon: Layers, color: 'text-[#C99A2E]', bg: 'bg-[#C99A2E]/10', border: 'border-[#C99A2E]/20' },
    { label: 'Kehadiran Hari Ini', value: '94%', icon: UserCheck, color: 'text-[#950415]', bg: 'bg-[#950415]/10', border: 'border-[#950415]/20' },
    { label: 'Rata-rata Progress', value: '78%', icon: TrendingUp, color: 'text-[#0362D0]', bg: 'bg-[#0362D0]/10', border: 'border-[#0362D0]/20' },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full py-16">
        <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-semibold text-[#172033]">Memuat data Portal BTQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden max-w-[1240px] mx-auto w-full">
      {/* HERO PANEL with Royal Blue (#0362D0) & SMPN 102 Identity */}
      <div className="bg-[#0362D0] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden border border-[#0362D0]">
        {/* Subtle Geometric Pattern Background Overlay */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.8) 1.5px, transparent 0%), radial-gradient(circle at 60px 60px, rgba(201,154,46,0.9) 1.5px, transparent 0%)`,
            backgroundSize: '80px 80px'
          }}
        />
        {/* Decorative Ring Motifs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full border-4 border-white/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border-8 border-[#C99A2E]/20 pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
          {/* Logo Container */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-xl ring-4 ring-[#C99A2E]/50">
            <img 
              src={APP_LOGO} 
              alt="Logo SMPN 102 Jakarta" 
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[#C99A2E] text-xs font-bold border border-[#C99A2E]/40 tracking-wide">
                {!isMentor ? 'KOORDINATOR BTQ 102' : 'DASHBOARD MENTOR'}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-black/20 text-blue-100 text-xs font-semibold">
                SMP Negeri 102 Jakarta • TP 2025/2026
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              {!isMentor ? `${APP_NAME} — ${APP_SUBTITLE}` : `Assalamu'alaikum, ${userData?.name || 'Ustadz / Ustadzah'}`}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1 font-medium max-w-xl">
              {!isMentor 
                ? APP_DESC 
                : `Membimbing ${mentorGroup?.name || 'Kelompok Binaan'} (Ruang: ${mentorGroup?.room || 'Belum diatur'}) di SMP Negeri 102 Jakarta.`}
            </p>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 relative z-10 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/15">
          {!isMentor ? (
            <>
              <Link 
                to="/students" 
                className="px-4 py-2.5 bg-white text-[#0362D0] hover:bg-blue-50 font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Users size={15} className="text-[#0362D0]" /> Data Siswa
              </Link>
              <Link 
                to="/groups" 
                className="px-4 py-2.5 bg-[#C99A2E] hover:bg-[#b58825] text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Layers size={15} /> 10 Kelompok
              </Link>
              <Link 
                to="/reports" 
                className="px-4 py-2.5 bg-[#950415] hover:bg-[#7a0311] text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <BookOpen size={15} /> Laporan Rekap
              </Link>
            </>
          ) : (
            <>
              <Link 
                to="/attendance/students" 
                className="px-4 py-2.5 bg-white text-[#0362D0] hover:bg-blue-50 font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <UserCheck size={15} className="text-[#0362D0]" /> Input Absensi
              </Link>
              <Link 
                to="/progress" 
                className="px-4 py-2.5 bg-[#C99A2E] hover:bg-[#b58825] text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Edit3 size={15} /> Input Nilai
              </Link>
            </>
          )}
        </div>
      </div>

      {/* STAT CARDS (4 Grid Layout) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div 
            key={idx} 
            className="bg-white p-5 rounded-2xl border border-[#E6E8EC] flex items-center gap-4 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${stat.bg} ${stat.color} ${stat.border} group-hover:scale-105 transition-transform`}>
              <stat.icon size={22} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">{stat.label}</p>
              <p className="text-xl md:text-2xl font-black text-[#172033] mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {isMentor ? (
            /* MENTOR VIEW: Daftar Siswa Kelompok Binaan */
            <section className="bg-white rounded-2xl border border-[#E6E8EC] flex flex-col h-full overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-[#E6E8EC] flex justify-between items-center bg-[#F5F6F8]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-5 bg-[#0362D0] rounded-full" />
                  <div>
                    <h3 className="font-extrabold text-[#172033] text-sm sm:text-base">
                      Daftar Siswa {mentorGroup?.name || 'Kelompok Anda'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total {students.length} siswa dalam kelompok binaan
                    </p>
                  </div>
                </div>
                <Link to="/students" className="text-xs text-[#0362D0] font-bold hover:underline flex items-center gap-1">
                  Kelola Siswa <ArrowRight size={13} />
                </Link>
              </div>

              <div className="overflow-x-auto p-4 sm:p-5">
                {students.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs sm:text-sm font-medium">
                    Belum ada siswa yang terdaftar di kelompok ini.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-[#E6E8EC] text-[11px] uppercase tracking-wider font-extrabold">
                        <th className="py-2.5 font-bold">Nama Siswa</th>
                        <th className="py-2.5 font-bold">Kelas</th>
                        <th className="py-2.5 font-bold">Capaian Terakhir</th>
                        <th className="py-2.5 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E8EC]">
                      {students.map((student, idx) => {
                        const sampleStatus = idx % 5 === 0 ? "Butuh Bimbingan" : idx % 3 === 0 ? "Sangat Baik" : "Lancar";
                        const sampleProgress = idx % 5 === 0 ? "Pertemuan 3 (Hal. 7)" : idx % 3 === 0 ? "Pertemuan 5 (Hal. 14)" : "Pertemuan 4 (Hal. 10)";
                        
                        const statusBg = sampleStatus === "Sangat Baik" 
                          ? "bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20" 
                          : sampleStatus === "Lancar" 
                          ? "bg-[#C99A2E]/15 text-[#956d11] border-[#C99A2E]/30" 
                          : "bg-[#950415]/10 text-[#950415] border-[#950415]/20";

                        return (
                          <tr key={student.id} className="hover:bg-[#F5F6F8] transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black flex items-center justify-center shrink-0 border border-[#0362D0]/20">
                                  {student.name.charAt(0)}
                                </div>
                                <span className="font-bold text-[#172033]">{student.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-slate-600 text-xs font-semibold">
                              <span className="px-2.5 py-0.5 bg-[#F5F6F8] rounded-md border border-[#E6E8EC] text-[#172033]">
                                Kelas {student.class}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600 text-xs font-medium">
                              {sampleProgress}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${statusBg}`}>
                                {sampleStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          ) : (
            /* ADMIN VIEW: Ringkasan 10 Kelompok */
            <section className="bg-white rounded-2xl border border-[#E6E8EC] flex flex-col h-full overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-[#E6E8EC] flex justify-between items-center bg-[#F5F6F8]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-5 bg-[#0362D0] rounded-full" />
                  <h3 className="font-extrabold text-[#172033] text-sm sm:text-base">
                    Ringkasan 10 Kelompok BTQ
                  </h3>
                </div>
                <Link to="/groups" className="text-xs text-[#0362D0] font-bold hover:underline">
                  Lihat Semua
                </Link>
              </div>
              <div className="overflow-x-auto p-4 sm:p-5">
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[560px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-[#E6E8EC] text-[11px] uppercase tracking-wider font-extrabold">
                      <th className="py-2.5 font-bold">Kelompok</th>
                      <th className="py-2.5 font-bold">Lokasi / Ruang</th>
                      <th className="py-2.5 font-bold">Mentor</th>
                      <th className="py-2.5 font-bold text-center">Siswa</th>
                      <th className="py-2.5 font-bold">Progress</th>
                      <th className="py-2.5 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E8EC]">
                    {groups.slice(0, 10).map((group) => {
                      const mentor = mentors.find(m => m.id === group.mentorId);
                      const studentsCount = students.filter(s => s.groupId === group.id).length;
                      const progress = 65 + Math.floor(Math.random() * 25);
                      
                      let statusLabel = "LANCAR";
                      let statusBg = "bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20";
                      let barColor = "bg-[#0362D0]";
                      
                      if (progress < 70) {
                        statusLabel = "BERKEMBANG";
                        statusBg = "bg-[#C99A2E]/15 text-[#956d11] border-[#C99A2E]/30";
                        barColor = "bg-[#C99A2E]";
                      } else if (progress > 85) {
                        statusLabel = "SANGAT BAIK";
                        statusBg = "bg-[#0362D0]/15 text-[#0362D0] border-[#0362D0]/30";
                      }

                      return (
                        <tr key={group.id} className="hover:bg-[#F5F6F8] transition-colors">
                          <td className="py-3 font-bold text-[#172033]">{group.name}</td>
                          <td className="py-3 text-xs">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#F5F6F8] text-[#172033] font-bold border border-[#E6E8EC]">
                              <MapPin size={12} className="text-[#0362D0]" />
                              {group.room || '-'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600 text-xs font-medium">{mentor?.name || 'Belum ada'}</td>
                          <td className="py-3 text-center text-[#172033] font-bold">{studentsCount}</td>
                          <td className="py-3">
                            <div className="w-full max-w-[100px] bg-[#E6E8EC] h-2 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{width: `${progress}%`}}></div>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${statusBg}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Timeline Kurikulum Widget */}
          <section className="bg-white rounded-2xl border border-[#E6E8EC] p-4 sm:p-5 shrink-0 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E6E8EC]">
              <div>
                <h3 className="font-extrabold text-[#172033] text-sm">
                  {isMentor ? `Kurikulum ${mentorGrade?.name || 'Grade 1'}` : 'Timeline Kurikulum BTQ'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isMentor ? (mentorGrade?.programName || 'Utsmani Jilid 1') : 'Setiap Sabtu • Semester 1'}
                </p>
              </div>
              <span className="text-[10px] bg-[#C99A2E] text-slate-950 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                Sesi 3 (Aktif)
              </span>
            </div>

            {/* Riwayat Status Sesi */}
            <div className="mb-3 p-2.5 bg-[#0362D0]/5 rounded-xl border border-[#0362D0]/15 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-[#0362D0] font-bold">
                <CheckCircle size={15} className="text-[#0362D0]" />
                <span>2 Sesi Telah Terlaksana</span>
              </div>
              <span className="text-[10px] bg-[#0362D0]/15 text-[#0362D0] px-2 py-0.5 rounded font-extrabold">
                Pekan 1 & 2
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {/* Active Session */}
              <div className="flex gap-3 bg-[#C99A2E]/10 p-3 rounded-2xl border border-[#C99A2E]/30 relative overflow-hidden">
                <div className="w-1.5 bg-[#C99A2E] rounded-full shrink-0" />
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#7a580a] bg-[#C99A2E]/20 px-2 py-0.5 rounded-md">
                    Sesi 3 • Sabtu Pekan Ini
                  </span>
                  <p className="text-xs font-extrabold text-[#172033] mt-1.5 leading-snug">
                    {gradeSessions[2]?.topic || 'Harakat Tunggal: Fathah, Kasrah, dan Dhammah'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Ref: {gradeSessions[2]?.pageRef || 'Halaman 4–6'}
                  </p>
                </div>
              </div>

              {/* Upcoming Session */}
              <div className="flex gap-3 bg-[#F5F6F8] p-3 rounded-2xl border border-[#E6E8EC]">
                <div className="w-1.5 bg-slate-300 rounded-full shrink-0" />
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                    Sesi 4 • Sabtu Pekan Depan
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-1.5 leading-snug">
                    {gradeSessions[3]?.topic || 'Bentuk Huruf Sambung di Awal, Tengah, dan Akhir Kata'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Ref: {gradeSessions[3]?.pageRef || 'Halaman 7–9'}
                  </p>
                </div>
              </div>
            </div>

            <Link 
              to="/curriculum" 
              className="mt-4 text-xs text-[#0362D0] font-extrabold hover:underline flex items-center justify-center gap-1 w-full pt-3 border-t border-[#E6E8EC]"
            >
              Lihat Silabus Lengkap 32 Sesi <ArrowRight size={13} />
            </Link>
          </section>

          {/* Activity Widget */}
          <section className="bg-white rounded-2xl border border-[#E6E8EC] p-4 sm:p-5 flex-1 flex flex-col overflow-hidden shadow-xs">
            <h3 className="font-extrabold text-[#172033] mb-3 text-sm pb-2 border-b border-[#E6E8EC]">
              Aktivitas Terkini
            </h3>
            <div className="space-y-3.5 overflow-y-auto pr-1 pb-2 flex-1">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center text-xs shrink-0 font-bold border border-[#0362D0]/20">
                  ✓
                </div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold text-[#172033]">{isMentor ? 'Anda' : 'Mentor Kelompok 3'}</span> mengisi absensi harian (100% hadir).
                  <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Baru saja</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#C99A2E]/15 text-[#956d11] flex items-center justify-center text-xs shrink-0 font-bold border border-[#C99A2E]/30">
                  ★
                </div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold text-[#172033]">Siswa {mentorGroup?.name || 'Kelompok 1'}</span> menyelesaikan target hafalan.
                  <p className="text-slate-400 text-[10px] mt-0.5 font-medium">15 menit yang lalu</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#950415]/10 text-[#950415] flex items-center justify-center text-xs shrink-0 font-bold border border-[#950415]/20">
                  📖
                </div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold text-[#172033]">Silabus BTQ</span> diperbarui sesuai buku Utsmani Jilid 1 & 2.
                  <p className="text-slate-400 text-[10px] mt-0.5 font-medium">1 jam yang lalu</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="w-full mt-3 py-2.5 bg-[#F5F6F8] text-[#172033] rounded-xl text-xs font-bold hover:bg-[#E6E8EC] transition-colors border border-[#E6E8EC] cursor-pointer"
            >
              Lihat Riwayat Lengkap
            </button>
          </section>
        </div>
      </div>

      <ActivityLogModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
    </div>
  );
}

