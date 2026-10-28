import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, CheckCircle, RotateCcw, MessageSquare, MessageCircle, Loader2, BookOpen, Users, UserCheck, AlertCircle, Sparkles, Clock, Check, X, ShieldCheck, Search, Filter, CalendarOff } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { getGroups, getStudentsByGroup, getStudentAttendance, saveStudentAttendance, getMentors, createNotification, Group, Student, Mentor } from '../services/db';
import { masterGrades, masterSessions, CurriculumSession } from '../services/curriculumData';
import { cn } from '../utils/cn';
import { sortStudents } from '../utils/studentUtils';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { StudentTableSkeleton } from '../components/students/StudentTableSkeleton';
import { useDebounce } from '../hooks/useDebounce';
import { getMeetingRealDate, formatShortDateID } from '../services/academicCalendar';
import { getAcademicHolidays, subscribeAcademicHolidays, AcademicHoliday } from '../services/db/calendar';

export function StudentAttendance() {
  const { currentUser, userData, userRole } = useAuth();
  
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('g1-s3');
  const [toast, setToast] = useState<{ show: boolean, type: 'success' | 'error', message: string, description?: string }>({ show: false, type: 'success', message: '' });
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMentorObj, setCurrentMentorObj] = useState<Mentor | null>(null);

  // Filters for student list
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // State for attendance
  const [attendance, setAttendance] = useState<Record<string, { status: string, notes: string }>>({});
  const [initialAttendance, setInitialAttendance] = useState<Record<string, { status: string, notes: string }>>({});
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);

  useEffect(() => {
    let isMounted = true;
    getAcademicHolidays().then(h => {
      if (isMounted) setHolidays(h);
    });
    const unsub = subscribeAcademicHolidays(h => {
      if (isMounted) setHolidays(h);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const activeHoliday = useMemo(() => {
    const cleanDate = selectedDate.split('T')[0];
    return holidays.find(h => h.date === cleanDate);
  }, [selectedDate, holidays]);

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
        // Default to session 2 (Pertemuan 2, 22 Agustus) in semester 1, else first
        const defaultSession = availableSessions.find(s => s.sessionNumber === 2) || availableSessions[0];
        setSelectedSessionId(defaultSession.id);
        if (selectedSemester === 1) {
          const realDate = getMeetingRealDate(defaultSession.sessionNumber);
          if (realDate) setSelectedDate(realDate);
        }
      }
    }
  }, [selectedGroup, currentGradeId, selectedSemester]);

  const handleSessionChange = (sessId: string) => {
    setSelectedSessionId(sessId);
    const session = availableSessions.find(s => s.id === sessId);
    if (session && selectedSemester === 1) {
      const realDate = getMeetingRealDate(session.sessionNumber);
      if (realDate) setSelectedDate(realDate);
    }
  };

  // Load students and attendance records
  useEffect(() => {
    async function loadGroupData() {
      if (!selectedGroup) return;
      setLoading(true);
      try {
        const rawStudents = await getStudentsByGroup(selectedGroup);
        const students = sortStudents(rawStudents);
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
            status: existingRecord ? existingRecord.status : 'Alpa', 
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
      filteredGroupStudents.forEach(student => {
        if (next[student.id]) {
          next[student.id] = { ...next[student.id], status };
        } else {
          next[student.id] = { status, notes: '' };
        }
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
        status: attendance[student.id]?.status || 'Alpa',
        notes: attendance[student.id]?.notes || ''
      }));
      
      await saveStudentAttendance(recordsToSave);
      setInitialAttendance(JSON.parse(JSON.stringify(attendance)));
      setToast({ show: true, type: 'success', message: 'Presensi Berhasil Disimpan', description: `Data presensi untuk tanggal ${selectedDate} telah tersimpan.` });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('attendance-updated'));
        window.dispatchEvent(new CustomEvent('db-cache-invalidated', { detail: { keyPrefix: 'attendance' } }));
      }

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
      setToast({ show: true, type: 'error', message: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan absensi.' });
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

  // Memoized filter for students list
  const filteredGroupStudents = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    return groupStudents.filter(student => {
      const matchQuery = !q || 
        student.name.toLowerCase().includes(q) || 
        (student.nis && student.nis.toLowerCase().includes(q)) ||
        (student.class && student.class.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (statusFilter === 'ALL') return true;
      const currentStatus = attendance[student.id]?.status || 'Alpa';
      return currentStatus === statusFilter;
    });
  }, [groupStudents, debouncedSearchQuery, statusFilter, attendance]);

  const handleSendWA = (student: Student, status: string) => {
    let text = `Assalamu'alaikum Wr. Wb. Menginformasikan bahwa ananda ${student.name} pada kegiatan BTQ hari ini berstatus ${status}.`;
    
    if (status === 'Hadir') {
      text = `Assalamu'alaikum Wr. Wb. Menginformasikan perkembangan KBM BTQ ananda ${student.name} hari ini.\n\n`;
      text += `Status: ${status}\n`;
      text += `\nKami mohon bantuan motivasi dari ayah/bunda agar ananda lebih semangat belajar dan menghafal. Terima kasih.`;
    } else {
      text += `\n\nMohon kerja sama ayah/bunda untuk memastikan kehadiran dan kelancaran kegiatan belajar ananda. Terima kasih.`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
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
        <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] text-white rounded-3xl p-6 shadow-md border border-slate-100">
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
              <h2 className="text-lg font-black text-white">
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
      <Card className="border border-slate-100 rounded-3xl overflow-hidden shadow-xs bg-white">
        <div className="p-5 border-b border-slate-100 bg-slate-50/60">
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
                {availableSessions.map((s, idx) => {
                  const isDone = selectedSemester === 1 && s.sessionNumber <= 2;
                  const isActive = selectedSemester === 1 && s.sessionNumber === 3;
                  const tag = isDone ? ' [Selesai]' : isActive ? ' [Pertemuan Aktif]' : '';
                  const mDate = getMeetingRealDate(s.sessionNumber);
                  const dateInfo = mDate ? ` (${formatShortDateID(mDate)})` : '';
                  return (
                    <option key={`att_sess_${s.id}_${idx}`} value={s.id}>
                      Pertemuan {s.sessionNumber}{dateInfo}: {s.topic}{tag}
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
                <span className="px-3 py-1 rounded-full bg-white border border-slate-100 text-[#172033] text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                  <Clock size={12} className="text-[#0362D0]" />
                  Sabtu, 07:15 - 08:00 WIB
                </span>
              </div>
            </div>
          )}

          {/* Banner Peringatan Hari Libur Terkonfirmasi */}
          {activeHoliday && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-xs animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-800">
                <CalendarOff size={18} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-[11px] uppercase tracking-wider bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md border border-amber-300">
                    Sesi Diliburkan Admin
                  </span>
                  <span className="font-bold text-xs text-amber-900">
                    &ldquo;{activeHoliday.reason}&rdquo;
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Pada tanggal ini, sesi bimbingan BTQ ditiadakan dan <strong>tidak diperhitungkan</strong> dalam persentase kehadiran santri (santri tidak dianggap alpa). Sesi pertemuan efektif dialihkan ke Sabtu berikutnya di Kalender Akademik.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Summary Counters Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-black text-[#172033] uppercase tracking-wider">Rekap Presensi:</span>
            <span className="px-3 py-1 bg-slate-50 text-[#172033] border border-slate-100 rounded-xl text-xs font-extrabold flex items-center gap-1">
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
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Hadir')} className="border-slate-100 text-[#172033] hover:bg-slate-50 font-bold text-xs">
              <Check size={14} className="mr-1 text-emerald-600" /> Hadir Semua
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllStatus('Alpa')} className="border-slate-100 text-rose-700 hover:bg-rose-50 font-bold text-xs">
              <X size={14} className="mr-1 text-rose-600" /> Alpa Semua
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="border-slate-100 text-slate-600 hover:bg-slate-50 font-bold text-xs">
              <RotateCcw size={14} className="mr-1 text-slate-500" /> Reset
            </Button>
          </div>
        </div>

        {/* Quick Filter & Search Bar */}
        {groupStudents.length > 0 && (
          <div className="p-3 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Cari santri, NIS, atau kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-[#172033] focus:ring-2 focus:ring-[#0362D0] outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mr-1 hidden lg:inline">Filter Status:</span>
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'Hadir', label: 'Hadir' },
                { id: 'Izin', label: 'Izin' },
                { id: 'Sakit', label: 'Sakit' },
                { id: 'Alpa', label: 'Alpa' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer whitespace-nowrap",
                    statusFilter === tab.id
                      ? "bg-[#172033] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:text-[#172033] border border-slate-100"
                  )}
                >
                  {tab.label}
                </button>
              ))}
              {(searchQuery || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                  className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Student List */}
        {loading ? (
          <StudentTableSkeleton rowCount={6} mobileCount={4} showFooter={false} variant="attendance" />
        ) : groupStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Users size={36} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-bold text-[#172033]">Tidak ada santri terdaftar di kelompok ini.</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Pilih kelompok lain atau periksa konfigurasi kelompok.</p>
          </div>
        ) : filteredGroupStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white">
            <Search size={32} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-bold text-[#172033]">Tidak ada santri yang cocok dengan filter pencarian.</p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
              className="mt-2 text-xs text-[#0362D0] font-bold hover:underline cursor-pointer"
            >
              Hapus Filter & Pencarian
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full scrollbar-thin">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="w-12 text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">No</TableHead>
                    <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Nama Santri</TableHead>
                    <TableHead className="text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Kelas</TableHead>
                    <TableHead className="text-center w-72 font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Status Presensi</TableHead>
                    <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Catatan Mentor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroupStudents.map((student, idx) => {
                    const currentStatus = attendance[student.id]?.status || 'Alpa';
                    const currentNotes = attendance[student.id]?.notes || '';
                    
                    return (
                      <TableRow key={student.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                        <TableCell className="text-center text-slate-500 py-3 font-bold text-xs whitespace-nowrap px-4">{idx + 1}</TableCell>
                        <TableCell className="py-3 whitespace-nowrap px-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-extrabold text-[#172033] text-sm">{student.name}</div>
                              <div className="text-[11px] text-slate-400 font-medium">NIS: {student.nis || '-'}</div>
                            </div>
                            <button
                              onClick={() => handleSendWA(student, currentStatus)}
                              className="p-1.5 shrink-0 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Kirim Notifikasi WA ke Ortu"
                            >
                              <MessageCircle size={15} />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3 whitespace-nowrap px-4">
                          <span className="px-2.5 py-1 bg-[#0362D0]/10 text-[#0362D0] rounded-md text-xs font-black border border-[#0362D0]/20 inline-block whitespace-nowrap">
                            Kelas {student.class}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3 whitespace-nowrap px-4">
                          <div className="inline-flex rounded-xl border border-slate-100 overflow-hidden p-1 bg-slate-50">
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
                        <TableCell className="py-3">
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              value={currentNotes}
                              onChange={(e) => handleNotesChange(student.id, e.target.value)}
                              placeholder="Catatan bacaan/adab..." 
                              className="w-full text-xs border border-slate-100 bg-white rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#0362D0] text-[#172033]"
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
            <div className="md:hidden p-4 space-y-3 bg-slate-50/50">
              {filteredGroupStudents.map((student, idx) => {
                const currentStatus = attendance[student.id]?.status || 'Alpa';
                const currentNotes = attendance[student.id]?.notes || '';
                const isHadir = currentStatus === 'Hadir';
                
                return (
                  <div key={student.id} className="p-4 space-y-3 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                          isHadir ? "bg-[#0362D0]/10 text-[#0362D0]" : "bg-slate-100 text-slate-500"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-black text-[#172033] text-sm leading-tight">{student.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium">NIS: {student.nis || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-black">
                          Kelas {student.class}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSendWA(student, currentStatus)}
                          className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          title="Kirim WA"
                        >
                          <MessageCircle size={15} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Segmented Control */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/70 rounded-xl border border-slate-200/50">
                      {[
                        { label: 'Hadir', activeClass: 'bg-emerald-600 text-white shadow-2xs font-black' },
                        { label: 'Izin', activeClass: 'bg-amber-500 text-white shadow-2xs font-black' },
                        { label: 'Sakit', activeClass: 'bg-blue-600 text-white shadow-2xs font-black' },
                        { label: 'Alpa', activeClass: 'bg-rose-600 text-white shadow-2xs font-black' }
                      ].map(({ label, activeClass }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleStatusChange(student.id, label)}
                          className={cn(
                            "py-1.5 text-xs rounded-lg transition-all text-center cursor-pointer",
                            currentStatus === label 
                              ? activeClass
                              : "text-slate-600 hover:text-[#172033]"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                      <input 
                        type="text" 
                        value={currentNotes}
                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                        placeholder="Catatan santri / kendala..." 
                        className="w-full text-xs border border-slate-200 bg-slate-50/50 rounded-xl py-2 pl-8 pr-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0362D0] font-medium"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Bottom Save Bar */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
            {activeHoliday 
              ? 'Tanggal ini berstatus libur resmi. Presensi kehadiran tidak perlu diisi.' 
              : 'Pastikan data presensi sudah sesuai sebelum menyimpan ke basis data portal.'}
          </p>
          <Button 
            onClick={handleSave} 
            disabled={saving || groupStudents.length === 0 || !!activeHoliday} 
            className={`w-full sm:w-auto font-bold shadow-xs py-2.5 ${
              activeHoliday 
                ? 'bg-amber-600 hover:bg-amber-600 opacity-60 text-white cursor-not-allowed' 
                : 'bg-[#0362D0] hover:bg-[#0252b3] text-white cursor-pointer'
            }`}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Menyimpan Presensi...
              </>
            ) : activeHoliday ? (
              <>
                <CalendarOff size={18} className="mr-2" /> Sesi Pertemuan Diliburkan
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
      {toast.show && (
        <Toast
          message={toast.message}
          description={toast.description}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}


