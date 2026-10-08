import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getStudents, 
  getGroups, 
  getMentors, 
  getStudentAttendanceByStudent, 
  getStudentProgressHistory,
  Student, 
  Group, 
  Mentor,
  StudentAttendance,
  StudentProgress
} from '../services/db';
import { StudentIdCard } from '../components/cards/StudentIdCard';
import { OfficialReportModal } from '../components/reports/OfficialReportModal';
import { ParentScanPortal } from '../components/portal/ParentScanPortal';
import { 
  Loader2, 
  ArrowLeft, 
  Activity, 
  Calendar, 
  BookOpen, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  MessageCircle, 
  Printer, 
  X, 
  QrCode, 
  Share2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Award,
  Search,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { theme } from '../theme';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { getPublicStudentUrl } from '../utils/studentUtils';

export function PublicStudentProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  
  // If no studentId or route is a portal alias, show the ParentScanPortal
  if (!studentId || studentId === 'portal' || studentId === 'search' || studentId === 'scan') {
    return <ParentScanPortal />;
  }

  const [student, setStudent] = useState<Student | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [isPreviewCardModalOpen, setIsPreviewCardModalOpen] = useState(false);
  const [isOfficialRaportModalOpen, setIsOfficialRaportModalOpen] = useState(false);
  const [isShowBarcodeOpen, setIsShowBarcodeOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Active Tab for Parent details
  const [activeTab, setActiveTab] = useState<'overview' | 'hafalan' | 'presensi'>('overview');

  useEffect(() => {
    async function loadData() {
      if (!studentId) return;
      try {
        const students = await getStudents();
        const foundStudent = students.find(s => s.id === studentId || s.nis === studentId);
        
        if (!foundStudent) {
          setError('Data santri tidak ditemukan.');
          setLoading(false);
          return;
        }

        const groups = await getGroups();
        const foundGroup = groups.find(g => g.id === foundStudent.groupId);
        
        let foundMentor = null;
        if (foundGroup) {
          const mentors = await getMentors();
          foundMentor = mentors.find(m => m.id === foundGroup.mentorId);
        }

        const attHistory = await getStudentAttendanceByStudent(foundStudent.id);
        const progHistory = await getStudentProgressHistory(foundStudent.id);

        setStudent(foundStudent);
        setGroup(foundGroup || null);
        setMentor(foundMentor || null);
        setAttendance(attHistory);
        setProgress(progHistory);
      } catch (err) {
        console.error(err);
        setError('Terjadi kesalahan saat memuat data rapor.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <Loader2 size={36} className="animate-spin text-[#0362D0] mb-4" />
        <p className="text-[#172033] font-bold text-sm">Menghubungkan ke Database Cloud SMPN 102...</p>
        <span className="text-xs text-slate-400 mt-1">Memuat profil dan riwayat hafalan santri</span>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-lg font-black text-[#172033] mb-1">Data Santri Tidak Ditemukan</h1>
        <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
          {error || 'ID Santri atau QR Code tidak valid dalam sistem database BTQ.'}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link 
            to="/student/card/portal" 
            className="px-5 py-2.5 bg-[#0362D0] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#024a9e] transition-all flex items-center gap-1.5"
          >
            <Search size={14} /> Pindai / Cari Siswa Lain
          </Link>
          <Link 
            to="/" 
            className="px-5 py-2.5 bg-white border border-slate-200 text-[#172033] text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
          >
            Halaman Utama
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalMeetings = attendance.length;
  const presentMeetings = attendance.filter(a => a.status === 'Hadir').length;
  const attendancePercentage = totalMeetings > 0 ? Math.round((presentMeetings / totalMeetings) * 100) : 0;
  
  const latestProgress = progress.length > 0 ? progress[progress.length - 1] : null;
  const averageScore = latestProgress?.total ? Number(latestProgress.total) : 80;
  
  // Surah Setoran History
  const memorizedRecords = progress.filter(p => p.memorizedSurah && p.memorizedSurah.trim() !== '');

  // Prepare Chart Data
  const chartData = progress.map((p, index) => ({
    name: `Pekan ${p.meetingNumber || index + 1}`,
    nilai: p.total,
    kkm: 75
  })).slice(-8);

  // Find latest mentor notes
  const recordWithNotes = [...attendance].reverse().find(a => a.notes && a.notes.trim() !== '');
  const mentorNotes = recordWithNotes?.notes || null;

  const directStudentUrl = getPublicStudentUrl(student.id);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directStudentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*RAPOR & PANTAU HARIAN BTQ SMPN 102 JAKARTA*\n` +
      `Nama Santri: ${student.name}\n` +
      `Kelas: ${student.class}\n` +
      `Kehadiran: ${attendancePercentage}%\n` +
      `Nilai Mutu Terakhir: ${averageScore}\n\n` +
      `Pantau riwayat hafalan Al-Qur'an dan unduh lembar rapor resmi melalui tautan:\n${directStudentUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-16">
      {/* Public Header */}
      <div className="bg-[#172033] text-white pt-8 pb-32 px-6 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="400" height="400" viewBox="0 0 100 100">
            <circle cx="80" cy="20" r="40" fill="currentColor" />
            <circle cx="90" cy="80" r="30" fill="currentColor" />
          </svg>
        </div>
        
        <div className="max-w-xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-[#C99A2E] mb-2 border border-white/10">
            <QrCode size={14} /> Portal Mandiri Siswa & Wali Murid
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
            Rapor Digital BTQ Rohis Avicenna
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-300">
            SMP Negeri 102 Jakarta • Laporan Capaian Belajar Real-Time
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-24 relative z-20 flex flex-col gap-6 print:hidden">
        
        {/* ID Card Display with Action Buttons */}
        <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
          <StudentIdCard student={student} group={group || undefined} mentor={mentor || undefined} />
          
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-2">
            <button 
              type="button"
              onClick={() => setIsOfficialRaportModalOpen(true)}
              className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0362D0] text-white rounded-xl text-xs font-black hover:bg-[#0252b3] transition-colors shadow-sm cursor-pointer"
            >
              <FileText size={16} />
              Cetak Raport Resmi (A4)
            </button>
            <button 
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
              title="Bagikan ke WhatsApp"
            >
              <Share2 size={15} />
              <span>WhatsApp</span>
            </button>
            <button 
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-50 text-[#172033] border border-slate-100 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              title="Salin Tautan"
            >
              {copiedLink ? <Check size={15} className="text-emerald-600" /> : <QrCode size={15} />}
              <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100 text-xs">
            <Link 
              to="/student/card/portal" 
              className="text-slate-500 hover:text-[#0362D0] font-bold flex items-center gap-1"
            >
              <Search size={14} /> Pindai Siswa Lain
            </Link>
            <Link 
              to="/login" 
              className="text-[#0362D0] hover:underline font-bold flex items-center gap-1"
            >
              Masuk Guru / Mentor <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex flex-col">
            <div className="flex items-center gap-2 mb-1.5 text-slate-500">
              <Calendar size={16} className="text-[#0362D0]" />
              <span className="text-[11px] font-black uppercase tracking-wider">Kehadiran</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-[#172033]">{attendancePercentage}%</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-1">
              {presentMeetings} dari {totalMeetings} pertemuan
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex flex-col">
            <div className="flex items-center gap-2 mb-1.5 text-slate-500">
              <Activity size={16} className="text-[#C99A2E]" />
              <span className="text-[11px] font-black uppercase tracking-wider">Nilai Rata-rata</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-[#172033]">{averageScore}</span>
              <span className="text-xs text-slate-400 font-bold">/ 100</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-1">
              Predikat: {averageScore >= 85 ? 'Mumtaz (A)' : averageScore >= 75 ? 'Jayyid (B)' : 'Maqbul (C)'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs for Parent View */}
        <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-xs flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-[#172033] text-white shadow-xs'
                : 'text-slate-500 hover:text-[#172033] hover:bg-slate-50'
            }`}
          >
            Capaian & Grafik
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hafalan')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'hafalan'
                ? 'bg-[#172033] text-white shadow-xs'
                : 'text-slate-500 hover:text-[#172033] hover:bg-slate-50'
            }`}
          >
            <span>Riwayat Hafalan</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#C99A2E]/20 text-[#C99A2E]">
              {memorizedRecords.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presensi')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'presensi'
                ? 'bg-[#172033] text-white shadow-xs'
                : 'text-slate-500 hover:text-[#172033] hover:bg-slate-50'
            }`}
          >
            <span>Presensi KBM</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
              {attendance.length}
            </span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & LEARNING TREND */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Detail Latest Progress */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#172033]" />
                  <h2 className="text-sm font-black text-[#172033]">Rincian Nilai Terkini</h2>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Standar KKM 75</span>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {latestProgress ? (
                  <>
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-[#172033] block">Tilawah & Kelancaran</span>
                        <span className="text-[10px] text-slate-400">Fashohah & pengucapan harakat</span>
                      </div>
                      <span className="text-sm font-black text-[#172033]">{latestProgress.reading || 85}</span>
                    </div>

                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-[#172033] block">Kaidah Tajwid</span>
                        <span className="text-[10px] text-slate-400">Hukum Nun/Mim mati & Mad</span>
                      </div>
                      <span className="text-sm font-black text-[#172033]">{latestProgress.tajwid || 80}</span>
                    </div>

                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-[#172033] block">Menulis Arab (Khat)</span>
                        <span className="text-[10px] text-slate-400">Kerapian sambung huruf hijaiyah</span>
                      </div>
                      <span className="text-sm font-black text-[#172033]">{latestProgress.writing || 82}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-[#172033] block">Target Hafalan Juz 30</span>
                        <span className="text-[10px] text-slate-400">Surah yang telah tuntas</span>
                      </div>
                      <span className="text-xs font-black text-[#0362D0] max-w-[200px] text-right">
                        {latestProgress.memorizedSurah || 'Surah-surah Pendek Juz 30'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">
                    Belum ada rekaman nilai sesi tercatat.
                  </div>
                )}
              </div>
            </div>

            {/* Learning Trend Graph */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden p-5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Activity size={18} className="text-[#0362D0]" />
                    <h2 className="text-sm font-black text-[#172033]">Grafik Tren Nilai</h2>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Garis KKM (75)
                  </span>
                </div>
                <div className="h-44 w-full -ml-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} domain={[40, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#172033', marginBottom: '2px' }}
                      />
                      <ReferenceLine y={75} stroke="#C99A2E" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="nilai" stroke="#0362D0" strokeWidth={3} dot={{ r: 4, fill: '#0362D0', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} name="Nilai Mutu" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Mentor Notes */}
            {mentorNotes && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-xs p-5 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle size={18} className="text-emerald-700" />
                  <h2 className="text-sm font-black text-emerald-950">Pesan dari Guru Pembina</h2>
                </div>
                <p className="text-xs sm:text-sm text-emerald-900 font-medium leading-relaxed italic">
                  "{mentorNotes}"
                </p>
                {mentor && (
                  <p className="text-xs font-bold text-emerald-700 mt-2 text-right">
                    — {mentor.name} (Pembimbing BTQ)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT SETORAN HAFALAN AL-QUR'AN */}
        {activeTab === 'hafalan' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-[#C99A2E]" />
                <h3 className="text-sm font-black text-[#172033]">Rekam Jejak Setoran Hafalan</h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">{memorizedRecords.length} Setoran Tercatat</span>
            </div>

            {memorizedRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <BookOpen size={28} className="mx-auto text-slate-300" />
                <p>Belum ada rekaman setoran hafalan surah yang tersimpan.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {memorizedRecords.map((rec, idx) => (
                  <div key={idx} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center text-[11px] font-black">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-black text-[#172033]">{rec.memorizedSurah}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium pl-8">
                        Pekan Ke-{rec.meetingNumber || idx + 1} • Tajwid: {rec.tajwid || '-'} • Kelancaran: {rec.reading || '-'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black">
                        Nilai {rec.total || 85}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RIWAYAT PRESENSI & KEHADIRAN */}
        {activeTab === 'presensi' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#0362D0]" />
                <h3 className="text-sm font-black text-[#172033]">Daftar Kehadiran KBM BTQ</h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {attendancePercentage}% Kehadiran
              </span>
            </div>

            {attendance.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <Calendar size={28} className="mx-auto text-slate-300" />
                <p>Belum ada rekaman presensi santri.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendance.map((att, idx) => (
                  <div key={att.id || idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          att.status === 'Hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.status === 'Sakit'
                            ? 'bg-amber-100 text-amber-800'
                            : att.status === 'Izin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {att.status.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[#172033]">
                          {att.date ? format(new Date(att.date), 'dd MMMM yyyy', { locale: localeId }) : `Pertemuan ${idx + 1}`}
                        </div>
                        {att.notes && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">"{att.notes}"</p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                        att.status === 'Hadir'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : att.status === 'Sakit'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : att.status === 'Izin'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center py-4 text-[11px] text-slate-400 font-medium">
          Sistem Informasi Bina Baca Tulis Al-Qur'an (SI-BTQ)<br />
          Rohis Avicenna • SMP Negeri 102 Jakarta
        </div>
      </div>

      {/* Official A4 Raport Modal */}
      {isOfficialRaportModalOpen && (
        <OfficialReportModal
          isOpen={isOfficialRaportModalOpen}
          onClose={() => setIsOfficialRaportModalOpen(false)}
          student={student}
          group={group}
          mentor={mentor}
        />
      )}
    </div>
  );
}
