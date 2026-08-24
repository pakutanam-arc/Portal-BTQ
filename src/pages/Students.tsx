import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Upload, Users, Edit3, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { subscribeToStudents, addStudent, updateStudent, deleteStudent, getGroups, getMentors, Student, Group } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

export function Students() {
  const { currentUser, userData, userRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nis: '',
    class: '7A',
    gender: 'L',
    groupId: 'g1',
    status: 'Aktif'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initData() {
      try {
        const [groupsData, mentorsData] = await Promise.all([
          getGroups(),
          getMentors()
        ]);

        let finalGroups = groupsData;
        if (isMentor) {
          const matchedMentor = mentorsData.find(
            m => (userData?.id && m.id === userData.id) ||
                 (currentUser?.uid && m.id === currentUser.uid) ||
                 (currentUser?.email && m.email?.toLowerCase() === currentUser.email?.toLowerCase())
          );
          const mentorId = matchedMentor?.id || userData?.id || currentUser?.uid;
          finalGroups = groupsData.filter(g => g.mentorId === mentorId);
        }
        setGroups(finalGroups);

        // Subscribe to real-time updates from Firebase Firestore
        unsubscribe = subscribeToStudents((allStudents) => {
          let finalStudents = allStudents;
          if (isMentor) {
            const groupIds = finalGroups.map(g => g.id);
            finalStudents = allStudents.filter(s => groupIds.includes(s.groupId));
          }
          setStudents(finalStudents);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error initializing real-time data:", error);
        setLoading(false);
      }
    }

    initData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userRole, userData, currentUser, isMentor]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      nis: '',
      class: '7A',
      gender: 'L',
      groupId: groups.length > 0 ? groups[0].id : 'g1',
      status: 'Aktif'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      nis: student.nis || '',
      class: student.class || '7A',
      gender: student.gender || 'L',
      groupId: student.groupId || 'g1',
      status: student.status || 'Aktif'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          name: formData.name.trim().toUpperCase(),
          nis: formData.nis.trim(),
          class: formData.class,
          gender: formData.gender,
          groupId: formData.groupId,
          status: formData.status
        });
      } else {
        await addStudent({
          name: formData.name.trim().toUpperCase(),
          nis: formData.nis.trim() || `102${String(Math.floor(1000 + Math.random() * 9000))}`,
          class: formData.class,
          gender: formData.gender,
          groupId: formData.groupId,
          status: formData.status
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving student:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (student.class && student.class.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (student.nis && student.nis.includes(searchTerm));
    const matchesClass = classFilter ? student.class?.includes(classFilter) : true;
    const matchesGroup = groupFilter ? student.groupId === groupFilter : true;
    
    return matchesSearch && matchesClass && matchesGroup;
  });

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#172033] tracking-tight">Data Santri BTQ</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
              Realtime Firebase
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            Direktori peserta bimbingan Baca Tulis Al-Qur'an dan alokasi kelompok
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex border-[#E6E8EC] text-[#172033] hover:bg-[#F5F6F8] font-bold">
            <Download size={15} className="mr-2 text-[#0362D0]" /> Export Data
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex border-[#E6E8EC] text-[#172033] hover:bg-[#F5F6F8] font-bold">
            <Upload size={15} className="mr-2 text-[#C99A2E]" /> Import Excel
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold shadow-xs">
            <Plus size={16} className="mr-1.5" /> Tambah Santri
          </Button>
        </div>
      </div>

      <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
        <div className="p-4 border-b border-[#E6E8EC] bg-[#F5F6F8]/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="w-full sm:max-w-xs">
            <Input 
              placeholder="Cari nama, NIS, atau kelas santri..." 
              icon={<Search size={16} className="text-[#0362D0]" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            <Select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full sm:w-[130px] font-medium text-xs"
            >
              <option value="">Semua Kelas</option>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </Select>
            <Select 
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full sm:w-[170px] font-medium text-xs"
            >
              <option value="">Semua Kelompok</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
              <Users size={32} />
              <p className="font-semibold text-[#172033]">Memuat data santri dari Firebase...</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#F5F6F8]">
              <TableRow className="border-b border-[#E6E8EC]">
                <TableHead className="w-16 text-center font-black text-[#172033] text-xs">No</TableHead>
                <TableHead className="font-black text-[#172033] text-xs">Nama Santri</TableHead>
                <TableHead className="text-center font-black text-[#172033] text-xs">Kelas</TableHead>
                <TableHead className="font-black text-[#172033] text-xs">Kelompok BTQ</TableHead>
                <TableHead className="text-center font-black text-[#172033] text-xs">Status</TableHead>
                <TableHead className="text-right font-black text-[#172033] text-xs">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student, idx) => {
                const group = groups.find(g => g.id === student.groupId);
                const isDeleting = deleteConfirmId === student.id;

                return (
                  <TableRow key={student.id} className="group hover:bg-[#F5F6F8]/60 transition-colors border-b border-[#E6E8EC]/80">
                    <TableCell className="text-center text-slate-500 font-bold text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-extrabold text-[#172033] text-sm">{student.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        NIS: {student.nis || '-'} • {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="px-2.5 py-1 bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20 rounded-md text-xs font-black inline-block">
                        Kelas {student.class || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 bg-[#F5F6F8] text-[#172033] border border-[#E6E8EC] rounded-md text-xs font-bold inline-block">
                        {group?.name || 'Belum Ada Kelompok'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md border ${
                        student.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {student.status || 'Aktif'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isDeleting ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] font-bold text-rose-600 mr-1">Hapus?</span>
                          <Button size="xs" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={() => handleDelete(student.id)}>
                            <Check size={12} />
                          </Button>
                          <Button size="xs" variant="outline" className="border-slate-300" onClick={() => setDeleteConfirmId(null)}>
                            <X size={12} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenEdit(student)}
                            className="text-[#0362D0] hover:bg-[#0362D0]/10 font-bold text-xs"
                          >
                            <Edit3 size={14} className="mr-1" /> Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDeleteConfirmId(student.id)}
                            className="text-rose-600 hover:bg-rose-50 font-bold text-xs"
                          >
                            <Trash2 size={14} className="mr-1" /> Hapus
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                    Tidak ada data santri yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        
        {!loading && (
          <div className="p-4 border-t border-[#E6E8EC] bg-[#F5F6F8]/50 flex items-center justify-between text-xs font-bold text-slate-600">
            <div>Menampilkan {filteredStudents.length} dari {students.length} santri</div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled className="text-xs font-bold border-[#E6E8EC]">Prev</Button>
              <Button variant="outline" size="sm" disabled className="text-xs font-bold border-[#E6E8EC]">Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Tambah / Edit Santri */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E6E8EC] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E6E8EC] pb-4">
              <h3 className="text-lg font-black text-[#172033]">
                {editingStudent ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#172033] mb-1">Nama Lengkap Santri</label>
                <Input 
                  required
                  placeholder="Contoh: MUHAMMAD FAIZ"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="font-semibold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#172033] mb-1">NIS (Opsional)</label>
                  <Input 
                    placeholder="Contoh: 1020123"
                    value={formData.nis}
                    onChange={e => setFormData({ ...formData, nis: e.target.value })}
                    className="font-medium text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-[#172033] mb-1">Jenis Kelamin</label>
                  <Select 
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="font-medium text-xs"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#172033] mb-1">Kelas</label>
                  <Input 
                    placeholder="Contoh: 7A, 8B, 9D"
                    value={formData.class}
                    onChange={e => setFormData({ ...formData, class: e.target.value.toUpperCase() })}
                    className="font-medium text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-[#172033] mb-1">Status</label>
                  <Select 
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="font-medium text-xs"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#172033] mb-1">Kelompok BTQ</label>
                <Select 
                  value={formData.groupId}
                  onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                  className="font-medium text-xs"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E6E8EC]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="font-bold border-[#E6E8EC]">
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold">
                  {isSubmitting ? 'Saving...' : editingStudent ? 'Simpan Perubahan' : 'Tambah Santri'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
