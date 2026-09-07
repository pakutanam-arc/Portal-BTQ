import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, RotateCcw, MessageSquare, Loader2, BookOpen, Users, UserCheck, AlertCircle, Sparkles, Clock, Check, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { getGroups, getStudentsByGroup, getStudentAttendance, saveStudentAttendance, getMentors, createNotification, Group, Student, Mentor } from '../services/db';
import { masterGrades, masterSessions, CurriculumSession } from '../services/curriculumData';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';

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
        // Default to session 2 (Pekan 2, 22 Agustus) in semester 1, else first
        const defaultSession = availableSessions.find(s => s.sessionNumber === 2) || availableSessions[0];
        setSelectedSessionId(defaultSession.id);
        if (selectedSemester === 1) {
          if (defaultSession.sessionNumber === 1) setSelectedDate('2026-08-15');
          else if (defaultSession.sessionNumber === 2) setSelectedDate('2026-08-22');
          else if (defaultSession.sessionNumber === 3) setSelectedDate('2026-08-29');
        }
      }
    }
  }, [selectedGroup, currentGradeId, selectedSemester]);

  const handleSessionChange = (sessId: string) => {
    setSelectedSessionId(sessId);
    const session = availableSessions.find(s => s.id === sessId);
    if (session && selectedSemester === 1) {
      if (session.sessionNumber === 1) setSelectedDate('2026-08-15');
      else if (session.sessionNumber === 2) setSelectedDate('2026-08-22');
      else if (session.sessionNumber === 3) setSelectedDate('2026-08-29');
    }
  };

  // Load students and attendance records
  useEffect(() => {
    async function loadGroupData() {
      if (!selectedGroup) return;
      setLoading(true);
      try {
        const students = await getStudentsByGroup(selectedGroup);
        setGroupStudents(students);
        
        // Load existing attendance by meetingNumber or date
        const meetingNum = activeSessionObj?.sessionNumber || (
          selectedDate === '2026-08-15' ? 1 : selectedDate === '2026-08-22' ? 2 : 3
        );
        const attendanceRecords = await getStudentAttendance(selectedGroup, selectedDate, meetingNum);
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
  }, [selectedGroup, selectedDate, activeSessionObj?.sessionNumber]);

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
      const meetingNum = activeSessionObj?.sessionNumber || (
        selectedDate === '2026-08-15' ? 1 : selectedDate === '2026-08-22' ? 2 : 3
      );
      const recordsToSave = groupStudents.map(student => ({
        studentId: student.id,
        groupId: selectedGroup,
        date: selectedDate,
        meetingNumber: meetingNum,
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
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#172033] tracking-tight">Presensi Kehadiran Santri</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
              Sesi Sabtu (07:15 - 08:00 WIB)
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            Formulir pencatatan presensi tatap muka cepat untuk mentor bimbingan BTQ SMPN 102 Jakarta
          </p>
        </div>
      </div>

      {/* Mentor Info Banner if Mentor logged in */}
      {isMentor && (
        <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] text-white rounded-3xl p-6 shadow-md border border-[#E6E8EC]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C99A2E] text-slate-950 text-xs font-extrabold uppercase tracking-wider">
                  Panel Mentor
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center gap-1">
                  <Calendar size={12} /> Bimbingan Sabtu
                </span>
              </div>
              <h2 className="text-lg font-black">
                Selamat Datang, {userData?.name || currentMentorObj?.name || 'Ustadz/ah Mentor'}
              </h2>
              <p className="text-xs text-slate-200 font-medium">
                Kelompok: <strong>{currentGroupObj?.name || 'Kelompok 1'}</strong> • Program: <strong>{currentGradeObj?.name} ({currentGradeObj?.programName})</strong>
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-xs">
              <div className="text-center px-3">
                <p className="text-[10px] text-slate-300 uppercase font-extrabold">Total Santri</p>
                <p className="text-xl font-black text-white">{totalCount}</p>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="text-center px-3">
                <p className="text-[10px] text-slate-300 uppercase font-extrabold">Ruang Belajar</p>
                <p className="text-sm font-bold text-[#C99A2E]">{currentGroupObj?.room || 'Ruang 102'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Filter & Control Card */}
      <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
        <div className="p-5 border-b border-[#E6E8EC] bg-[#F5F6F8]/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Kelompok Bimbingan</label>
              <Select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full font-bold text-xs"
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
              <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Tanggal Bimbingan</label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                icon={<Calendar size={16} className="text-[#0362D0]" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Semester</label>
              <Select 
                value={selectedSemester.toString()}
                onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                className="w-full font-bold text-xs"
              >
                <option value="1">Semester 1 (Tahap 1 – 16)</option>
                <option value="2">Semester 2 (Tahap 17 – 32)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Materi Kurikulum</label>
              <Select 
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="w-full font-bold text-xs"
              >
                {availableSessions.map(s => {
                  const isDone = selectedSemester === 1 && s.sessionNumber <= 2;
                  const isActive = selectedSemester === 1 && s.sessionNumber === 3;
                  const tag = isDone ? ' [Selesai]' : isActive ? ' [Tahap Aktif]' : '';
                  return (
                    <option key={s.id} value={s.id}>
                      Tahap {s.sessionNumber}: {s.topic}{tag}
                    </option>
                  );
                })}
              </Select>
            </div>
          </div>

          {/* Active Session Info Box */}
          {activeSessionObj && (
            <div className="mt-4 p-4 bg-[#0362D0]/10 rounded-2xl border border-[#0362D0]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#0362D0]">
                    Tahap {activeSessionObj.sessionNumber}: {activeSessionObj.topic}
                  </span>
                  {activeSessionObj.pageRef && (
                    <span className="px-2 py-0.5 bg-white text-[#0362D0] border border-[#0362D0]/30 rounded text-[10px] font-black">
                      Ref: {activeSessionObj.pageRef}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px] font-medium">
                  <strong>Target Capaian:</strong> {activeSessionObj.target}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white border border-[#E6E8EC] text-[#172033] text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                  <Clock size={12} className="text-[#0362D0]" />
                  Sabtu, 07:15 - 08:00 WIB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Summary Counters Bar */}
        <div className="p-4 bg-white border-b border-[#E6E8EC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-black text-[#172033] uppercase tracking-wider">Rekap Presensi:</span>
            <span className="px-3 py-1 bg-[#F5F6F8] text-[#172033] border border-[#E6E8EC] rounded-xl text-xs font-extrabold flex items-center gap-1">
              Total: {totalCount} Santri
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Hadir: {hadirCount}
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span> Izin: {izinCount}
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> Sakit: {sakitCount}
            </span>
            <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span> Alpa: {alpaCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Hadir')} className="border-[#E6E8EC] text-[#172033] hover:bg-[#F5F6F8] font-bold text-xs">
              <Check size={14} className="mr-1 text-emerald-600" /> Hadir Semua
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="border-[#E6E8EC] text-slate-600 hover:bg-[#F5F6F8] font-bold text-xs">
              <RotateCcw size={14} className="mr-1 text-slate-500" /> Reset
            </Button>
          </div>
        </div>

        {/* Student List */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#0362D0]" />
            <p className="text-sm font-bold text-[#172033]">Memuat data santri...</p>
          </div>
        ) : groupStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Users size={36} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-bold text-[#172033]">Tidak ada santri terdaftar di kelompok ini.</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Pilih kelompok lain atau periksa konfigurasi kelompok.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full scrollbar-thin">
              <Table>
                <TableHeader className="bg-[#F5F6F8]">
                  <TableRow className="border-b border-[#E6E8EC]">
                    <TableHead className="w-12 text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">No</TableHead>
                    <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Nama Santri</TableHead>
                    <TableHead className="text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Kelas</TableHead>
                    <TableHead className="text-center w-72 font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Status Presensi</TableHead>
                    <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Catatan Mentor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupStudents.map((student, idx) => {
                    const currentStatus = attendance[student.id]?.status || 'Hadir';
                    const currentNotes = attendance[student.id]?.notes || '';
                    
                    return (
                      <TableRow key={student.id} className="hover:bg-[#F5F6F8]/60 transition-colors border-b border-[#E6E8EC]">
                        <TableCell className="text-center text-slate-500 py-3 font-bold text-xs whitespace-nowrap px-4">{idx + 1}</TableCell>
                        <TableCell className="py-3 whitespace-nowrap px-4">
                          <div className="font-extrabold text-[#172033] text-sm">{student.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium">NIS: {student.nis || '-'}</div>
                        </TableCell>
                        <TableCell className="text-center py-3 whitespace-nowrap px-4">
                          <span className="px-2.5 py-1 bg-[#0362D0]/10 text-[#0362D0] rounded-md text-xs font-black border border-[#0362D0]/20 inline-block whitespace-nowrap">
                            Kelas {student.class}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3 whitespace-nowrap px-4">
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
                                onClick={() => handleStatusChange(student.id, label)}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
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
                        <TableCell className="py-3">
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              value={currentNotes}
                              onChange={(e) => handleNotesChange(student.id, e.target.value)}
                              placeholder="Catatan bacaan/adab..." 
                              className="w-full text-xs border border-[#E6E8EC] bg-white rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#0362D0] text-[#172033]"
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
            <div className="md:hidden divide-y divide-[#E6E8EC]">
              {groupStudents.map((student, idx) => {
                const currentStatus = attendance[student.id]?.status || 'Hadir';
                const currentNotes = attendance[student.id]?.notes || '';
                
                return (
                  <div key={student.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-extrabold text-[#172033] text-sm">{idx + 1}. {student.name}</div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20 rounded-md text-xs font-black">
                        Kelas {student.class}
                      </span>
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
                          onClick={() => handleStatusChange(student.id, label)}
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
                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                        placeholder="Catatan santri..." 
                        className="w-full text-xs border border-[#E6E8EC] bg-white rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#0362D0]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Bottom Save Bar */}
        <div className="p-5 border-t border-[#E6E8EC] bg-[#F5F6F8]/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Pastikan data presensi sudah sesuai sebelum menyimpan ke basis data portal.
          </p>
          <Button 
            onClick={handleSave} 
            disabled={saving || groupStudents.length === 0} 
            className="w-full sm:w-auto bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold shadow-xs cursor-pointer py-2.5"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Menyimpan Presensi...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" /> Simpan Presensi Kehadiran
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-[#172033] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 border border-[#E6E8EC]/20">
          <CheckCircle className="text-[#C99A2E] shrink-0" size={24} />
          <div>
            <p className="text-sm font-black">Presensi Berhasil Disimpan</p>
            <p className="text-xs text-slate-300 font-medium">
              Data presensi {currentGroupObj?.name || 'Kelompok'} untuk tanggal {selectedDate} telah tersimpan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


