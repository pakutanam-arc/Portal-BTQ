import React, { useState } from 'react';
import { Calendar, Save, CheckCircle, RotateCcw, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { mockGroups, mockStudents, mockCurriculum } from '../data/mockData';
import { cn } from '../utils/cn';

export function StudentAttendance() {
  const [selectedGroup, setSelectedGroup] = useState<string>(mockGroups[0].id);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showToast, setShowToast] = useState(false);
  
  const groupStudents = mockStudents.filter(s => s.groupId === selectedGroup);
  
  // State for attendance
  const [attendance, setAttendance] = useState<Record<string, { status: string, notes: string }>>(() => {
    const initial: Record<string, { status: string, notes: string }> = {};
    groupStudents.forEach(s => {
      initial[s.id] = { status: 'Hadir', notes: '' };
    });
    return initial;
  });

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  const setAllStatus = (status: string) => {
    setAttendance(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], status };
      });
      return next;
    });
  };

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absensi Siswa</h1>
          <p className="text-gray-500 mt-1 text-sm">Catat kehadiran siswa pada pertemuan BTQ</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Tanggal Pertemuan</label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                icon={<Calendar size={16} />}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Kelompok</label>
              <Select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                {mockGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-gray-700">Materi Pembelajaran</label>
              <Select defaultValue="c3">
                <option value="" disabled>Pilih materi yang diajarkan...</option>
                {mockCurriculum.map(c => (
                  <option key={c.id} value={c.id}>{c.stage} - {c.topic}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="font-medium text-gray-800">Daftar Siswa ({groupStudents.length} orang)</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Hadir')}>
              Hadir Semua
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Hadir')}>
              <RotateCcw size={14} className="mr-2" /> Reset
            </Button>
          </div>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="text-center">Status Kehadiran</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupStudents.map((student, idx) => {
                const currentStatus = attendance[student.id]?.status || 'Hadir';
                const currentNotes = attendance[student.id]?.notes || '';
                
                return (
                  <TableRow key={student.id}>
                    <TableCell className="text-center text-gray-500 py-3">{idx + 1}</TableCell>
                    <TableCell className="py-3">
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.nis}</div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {['Hadir', 'Izin', 'Sakit', 'Alpa'].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(student.id, status)}
                            className={cn(
                              "px-4 py-2 text-sm font-medium border first:rounded-l-lg last:rounded-r-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-emerald-500 transition-colors",
                              currentStatus === status 
                                ? status === 'Hadir' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 z-10' 
                                  : status === 'Izin' ? 'bg-amber-50 border-amber-500 text-amber-700 z-10'
                                  : status === 'Sakit' ? 'bg-blue-50 border-blue-500 text-blue-700 z-10'
                                  : 'bg-red-50 border-red-500 text-red-700 z-10'
                                : "bg-white border-gray-200 text-gray-900"
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text" 
                          value={currentNotes}
                          onChange={(e) => handleNotesChange(student.id, e.target.value)}
                          placeholder="Tambahkan catatan..." 
                          className="w-full text-sm border-0 bg-gray-50 rounded-md py-2 pl-9 pr-3 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-colors"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {groupStudents.map((student, idx) => {
            const currentStatus = attendance[student.id]?.status || 'Hadir';
            const currentNotes = attendance[student.id]?.notes || '';
            
            return (
              <div key={student.id} className="p-4 space-y-3">
                <div>
                  <div className="font-medium text-slate-900 text-sm">{idx + 1}. {student.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{student.nis}</div>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5">
                  {['Hadir', 'Izin', 'Sakit', 'Alpa'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(student.id, status)}
                      className={cn(
                        "py-1.5 text-[11px] font-medium rounded-md border focus:z-10 focus:ring-2 focus:ring-emerald-500 transition-colors",
                        currentStatus === status 
                          ? status === 'Hadir' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                            : status === 'Izin' ? 'bg-amber-50 border-amber-500 text-amber-700'
                            : status === 'Sakit' ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-red-50 border-red-500 text-red-700'
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(student.id, e.target.value)}
                    placeholder="Catatan (opsional)..." 
                    className="w-full text-xs border-0 bg-slate-50 rounded-md py-2 pl-9 pr-3 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <Button onClick={handleSave} className="w-full sm:w-auto">
            <Save size={18} className="mr-2" /> Simpan Absensi
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <CheckCircle className="text-emerald-400" size={20} />
          <div>
            <p className="text-sm font-medium">Absensi berhasil disimpan</p>
            <p className="text-xs text-gray-400">Data kehadiran Kelompok {mockGroups.find(g => g.id === selectedGroup)?.name} telah diperbarui.</p>
          </div>
        </div>
      )}
    </div>
  );
}
