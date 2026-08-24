import React, { useState, useEffect } from 'react';
import { Users, Layers, BookOpen, UserCheck, TrendingUp, AlertCircle, Loader2, Award, ArrowRight, CheckCircle, Calendar, Edit3 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { getGroups, getStudents, getMentors, Group, Student, Mentor } from '../services/db';
import { Badge } from '../components/ui/Badge';
import { ActivityLogModal } from '../components/modals/ActivityLogModal';
import { useAuth } from '../contexts/AuthContext';
import { masterGrades, masterSessions } from '../services/curriculumData';
import { Link } from 'react-router-dom';

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
    { label: 'Siswa Kelompok Anda', value: `${students.length} Siswa`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Kelompok Binaan', value: mentorGroup?.name || 'Kelompok Anda', icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Kehadiran Siswa', value: '96%', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Rata-rata Kelancaran', value: '82%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ] : [
    { label: 'Total Siswa', value: students.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Kelompok', value: groups.length, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Kehadiran Hari Ini', value: '94%', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Rata-rata Progress', value: '78%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full py-16">
        <div className="animate-pulse flex flex-col items-center gap-4 text-emerald-600">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-medium text-slate-600">Memuat data Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden max-w-[1200px] mx-auto w-full">
      {/* Welcome Banner for Mentor */}
      {isMentor && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-bold uppercase tracking-wider">
                Dashboard Mentor
              </span>
              {mentorGrade && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-xs font-medium border border-amber-400/30">
                  {mentorGrade.name} • {mentorGrade.programName}
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold">
              Assalamu'alaikum, {userData?.name || 'Ustadz / Ustadzah'}
            </h1>
            <p className="text-xs md:text-sm text-emerald-100/80 mt-1">
              Membimbing <strong>{mentorGroup?.name || 'Kelompok Binaan'}</strong> SMPN 102 Jakarta. Pantau kemajuan bacaan dan absensi santri Anda.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link 
              to="/attendance/students" 
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <UserCheck size={15} /> Absensi
            </Link>
            <Link 
              to="/journals" 
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <BookOpen size={15} /> Tulis Jurnal
            </Link>
            <Link 
              to="/progress" 
              className="px-3.5 py-2 bg-white text-emerald-950 hover:bg-emerald-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Edit3 size={15} /> Input Nilai
            </Link>
            <Link 
              to="/certifications" 
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Award size={15} /> Ujian & Sertifikat
            </Link>
          </div>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{stat.label}</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Table Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {isMentor ? (
            /* MENTOR VIEW: Daftar Siswa Kelompok Binaan */
            <section className="bg-white rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
                    Daftar Siswa {mentorGroup?.name || 'Kelompok Anda'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total {students.length} siswa aktif dalam kelompok binaan Anda
                  </p>
                </div>
                <Link to="/students" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                  Kelola Siswa <ArrowRight size={12} />
                </Link>
              </div>

              <div className="overflow-x-auto p-4">
                {students.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Belum ada siswa yang terdaftar di kelompok ini.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 text-xs">
                        <th className="py-2.5 font-medium">Siswa</th>
                        <th className="py-2.5 font-medium">Kelas</th>
                        <th className="py-2.5 font-medium">Capaian Terakhir</th>
                        <th className="py-2.5 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.map((student, idx) => {
                        const sampleStatus = idx % 5 === 0 ? "Butuh Bimbingan" : idx % 3 === 0 ? "Sangat Baik" : "Lancar";
                        const sampleProgress = idx % 5 === 0 ? "Pertemuan 3 (Hal. 7)" : idx % 3 === 0 ? "Pertemuan 5 (Hal. 14)" : "Pertemuan 4 (Hal. 10)";
                        const statusBg = sampleStatus === "Sangat Baik" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : sampleStatus === "Lancar" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-amber-100 text-amber-700";

                        return (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                                <span className="font-semibold text-slate-800">{student.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-slate-700 text-xs font-medium">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">
                                Kelas {student.class}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600 text-xs font-medium">
                              {sampleProgress}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBg}`}>
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
            /* ADMIN VIEW: Ringkasan Seluruh Kelompok */
            <section className="bg-white rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
                  Ringkasan 10 Kelompok BTQ
                </h3>
                <Link to="/groups" className="text-xs text-emerald-600 font-semibold hover:underline">Lihat Semua</Link>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="py-3 font-medium">Kelompok</th>
                      <th className="py-3 font-medium">Mentor</th>
                      <th className="py-3 font-medium text-center">Siswa</th>
                      <th className="py-3 font-medium">Progress</th>
                      <th className="py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groups.slice(0, 10).map((group) => {
                      const mentor = mentors.find(m => m.id === group.mentorId);
                      const studentsCount = students.filter(s => s.groupId === group.id).length;
                      const progress = 65 + Math.floor(Math.random() * 25);
                      
                      let statusLabel = "BAIK";
                      let statusBg = "bg-emerald-100 text-emerald-700";
                      let barColor = "bg-emerald-500";
                      
                      if (progress < 70) {
                        statusLabel = "BERKEMBANG";
                        statusBg = "bg-amber-100 text-amber-700";
                        barColor = "bg-amber-400";
                      } else if (progress > 85) {
                        statusLabel = "SANGAT BAIK";
                      }

                      return (
                        <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-semibold text-slate-800">{group.name}</td>
                          <td className="py-3 text-slate-600">{mentor?.name || 'Belum ada'}</td>
                          <td className="py-3 text-center text-slate-600">{studentsCount}</td>
                          <td className="py-3">
                            <div className="w-full max-w-[120px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{width: `${progress}%`}}></div>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBg}`}>
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
          <section className="bg-white rounded-2xl border border-slate-200 p-4 shrink-0 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {isMentor ? `Kurikulum ${mentorGrade?.name || 'Grade 1'}` : 'Timeline Kurikulum BTQ'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isMentor ? (mentorGrade?.programName || 'Utsmani Jilid 1') : 'Setiap Sabtu • Semester 1'}
                </p>
              </div>
              <span className="text-[10px] bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-semibold">
                Sesi 3 (Aktif)
              </span>
            </div>

            {/* Riwayat Sesi 1 & 2 Selesai */}
            <div className="mb-2.5 p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>2 Sesi Telah Terlaksana</span>
              </div>
              <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                Pekan 1 & 2 Selesai
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex gap-3 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                <div className="w-1 bg-amber-500 rounded-full shrink-0"></div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    Sesi 3 • Sabtu Pekan Ini
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {gradeSessions[2]?.topic || 'Harakat Tunggal: Fathah, Kasrah, dan Dhammah'}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    Ref: {gradeSessions[2]?.pageRef || 'Halaman 4–6'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 opacity-80">
                <div className="w-1 bg-slate-300 rounded-full shrink-0"></div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                    Sesi 4 • Sabtu Pekan Depan
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    {gradeSessions[3]?.topic || 'Bentuk Huruf Sambung di Awal, Tengah, dan Akhir Kata'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Ref: {gradeSessions[3]?.pageRef || 'Halaman 7–9'}
                  </p>
                </div>
              </div>
            </div>

            <Link 
              to="/curriculum" 
              className="mt-3 text-xs text-emerald-600 font-semibold hover:underline flex items-center justify-center gap-1 w-full pt-2 border-t border-slate-100"
            >
              Lihat Silabus Lengkap 32 Sesi <ArrowRight size={12} />
            </Link>
          </section>

          {/* Activity Widget */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 flex-1 flex flex-col overflow-hidden shadow-sm">
            <h3 className="font-bold text-slate-700 mb-3 text-sm">Aktivitas Terkini</h3>
            <div className="space-y-3.5 overflow-y-auto pr-1 pb-2 flex-1">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs shrink-0">✅</div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">{isMentor ? 'Anda' : 'Mentor Kelompok 3'}</span> mengisi absensi harian (100% hadir).
                  <p className="text-slate-400 text-[10px] mt-0.5">Baru saja</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs shrink-0">📈</div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">Siswa {mentorGroup?.name || 'Kelompok 1'}</span> menyelesaikan target hafalan/bacaan.
                  <p className="text-slate-400 text-[10px] mt-0.5">15 menit yang lalu</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs shrink-0">📖</div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">Kurikulum</span> diperbarui sesuai buku Utsmani Jilid 1 & 2.
                  <p className="text-slate-400 text-[10px] mt-0.5">1 jam yang lalu</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="w-full mt-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
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
