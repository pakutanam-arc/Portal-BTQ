import React, { useState } from 'react';
import { Search, Plus, Filter, Download, Upload } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { mockStudents, mockGroups } from '../data/mockData';

export function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.nis.includes(searchTerm);
    const matchesClass = classFilter ? student.class.includes(classFilter) : true;
    const matchesGroup = groupFilter ? student.groupId === groupFilter : true;
    return matchesSearch && matchesClass && matchesGroup;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola data seluruh siswa peserta BTQ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex"><Download size={16} className="mr-2" /> Export</Button>
          <Button variant="outline" size="sm" className="hidden sm:flex"><Upload size={16} className="mr-2" /> Import</Button>
          <Button size="sm"><Plus size={16} className="mr-2" /> Tambah Siswa</Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:max-w-xs">
            <Input 
              placeholder="Cari nama atau NIS..." 
              icon={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            <Select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full sm:w-[120px]"
            >
              <option value="">Semua Kelas</option>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </Select>
            <Select 
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full sm:w-[160px]"
            >
              <option value="">Semua Kelompok</option>
              {mockGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
            <Button variant="outline" className="col-span-2 sm:col-span-1 px-3 flex justify-center bg-white" title="Filter Lainnya"><Filter size={16} /><span className="sm:hidden ml-2">Filter Lainnya</span></Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">No</TableHead>
              <TableHead>Nama Siswa</TableHead>
              <TableHead>NIS</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Kelompok</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student, idx) => {
              const group = mockGroups.find(g => g.id === student.groupId);
              return (
                <TableRow key={student.id} className="group cursor-pointer hover:bg-gray-50/50">
                  <TableCell className="text-center text-gray-500">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                  </TableCell>
                  <TableCell className="text-gray-600">{student.nis}</TableCell>
                  <TableCell className="text-gray-600">{student.class}</TableCell>
                  <TableCell>
                    <Badge variant="neutral" className="font-normal">{group?.name}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={student.status === 'Aktif' ? 'success' : 'danger'}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Detail</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Tidak ada data siswa yang ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <div>Menampilkan {filteredStudents.length} dari {mockStudents.length} siswa</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Prev</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
