import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { mockProgress, mockStudents, mockGroups } from '../data/mockData';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Search } from 'lucide-react';
import { cn } from '../utils/cn';

export function Progress() {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  
  // Get latest progress for each student
  const latestProgress = mockStudents.map(student => {
    const studentProgress = mockProgress.filter(p => p.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      student,
      progress: studentProgress[0] || { reading: 0, tajwid: 0, memorization: 0, writing: 0, total: 0 }
    };
  }).filter(item => selectedGroup === '' || item.student.groupId === selectedGroup);

  const ProgressBar = ({ value, label }: { value: number, label?: string }) => {
    let colorClass = 'bg-emerald-500';
    if (value < 60) colorClass = 'bg-red-500';
    else if (value < 75) colorClass = 'bg-amber-500';

    return (
      <div className="w-full max-w-[120px] flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${value}%` }} />
        </div>
        <span className="text-xs font-medium text-gray-600 w-8 text-right">{value}%</span>
      </div>
    );
  };

  const getStatusBadge = (value: number) => {
    if (value >= 85) return <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Sangat Baik</span>;
    if (value >= 70) return <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800 border border-blue-200">Baik</span>;
    if (value >= 50) return <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200">Berkembang</span>;
    return <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800 border border-red-200">Pemula</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress BTQ</h1>
          <p className="text-gray-500 mt-1 text-sm">Pantau perkembangan kemampuan baca tulis Al-Qur'an siswa</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
          <div className="w-full sm:max-w-xs">
            <Input 
              placeholder="Cari siswa..." 
              icon={<Search size={16} />}
            />
          </div>
          <Select 
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-[200px]"
          >
            <option value="">Semua Kelompok</option>
            {mockGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Membaca</TableHead>
                <TableHead>Tajwid</TableHead>
                <TableHead>Hafalan</TableHead>
                <TableHead>Menulis</TableHead>
                <TableHead className="text-center">Total Progress</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestProgress.slice(0, 15).map(({ student, progress }) => {
                const group = mockGroups.find(g => g.id === student.groupId);
                return (
                  <TableRow key={student.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-900">{student.name}</div>
                      <div className="text-xs text-slate-500">{student.nis}</div>
                    </TableCell>
                    <TableCell className="text-slate-600">{group?.name}</TableCell>
                    <TableCell><ProgressBar value={progress.reading} /></TableCell>
                    <TableCell><ProgressBar value={progress.tajwid} /></TableCell>
                    <TableCell><ProgressBar value={progress.memorization} /></TableCell>
                    <TableCell><ProgressBar value={progress.writing} /></TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-slate-800">{progress.total}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(progress.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {latestProgress.slice(0, 15).map(({ student, progress }) => {
            const group = mockGroups.find(g => g.id === student.groupId);
            return (
              <div key={student.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{student.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{student.nis} • {group?.name}</p>
                  </div>
                  {getStatusBadge(progress.total)}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">Membaca</p>
                    <ProgressBar value={progress.reading} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">Tajwid</p>
                    <ProgressBar value={progress.tajwid} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">Hafalan</p>
                    <ProgressBar value={progress.memorization} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">Menulis</p>
                    <ProgressBar value={progress.writing} />
                  </div>
                </div>
                
                <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">Total Progress:</span>
                  <span className="font-bold text-slate-800">{progress.total}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">Menampilkan 15 dari {latestProgress.length} data progress.</p>
        </div>
      </Card>
    </div>
  );
}
