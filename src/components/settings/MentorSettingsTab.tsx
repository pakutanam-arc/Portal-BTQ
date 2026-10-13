import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Edit2, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Mail, 
  Sparkles, 
  Search,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getMentors, getGroups, getGroupNumber, updateMentorName, Mentor, Group } from '../../services/db';

export function MentorSettingsTab() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit modal / dialog state
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mentorsData, groupsData] = await Promise.all([
        getMentors(true),
        getGroups(true)
      ]);
      setMentors(mentorsData);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error fetching mentors for settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setNewName(mentor.name);
    setErrorToast(null);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorToast('Nama mentor tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      await updateMentorName(selectedMentor.id, trimmed);
      
      // Update local state
      setMentors(prev => prev.map(m => m.id === selectedMentor.id ? { ...m, name: trimmed } : m));
      setSelectedMentor(null);
      setSuccessToast(`Nama mentor berhasil diubah menjadi "${trimmed}". Tampilan kartu peserta langsung disinkronkan.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorToast(err?.message || 'Gagal menyimpan perubahan nama mentor.');
    } finally {
      setSaving(false);
    }
  };

  const getGroupName = (mentor: Mentor) => {
    const matchedGroup = groups.find(g => g.id === mentor.groupId || g.mentorId === mentor.id);
    return matchedGroup ? matchedGroup.name : (mentor.groupId ? `Kelompok ${mentor.groupId.replace('g', '').replace('group_', '')}` : 'Belum Ditugaskan');
  };

  const sortedMentors = [...mentors].sort((a, b) => {
    const numA = parseInt(a.groupId?.replace(/\D/g, '') || a.id.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.groupId?.replace(/\D/g, '') || b.id.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });

  const filteredMentors = sortedMentors.filter(m => {
    const term = searchTerm.toLowerCase();
    const gName = getGroupName(m).toLowerCase();
    return m.name.toLowerCase().includes(term) || 
           m.email.toLowerCase().includes(term) || 
           gName.includes(term);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0362D0]/10 via-[#0362D0]/5 to-transparent rounded-2xl sm:rounded-3xl border border-[#0362D0]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0362D0] text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#172033]">Pengelolaan Nama Profil Mentor</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Anda dapat mengubah nama lengkap mentor/ustadz pengampu di sini. Perubahan ini langsung terefleksi di <strong>Kartu Peserta Santri</strong> dan halaman <strong>Kelompok</strong> tanpa memengaruhi akun kredensial login (user email tetap aman).
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <Input 
            placeholder="Cari mentor, kelompok, atau email..."
            icon={<Search size={15} className="text-[#0362D0]" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          Total: <span className="text-[#172033] font-black">{filteredMentors.length}</span> Mentor
        </div>
      </div>

      {/* Mentors Grid / Table */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin w-8 h-8 border-3 border-[#0362D0] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Memuat daftar mentor dari Firestore...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMentors.map((mentor) => {
            const groupTitle = getGroupName(mentor);

            return (
              <Card key={mentor.id} className="border border-slate-100 hover:shadow-md transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-[#0362D0] flex items-center justify-center font-black text-sm shrink-0">
                        {mentor.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-[#172033] truncate" title={mentor.name}>
                          {mentor.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-bold">
                          <span className="px-2 py-0.5 bg-[#0362D0]/10 text-[#0362D0] rounded-md text-[10px] font-black">
                            {groupTitle}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md shrink-0 border border-emerald-200">
                      Aktif
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 truncate min-w-0">
                      <Mail size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate font-medium">{mentor.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold shrink-0 ml-2" title="Akun login tidak berubah saat nama diubah">
                      <Lock size={10} /> Akun Kredensial
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenEdit(mentor)}
                      className="text-xs font-bold text-[#0362D0] hover:bg-[#0362D0] hover:text-white border-[#0362D0]/30 transition-colors flex items-center gap-1.5 cursor-pointer w-full sm:w-auto"
                    >
                      <Edit2 size={13} /> Ubah Nama Mentor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredMentors.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
              <Users size={28} className="mx-auto mb-2 text-slate-400" />
              <p className="font-bold text-[#172033] text-sm">Tidak ada mentor yang cocok</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Mentor Name Modal */}
      {selectedMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-[#172033]">Ubah Nama Mentor</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {getGroupName(selectedMentor)} • SMP Negeri 102 Jakarta
                </p>
              </div>
              <button 
                onClick={() => setSelectedMentor(null)}
                className="text-slate-400 hover:text-[#172033] p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              {errorToast && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorToast}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Nama Lengkap Mentor Saat Ini
                </label>
                <div className="px-3 py-2 bg-slate-50 text-slate-500 text-xs font-semibold rounded-xl border border-slate-100">
                  {selectedMentor.name}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-[#172033] block mb-1">
                  Nama Lengkap Baru <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Masukkan nama lengkap baru (misal: Ustadz Ahmad, S.Pd)..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-white border border-[#0362D0] rounded-xl focus:outline-none text-[#172033]"
                  autoFocus
                />
              </div>

              {/* Informative Note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed flex items-start gap-2 font-medium">
                <Lock size={14} className="shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Perlindungan Akun:</strong> Perubahan ini hanya memperbarui nama tampilan mentor dan kartu peserta. Akun login email (<code className="font-bold text-blue-800">{selectedMentor.email}</code>) tetap aman dan tidak diubah.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedMentor(null)}
                  className="text-xs font-bold py-2 rounded-xl"
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button 
                  type="submit"
                  disabled={saving}
                  className="bg-[#0362D0] hover:bg-[#0252b3] text-white text-xs font-bold py-2 px-5 rounded-xl flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {saving ? 'Menyimpan...' : 'Simpan Nama'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
