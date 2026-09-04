import React, { useState, useEffect } from 'react';
import { theme } from '../theme';
import { Search, Plus, Download, Upload, Users, Edit3, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { getStudents, addStudent, updateStudent, deleteStudent, getGroups, getMentors, Student, Group } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

export function Students() {
  const { currentUser, userData, userRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  const loadData = async () => {
    try {
      const [groupsData, mentorsData, allStudents] = await Promise.all([
        getGroups(),
        getMentors(),
        getStudents()
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

      let finalStudents = allStudents;
      if (isMentor) {
        const groupIds = finalGroups.map(g => g.id);
        finalStudents = allStudents.filter(s => groupIds.includes(s.groupId));
      }
      
      finalStudents.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(finalStudents);
      setLoading(false);
    } catch (error) {
      console.error("Error loading students data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userRole, userData, currentUser, isMentor]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, classFilter, groupFilter]);

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
      await loadData();
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
      await loadData();
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

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={theme.typography.h1}>Data Santri BTQ</h1>
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-[#F5F6F8]">
                  <TableRow className="border-b border-[#E6E8EC]">
                    <TableHead className="w-16 text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">No</TableHead>
                    <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Nama Santri</TableHead>
                    <TableHead className="text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Kelas</TableHead>
                    <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Kelompok BTQ</TableHead>
                    <TableHead className="text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Status</TableHead>
                    <TableHead className="text-right font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student, idx) => {
                    const group = groups.find(g => g.id === student.groupId);
                    const isDeleting = deleteConfirmId === student.id;
                    const realIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <TableRow key={student.id} className="group hover:bg-[#F5F6F8]/60 transition-colors border-b border-[#E6E8EC]/80">
                        <TableCell className="text-center text-slate-500 font-bold text-xs whitespace-nowrap px-4 py-3.5">{realIdx}</TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3.5">
                          <div className="font-extrabold text-[#172033] text-sm">{student.name}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            NIS: {student.nis || '-'} • {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap px-4 py-3.5">
                          <span className="px-2.5 py-1 bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20 rounded-md text-xs font-black inline-block whitespace-nowrap">
                            Kelas {student.class || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3.5">
                          <span className="px-2.5 py-1 bg-[#F5F6F8] text-[#172033] border border-[#E6E8EC] rounded-md text-xs font-bold inline-block whitespace-nowrap">
                            {group?.name || 'Belum Ada Kelompok'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap px-4 py-3.5">
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md border whitespace-nowrap ${
                            student.status === 'Aktif' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {student.status || 'Aktif'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap px-4 py-3.5">
                          {isDeleting ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[11px] font-bold text-rose-600 mr-1">Hapus?</span>
                              <Button size="sm" className="h-7 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={() => handleDelete(student.id)}>
                                <Check size={12} />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 border-slate-300" onClick={() => setDeleteConfirmId(null)}>
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
                  {paginatedStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                        Tidak ada data santri yang ditemukan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-3 p-1">
              {paginatedStudents.map((student, idx) => {
                const group = groups.find(g => g.id === student.groupId);
                const isDeleting = deleteConfirmId === student.id;
                
                return (
                  <div key={student.id} className="bg-white border border-[#E6E8EC] rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-extrabold text-[#172033] text-sm leading-tight">{student.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1">
                          NIS: {student.nis || '-'} • {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border shrink-0 ${
                        student.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {student.status || 'Aktif'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2.5 py-1 bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20 rounded-md text-[10px] font-black inline-block">
                        Kelas {student.class || '-'}
                      </span>
                      <span className="px-2.5 py-1 bg-[#F5F6F8] text-[#172033] border border-[#E6E8EC] rounded-md text-[10px] font-bold inline-block">
                        {group?.name || 'Belum Ada Kelompok'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E8EC]">
                      {isDeleting ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-600">Yakin hapus?</span>
                          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8" onClick={() => handleDelete(student.id)}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="outline" className="border-slate-300 h-8" onClick={() => setDeleteConfirmId(null)}>
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenEdit(student)}
                            className="flex-1 h-8 text-[#0362D0] border-[#0362D0]/30 hover:bg-[#0362D0]/5 font-bold text-xs"
                          >
                            <Edit3 size={14} className="mr-1.5" /> Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDeleteConfirmId(student.id)}
                            className="flex-1 h-8 text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs"
                          >
                            <Trash2 size={14} className="mr-1.5" /> Hapus
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {paginatedStudents.length === 0 && (
                <div className="text-center py-12 text-slate-500 font-medium bg-[#F5F6F8] rounded-xl border border-[#E6E8EC]">
                  Tidak ada data santri yang ditemukan.
                </div>
              )}
            </div>
          </>
        )}
        
        {!loading && (
          <div className="p-4 border-t border-[#E6E8EC] bg-[#F5F6F8]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600">
            <div>
              Menampilkan {paginatedStudents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} dari {filteredStudents.length} santri
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1} 
                className="text-xs font-bold border-[#E6E8EC]"
              >
                Prev
              </Button>
              <div className="flex items-center justify-center px-3 font-black text-[#172033]">
                {currentPage} / {totalPages || 1}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages || totalPages === 0} 
                className="text-xs font-bold border-[#E6E8EC]"
              >
                Next
              </Button>
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
              <div className="bg-[#F5F6F8] p-4 rounded-xl border border-[#E6E8EC] space-y-4">
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
              </div>

              <div className="bg-[#F5F6F8] p-4 rounded-xl border border-[#E6E8EC] space-y-4">
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
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E6E8EC] mt-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="font-bold border-[#E6E8EC]">
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="btn-primary font-bold">
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
