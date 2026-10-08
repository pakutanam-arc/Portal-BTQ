import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Users, Calendar, MapPin, Search, BookOpen, UserCheck, X, Edit2, Check, Sparkles, Building2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { getGroups, getMentors, getStudents, getStudentsByGroup, getGroupNumber, invalidateDbCache, Group, Mentor, Student } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { masterGrades, getGradeForGroup } from '../services/curriculumData';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { theme } from '../theme';
import { useDebounce } from '../hooks/useDebounce';

export function Groups() {
  const { currentUser, userData, userRole } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [selectedGroupStudents, setSelectedGroupStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  
  // Modal state
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [editedRoom, setEditedRoom] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadData() {
      try {
        const [groupsData, mentorsData, studentsData] = await Promise.all([
          getGroups(),
          getMentors(),
          getStudents()
        ]);
        
        const sortedGroups = [...groupsData].sort((a, b) => getGroupNumber(a) - getGroupNumber(b));
        let filteredGroups = sortedGroups;
        if (isMentor) {
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
          
          const mentorAssigned = groupsData.filter(g => 
            g.mentorId === mentorId || 
            (assignedGroupId && g.id === assignedGroupId)
          );

          if (mentorAssigned.length > 0) {
            filteredGroups = mentorAssigned;
          }
        }

        setGroups(filteredGroups);
        setMentors(mentorsData);
        
        // Load group counts in-memory (Eliminates 20+ N+1 queries)
        const counts: Record<string, number> = {};
        filteredGroups.forEach(g => {
          counts[g.id] = studentsData.filter(
            s => s.groupId === g.id || (g.id === 'g1' && s.groupId === 'group_1') || (g.id === 'g2' && s.groupId === 'group_2') || (g.id === 'g3' && s.groupId === 'group_3') || (g.id === 'g4' && s.groupId === 'group_4') || (g.id === 'g5' && s.groupId === 'group_5') || (g.id === 'g6' && s.groupId === 'group_6') || (g.id === 'g7' && s.groupId === 'group_7') || (g.id === 'g8' && s.groupId === 'group_8') || (g.id === 'g9' && s.groupId === 'group_9') || (g.id === 'g10' && s.groupId === 'group_10')
          ).length;
        });
        setGroupCounts(counts);
      } catch (error) {
        console.error("Error fetching groups data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userRole, userData, currentUser, isMentor]);

  const handleSaveRoom = async () => {
    if (!selectedGroup || !editedRoom.trim()) return;
    setSavingRoom(true);
    try {
      invalidateDbCache('groups');
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        room: editedRoom.trim()
      });

      // Update local state
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, room: editedRoom.trim() } : g));
      setSelectedGroup(prev => prev ? { ...prev, room: editedRoom.trim() } : null);
      setIsEditingRoom(false);
    } catch (e) {
      console.error("Failed to update room:", e);
    } finally {
      setSavingRoom(false);
    }
  };

  const mentorMap = useMemo(() => {
    const map = new Map<string, Mentor>();
    mentors.forEach(m => map.set(m.id, m));
    return map;
  }, [mentors]);

  const filteredGroups = useMemo(() => {
    const cleanSearch = debouncedSearchTerm.trim().toLowerCase();
    return groups.filter(group => {
      const mentor = group.mentorId ? mentorMap.get(group.mentorId) : undefined;
      const matchesSearch = !cleanSearch || 
        group.name.toLowerCase().includes(cleanSearch) || 
        (mentor?.name && mentor.name.toLowerCase().includes(cleanSearch)) ||
        (group.room && group.room.toLowerCase().includes(cleanSearch));

      if (!matchesSearch) return false;

      if (selectedLocationFilter === 'all') return true;
      if (selectedLocationFilter === 'mushola') return group.room?.toLowerCase().includes('mushola');
      if (selectedLocationFilter === 'perpus') return group.room?.toLowerCase().includes('perpus');
      if (selectedLocationFilter === 'kelas') return !group.room?.toLowerCase().includes('mushola') && !group.room?.toLowerCase().includes('perpus');
      
      return true;
    });
  }, [groups, mentorMap, debouncedSearchTerm, selectedLocationFilter]);

  const getLocationBadgeStyle = (room?: string) => {
    if (!room) return 'bg-slate-50 text-[#172033] border-slate-100';
    const lower = room.toLowerCase();
    if (lower.includes('mushola')) {
      return 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/30';
    }
    if (lower.includes('perpus')) {
      return 'bg-[#C99A2E]/15 text-[#956d11] border-[#C99A2E]/40';
    }
    return 'bg-[#950415]/10 text-[#950415] border-[#950415]/30';
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={theme.typography.h1}>10 Kelompok Bimbingan BTQ</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
              SMP Negeri 102 Jakarta
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            Penempatan 10 kelompok bimbingan, daftar mentor, dan alokasi ruang belajar tatap muka Sabtu
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="w-full sm:max-w-md">
          <Input 
            placeholder="Cari kelompok, mentor, atau lokasi (cth: Mushola, 9A)..." 
            icon={<Search size={16} className="text-[#0362D0]" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Location Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
          <button
            onClick={() => setSelectedLocationFilter('all')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              selectedLocationFilter === 'all' 
                ? 'bg-[#0362D0] text-white shadow-xs' 
                : 'bg-white text-[#172033] border border-slate-100 hover:bg-slate-50'
            }`}
          >
            Semua Lokasi
          </button>
          <button
            onClick={() => setSelectedLocationFilter('mushola')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              selectedLocationFilter === 'mushola' 
                ? 'bg-[#0362D0] text-white shadow-xs' 
                : 'bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20 hover:bg-[#0362D0]/15'
            }`}
          >
            🕌 Mushola (1, 2, 3)
          </button>
          <button
            onClick={() => setSelectedLocationFilter('perpus')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              selectedLocationFilter === 'perpus' 
                ? 'bg-[#C99A2E] text-slate-950 shadow-xs' 
                : 'bg-[#C99A2E]/15 text-[#956d11] border border-[#C99A2E]/30 hover:bg-[#C99A2E]/20'
            }`}
          >
            📚 Perpus (7, 8)
          </button>
          <button
            onClick={() => setSelectedLocationFilter('kelas')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              selectedLocationFilter === 'kelas' 
                ? 'bg-[#950415] text-white shadow-xs' 
                : 'bg-[#950415]/10 text-[#950415] border border-[#950415]/20 hover:bg-[#950415]/15'
            }`}
          >
            🏫 Ruang Kelas (4, 5, 6, 9, 10)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
            <Layers size={32} />
            <p className="font-semibold text-[#172033]">Memuat data kelompok...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map(group => {
            const mentor = group.mentorId ? mentorMap.get(group.mentorId) : undefined;
            const studentsCount = groupCounts[group.id] || 0;
            const gradeInfo = getGradeForGroup(group);
            
            return (
              <Card key={group.id} className="hover:shadow-md transition-all duration-200 border border-slate-100 rounded-2xl overflow-hidden flex flex-col bg-white group">
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Header Card */}
                    <div className="flex justify-between items-start mb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#0362D0] flex items-center justify-center text-white shadow-sm shrink-0 font-bold">
                          <Layers size={22} />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-[#172033] leading-snug">{group.name}</h3>
                          <div className="flex flex-col mt-0.5">
                            <span className="text-[11px] font-bold text-[#0362D0] bg-[#0362D0]/10 px-2 py-0.5 rounded-md inline-block w-fit">
                              {gradeInfo?.name || 'Grade 1'} • {gradeInfo?.programName || 'Utsmani'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase rounded-md">
                        Aktif
                      </span>
                    </div>

                    {/* Mentor Info */}
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-3.5 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Mentor Pembimbing:</span>
                      <span className="font-extrabold text-[#172033]">{mentor?.name || 'Belum ditugaskan'}</span>
                    </div>
                    
                    {/* Stats Box */}
                    <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                      <div className="flex flex-col gap-0.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                          <Users size={12} className="text-[#0362D0]" /> Total Siswa
                        </div>
                        <span className="text-sm font-black text-[#172033]">
                          {studentsCount} <span className="text-[11px] font-medium text-slate-500">santri</span>
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                          <Calendar size={12} className="text-[#C99A2E]" /> Sesi Belajar
                        </div>
                        <span className="text-xs font-bold text-[#172033] truncate" title={group.schedule}>
                          {group.schedule}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Location Pill */}
                    <div className="mt-auto pt-2">
                      <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-bold ${getLocationBadgeStyle(group.room)}`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin size={14} className="shrink-0" />
                          <span className="truncate">Ruang: {group.room || 'Belum diatur'}</span>
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-wider opacity-80 shrink-0">Sabtu</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Footer */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async () => {
                        setSelectedGroup(group);
                        setEditedRoom(group.room || '');
                        setIsEditingRoom(false);
                        setLoadingStudents(true);
                        try {
                          const stds = await getStudentsByGroup(group.id);
                          setSelectedGroupStudents(stds);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setLoadingStudents(false);
                        }
                      }}
                      className="w-full text-xs font-bold text-[#172033] hover:bg-[#0362D0] hover:text-white hover:border-[#0362D0] transition-colors"
                    >
                      Lihat Detail & Santri
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {filteredGroups.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-100">
              <Layers size={32} className="mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="font-bold text-[#172033]">Tidak ada kelompok yang sesuai</p>
              <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter lokasi.</p>
            </div>
          )}
        </div>
      )}

      {/* Group Detail & Room Editor Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#172033]">{selectedGroup.name}</h3>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                    Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  SMP Negeri 102 Jakarta • Program BTQ Sesi Sabtu
                </p>
              </div>
              <button 
                onClick={() => setSelectedGroup(null)}
                className="text-slate-400 hover:text-[#172033] p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Location Box with Edit Feature for Admin */}
              <div className="p-3.5 bg-[#0362D0]/10 rounded-2xl border border-[#0362D0]/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0362D0]">
                    <MapPin size={15} className="text-[#0362D0]" />
                    <span>Lokasi Belajar / Ruang</span>
                  </div>
                  {!isEditingRoom && userRole === 'admin' && (
                    <button
                      onClick={() => setIsEditingRoom(true)}
                      className="text-[11px] font-bold text-[#0362D0] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} /> Ubah Ruang
                    </button>
                  )}
                </div>

                {isEditingRoom ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={editedRoom}
                      onChange={(e) => setEditedRoom(e.target.value)}
                      placeholder="Masukkan nama ruangan..."
                      className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white border border-[#0362D0] rounded-xl focus:outline-none text-[#172033]"
                    />
                    <button
                      onClick={handleSaveRoom}
                      disabled={savingRoom}
                      className="px-3 py-1.5 bg-[#0362D0] hover:bg-[#0252b3] text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check size={13} /> {savingRoom ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingRoom(false);
                        setEditedRoom(selectedGroup.room || '');
                      }}
                      className="px-2.5 py-1.5 bg-[#f1f5f9] text-[#172033] rounded-xl text-xs font-bold"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="text-sm font-black text-[#172033]">
                    {selectedGroup.room || 'Belum ditentukan'}
                  </div>
                )}
              </div>

              {/* Mentor & Schedule Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">Mentor Pembimbing</span>
                  <span className="font-extrabold text-[#172033]">
                    {mentors.find(m => m.id === selectedGroup.mentorId)?.name || 'Belum ditentukan'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">Jadwal Belajar</span>
                  <span className="font-extrabold text-[#172033]">
                    {selectedGroup.schedule}
                  </span>
                </div>
              </div>

              {/* Students List in this Group */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                    <Users size={14} className="text-[#0362D0]" />
                    <span>Daftar Siswa ({selectedGroupStudents.length})</span>
                  </h4>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-48 overflow-y-auto bg-slate-50">
                  {loadingStudents ? (
                    <div className="py-8 flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0362D0]"></div>
                    </div>
                  ) : selectedGroupStudents.map((st, idx) => (
                      <div key={st.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-white transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center text-slate-400 font-bold">{idx + 1}.</span>
                          <div>
                            <span className="font-bold text-[#172033]">{st.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-medium">NIS: {st.nis}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-white border border-slate-100 rounded-md font-bold text-[10px] text-[#172033]">
                          Kelas {st.class}
                        </span>
                      </div>
                    ))}
                  {!loadingStudents && selectedGroupStudents.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 font-medium">
                      Belum ada data siswa di kelompok ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button 
                onClick={() => setSelectedGroup(null)}
                className="w-full bg-[#0362D0] hover:bg-[#0252b3] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

