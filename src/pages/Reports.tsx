import React, { useState, useEffect } from 'react';
import { theme } from '../theme';
import { 
  Download, 
  Printer, 
  FileText, 
  PieChart, 
  BarChart, 
  FileSpreadsheet, 
  Sparkles, 
  QrCode, 
  UserCheck, 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronRight, 
  GraduationCap, 
  ShieldCheck,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Toast } from '../components/Toast';
import { 
  getStudents, 
  getGroups, 
  getMentors, 
  getAllStudentAttendance, 
  getAllStudentProgress, 
  getAllMentorAttendance, 
  getTeachingJournals,
  Student, 
  Group, 
  Mentor 
} from '../services/db';
import { OfficialReportModal } from '../components/reports/OfficialReportModal';
import { BatchOfficialReportModal } from '../components/reports/BatchOfficialReportModal';
import { getPublicStudentUrl } from '../utils/studentUtils';
import { useNavigate } from 'react-router-dom';

export function Reports() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ 
    show: boolean; 
    type: 'success' | 'error' | 'warning' | 'info'; 
    message: string; 
    description?: string; 
  }>({ show: false, type: 'success', message: '' });

  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  // Raport Selection State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isRaportModalOpen, setIsRaportModalOpen] = useState(false);
  const [isBatchRaportModalOpen, setIsBatchRaportModalOpen] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [stList, grList, mList] = await Promise.all([
          getStudents(),
          getGroups(),
          getMentors()
        ]);
        setStudents(stList);
        setGroups(grList);
        setMentors(mList);
        if (stList.length > 0) {
          setSelectedStudentId(stList[0].id);
        }
      } catch (err) {
        console.error('Failed to load students for reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || null;
  const selectedStudentGroup = selectedStudent ? groups.find((g) => g.id === selectedStudent.groupId) : null;
  const selectedStudentMentor = selectedStudentGroup ? mentors.find((m) => m.id === selectedStudentGroup.mentorId) : null;

  const classes = Array.from(new Set(students.map((s) => s.class).filter(Boolean))).sort();
  const filteredStudents = selectedClassFilter === 'all' 
    ? students 
    : students.filter((s) => s.class === selectedClassFilter);

  // Helper to trigger browser CSV download
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Real Export Handlers
  const handleExportAttendance = async () => {
    try {
      const attData = await getAllStudentAttendance();
      const headers = ['ID Presensi', 'ID Santri', 'Nama Santri', 'Kelas', 'ID Kelompok', 'Tanggal', 'Status', 'Catatan'];
      const rows = attData.map((a) => {
        const st = students.find((s) => s.id === a.studentId);
        return [
          a.id || '',
          a.studentId,
          `"${st?.name || 'Santri'}"`,
          st?.class || '',
          a.groupId || '',
          a.date || '',
          a.status,
          `"${(a.notes || '').replace(/"/g, '""')}"`
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      downloadCSV(`Rekap_Kehadiran_Santri_SMPN102_${new Date().toISOString().split('T')[0]}.csv`, csv);
      setToast({
        show: true,
        type: 'success',
        message: 'Ekspor Berhasil',
        description: 'File CSV Rekapitulasi Kehadiran Santri telah diunduh.'
      });
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Mengekspor',
        description: 'Terjadi kendala saat mengambil data kehadiran.'
      });
    }
  };

  const handleExportProgress = async () => {
    try {
      const progData = await getAllStudentProgress();
      const headers = ['ID Progress', 'ID Santri', 'Nama Santri', 'Kelas', 'Kelompok', 'Pertemuan Ke', 'Surah/Hafalan', 'Membaca', 'Tajwid', 'Menulis', 'Total Nilai'];
      const rows = progData.map((p) => {
        const st = students.find((s) => s.id === p.studentId);
        const gr = groups.find((g) => g.id === p.groupId);
        return [
          p.id || '',
          p.studentId,
          `"${st?.name || 'Santri'}"`,
          st?.class || '',
          `"${gr?.name || '-'}"`,
          p.meetingNumber || '',
          `"${(p.memorizedSurah || '').replace(/"/g, '""')}"`,
          p.reading || '',
          p.tajwid || '',
          p.writing || '',
          p.total || ''
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      downloadCSV(`Rekap_Progress_Hafalan_SMPN102_${new Date().toISOString().split('T')[0]}.csv`, csv);
      setToast({
        show: true,
        type: 'success',
        message: 'Ekspor Berhasil',
        description: 'File CSV Capaian Nilai & Hafalan Santri telah diunduh.'
      });
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Mengekspor',
        description: 'Terjadi kendala saat mengambil data progress.'
      });
    }
  };

  const handleExportMentors = async () => {
    try {
      const mAttData = await getAllMentorAttendance();
      const headers = ['ID Presensi', 'ID Mentor', 'Nama Mentor', 'ID Kelompok', 'Tanggal', 'Status', 'Catatan'];
      const rows = mAttData.map((m) => {
        const mentor = mentors.find((men) => men.id === m.mentorId);
        return [
          m.id || '',
          m.mentorId,
          `"${mentor?.name || 'Mentor'}"`,
          m.groupId || '',
          m.date || '',
          m.status,
          `"${(m.notes || '').replace(/"/g, '""')}"`
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      downloadCSV(`Rekap_Kehadiran_Mentor_SMPN102_${new Date().toISOString().split('T')[0]}.csv`, csv);
      setToast({
        show: true,
        type: 'success',
        message: 'Ekspor Berhasil',
        description: 'File CSV Kehadiran Mentor telah diunduh.'
      });
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Mengekspor',
        description: 'Terjadi kendala saat mengambil data kehadiran mentor.'
      });
    }
  };

  const handleExportJournals = async () => {
    try {
      const journalsRes = await getTeachingJournals('all', 1000);
      const journals = journalsRes.data;
      const headers = ['ID Jurnal', 'ID Kelompok', 'Kelompok', 'ID Mentor', 'Tanggal', 'Pertemuan Ke', 'Materi', 'Catatan Kegiatan'];
      const rows = journals.map((j) => {
        const gr = groups.find((g) => g.id === j.groupId);
        return [
          j.id || '',
          j.groupId,
          `"${gr?.name || '-'}"`,
          j.mentorId,
          j.date || '',
          j.meetingNumber || '',
          `"${(j.materialTaught || '').replace(/"/g, '""')}"`,
          `"${(j.studentObstacles || j.nextPlan || '').replace(/"/g, '""')}"`
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      downloadCSV(`Rekap_Jurnal_Mengajar_SMPN102_${new Date().toISOString().split('T')[0]}.csv`, csv);
      setToast({
        show: true,
        type: 'success',
        message: 'Ekspor Berhasil',
        description: 'File CSV Jurnal Pembelajaran telah diunduh.'
      });
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Mengekspor',
        description: 'Terjadi kendala saat mengambil data jurnal.'
      });
    }
  };

  const handleCopyPortalLink = () => {
    const portalUrl = `${window.location.origin}/#/portal`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedPortalLink(true);
    setToast({
      show: true,
      type: 'success',
      message: 'Tautan Tersalin',
      description: 'Link Portal Pantau Orang Tua telah disalin ke clipboard.'
    });
    setTimeout(() => setCopiedPortalLink(false), 3000);
  };

  const reportTypes = [
    {
      title: 'Laporan Kehadiran Santri',
      description: 'Rekapitulasi absensi santri per kelompok, kelas, dan rentang tanggal kegiatan BTQ.',
      icon: FileText,
      color: 'text-[#0362D0]',
      bg: 'bg-[#0362D0]/10',
      onExport: handleExportAttendance,
    },
    {
      title: 'Laporan Progress BTQ & Hafalan',
      description: 'Perkembangan kemampuan membaca (Jilid/Juz), tajwid, dan hafalan hafiz santri.',
      icon: PieChart,
      color: 'text-[#C99A2E]',
      bg: 'bg-[#C99A2E]/20',
      onExport: handleExportProgress,
    },
    {
      title: 'Laporan Kehadiran Mentor',
      description: 'Data kehadiran mentor dan ustadz pembimbing dalam mengajar setiap kelompok.',
      icon: UserCheck,
      color: 'text-[#172033]',
      bg: 'bg-[#172033]/10',
      onExport: handleExportMentors,
    },
    {
      title: 'Laporan Pembelajaran & Jurnal',
      description: 'Progress penyelesaian target kurikulum dan catatan pembimbing per kelompok.',
      icon: BarChart,
      color: 'text-[#950415]',
      bg: 'bg-[#950415]/10',
      onExport: handleExportJournals,
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] rounded-3xl p-6 lg:p-8 text-white shadow-md border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-100 text-xs font-bold mb-3 border border-white/10">
            <FileSpreadsheet size={14} className="text-[#C99A2E]" /> Pusat Laporan & Administrasi Resmi
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Laporan, Rapor Resmi & Portal Pantau
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
            Cetak Lembar Raport Resmi BTQ berformat Kop Surat SMPN 102 Jakarta, kelola akses portal orang tua via QR Code, dan ekspor database ke spreadsheet.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyPortalLink}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-black rounded-xl text-xs flex items-center gap-2 border border-white/20 transition-all cursor-pointer backdrop-blur-md"
          >
            {copiedPortalLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copiedPortalLink ? 'Tautan Tersalin' : 'Salin Link Portal Ortu'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/portal')}
            className="px-4 py-2.5 bg-[#C99A2E] hover:bg-[#b08524] text-[#172033] font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <QrCode size={16} /> Buka Portal Pantau
          </button>
        </div>
      </div>

      {/* FEATURED 1: GENERATOR CETAK RAPORT RESMI A4 (KOP SURAT & TANDA TANGAN) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4 max-w-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0362D0] text-[10px] font-black uppercase tracking-wider mb-1 border border-blue-100">
              Format Standar Kedinasan A4
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#172033]">
              Cetak Raport Hasil Pembelajaran BTQ Santri
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
              Dilengkapi Kop Surat resmi SMPN 102 Jakarta, kolom nilai materi (Membaca, Tajwid, Khat, Tahfizh), rekapitulasi kehadiran, catatan deskriptif otomatis, serta 3 kolom tanda tangan (Orang Tua, Pembimbing, Kepala Sekolah).
            </p>
          </div>
        </div>

        {/* Student Selector and Print Button */}
        <div className="w-full lg:w-auto bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Class Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Filter Kelas</label>
            <select
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                const first = e.target.value === 'all' 
                  ? students[0]?.id 
                  : students.find((s) => s.class === e.target.value)?.id;
                if (first) setSelectedStudentId(first);
              }}
              className="w-full h-10 px-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#0362D0]"
            >
              <option value="all">Semua Kelas ({students.length})</option>
              {classes.map((c) => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>

          {/* Student Selector */}
          <div className="space-y-1 sm:min-w-[220px]">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pilih Santri</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#0362D0]"
            >
              {filteredStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.class || '-'})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:self-end flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={!selectedStudent}
              onClick={() => setIsRaportModalOpen(true)}
              className="w-full sm:w-auto h-10 px-4 bg-[#0362D0] hover:bg-[#0252b3] disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={16} /> Pratinjau & Cetak Rapor
            </button>
            <button
              type="button"
              disabled={students.length === 0}
              onClick={() => setIsBatchRaportModalOpen(true)}
              className="w-full sm:w-auto h-10 px-4 bg-[#172033] hover:bg-slate-800 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              title="Cetak seluruh lembar rapor sekaligus dengan pemisah halaman A4 otomatis"
            >
              <Layers size={16} className="text-[#C99A2E]" /> Cetak Rapor Massal
            </button>
          </div>
        </div>
      </div>

      {/* FEATURED 2: PORTAL PANTAU MANDIRI ORANG TUA SISWA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Portal Mandiri & QR Code Info */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C99A2E]/15 text-[#C99A2E] flex items-center justify-center font-bold">
                <QrCode size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Akses Tanpa Login
                </span>
                <h3 className="text-base font-black text-[#172033] mt-0.5">Portal Pantau Mandiri Orang Tua</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Orang tua siswa dapat memantau kehadiran harian dan setoran hafalan Al-Qur'an putra/putrinya secara mandiri cukup dengan memindai QR Code pada Kartu Pelajar atau mencari nama/NISN siswa tanpa memerlukan kata sandi.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Rute: /#/portal atau /#/pantau</span>
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="px-4 py-2 bg-slate-50 hover:bg-[#172033] hover:text-white text-[#172033] text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-100"
            >
              <span>Uji Coba Portal</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Card 2: Status Kartu Pelajar Santri */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center font-bold">
                <GraduationCap size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Cetak Massal ID Card
                </span>
                <h3 className="text-base font-black text-[#172033] mt-0.5">Cetak Kartu Santri Ber-QR Code</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Cetak kartu santri fisik lengkap dengan foto santri, identitas kelompok, dan QR Code dinamis resolusi tinggi yang terverifikasi ke sistem database BTQ Rohis Avicenna.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Tersedia {students.length} santri aktif</span>
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="px-4 py-2 bg-[#0362D0] hover:bg-[#0252b3] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={14} />
              <span>Buka Menu Kartu Santri</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: REKAPITULASI TABEL & EKSPOR DATA EXCEL/CSV */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-black text-[#172033] flex items-center gap-2">
          <FileText size={20} className="text-[#0362D0]" />
          <span>Rekapitulasi Data & Ekspor Spreadsheet</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs hover:border-[#0362D0]/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-2xl ${report.bg} ${report.color} shrink-0 font-bold`}>
                  <report.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-[#172033]">{report.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{report.description}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                <button 
                  type="button"
                  onClick={report.onExport}
                  className="px-3 py-2 bg-slate-50 hover:bg-[#0362D0] hover:text-white text-[#172033] font-black rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-100 cursor-pointer"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button 
                  type="button"
                  onClick={report.onExport}
                  className="px-3 py-2 bg-slate-50 hover:bg-[#172033] hover:text-white text-[#172033] font-black rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-100 cursor-pointer"
                >
                  <Download size={14} /> Export Excel (.csv)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Official Raport Modal for selected student */}
      {isRaportModalOpen && selectedStudent && (
        <OfficialReportModal
          isOpen={isRaportModalOpen}
          onClose={() => setIsRaportModalOpen(false)}
          student={selectedStudent}
          group={selectedStudentGroup}
          mentor={selectedStudentMentor}
        />
      )}

      {/* Batch Raport Modal for entire Class or Group */}
      {isBatchRaportModalOpen && (
        <BatchOfficialReportModal
          isOpen={isBatchRaportModalOpen}
          onClose={() => setIsBatchRaportModalOpen(false)}
          students={students}
          groups={groups}
          mentors={mentors}
          defaultClass={selectedClassFilter}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          description={toast.description}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}
