import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Save, 
  Edit3, 
  Trash2, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  ChevronRight, 
  HelpCircle,
  X
} from 'lucide-react';
import { 
  getTeachingJournals, 
  saveTeachingJournal, 
  deleteTeachingJournal, 
  getGroups, 
  getMentors, 
  createNotification,
  TeachingJournal, 
  Group, 
  Mentor 
} from '../services/db';
import { masterSessions } from '../services/curriculumData';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

export function Journals() {
  const { userData, userRole, currentUser } = useAuth();
  const isMentor = userRole === 'mentor';

  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    groupId: string;
    sessionId: string;
    date: string;
    materialTaught: string;
    pagesCovered: string;
    studentObstacles: string;
    nextPlan: string;
    attendanceNote: string;
  }>({
    groupId: '',
    sessionId: '',
    date: new Date().toISOString().split('T')[0],
    materialTaught: '',
    pagesCovered: '',
    studentObstacles: '',
    nextPlan: '',
    attendanceNote: 'Seluruh santri hadir aktif.'
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
      const [journalsData, groupsData, mentorsData] = await Promise.all([
        getTeachingJournals(),
        getGroups(),
        getMentors()
      ]);

      setMentors(mentorsData);
      setGroups(groupsData);

      // Mentor specific default group selection
      const matchedMentor = mentorsData.find(
        m => (userData?.id && m.id === userData.id) ||
             (currentUser?.uid && m.id === currentUser.uid) ||
             (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
             (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase())
      );

      const assignedGroupId = matchedMentor?.groupId || userData?.groupId;
      if (isMentor && assignedGroupId) {
        setSelectedGroupFilter(assignedGroupId);
        setFormData(prev => ({ ...prev, groupId: assignedGroupId }));
      } else if (groupsData.length > 0) {
        setFormData(prev => ({ ...prev, groupId: groupsData[0].id }));
      }

      setJournals(journalsData);
    } catch (e) {
      console.error("Failed to load journals", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewModal = () => {
    setEditingJournalId(null);
    const defaultGroup = isMentor 
      ? (groups.find(g => g.mentorId === userData?.id || g.id === userData?.groupId)?.id || groups[0]?.id || '')
      : (groups[0]?.id || '');

    setFormData({
      groupId: defaultGroup,
      sessionId: masterSessions[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      materialTaught: '',
      pagesCovered: '',
      studentObstacles: '',
      nextPlan: '',
      attendanceNote: 'Semua santri hadir dan antusias.'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (journal: TeachingJournal) => {
    setEditingJournalId(journal.id || null);
    setFormData({
      groupId: journal.groupId,
      sessionId: journal.sessionId || '',
      date: journal.date,
      materialTaught: journal.materialTaught,
      pagesCovered: journal.pagesCovered || '',
      studentObstacles: journal.studentObstacles || '',
      nextPlan: journal.nextPlan || '',
      attendanceNote: journal.attendanceSummary || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (journalId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan jurnal ini?")) return;
    try {
      await deleteTeachingJournal(journalId);
      setJournals(prev => prev.filter(j => j.id !== journalId));
      showToast("Catatan jurnal berhasil dihapus");
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus jurnal");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.groupId || !formData.materialTaught || !formData.date) {
      alert("Mohon lengkapi kelompok, tanggal, dan materi yang dibahas.");
      return;
    }

    setIsSaving(true);
    try {
      const selectedGrp = groups.find(g => g.id === formData.groupId);
      const selectedSess = masterSessions.find(s => s.id === formData.sessionId);
      const mentorName = userData?.name || 'Mentor BTQ';
      const mentorId = userData?.id || currentUser?.uid || 'mentor_unknown';

      const journalPayload: TeachingJournal = {
        id: editingJournalId || undefined,
        groupId: formData.groupId,
        groupName: selectedGrp?.name || 'Kelompok BTQ',
        sessionId: formData.sessionId || undefined,
        sessionTitle: selectedSess?.topic || undefined,
        date: formData.date,
        materialTaught: formData.materialTaught,
        pagesCovered: formData.pagesCovered || undefined,
        studentObstacles: formData.studentObstacles,
        nextPlan: formData.nextPlan,
        attendanceSummary: formData.attendanceNote,
        mentorId: mentorId,
        mentorName: mentorName,
        createdAt: new Date().toISOString()
      };

      const savedId = await saveTeachingJournal(journalPayload);

      // Notification broadcast
      try {
        await createNotification({
          title: `Jurnal Sesi: ${selectedGrp?.name || 'Kelompok'}`,
          message: `${mentorName} telah mengisi jurnal pertemuan tanggal ${formData.date}: "${formData.materialTaught.substring(0, 70)}..."`,
          type: 'info',
          targetRole: 'all',
          link: '/journals',
          readBy: [mentorId],
          createdAt: new Date().toISOString(),
          createdBy: mentorName
        });
      } catch (err) {
        console.warn(err);
      }

      showToast(editingJournalId ? "Jurnal berhasil diperbarui" : "Jurnal mengajar berhasil disimpan");
      setIsModalOpen(false);
      
      // Refresh list
      const refreshed = await getTeachingJournals();
      setJournals(refreshed);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan jurnal mengajar");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered List
  const filteredJournals = journals.filter(j => {
    const matchGroup = selectedGroupFilter === 'all' || j.groupId === selectedGroupFilter;
    const matchSearch = searchQuery === '' || 
      j.materialTaught.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.groupName && j.groupName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (j.mentorName && j.mentorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (j.studentObstacles && j.studentObstacles.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchGroup && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#172033] text-white px-5 py-4 rounded-2xl shadow-2xl border border-[#E6E8EC]/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 size={20} className="text-[#C99A2E]" />
          <span className="text-sm font-black">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] rounded-3xl p-6 lg:p-8 text-white shadow-md border border-[#E6E8EC] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#C99A2E] text-xs font-black mb-3 border border-white/10">
            <BookOpen size={14} /> Jurnal Pembelajaran Sesi Sabtu
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
            Jurnal Mengajar & Catatan Pertemuan
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
            Dokumentasi berkala kegiatan belajar mengajar BTQ: materi tilawati/tahsin yang dibahas, kendala santri, dan target pekan berikutnya.
          </p>
        </div>

        <button
          id="btn-tambah-jurnal"
          onClick={handleOpenNewModal}
          className="relative z-10 px-5 py-3 bg-[#C99A2E] hover:bg-[#b08422] text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus size={18} className="text-slate-950" />
          Tulis Jurnal Baru
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E6E8EC] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari materi, kendala, atau mentor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0362D0] focus:bg-white outline-none text-[#172033]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="px-3 py-2 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs font-bold text-[#172033] outline-none focus:ring-2 focus:ring-[#0362D0]"
            >
              <option value="all">Semua Kelompok ({groups.length})</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
          Menampilkan <strong className="text-[#172033]">{filteredJournals.length}</strong> catatan jurnal
        </div>
      </div>

      {/* Journals Timeline / Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 font-medium text-sm bg-white rounded-3xl border border-[#E6E8EC]">
          Memuat catatan jurnal mengajar...
        </div>
      ) : filteredJournals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJournals.map(journal => {
            return (
              <div 
                key={journal.id} 
                className="bg-white rounded-3xl border border-[#E6E8EC] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-[#0362D0]/10 text-[#0362D0] rounded-xl text-xs font-black border border-[#0362D0]/20 flex items-center gap-1.5">
                        <Users size={12} /> {journal.groupName || 'Kelompok Binaan'}
                      </span>
                      <span className="px-2.5 py-1 bg-[#F5F6F8] text-slate-600 rounded-xl text-[11px] font-bold border border-[#E6E8EC] flex items-center gap-1">
                        <Calendar size={11} /> {journal.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEdit(journal)}
                        className="p-1.5 text-slate-400 hover:text-[#0362D0] hover:bg-[#F5F6F8] rounded-xl transition-colors cursor-pointer"
                        title="Edit Jurnal"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => journal.id && handleDelete(journal.id)}
                        className="p-1.5 text-slate-400 hover:text-[#950415] hover:bg-[#950415]/10 rounded-xl transition-colors cursor-pointer"
                        title="Hapus Jurnal"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Session Title if available */}
                  {journal.sessionTitle && (
                    <div className="text-[11px] text-[#0362D0] font-black mb-1">
                      {journal.sessionTitle}
                    </div>
                  )}

                  {/* Material Taught */}
                  <div className="mb-3">
                    <h3 className="text-base font-black text-[#172033] leading-snug">
                      {journal.materialTaught}
                    </h3>
                    {journal.pagesCovered && (
                      <span className="inline-block text-xs font-bold text-[#C99A2E] mt-0.5">
                        Halaman / Target: {journal.pagesCovered}
                      </span>
                    )}
                  </div>

                  {/* Content Cards */}
                  <div className="space-y-2 text-xs bg-[#F5F6F8] p-4 rounded-2xl border border-[#E6E8EC] mb-4">
                    <div>
                      <span className="font-extrabold text-[#172033] block mb-0.5 flex items-center gap-1 text-[11px]">
                        <AlertCircle size={12} className="text-amber-500" /> Kendala / Catatan Santri:
                      </span>
                      <p className="text-slate-600 leading-relaxed pl-4 font-medium">
                        {journal.studentObstacles || 'Tidak ada kendala khusus, santri mengikuti dengan baik.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E6E8EC]">
                      <span className="font-extrabold text-[#172033] block mb-0.5 flex items-center gap-1 text-[11px]">
                        <ChevronRight size={12} className="text-[#0362D0]" /> Rencana Pertemuan Pekan Depan:
                      </span>
                      <p className="text-slate-600 leading-relaxed pl-4 font-medium">
                        {journal.nextPlan || 'Melanjutkan materi jilid berikutnya dan setoran hafalan rutin.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-3 border-t border-[#E6E8EC] flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    Mentor: <strong className="text-[#172033]">{journal.mentorName}</strong>
                  </span>
                  {journal.attendanceSummary && (
                    <span className="text-[#0362D0] font-bold">
                      {journal.attendanceSummary}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E6E8EC] p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} />
          </div>
          <h3 className="font-extrabold text-[#172033] text-sm">Belum Ada Catatan Jurnal</h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed font-medium">
            Belum ada catatan jurnal mengajar yang sesuai dengan filter. Klik tombol di bawah untuk membuat catatan pertemuan baru.
          </p>
          <button
            onClick={handleOpenNewModal}
            className="mt-4 px-4 py-2 bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Tulis Jurnal Sekarang
          </button>
        </div>
      )}

      {/* Modal Form Jurnal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-[#E6E8EC] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 border-b border-[#E6E8EC] pb-3.5">
              <div>
                <h3 className="font-black text-base sm:text-lg text-[#172033]">
                  {editingJournalId ? 'Edit Jurnal Mengajar' : 'Catatan Jurnal Mengajar Sabtu'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Isi ringkas materi, evaluasi santri, dan perencanaan pertemuan berikutnya.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-[#172033] p-1.5 rounded-xl hover:bg-[#F5F6F8] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                    Kelompok Binaan <span className="text-[#950415]">*</span>
                  </label>
                  <select 
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#0362D0] outline-none text-[#172033]"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                    Tanggal Pertemuan <span className="text-[#950415]">*</span>
                  </label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#0362D0] outline-none text-[#172033]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                  Sesi Kurikulum Aktif (Opsional)
                </label>
                <select 
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0362D0] outline-none text-[#172033]"
                >
                  <option value="">-- Pilih Sesi Pertemuan Kurikulum --</option>
                  {masterSessions.map(s => (
                    <option key={s.id} value={s.id}>
                      Pertemuan {s.sessionNumber}: {s.topic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                  Materi & Halaman yang Dibahas <span className="text-[#950415]">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Tilawati Jilid 4 Hal 10-15 & Tahsin Surah Al-Humazah"
                  value={formData.materialTaught}
                  onChange={(e) => setFormData({ ...formData, materialTaught: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] focus:bg-white outline-none font-medium text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                  Halaman / Surat yang Dicapai
                </label>
                <input 
                  type="text"
                  placeholder="Contoh: Halaman 12-14 / Ayat 1-9"
                  value={formData.pagesCovered}
                  onChange={(e) => setFormData({ ...formData, pagesCovered: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] focus:bg-white outline-none font-medium text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                  Kendala / Catatan Perkembangan Santri
                </label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Ananda Fulan masih ragu hukum Ikhfa Haqiqi, sebagian besar sudah tartil..."
                  value={formData.studentObstacles}
                  onChange={(e) => setFormData({ ...formData, studentObstacles: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] focus:bg-white outline-none resize-none font-medium text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                  Rencana Target Pertemuan Pekan Depan
                </label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Lanjut Tilawati Jilid 4 Hal 16-20 dan setoran hafalan Surah Al-Ashr..."
                  value={formData.nextPlan}
                  onChange={(e) => setFormData({ ...formData, nextPlan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] focus:bg-white outline-none resize-none font-medium text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#172033] mb-1 uppercase tracking-wider">
                  Catatan Kehadiran Singkat
                </label>
                <input 
                  type="text"
                  placeholder="Contoh: Hadir 5 santri lengkap, tertib."
                  value={formData.attendanceNote}
                  onChange={(e) => setFormData({ ...formData, attendanceNote: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] outline-none font-medium text-[#172033]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E6E8EC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-[#F5F6F8] rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#0362D0] hover:bg-[#0252b3] text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save size={15} /> {isSaving ? 'Menyimpan...' : 'Simpan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

