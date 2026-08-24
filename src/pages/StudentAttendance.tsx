import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, RotateCcw, MessageSquare, Loader2, BookOpen, Users, UserCheck, AlertCircle, Sparkles, Clock, Check } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { getGroups, getStudentsByGroup, getStudentAttendance, saveStudentAttendance, getMentors, createNotification, Group, Student, Mentor } from '../services/db';
import { masterGrades, masterSessions, CurriculumSession } from '../services/curriculumData';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

export function StudentAttendance() {
  const { currentUser, userData, userRole } = useAuth();
  
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('g1-s3');
  const [showToast, setShowToast] = useState(false);
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMentorObj, setCurrentMentorObj] = useState<Mentor | null>(null);
  
  // State for attendance
  const [attendance, setAttendance] = useState<Record<string, { status: string, notes: string }>>({});
  const [initialAttendance, setInitialAttendance] = useState<Record<string, { status: string, notes: string }>>({});

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [groupsData, mentorsData] = await Promise.all([
          getGroups(),
          getMentors()
        ]);
        
        setAllGroups(groupsData);

        // Identify current mentor
        const userEmailLower = currentUser?.email?.toLowerCase();
        const matchedMentor = mentorsData.find(
          m => (userData?.id && m.id === userData.id) ||
               (currentUser?.uid && m.id === currentUser.uid) ||
               (userEmailLower && m.email?.toLowerCase() === userEmailLower) ||
               (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase()) ||
               (userData?.groupId && m.groupId === userData.groupId)
        );

        if (matchedMentor) {
          setCurrentMentorObj(matchedMentor);
        }

        let mentorAssignedGroups: Group[] = [];
        if (isMentor) {
          const mentorId = matchedMentor?.id || userData?.id || currentUser?.uid;
          const assignedGroupId = matchedMentor?.groupId || userData?.groupId;
          
          mentorAssignedGroups = groupsData.filter(g => 
            g.mentorId === mentorId || 
            (assignedGroupId && g.id === assignedGroupId)
          );
        }

        // If mentor has specific assigned groups, prioritize them; else use all groups
        const availableGroups = (isMentor && mentorAssignedGroups.length > 0)
          ? mentorAssignedGroups 
          : groupsData;

        setGroups(availableGroups.length > 0 ? availableGroups : groupsData);
        
        // Auto select first group
        if (availableGroups.length > 0) {
          setSelectedGroup(availableGroups[0].id);
        } else if (groupsData.length > 0) {
          setSelectedGroup(groupsData[0].id);
        }
      } catch (error) {
        console.error("Error loading initial groups/mentors data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [userRole, userData, currentUser, isMentor]);

  const currentGroupObj = (groups.find(g => g.id === selectedGroup)) || (allGroups.find(g => g.id === selectedGroup));
  const currentGradeId = currentGroupObj?.gradeId || 'grade1';
  const currentGradeObj = masterGrades.find(g => g.id === currentGradeId);
  const availableSessions = masterSessions.filter(s => s.gradeId === currentGradeId && s.semester === selectedSemester);
  const activeSessionObj = masterSessions.find(s => s.id === selectedSessionId) || availableSessions[0];

  // Keep session selection valid when group or grade changes
  useEffect(() => {
    if (availableSessions.length > 0) {
      const match = availableSessions.find(s => s.id === selectedSessionId);
      if (!match) {
        // Default to active session 3 in semester 1, else first
        const defaultSession = availableSessions.find(s => s.sessionNumber === 3) || availableSessions[0];
        setSelectedSessionId(defaultSession.id);
      }
    }
  }, [selectedGroup, currentGradeId, selectedSemester]);

  // Load students and attendance records
  useEffect(() => {
    async function loadGroupData() {
      if (!selectedGroup) return;
      setLoading(true);
      try {
        const students = await getStudentsByGroup(selectedGroup);
        setGroupStudents(students);
        
        // Load existing attendance
        const attendanceRecords = await getStudentAttendance(selectedGroup, selectedDate);
        const newAttendanceState: Record<string, { status: string, notes: string }> = {};
        
        students.forEach(s => {
          const existingRecord = attendanceRecords.find(r => r.studentId === s.id);
          newAttendanceState[s.id] = { 
            status: existingRecord ? existingRecord.status : 'Hadir', 
            notes: existingRecord?.notes || '' 
          };
        });
        
        setAttendance(newAttendanceState);
        setInitialAttendance(JSON.parse(JSON.stringify(newAttendanceState)));
      } catch (error) {
        console.error("Error loading student attendance group data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadGroupData();
  }, [selectedGroup, selectedDate]);

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

  const handleReset = () => {
    setAttendance(JSON.parse(JSON.stringify(initialAttendance)));
  };

  const handleSave = async () => {
    if (!selectedGroup || groupStudents.length === 0) return;
    setSaving(true);
    try {
      const recordsToSave = groupStudents.map(student => ({
        studentId: student.id,
        groupId: selectedGroup,
        date: selectedDate,
        status: attendance[student.id]?.status || 'Hadir',
        notes: attendance[student.id]?.notes || ''
      }));
      
      await saveStudentAttendance(recordsToSave);
      setInitialAttendance(JSON.parse(JSON.stringify(attendance)));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Real-time notification dispatch
      try {
        const groupObj = groups.find(g => g.id === selectedGroup);
        const groupName = groupObj?.name || 'Kelompok Binaan';
        const mentorName = userData?.name || 'Mentor BTQ';
        const hadir = recordsToSave.filter(r => r.status === 'Hadir').length;
        const total = recordsToSave.length;

        await createNotification({
          title: `Absensi ${groupName} Diperbarui`,
          message: `${mentorName} telah menginput absensi santri ${groupName} tanggal ${selectedDate} (${hadir}/${total} Hadir).`,
          type: 'success',
          targetRole: 'all',
          link: '/attendance/students',
          readBy: [userData?.id || currentUser?.uid || ''].filter(Boolean),
          createdAt: new Date().toISOString(),
          createdBy: mentorName
        });
      } catch (notifErr) {
        console.warn("Could not dispatch attendance notification", notifErr);
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Gagal menyimpan absensi");
    } finally {
      setSaving(false);
    }
  };

  // Calculate statistics
  const totalCount = groupStudents.length;
  const attendanceList = Object.values(attendance) as { status: string; notes: string }[];
  const hadirCount = attendanceList.filter(a => a.status === 'Hadir').length;
  const izinCount = attendanceList.filter(a => a.status === 'Izin').length;
  const sakitCount = attendanceList.filter(a => a.status === 'Sakit').length;
  const alpaCount = attendanceList.filter(a => a.status === 'Alpa').length;

  return (
    <div className="space-y-6 relative pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absensi Kehadiran Siswa</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Pencatatan kehadiran bimbingan BTQ SMPN 102 Jakarta • Pelaksanaan setiap hari <strong>Sabtu (07.30 - 09.00 WIB)</strong>
          </p>
        </div>
      </div>

      {/* Mentor Info Banner if Mentor logged in */}
      {isMentor && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
                  Panel Mentor
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-emerald-950 text-xs font-bold flex items-center gap-1">
                  <Calendar size={12} /> Setiap Sabtu
                </span>
              </div>
              <h2 className="text-lg font-bold">
                Selamat Datang, {userData?.name || currentMentorObj?.name || 'Ustadz/ah Mentor'}
              </h2>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Kelompok Binaan: <strong>{currentGroupObj?.name || 'Kelompok 1'}</strong> • Program: <strong>{currentGradeObj?.name} ({currentGradeObj?.programName})</strong>
              </p>
            </div>
            <div className="flex items-center gap-3 bg-emerald-950/40 p-3 rounded-xl border border-emerald-700/40">
              <div className="text-center px-3">
                <p className="text-[10px] text-emerald-300 uppercase font-semibold">Total Santri</p>
                <p className="text-lg font-bold text-white">{totalCount}</p>
              </div>
              <div className="w-px h-8 bg-emerald-700"></div>
              <div className="text-center px-3">
                <p className="text-[10px] text-emerald-300 uppercase font-semibold">Sesi Aktif</p>
                <p className="text-lg font-bold text-amber-300">Sesi 3 (Sabtu)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Filter & Control Card */}
      <Card>
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase">Kelompok Binaan</label>
              <Select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full"
              >
                {groups.map(g => {
                  const isAssigned = isMentor && (
                    g.mentorId === userData?.id || 
                    g.mentorId === currentMentorObj?.id ||
                    g.id === userData?.groupId ||
                    g.id === currentMentorObj?.groupId
                  );
                  return (
                    <option key={g.id} value={g.id}>
                      {g.name} {isAssigned ? '★ (Kelompok Anda)' : ''}
                    </option>
                  );
                })}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase">Tanggal Pertemuan (Sabtu)</label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                icon={<Calendar size={16} />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase">Semester</label>
              <Select 
                value={selectedSemester.toString()}
                onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                className="w-full"
              >
                <option value="1">Semester 1 (Pertemuan 1 – 16)</option>
                <option value="2">Semester 2 (Pertemuan 17 – 32)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase">Materi Sesi (Kurikulum)</label>
              <Select 
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full"
              >
                {availableSessions.map(s => {
                  const isDone = selectedSemester === 1 && s.sessionNumber <= 2;
                  const isActive = selectedSemester === 1 && s.sessionNumber === 3;
                  const tag = isDone ? ' [Selesai]' : isActive ? ' [Sesi Aktif]' : '';
                  return (
                    <option key={s.id} value={s.id}>
                      Pertemuan {s.sessionNumber} ({s.scheduleDay || 'Sabtu'}): {s.topic}{tag}
                    </option>
                  );
                })}
              </Select>
            </div>
          </div>

          {/* Active Session Info Box */}
          {activeSessionObj && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-900">
                    Pertemuan {activeSessionObj.sessionNumber}: {activeSessionObj.topic}
                  </span>
                  {activeSessionObj.pageRef && (
                    <span className="px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded text-[10px] font-semibold">
                      Ref: {activeSessionObj.pageRef}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px]">
                  <strong>Target Capaian:</strong> {activeSessionObj.target}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-1">
                  <Clock size={12} className="text-emerald-600" />
                  07.30 - 09.00 WIB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Summary Counters Bar */}
        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rekap:</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1">
              Total: {totalCount} Siswa
            </span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Hadir: {hadirCount}
            </span>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Izin: {izinCount}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Sakit: {sakitCount}
            </span>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Alpa: {alpaCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Hadir')}>
              <Check size={14} className="mr-1 text-emerald-600" /> Hadir Semua
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw size={14} className="mr-1 text-slate-500" /> Reset
            </Button>
          </div>
        </div>

        {/* Student List */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Memuat data siswa...</p>
          </div>
        ) : groupStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users size={36} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-semibold">Tidak ada siswa terdaftar di kelompok ini.</p>
            <p className="text-xs text-slate-400 mt-1">Pilih kelompok lain atau periksa konfigurasi kelompok.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead className="text-center">Kelas</TableHead>
                    <TableHead className="text-center w-72">Status Kehadiran</TableHead>
                    <TableHead>Catatan Mentor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupStudents.map((student, idx) => {
                    const currentStatus = attendance[student.id]?.status || 'Hadir';
                    const currentNotes = attendance[student.id]?.notes || '';
                    
                    return (
                      <TableRow key={student.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="text-center text-gray-500 py-3">{idx + 1}</TableCell>
                        <TableCell className="py-3">
                          <div className="font-semibold text-gray-900">{student.name}</div>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold border border-emerald-200/60">
                            Kelas {student.class}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <div className="inline-flex rounded-lg shadow-sm border border-slate-200 overflow-hidden p-0.5 bg-slate-50">
                            {[
                              { label: 'Hadir', activeClass: 'bg-emerald-600 text-white shadow-sm' },
                              { label: 'Izin', activeClass: 'bg-amber-500 text-white shadow-sm' },
                              { label: 'Sakit', activeClass: 'bg-blue-600 text-white shadow-sm' },
                              { label: 'Alpa', activeClass: 'bg-rose-600 text-white shadow-sm' }
                            ].map(({ label, activeClass }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => handleStatusChange(student.id, label)}
                                className={cn(
                                  "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all",
                                  currentStatus === label 
                                    ? activeClass
                                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                                )}
                              >
                                {label}
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
                              placeholder="Catatan keaktifan/adab..." 
                              className="w-full text-xs border border-slate-200 bg-white rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
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
                  <div key={student.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{idx + 1}. {student.name}</div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-md text-xs font-bold">
                        Kelas {student.class}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
                      {[
                        { label: 'Hadir', activeClass: 'bg-emerald-600 text-white shadow' },
                        { label: 'Izin', activeClass: 'bg-amber-500 text-white shadow' },
                        { label: 'Sakit', activeClass: 'bg-blue-600 text-white shadow' },
                        { label: 'Alpa', activeClass: 'bg-rose-600 text-white shadow' }
                      ].map(({ label, activeClass }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleStatusChange(student.id, label)}
                          className={cn(
                            "py-1.5 text-xs font-bold rounded-md transition-all",
                            currentStatus === label 
                              ? activeClass
                              : "text-slate-600 bg-white/60 hover:bg-white"
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
                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                        placeholder="Catatan santri..." 
                        className="w-full text-xs border border-slate-200 bg-white rounded-md py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Bottom Save Bar */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Pastikan seluruh santri telah terabsen sebelum menyimpan data ke sistem.
          </p>
          <Button 
            onClick={handleSave} 
            disabled={saving || groupStudents.length === 0} 
            className="w-full sm:w-auto shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Menyimpan Data...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" /> Simpan Absensi Kehadiran
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 border border-slate-700">
          <CheckCircle className="text-emerald-400 shrink-0" size={24} />
          <div>
            <p className="text-sm font-bold">Absensi Berhasil Disimpan</p>
            <p className="text-xs text-slate-300">
              Data kehadiran {currentGroupObj?.name || 'Kelompok'} untuk tanggal {selectedDate} telah tersimpan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

