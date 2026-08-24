import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, Upload, Users, GraduationCap, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { getStudents, getGroups, getMentors, Student, Group } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

export function Students() {
  const { currentUser, userData, userRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, groupsData, mentorsData] = await Promise.all([
          getStudents(),
          getGroups(),
          getMentors()
        ]);

        let finalGroups = groupsData;
        let finalStudents = studentsData;

        if (isMentor) {
          const matchedMentor = mentorsData.find(
            m => (userData?.id && m.id === userData.id) ||
                 (currentUser?.uid && m.id === currentUser.uid) ||
                 (currentUser?.email && m.email?.toLowerCase() === currentUser.email?.toLowerCase())
          );
          const mentorId = matchedMentor?.id || userData?.id || currentUser?.uid;
          finalGroups = groupsData.filter(g => g.mentorId === mentorId);
          const groupIds = finalGroups.map(g => g.id);
          finalStudents = studentsData.filter(s => groupIds.includes(s.groupId));
        }

        setStudents(finalStudents);
        setGroups(finalGroups);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userRole, userData, currentUser, isMentor]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (student.class && student.class.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = classFilter ? student.class?.includes(classFilter) : true;
    const matchesGroup = groupFilter ? student.groupId === groupFilter : true;
    
    return matchesSearch && matchesClass && matchesGroup;
  });

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#172033] tracking-tight">Data Santri BTQ</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
              SMP Negeri 102 Jakarta
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
          <Button size="sm" className="bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold shadow-xs">
            <Plus size={16} className="mr-1.5" /> Tambah Santri
          </Button>
        </div>
      </div>

      <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
        <div className="p-4 border-b border-[#E6E8EC] bg-[#F5F6F8]/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="w-full sm:max-w-xs">
            <Input 
              placeholder="Cari nama atau kelas santri..." 
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
              <p className="font-semibold text-[#172033]">Memuat data santri...</p>
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
                      <Button variant="ghost" size="sm" className="text-[#0362D0] hover:bg-[#0362D0]/10 font-bold text-xs">
                        Detail
                      </Button>
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
    </div>
  );
}

