import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, RotateCcw, MessageSquare, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
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
        // Client-side natural numerical sorting to ensure 100% correct display order
        const sortedMentors = [...mentorsData].sort((a, b) => {
          const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });
        setMentors(sortedMentors);
        if (sortedMentors.length === 0) {
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
        <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-semibold text-[#172033]">Memuat data mentor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#172033] tracking-tight">Presensi Kehadiran Mentor</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#950415]/10 text-[#950415] text-xs font-black border border-[#950415]/20">
              Pengurus & Mentor BTQ
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            Formulir pencatatan presensi kedatangan ustadz/ustadzah mentor kegiatan bimbingan BTQ
          </p>
        </div>
      </div>

      <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
        <div className="p-5 border-b border-[#E6E8EC] bg-[#F5F6F8]/60">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1.5 w-full md:w-80">
              <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Tanggal Bimbingan</label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                icon={<Calendar size={16} className="text-[#0362D0]" />}
              />
            </div>
            <div className="flex items-center gap-2 bg-[#0362D0]/10 px-4 py-2.5 rounded-2xl border border-[#0362D0]/20 text-[#0362D0] text-xs font-bold">
              <Calendar size={14} />
              <span>Jadwal Wajib: <strong>Setiap Hari Sabtu (07:15 - 08:00 WIB)</strong></span>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex items-center justify-between border-b border-[#E6E8EC] bg-white">
          <h3 className="font-extrabold text-[#172033] text-sm">Daftar Mentor Terdaftar ({mentors.length} orang)</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Hadir')} className="border-[#E6E8EC] text-[#172033] font-bold text-xs hover:bg-[#F5F6F8]">
              Hadir Semua
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Hadir')} className="border-[#E6E8EC] text-slate-600 font-bold text-xs hover:bg-[#F5F6F8]">
              <RotateCcw size={14} className="mr-1.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-[#F5F6F8]">
              <TableRow className="border-b border-[#E6E8EC]">
                <TableHead className="w-12 text-center font-black text-[#172033] text-xs">No</TableHead>
                <TableHead className="font-black text-[#172033] text-xs">Nama Mentor</TableHead>
                <TableHead className="text-center font-black text-[#172033] text-xs">Status Presensi</TableHead>
                <TableHead className="font-black text-[#172033] text-xs">Catatan Mentor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-500 font-medium">
                    Belum ada data mentor di database.
                  </TableCell>
                </TableRow>
              ) : (
                mentors.map((mentor, idx) => {
                  const currentStatus = attendance[mentor.id]?.status || 'Hadir';
                  const currentNotes = attendance[mentor.id]?.notes || '';
                  
                  return (
                    <TableRow key={mentor.id} className="hover:bg-[#F5F6F8]/60 transition-colors border-b border-[#E6E8EC]">
                      <TableCell className="text-center text-slate-500 font-bold text-xs py-3.5">{idx + 1}</TableCell>
                      <TableCell className="py-3.5">
                        <div className="font-extrabold text-[#172033] text-sm">{mentor.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{mentor.email}</div>
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <div className="inline-flex rounded-xl border border-[#E6E8EC] overflow-hidden p-1 bg-[#F5F6F8]">
                          {[
                            { label: 'Hadir', activeClass: 'bg-emerald-600 text-white shadow-2xs' },
                            { label: 'Izin', activeClass: 'bg-amber-500 text-white shadow-2xs' },
                            { label: 'Sakit', activeClass: 'bg-blue-600 text-white shadow-2xs' },
                            { label: 'Alpa', activeClass: 'bg-rose-600 text-white shadow-2xs' }
                          ].map(({ label, activeClass }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => handleStatusChange(mentor.id, label)}
                              className={cn(
                                "px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                                currentStatus === label 
                                  ? activeClass
                                  : "text-slate-600 hover:text-[#172033] hover:bg-white"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            value={currentNotes}
                            onChange={(e) => handleNotesChange(mentor.id, e.target.value)}
                            placeholder="Catatan keutamaan/keterangan..." 
                            className="w-full text-xs border border-[#E6E8EC] bg-white rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#0362D0] text-[#172033]"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-[#E6E8EC]">
          {mentors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              Belum ada data mentor di database.
            </div>
          ) : (
            mentors.map((mentor, idx) => {
              const currentStatus = attendance[mentor.id]?.status || 'Hadir';
              const currentNotes = attendance[mentor.id]?.notes || '';
              
              return (
                <div key={mentor.id} className="p-4 space-y-3 bg-white">
                  <div>
                    <div className="font-extrabold text-[#172033] text-sm">{idx + 1}. {mentor.name}</div>
                    <div className="text-[11px] text-slate-400">{mentor.email}</div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F5F6F8] rounded-xl border border-[#E6E8EC]">
                    {[
                      { label: 'Hadir', activeClass: 'bg-emerald-600 text-white' },
                      { label: 'Izin', activeClass: 'bg-amber-500 text-white' },
                      { label: 'Sakit', activeClass: 'bg-blue-600 text-white' },
                      { label: 'Alpa', activeClass: 'bg-rose-600 text-white' }
                    ].map(({ label, activeClass }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleStatusChange(mentor.id, label)}
                        className={cn(
                          "py-1.5 text-xs font-extrabold rounded-lg transition-all",
                          currentStatus === label 
                            ? activeClass
                            : "text-slate-600 bg-white"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      value={currentNotes}
                      onChange={(e) => handleNotesChange(mentor.id, e.target.value)}
                      placeholder="Catatan..." 
                      className="w-full text-xs border border-[#E6E8EC] bg-white rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#0362D0]"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-5 border-t border-[#E6E8EC] bg-[#F5F6F8]/70 flex justify-end">
          <Button onClick={handleSave} className="w-full sm:w-auto bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold py-2.5 shadow-xs cursor-pointer" disabled={saving}>
            {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />} 
            {saving ? 'Menyimpan Absensi...' : 'Simpan Presensi Mentor'}
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-[#172033] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 border border-[#E6E8EC]/20">
          <CheckCircle className="text-[#C99A2E] shrink-0" size={24} />
          <div>
            <p className="text-sm font-black">Presensi Mentor Berhasil Disimpan</p>
            <p className="text-xs text-slate-300 font-medium">Data presensi mentor tanggal {selectedDate} telah tersimpan.</p>
          </div>
        </div>
      )}
    </div>
  );
}

