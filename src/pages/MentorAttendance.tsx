import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, RotateCcw, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { getMentors, getMentorAttendance, saveMentorAttendance, Mentor } from '../services/db';
import { cn } from '../utils/cn';

export function MentorAttendance() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for attendance
  const [attendance, setAttendance] = useState<Record<string, { status: string, notes: string }>>({});

  useEffect(() => {
    async function loadMentors() {
      try {
        const mentorsData = await getMentors();
        setMentors(mentorsData);
        if (mentorsData.length === 0) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading mentors:", error);
        setLoading(false);
      }
    }
    loadMentors();
  }, []);

  useEffect(() => {
    async function loadAttendanceData() {
      if (mentors.length === 0) return;
      setLoading(true);
      try {
        const attendanceRecords = await getMentorAttendance(selectedDate);
        const newAttendanceState: Record<string, { status: string, notes: string }> = {};
        
        mentors.forEach(m => {
          const existingRecord = attendanceRecords.find(r => r.mentorId === m.id);
          newAttendanceState[m.id] = { 
            status: existingRecord ? existingRecord.status : 'Hadir', 
            notes: existingRecord?.notes || '' 
          };
        });
        setAttendance(newAttendanceState);
      } catch (error) {
        console.error("Error loading attendance data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAttendanceData();
  }, [selectedDate, mentors]);

  const handleStatusChange = (mentorId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [mentorId]: { ...prev[mentorId], status }
    }));
  };

  const handleNotesChange = (mentorId: string, notes: string) => {
    setAttendance(prev => ({
      ...prev,
      [mentorId]: { ...prev[mentorId], notes }
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const recordsToSave = mentors.map(mentor => ({
        mentorId: mentor.id,
        date: selectedDate,
        status: attendance[mentor.id]?.status || 'Hadir',
        notes: attendance[mentor.id]?.notes || ''
      }));
      
      await saveMentorAttendance(recordsToSave);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Gagal menyimpan absensi mentor");
    } finally {
      setSaving(false);
    }
  };

  if (loading && mentors.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-emerald-600">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-medium text-slate-600">Memuat data mentor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absensi Mentor</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola kehadiran mentor BTQ</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-xs font-medium text-gray-700">Tanggal Absensi (Jadwal Setiap Hari Sabtu)</label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                icon={<Calendar size={16} />}
              />
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-medium">
              <Calendar size={14} className="text-emerald-600" />
              <span>Jadwal Bimbingan: <strong>Setiap Hari Sabtu (07.30 - 09.00 WIB)</strong></span>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="font-medium text-gray-800">Daftar Mentor ({mentors.length} orang)</h3>
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
                <TableHead>Nama Mentor</TableHead>
                <TableHead className="text-center">Status Kehadiran</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    Belum ada data mentor di database.
                  </TableCell>
                </TableRow>
              ) : (
                mentors.map((mentor, idx) => {
                  const currentStatus = attendance[mentor.id]?.status || 'Hadir';
                  const currentNotes = attendance[mentor.id]?.notes || '';
                  
                  return (
                    <TableRow key={mentor.id}>
                    <TableCell className="text-center text-gray-500 py-3">{idx + 1}</TableCell>
                    <TableCell className="py-3">
                      <div className="font-medium text-gray-900">{mentor.name}</div>
                      <div className="text-xs text-gray-500">{mentor.email}</div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {['Hadir', 'Izin', 'Sakit', 'Alpa'].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(mentor.id, status)}
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
                          onChange={(e) => handleNotesChange(mentor.id, e.target.value)}
                          placeholder="Tambahkan catatan..." 
                          className="w-full text-sm border-0 bg-gray-50 rounded-md py-2 pl-9 pr-3 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-colors"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {mentors.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Belum ada data mentor di database.
            </div>
          ) : (
            mentors.map((mentor, idx) => {
              const currentStatus = attendance[mentor.id]?.status || 'Hadir';
              const currentNotes = attendance[mentor.id]?.notes || '';
              
              return (
                <div key={mentor.id} className="p-4 space-y-3">
                <div>
                  <div className="font-medium text-slate-900 text-sm">{idx + 1}. {mentor.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{mentor.email}</div>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5">
                  {['Hadir', 'Izin', 'Sakit', 'Alpa'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(mentor.id, status)}
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
                    onChange={(e) => handleNotesChange(mentor.id, e.target.value)}
                    placeholder="Catatan (opsional)..." 
                    className="w-full text-xs border-0 bg-slate-50 rounded-md py-2 pl-9 pr-3 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            );
          }))}
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <Button onClick={handleSave} className="w-full sm:w-auto" disabled={saving}>
            {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />} 
            {saving ? 'Menyimpan...' : 'Simpan Absensi'}
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <CheckCircle className="text-emerald-400" size={20} />
          <div>
            <p className="text-sm font-medium">Absensi berhasil disimpan</p>
            <p className="text-xs text-gray-400">Data kehadiran mentor tanggal {selectedDate} telah diperbarui.</p>
          </div>
        </div>
      )}
    </div>
  );
}
