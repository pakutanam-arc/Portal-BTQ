import React, { useState, useEffect, useRef, useMemo } from 'react';
import { theme } from '../theme';
import { 
  Award, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
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
  Share2,
  RotateCcw
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
import { Toast } from '../components/Toast';
import { APP_LOGO } from '../assets/logo';
import { getGradeForGroup } from '../services/curriculumData';
import { useDebounce } from '../hooks/useDebounce';

const CATEGORIES: CertCategory[] = [
  'Khatam Iqro/Tilawati',
  "Tasmi' Juz 30",
  "Tasmi' Juz 'Amma Pilihan",
  'Ujian Kenaikan Tingkat',
  "Khatam Al-Qur'an 30 Juz"
];

const STATUSES: { key: CertStatus; label: string; color: string; bg: string; icon: any }[] = [
  { key: 'Persiapan', label: 'Persiapan', color: 'text-slate-700', bg: 'bg-slate-50', icon: Clock },
  { key: 'Siap Ujian', label: 'Siap Ujian / Tasmi\'', color: 'text-[#172033]', bg: 'bg-[#C99A2E]/20 border-[#C99A2E]/40', icon: AlertCircle },
  { key: 'Lulus Bersertifikat', label: 'Lulus & Bersertifikat', color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-200', icon: CheckCircle2 },
  { key: 'Perbaikan', label: 'Perbaikan / Remedial', color: 'text-[#950415]', bg: 'bg-[#950415]/10 border-[#950415]/20', icon: AlertCircle }
];

export function Certifications() {
  const { userData, userRole, currentUser } = useAuth();
  const isMentor = userRole === 'mentor';

  const [certifications, setCertifications] = useState<StudentCertification[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 200);

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

  const [toast, setToast] = useState<{ show: boolean, type: 'success' | 'error' | 'warning' | 'info', message: string, description?: string }>({ show: false, type: 'success', message: '' });

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message: msg, type });
  };

  useEffect(() => {
    loadData();
  }, [userData, userRole, currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, groupsData, mentorsData] = await Promise.all([
        getStudents(),
        getGroups(),
        getMentors()
      ]);

      setStudents(studentsData);
      setGroups(groupsData);
      setMentors(mentorsData);

      // Default mentor group
      let initialGroup = 'all';
      const matchedMentor = mentorsData.find(
        m => (userData?.id && m.id === userData.id) ||
             (currentUser?.uid && m.id === currentUser.uid) ||
             (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
             (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase())
      );
      
      const assignedGroupId = matchedMentor?.groupId || userData?.groupId;
      if (isMentor && assignedGroupId) {
        setSelectedGroupFilter(assignedGroupId);
        initialGroup = assignedGroupId;
      }
      
      const res = await getCertifications(initialGroup === 'all' ? undefined : initialGroup, 20);
      setCertifications(res.data);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error("Failed to load certifications", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (groupId: string) => {
    setSelectedGroupFilter(groupId);
    setLoading(true);
    try {
      const res = await getCertifications(groupId === 'all' ? undefined : groupId, 20);
      setCertifications(res.data);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const grp = selectedGroupFilter === 'all' ? undefined : selectedGroupFilter;
      const res = await getCertifications(grp, 20, lastDoc);
      setCertifications(prev => [...prev, ...res.data]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
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

  const [certToDelete, setCertToDelete] = useState<StudentCertification | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const promptDelete = (cert: StudentCertification) => {
    setCertToDelete(cert);
  };

  const handleConfirmDelete = async () => {
    if (!certToDelete || !certToDelete.id) return;
    const certId = certToDelete.id;
    setIsDeleting(true);
    try {
      await deleteCertification(certId, certToDelete.studentName, certToDelete.category);
      setCertifications(prev => prev.filter(c => c.id !== certId));
      showToast(`Data ujian/sertifikasi untuk ${certToDelete.studentName || 'santri'} berhasil dihapus`);
      setCertToDelete(null);
      if (isModalOpen && editingCertId === certId) {
        setIsModalOpen(false);
        setEditingCertId(null);
      }
    } catch (e: any) {
      console.error('Delete certification failed:', e);
      showToast(e?.message || "Gagal menghapus sertifikasi dari database", "error");
    } finally {
      setIsDeleting(false);
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
      showToast("Gagal mengubah status", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.category) {
      showToast("Mohon pilih santri dan kategori sertifikasi.", "warning");
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

      await handleFilterChange(selectedGroupFilter);
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan sertifikasi", "error");
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

  // Memoized Filtered List
  const filteredCertifications = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    return certifications.filter(c => {
      const matchGroup = selectedGroupFilter === 'all' || c.groupId === selectedGroupFilter;
      const matchCategory = selectedCategoryFilter === 'all' || c.category === selectedCategoryFilter;
      const matchStatus = selectedStatusFilter === 'all' || c.status === selectedStatusFilter;
      const matchSearch = q === '' || 
        (c.studentName && c.studentName.toLowerCase().includes(q)) ||
        (c.studentNis && c.studentNis.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      return matchGroup && matchCategory && matchStatus && matchSearch;
    });
  }, [certifications, selectedGroupFilter, selectedCategoryFilter, selectedStatusFilter, debouncedSearchQuery]);

  // Reset all active filters
  const handleResetFilters = () => {
    setSelectedGroupFilter('all');
    setSelectedCategoryFilter('all');
    setSelectedStatusFilter('all');
    setSearchQuery('');
  };

  const isFilterActive = selectedGroupFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedStatusFilter !== 'all' || searchQuery !== '';

  // Summary Metrics
  const totalLulus = useMemo(() => certifications.filter(c => c.status === 'Lulus Bersertifikat').length, [certifications]);
  const totalSiapUjian = useMemo(() => certifications.filter(c => c.status === 'Siap Ujian').length, [certifications]);
  const totalPersiapan = useMemo(() => certifications.filter(c => c.status === 'Persiapan' || c.status === 'Perbaikan').length, [certifications]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          description={toast.description}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] rounded-3xl p-6 lg:p-8 text-white shadow-md border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-100 text-xs font-bold mb-3 border border-white/10">
            <Award size={14} className="text-[#C99A2E]" /> Sertifikasi & Kesiapan Ujian BTQ
          </div>
          <h1 className={theme.typography.h1.replace('text-[#172033]', 'text-white')}>
            Status Ujian, Tasmi' & Sertifikasi Kelulusan
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
            Pencatatan santri yang tuntas target kurikulum: Khatam Tilawati/Iqro, Siap Tasmi' Juz 30, dan penerbitan Sertifikat Kelulusan resmi.
          </p>
        </div>

        <button
          id="btn-tambah-sertifikasi"
          onClick={handleOpenNewModal}
          className="relative z-10 px-5 py-3 bg-[#C99A2E] text-slate-950 hover:bg-[#b58a27] font-black rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus size={18} />
          Daftarkan Santri Ujian
        </button>
      </div>

      {/* KPI Stats Strip with clickable status filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Lulus Bersertifikat' ? 'all' : 'Lulus Bersertifikat')}
          className={cn(
            "bg-white p-5 rounded-3xl border shadow-xs flex items-center gap-4 text-left transition-all cursor-pointer",
            selectedStatusFilter === 'Lulus Bersertifikat' ? "ring-2 ring-emerald-500 border-emerald-300" : "border-slate-100 hover:border-emerald-300"
          )}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[#172033]">{totalLulus}</div>
            <div className="text-xs text-slate-500 font-bold">Santri Lulus & Bersertifikat</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Siap Ujian' ? 'all' : 'Siap Ujian')}
          className={cn(
            "bg-white p-5 rounded-3xl border shadow-xs flex items-center gap-4 text-left transition-all cursor-pointer",
            selectedStatusFilter === 'Siap Ujian' ? "ring-2 ring-[#C99A2E] border-[#C99A2E]" : "border-slate-100 hover:border-[#C99A2E]/50"
          )}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#C99A2E]/20 text-[#172033] flex items-center justify-center font-bold">
            <Sparkles size={24} className="text-[#C99A2E]" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#172033]">{totalSiapUjian}</div>
            <div className="text-xs text-slate-500 font-bold">Siap Mengikuti Ujian / Tasmi'</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Persiapan' ? 'all' : 'Persiapan')}
          className={cn(
            "bg-white p-5 rounded-3xl border shadow-xs flex items-center gap-4 text-left transition-all cursor-pointer",
            selectedStatusFilter === 'Persiapan' ? "ring-2 ring-[#0362D0] border-[#0362D0]" : "border-slate-100 hover:border-[#0362D0]/40"
          )}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[#172033]">{totalPersiapan}</div>
            <div className="text-xs text-slate-500 font-bold">Tahap Bimbingan & Persiapan</div>
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari santri atau NIS..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
            />
          </div>

          <select
            value={selectedGroupFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#172033] outline-none focus:ring-2 focus:ring-[#0362D0]"
          >
            <option value="all">Semua Kelompok</option>
            {groups.map(g => {
              const gr = getGradeForGroup(g);
              return (
                <option key={g.id} value={g.id}>{g.name} ({gr.name} - {gr.programName})</option>
              );
            })}
          </select>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#172033] outline-none focus:ring-2 focus:ring-[#0362D0]"
          >
            <option value="all">Semua Kategori Ujian</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#172033] outline-none focus:ring-2 focus:ring-[#0362D0]"
          >
            <option value="all">Semua Status</option>
            {STATUSES.map(st => (
              <option key={st.key} value={st.key}>{st.label}</option>
            ))}
          </select>

          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
            >
              <RotateCcw size={13} /> Reset Filter
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium self-end lg:self-center">
          Menampilkan <strong className="text-[#172033] font-bold">{filteredCertifications.length}</strong> dari {certifications.length} santri
        </div>
      </div>

      {/* Certifications Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Memuat data sertifikasi & status ujian santri...
          </div>
        ) : filteredCertifications.length > 0 ? (
          <>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold bg-slate-50/50 whitespace-nowrap">
                  <th className="py-3.5 px-4">Nama Santri</th>
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
                    <tr key={cert.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-[#172033] text-xs sm:text-sm">
                          {cert.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          NIS: {cert.studentNis || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#172033]">{cert.groupName}</div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <span>Kelas {cert.studentClass}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-[#0362D0] bg-[#0362D0]/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {getGradeForGroup(groups.find(g => g.id === cert.groupId) || { name: cert.groupName }).name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0362D0]/10 text-[#0362D0] font-bold border border-[#0362D0]/20 text-xs whitespace-nowrap">
                          <Award size={13} /> {cert.category}
                        </span>
                        {cert.notes && (
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 max-w-xs font-medium">
                            {cert.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 border whitespace-nowrap",
                            statusObj.bg,
                            statusObj.color
                          )}>
                            <StatusIcon size={12} /> {cert.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-black text-sm text-[#172033]">{cert.score ?? cert.examScore ?? '-'}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#172033] text-[11px]">
                          {cert.certificateNumber || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {cert.completedDate || cert.examDate || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(cert)}
                            className="p-1.5 text-slate-400 hover:text-[#0362D0] hover:bg-[#0362D0]/10 rounded-xl transition-colors cursor-pointer"
                            title="Edit / Update Data"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => promptDelete(cert)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-3 p-3">
            {filteredCertifications.map(cert => {
              const statusObj = STATUSES.find(s => s.key === cert.status) || STATUSES[0];
              const StatusIcon = statusObj.icon;
              return (
                <div key={cert.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-extrabold text-[#172033] text-sm leading-tight">{cert.studentName}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                        <span>{cert.groupName}</span>
                        <span>•</span>
                        <span>Kelas {cert.studentClass}</span>
                        <span className="text-[9px] font-bold text-[#0362D0] bg-[#0362D0]/10 px-1.5 py-0.5 rounded">
                          {getGradeForGroup(groups.find(g => g.id === cert.groupId) || { name: cert.groupName }).name}
                        </span>
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black inline-flex items-center gap-1 border shrink-0",
                      statusObj.bg,
                      statusObj.color
                    )}>
                      <StatusIcon size={10} /> {cert.status}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0362D0]/10 text-[#0362D0] font-bold border border-[#0362D0]/20 text-[10px]">
                      <Award size={12} /> {cert.category}
                    </span>
                    {cert.notes && (
                      <div className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 font-medium bg-slate-50 p-2 rounded-lg">
                        {cert.notes}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Nilai Ujian</p>
                      <p className="text-sm font-black text-[#172033]">{cert.score ?? cert.examScore ?? '-'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Tgl Ujian</p>
                      <p className="text-xs font-black text-[#172033]">{cert.completedDate || cert.examDate || '-'}</p>
                    </div>
                  </div>
                  
                  {cert.certificateNumber && (
                    <div className="mb-4">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">No. Piagam</p>
                      <p className="text-[11px] font-bold text-[#172033]">{cert.certificateNumber}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleEdit(cert)}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 text-[#0362D0] border border-[#0362D0]/30 hover:bg-[#0362D0]/5 rounded-xl font-bold text-[11px] transition-colors"
                    >
                      <Edit3 size={14} /> Update
                    </button>
                    <button
                      onClick={() => promptDelete(cert)}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl font-bold text-[11px] transition-colors"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {hasMore && (
            <div className="mt-8 mb-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-black text-[#172033] hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#172033] border-t-transparent rounded-full animate-spin"></div>
                    Memuat...
                  </>
                ) : (
                  'Muat Lebih Banyak'
                )}
              </button>
            </div>
          )}
          
        </>
        ) : (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center mx-auto mb-3">
              <Award size={24} />
            </div>
            <h3 className="font-black text-[#172033] text-sm">Belum Ada Data Sertifikasi</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed font-medium">
              Belum ada santri yang didaftarkan untuk ujian atau sertifikasi. Klik tombol di bawah untuk mendaftarkan santri yang siap ujian.
            </p>
            <button
              onClick={handleOpenNewModal}
              className="mt-4 px-4 py-2 bg-[#0362D0] hover:bg-[#0252b3] text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
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
                <h3 className="font-black text-base sm:text-lg text-[#172033]">
                  {editingCertId ? 'Edit Status Ujian & Sertifikat' : 'Pendaftaran Ujian & Sertifikasi'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Tentukan target ujian tasmi', status kelulusan, dan nomor piagam santri.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#172033] mb-1">
                  Pilih Santri <span className="text-[#950415]">*</span>
                </label>
                <select 
                  value={formData.studentId}
                  onChange={(e) => {
                    const stId = e.target.value;
                    const st = students.find(s => s.id === stId);
                    const grp = groups.find(g => g.id === st?.groupId);
                    const gr = getGradeForGroup(grp);
                    let defaultCat: CertCategory = formData.category;
                    if (gr.id === 'grade3') {
                      defaultCat = "Tasmi' Juz 30";
                    } else if (gr.id === 'grade2') {
                      defaultCat = 'Ujian Kenaikan Tingkat';
                    } else {
                      defaultCat = 'Khatam Iqro/Tilawati';
                    }
                    setFormData({ 
                      ...formData, 
                      studentId: stId,
                      groupId: st?.groupId || formData.groupId,
                      category: defaultCat
                    });
                  }}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
                >
                  <option value="">-- Pilih Santri --</option>
                  {students.map(s => {
                    const grp = groups.find(g => g.id === s.groupId);
                    const gr = getGradeForGroup(grp);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class} - {grp?.name || 'Kelompok'} | {gr.name} {gr.programName})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-black text-[#172033] mb-1">
                    Kategori Ujian / Target <span className="text-[#950415]">*</span>
                  </label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CertCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#172033] mb-1">
                    Status Ujian <span className="text-[#950415]">*</span>
                  </label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CertStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
                  >
                    {STATUSES.map(st => (
                      <option key={st.key} value={st.key}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-black text-[#172033] mb-1">
                    Nilai Ujian / Tasmi' (0 - 100)
                  </label>
                  <input 
                    type="number"
                    min={0}
                    max={100}
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#172033] mb-1">
                    Ustadz Penguji / Penilai
                  </label>
                  <input 
                    type="text"
                    value={formData.examinerName}
                    onChange={(e) => setFormData({ ...formData, examinerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
                  />
                </div>
              </div>

              {formData.status === 'Lulus Bersertifikat' && (
                <div className="bg-[#0362D0]/10 p-4 rounded-2xl border border-[#0362D0]/20 space-y-3">
                  <div className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" /> Kelulusan & Penerbitan Piagam
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-[#172033] mb-1">Nomor Piagam Resmi</label>
                      <input 
                        type="text"
                        value={formData.certificateNumber}
                        onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-[#0362D0]/30 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[#172033] mb-1">Tanggal Kelulusan</label>
                      <input 
                        type="date"
                        value={formData.completedDate}
                        onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-[#0362D0]/30 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-[#172033] mb-1">
                  Catatan Evaluasi / Rekomendasi
                </label>
                <textarea 
                  rows={2}
                  placeholder="Catatan makhraj, kelancaran tajwid, atau rekomendasi jilid lanjutan..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                {editingCertId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const currentCert = certifications.find(c => c.id === editingCertId);
                      if (currentCert) promptDelete(currentCert);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Hapus data sertifikasi ini"
                  >
                    <Trash2 size={14} /> Hapus Data
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 sm:border-transparent rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#0362D0] hover:bg-[#0252b3] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 text-center"
                  >
                    <FileCheck size={15} /> {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
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
              <h3 className="font-black text-base text-[#172033] flex items-center gap-2">
                <Award className="text-[#C99A2E]" size={18} /> Piagam Sertifikasi Kelulusan BTQ
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={triggerBrowserPrint}
                  className="px-3.5 py-1.5 bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer size={14} /> Cetak Dokumen
                </button>
                <button 
                  onClick={() => setSelectedCertToPrint(null)} 
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Certificate Preview Frame */}
            <div 
              ref={printRef}
              className="p-8 sm:p-10 bg-gradient-to-b from-[#F5F6F8] via-white to-[#F5F6F8] border-8 border-double border-[#C99A2E] rounded-3xl text-center relative shadow-inner my-2"
            >
              {/* Official Seal Logo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2 rounded-full p-0.5 ring-2 ring-[#C99A2E] shadow-sm overflow-hidden bg-white">
                <img 
                  src={APP_LOGO} 
                  alt="Logo Rohis 102" 
                  className="w-full h-full object-cover rounded-full" 
                  referrerPolicy="no-referrer" 
                />
              </div>

              <div className="text-xs uppercase font-black tracking-widest text-[#0362D0] mb-0.5">
                SMP NEGERI 102 JAKARTA
              </div>
              <div className="text-[10px] text-[#C99A2E] font-black tracking-wider uppercase mb-3">
                ROHIS 102 • PORTAL BACA TULIS AL-QUR'AN (BTQ)
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#172033] tracking-tight my-2">
                SERTIFIKAT KELULUSAN
              </h2>
              
              <div className="text-[11px] font-mono font-bold text-slate-500 mb-6">
                Nomor: {selectedCertToPrint.certificateNumber || 'BTQ-102/CERT/2026/001'}
              </div>

              <p className="text-xs text-slate-600 italic font-medium mb-2">
                Diberikan kepada santri bimbingan:
              </p>

              <div className="text-xl sm:text-2xl font-black text-[#172033] border-b-2 border-[#C99A2E] inline-block px-8 pb-1 mb-2">
                {selectedCertToPrint.studentName}
              </div>

              <div className="text-xs font-bold text-slate-600 mb-4">
                NIS: {selectedCertToPrint.studentNis || '-'} • Kelas: {selectedCertToPrint.studentClass || '7A'}
              </div>

              <p className="text-xs text-slate-700 max-w-lg mx-auto leading-relaxed mb-6 font-medium">
                Dinyatakan telah <strong>LULUS DAN TUNTAS</strong> mengikuti evaluasi pembelajaran pada kategori:
                <span className="block text-sm font-black text-[#0362D0] mt-1">
                  "{selectedCertToPrint.category}"
                </span>
                dengan perolehan Predikat Nilai: <strong className="text-[#172033]">{selectedCertToPrint.score || 90} / 100</strong>
              </p>

              <div className="flex justify-between items-end pt-8 px-6 text-xs text-slate-600">
                <div className="text-center">
                  <div className="text-[11px] font-bold text-slate-500 mb-12">Jakarta, {selectedCertToPrint.completedDate || new Date().toLocaleDateString('id-ID')}</div>
                  <div className="font-extrabold text-[#172033] border-t border-slate-400 pt-1 px-4">
                    {selectedCertToPrint.examinerName || 'Ustadz Penguji'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">Penguji / Pembimbing</div>
                </div>

                <div className="relative flex items-center justify-center w-28 h-28 rotate-[-12deg] opacity-90">
                  <img 
                    src="/stamp-rohis.png" 
                    alt="Stempel Rohis" 
                    className="w-full h-full object-contain mix-blend-multiply"
                    onError={(e) => {
                      e.currentTarget.src = "/download (4).png"; // Fallback
                    }}
                  />
                </div>

                <div className="text-center">
                  <div className="text-[11px] font-bold text-slate-500 mb-12">Mengetahui,</div>
                  <div className="font-extrabold text-[#172033] border-t border-slate-400 pt-1 px-4">
                    Koordinator BTQ SMPN 102
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">Pembina Rohis</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus In-App */}
      {certToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#172033]/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
              <Trash2 size={24} />
            </div>

            <h3 className="text-base font-black text-[#172033] mb-1">
              Hapus Data Ujian / Sertifikasi?
            </h3>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Anda akan menghapus data penilaian sertifikasi santri berikut dari database:
            </p>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 mb-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Nama Santri:</span>
                <span className="font-extrabold text-[#172033]">{certToDelete.studentName || 'Santri'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Kategori:</span>
                <span className="font-extrabold text-[#0362D0]">{certToDelete.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Status:</span>
                <span className="font-bold text-slate-700">{certToDelete.status}</span>
              </div>
              {certToDelete.score !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Nilai:</span>
                  <span className="font-black text-[#172033]">{certToDelete.score}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed flex items-start gap-2 mb-5 font-medium">
              <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Peringatan:</strong> Data yang dihapus akan hilang dari sistem secara permanen dan tidak dapat dipulihkan.
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCertToDelete(null)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50 text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                {isDeleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

