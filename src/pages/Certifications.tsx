import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  FileCheck, 
  Sparkles, 
  Calendar, 
  X, 
  UserCheck, 
  GraduationCap, 
  Download,
  Share2
} from 'lucide-react';
import { 
  getCertifications, 
  saveCertification, 
  deleteCertification, 
  getStudents, 
  getGroups, 
  getMentors, 
  createNotification,
  StudentCertification, 
  CertCategory, 
  CertStatus, 
  Student, 
  Group, 
  Mentor 
} from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

const CATEGORIES: CertCategory[] = [
  'Khatam Iqro/Tilawati',
  "Tasmi' Juz 30",
  "Tasmi' Juz 'Amma Pilihan",
  'Ujian Kenaikan Tingkat',
  "Khatam Al-Qur'an 30 Juz"
];

const STATUSES: { key: CertStatus; label: string; color: string; bg: string; icon: any }[] = [
  { key: 'Persiapan', label: 'Persiapan', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
  { key: 'Siap Ujian', label: 'Siap Ujian / Tasmi\'', color: 'text-amber-800', bg: 'bg-amber-100 border-amber-200', icon: AlertCircle },
  { key: 'Lulus Bersertifikat', label: 'Lulus & Bersertifikat', color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-200', icon: CheckCircle2 },
  { key: 'Perbaikan', label: 'Perbaikan / Remedial', color: 'text-rose-800', bg: 'bg-rose-100 border-rose-200', icon: AlertCircle }
];

export function Certifications() {
  const { userData, userRole, currentUser } = useAuth();
  const isMentor = userRole === 'mentor';

  const [certifications, setCertifications] = useState<StudentCertification[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);

  // Certificate Print / Preview modal
  const [selectedCertToPrint, setSelectedCertToPrint] = useState<StudentCertification | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    studentId: string;
    groupId: string;
    category: CertCategory;
    status: CertStatus;
    score: number;
    notes: string;
    certificateNumber: string;
    completedDate: string;
    examinerName: string;
  }>({
    studentId: '',
    groupId: '',
    category: 'Khatam Iqro/Tilawati',
    status: 'Siap Ujian',
    score: 85,
    notes: '',
    certificateNumber: '',
    completedDate: new Date().toISOString().split('T')[0],
    examinerName: userData?.name || 'Koordinator BTQ'
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, [userData, userRole, currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [certsData, studentsData, groupsData, mentorsData] = await Promise.all([
        getCertifications(),
        getStudents(),
        getGroups(),
        getMentors()
      ]);

      setCertifications(certsData);
      setStudents(studentsData);
      setGroups(groupsData);
      setMentors(mentorsData);

      // Default mentor group
      const matchedMentor = mentorsData.find(
        m => (userData?.id && m.id === userData.id) ||
             (currentUser?.uid && m.id === currentUser.uid) ||
             (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
             (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase())
      );
      const assignedGroupId = matchedMentor?.groupId || userData?.groupId;
      if (isMentor && assignedGroupId) {
        setSelectedGroupFilter(assignedGroupId);
      }
    } catch (e) {
      console.error("Failed to load certifications", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewModal = () => {
    setEditingCertId(null);
    const defaultGroup = isMentor 
      ? (groups.find(g => g.mentorId === userData?.id || g.id === userData?.groupId)?.id || groups[0]?.id || '')
      : (groups[0]?.id || '');

    const groupStudents = students.filter(s => s.groupId === defaultGroup);
    const defaultStudent = groupStudents[0]?.id || students[0]?.id || '';

    setFormData({
      studentId: defaultStudent,
      groupId: defaultGroup,
      category: "Tasmi' Juz 30",
      status: 'Siap Ujian',
      score: 85,
      notes: 'Kelancaran makhraj dan tajwid terpantau siap mengikuti ujian tasmi\'.',
      certificateNumber: `BTQ-102/CERT/${new Date().getFullYear()}/${String(certifications.length + 1).padStart(3, '0')}`,
      completedDate: new Date().toISOString().split('T')[0],
      examinerName: userData?.name || 'Ustadz Penguji'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (cert: StudentCertification) => {
    setEditingCertId(cert.id || null);
    setFormData({
      studentId: cert.studentId,
      groupId: cert.groupId,
      category: cert.category,
      status: cert.status,
      score: cert.score || 80,
      notes: cert.notes || '',
      certificateNumber: cert.certificateNumber || `BTQ-102/CERT/${new Date().getFullYear()}/001`,
      completedDate: cert.completedDate || new Date().toISOString().split('T')[0],
      examinerName: cert.examinerName || (userData?.name || 'Penguji BTQ')
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (certId: string) => {
    if (!window.confirm("Hapus data sertifikasi santri ini?")) return;
    try {
      await deleteCertification(certId);
      setCertifications(prev => prev.filter(c => c.id !== certId));
      showToast("Data sertifikasi dihapus");
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus sertifikasi");
    }
  };

  const handleQuickStatusChange = async (cert: StudentCertification, newStatus: CertStatus) => {
    try {
      const updated: StudentCertification = {
        ...cert,
        status: newStatus,
        completedDate: newStatus === 'Lulus Bersertifikat' ? (cert.completedDate || new Date().toISOString().split('T')[0]) : cert.completedDate,
        certificateNumber: newStatus === 'Lulus Bersertifikat' && !cert.certificateNumber 
          ? `BTQ-102/CERT/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 900) + 100)}` 
          : cert.certificateNumber,
        updatedAt: new Date().toISOString()
      };

      await saveCertification(updated);
      setCertifications(prev => prev.map(c => c.id === cert.id ? updated : c));
      showToast(`Status santri diperbarui menjadi: ${newStatus}`);

      // Broadcast if graduated
      if (newStatus === 'Lulus Bersertifikat') {
        try {
          await createNotification({
            title: `Kelulusan Sertifikasi: ${cert.studentName || 'Santri'}`,
            message: `Alhamdulillah, ananda ${cert.studentName || 'Santri'} telah lulus sertifikasi ${cert.category} dengan nilai ${cert.score || 90}.`,
            type: 'success',
            targetRole: 'all',
            link: '/certifications',
            readBy: [],
            createdAt: new Date().toISOString(),
            createdBy: userData?.name || 'Koordinator BTQ'
          });
        } catch (err) {
          console.warn(err);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah status");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.category) {
      alert("Mohon pilih santri dan kategori sertifikasi.");
      return;
    }

    setIsSaving(true);
    try {
      const studentObj = students.find(s => s.id === formData.studentId);
      const groupObj = groups.find(g => g.id === (formData.groupId || studentObj?.groupId));

      const certPayload: StudentCertification = {
        id: editingCertId || undefined,
        studentId: formData.studentId,
        studentName: studentObj?.name || 'Santri BTQ',
        studentNis: studentObj?.nis || '-',
        studentClass: studentObj?.class || '7A',
        groupId: groupObj?.id || formData.groupId || 'group_1',
        groupName: groupObj?.name || 'Kelompok Binaan',
        category: formData.category,
        status: formData.status,
        score: Number(formData.score) || 80,
        notes: formData.notes,
        certificateNumber: formData.status === 'Lulus Bersertifikat' ? formData.certificateNumber : undefined,
        completedDate: formData.status === 'Lulus Bersertifikat' ? formData.completedDate : undefined,
        examinerName: formData.examinerName,
        updatedAt: new Date().toISOString()
      };

      await saveCertification(certPayload);

      if (formData.status === 'Lulus Bersertifikat') {
        try {
          await createNotification({
            title: `Kelulusan: ${studentObj?.name || 'Santri'}`,
            message: `Alhamdulillah, ananda ${studentObj?.name} telah lulus sertifikasi ${formData.category} dengan nilai ${formData.score}.`,
            type: 'success',
            targetRole: 'all',
            link: '/certifications',
            readBy: [userData?.id || currentUser?.uid || ''].filter(Boolean),
            createdAt: new Date().toISOString(),
            createdBy: userData?.name || 'Penguji BTQ'
          });
        } catch (err) {
          console.warn(err);
        }
      }

      showToast("Data status ujian & sertifikasi berhasil disimpan");
      setIsModalOpen(false);

      const refreshed = await getCertifications();
      setCertifications(refreshed);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan sertifikasi");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintCertificate = (cert: StudentCertification) => {
    setSelectedCertToPrint(cert);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  // Filtered List
  const filteredCertifications = certifications.filter(c => {
    const matchGroup = selectedGroupFilter === 'all' || c.groupId === selectedGroupFilter;
    const matchCategory = selectedCategoryFilter === 'all' || c.category === selectedCategoryFilter;
    const matchStatus = selectedStatusFilter === 'all' || c.status === selectedStatusFilter;
    const matchSearch = searchQuery === '' || 
      (c.studentName && c.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.studentNis && c.studentNis.includes(searchQuery)) ||
      (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchGroup && matchCategory && matchStatus && matchSearch;
  });

  // Summary Metrics
  const totalLulus = certifications.filter(c => c.status === 'Lulus Bersertifikat').length;
  const totalSiapUjian = certifications.filter(c => c.status === 'Siap Ujian').length;
  const totalPersiapan = certifications.filter(c => c.status === 'Persiapan' || c.status === 'Perbaikan').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-600 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 size={18} className="text-emerald-300" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-emerald-700 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-emerald-950/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-200 text-xs font-semibold mb-3 border border-white/10">
            <Award size={14} /> Sertifikasi & Kesiapan Ujian BTQ
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Status Ujian, Tasmi' & Sertifikasi Kelulusan
          </h1>
          <p className="text-emerald-100 text-sm mt-1.5 leading-relaxed">
            Pencatatan santri yang tuntas target kurikulum: Khatam Tilawati/Iqro, Siap Tasmi' Juz 30, dan penerbitan Sertifikat Kelulusan resmi.
          </p>
        </div>

        <button
          id="btn-tambah-sertifikasi"
          onClick={handleOpenNewModal}
          className="relative z-10 px-5 py-3 bg-white text-emerald-950 hover:bg-emerald-50 font-extrabold rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 shrink-0"
        >
          <Plus size={18} className="text-emerald-700" />
          Daftarkan Santri Ujian
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalLulus}</div>
            <div className="text-xs text-slate-500 font-medium">Santri Lulus & Bersertifikat</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalSiapUjian}</div>
            <div className="text-xs text-slate-500 font-medium">Siap Mengikuti Ujian / Tasmi'</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalPersiapan}</div>
            <div className="text-xs text-slate-500 font-medium">Tahap Bimbingan & Persiapan</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari santri atau NIS..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            />
          </div>

          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Kelompok</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Kategori Ujian</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Status</option>
            {STATUSES.map(st => (
              <option key={st.key} value={st.key}>{st.label}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end lg:self-center">
          Menampilkan <strong className="text-slate-800">{filteredCertifications.length}</strong> santri
        </div>
      </div>

      {/* Certifications Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Memuat data sertifikasi & status ujian santri...
          </div>
        ) : filteredCertifications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Santri</th>
                  <th className="py-3.5 px-4">Kelompok & Kelas</th>
                  <th className="py-3.5 px-4">Kategori Ujian / Target</th>
                  <th className="py-3.5 px-4">Status Kesiapan</th>
                  <th className="py-3.5 px-4 text-center">Nilai Ujian</th>
                  <th className="py-3.5 px-4">Nomor Piagam & Tgl</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCertifications.map(cert => {
                  const statusObj = STATUSES.find(s => s.key === cert.status) || STATUSES[0];
                  const StatusIcon = statusObj.icon;

                  return (
                    <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {cert.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          NIS: {cert.studentNis || '-'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{cert.groupName}</div>
                        <div className="text-[11px] text-slate-500">Kelas {cert.studentClass}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-100 text-xs">
                          <Award size={13} /> {cert.category}
                        </span>
                        {cert.notes && (
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 max-w-xs">
                            {cert.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 border",
                            statusObj.bg,
                            statusObj.color
                          )}>
                            <StatusIcon size={12} /> {cert.status}
                          </span>
                        </div>

                        {/* Quick switch status dropdown for mentor / admin */}
                        <div className="mt-1.5">
                          <select
                            value={cert.status}
                            onChange={(e) => handleQuickStatusChange(cert, e.target.value as CertStatus)}
                            className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 border border-slate-200 outline-none cursor-pointer"
                          >
                            <option value="Persiapan">Ubah: Persiapan</option>
                            <option value="Siap Ujian">Ubah: Siap Ujian</option>
                            <option value="Lulus Bersertifikat">Ubah: Lulus & Bersertifikat</option>
                            <option value="Perbaikan">Ubah: Perbaikan</option>
                          </select>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {cert.score ? (
                          <span className={cn(
                            "px-2 py-1 rounded-lg font-black text-xs",
                            cert.score >= 90 ? "bg-emerald-100 text-emerald-800" :
                            cert.score >= 75 ? "bg-teal-50 text-teal-800" : "bg-rose-50 text-rose-700"
                          )}>
                            {cert.score}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {cert.certificateNumber ? (
                          <div>
                            <div className="font-mono font-bold text-[11px] text-emerald-800">
                              {cert.certificateNumber}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {cert.completedDate} • {cert.examinerName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Belum terbit</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cert.status === 'Lulus Bersertifikat' && (
                            <button
                              onClick={() => handlePrintCertificate(cert)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                              title="Lihat / Cetak Sertifikat Digital"
                            >
                              <Printer size={13} /> Cetak
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(cert)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Data"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => cert.id && handleDelete(cert.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Award size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Belum Ada Data Sertifikasi</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Belum ada santri yang didaftarkan untuk ujian atau sertifikasi. Klik tombol di bawah untuk mendaftarkan santri yang siap ujian.
            </p>
            <button
              onClick={handleOpenNewModal}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Daftarkan Santri Ujian Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit Sertifikasi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                  {editingCertId ? 'Edit Status Ujian & Sertifikat' : 'Pendaftaran Ujian & Sertifikasi'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan target ujian tasmi', status kelulusan, dan nomor piagam santri.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Santri <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={formData.studentId}
                  onChange={(e) => {
                    const stId = e.target.value;
                    const st = students.find(s => s.id === stId);
                    setFormData({ 
                      ...formData, 
                      studentId: stId,
                      groupId: st?.groupId || formData.groupId 
                    });
                  }}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- Pilih Santri --</option>
                  {students.map(s => {
                    const grp = groups.find(g => g.id === s.groupId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class} - {grp?.name || 'Kelompok'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Ujian / Target <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CertCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Ujian <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CertStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {STATUSES.map(st => (
                      <option key={st.key} value={st.key}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nilai Ujian / Tasmi' (0 - 100)
                  </label>
                  <input 
                    type="number"
                    min={0}
                    max={100}
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ustadz Penguji / Penilai
                  </label>
                  <input 
                    type="text"
                    value={formData.examinerName}
                    onChange={(e) => setFormData({ ...formData, examinerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {formData.status === 'Lulus Bersertifikat' && (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-700" /> Kelulusan & Penerbitan Piagam
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Piagam Resmi</label>
                      <input 
                        type="text"
                        value={formData.certificateNumber}
                        onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Kelulusan</label>
                      <input 
                        type="date"
                        value={formData.completedDate}
                        onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Evaluasi / Rekomendasi
                </label>
                <textarea 
                  rows={2}
                  placeholder="Catatan makhraj, kelancaran tajwid, atau rekomendasi jilid lanjutan..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <FileCheck size={15} /> {isSaving ? 'Menyimpan...' : 'Simpan Data Sertifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Piagam / Sertifikat Digital */}
      {selectedCertToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Award className="text-amber-500" size={18} /> Piagam Sertifikasi Kelulusan BTQ
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={triggerBrowserPrint}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} /> Cetak Dokumen
                </button>
                <button 
                  onClick={() => setSelectedCertToPrint(null)} 
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Certificate Preview Frame */}
            <div 
              ref={printRef}
              className="p-8 sm:p-10 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/40 border-8 border-double border-amber-600/60 rounded-2xl text-center relative shadow-inner my-2"
            >
              <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-800 mb-1">
                SMP NEGERI 102 JAKARTA
              </div>
              <div className="text-[10px] text-slate-500 tracking-wider uppercase mb-4">
                PROGRAM BIMBINGAN BACA TULIS AL-QUR'AN (BTQ)
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-black text-amber-900 tracking-tight my-2">
                SERTIFIKAT KELULUSAN
              </h2>
              
              <div className="text-[11px] font-mono text-slate-500 mb-6">
                Nomor: {selectedCertToPrint.certificateNumber || 'BTQ-102/CERT/2026/001'}
              </div>

              <p className="text-xs text-slate-600 italic mb-2">
                Diberikan kepada santri bimbingan:
              </p>

              <div className="text-xl sm:text-2xl font-bold text-slate-900 border-b-2 border-amber-400 inline-block px-8 pb-1 mb-2">
                {selectedCertToPrint.studentName}
              </div>

              <div className="text-xs font-semibold text-slate-600 mb-4">
                NIS: {selectedCertToPrint.studentNis || '-'} • Kelas: {selectedCertToPrint.studentClass || '7A'}
              </div>

              <p className="text-xs text-slate-700 max-w-lg mx-auto leading-relaxed mb-6">
                Dinyatakan telah <strong>LULUS DAN TUNTAS</strong> mengikuti evaluasi pembelajaran pada kategori:
                <span className="block text-sm font-extrabold text-emerald-900 mt-1">
                  "{selectedCertToPrint.category}"
                </span>
                dengan perolehan Predikat Nilai: <strong>{selectedCertToPrint.score || 90} / 100</strong>
              </p>

              <div className="flex justify-between items-end pt-8 px-6 text-xs text-slate-600">
                <div className="text-center">
                  <div className="text-[11px] text-slate-500 mb-12">Jakarta, {selectedCertToPrint.completedDate || new Date().toLocaleDateString('id-ID')}</div>
                  <div className="font-bold text-slate-900 border-t border-slate-400 pt-1 px-4">
                    {selectedCertToPrint.examinerName || 'Ustadz Penguji'}
                  </div>
                  <div className="text-[10px] text-slate-400">Penguji / Pembimbing</div>
                </div>

                <div className="w-16 h-16 rounded-full border-4 border-dashed border-amber-500/50 flex items-center justify-center text-amber-700 font-serif font-black text-xs rotate-[-12deg]">
                  STAMP
                </div>

                <div className="text-center">
                  <div className="text-[11px] text-slate-500 mb-12">Mengetahui,</div>
                  <div className="font-bold text-slate-900 border-t border-slate-400 pt-1 px-4">
                    Koordinator BTQ SMPN 102
                  </div>
                  <div className="text-[10px] text-slate-400">Penyelenggara Bimbingan</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
