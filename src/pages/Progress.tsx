import React, { useState, useEffect } from 'react';
import { theme } from '../theme';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Search, Loader2, Save, FileText, CheckCircle, Award, BookOpen } from 'lucide-react';
import { getGroups, getStudentsByGroup, getStudentProgressBySession, saveStudentProgress, getMentors, createNotification, Student, Group, StudentProgress } from '../services/db';
import { masterGrades, masterSessions, getGradeForGroup, JUZ_30_SURAHS } from '../services/curriculumData';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

export function Progress() {
  const { currentUser, userData, userRole } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  const [sessionProgress, setSessionProgress] = useState<Record<string, Partial<StudentProgress>>>({});
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadData() {
      try {
        const [groupsRes, mentorsRes] = await Promise.all([
          getGroups(),
          getMentors()
        ]);
        
        let filteredGroups = groupsRes;
        
        if (isMentor) {
          const userEmailLower = currentUser?.email?.toLowerCase();
          const matchedMentor = mentorsRes.find(
            m => (userData?.id && m.id === userData.id) ||
                 (currentUser?.uid && m.id === currentUser.uid) ||
                 (userEmailLower && m.email?.toLowerCase() === userEmailLower) ||
                 (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase()) ||
                 (userData?.groupId && m.groupId === userData.groupId)
          );
          const mentorId = matchedMentor?.id || userData?.id || currentUser?.uid;
          const assignedGroupId = matchedMentor?.groupId || userData?.groupId;
          
          const mentorAssigned = groupsRes.filter(g => 
            g.mentorId === mentorId || 
            (assignedGroupId && g.id === assignedGroupId)
          );

          if (mentorAssigned.length > 0) {
            filteredGroups = mentorAssigned;
          }
        }
        
        setGroups(filteredGroups);
        
        if (filteredGroups.length > 0) {
          setSelectedGroupId(filteredGroups[0].id);
        }
      } catch (error) {
        console.error("Error loading progress data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userRole, userData, currentUser, isMentor]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const gradeObj = getGradeForGroup(selectedGroup);
  const gradeId = gradeObj.id;
  const availableSessions = React.useMemo(() => {
    return masterSessions.filter(s => s.gradeId === gradeId && s.semester === selectedSemester);
  }, [gradeId, selectedSemester]);
  
  // Set default session when grade or semester changes
  useEffect(() => {
    if (availableSessions.length > 0) {
      if (!availableSessions.find(s => s.id === selectedSessionId)) {
        // Default to session 2 if available in semester 1, else session 1
        const defaultSession = availableSessions.find(s => s.sessionNumber === 2) || 
                               availableSessions.find(s => s.sessionNumber === 1) || 
                               availableSessions[0];
        setSelectedSessionId(defaultSession.id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [gradeId, selectedSemester, availableSessions, selectedSessionId]);

  // Helper to calculate average of non-zero quality scores:
  // Kelompok 1-9 (Utsmani): Tajwid & Menulis
  // Kelompok 10 (Tahfizh / Al-Qur'an): Membaca, Tajwid, Menulis (Hafalan dicatat tersendiri per surah dan tidak dirata-ratakan)
  const calculateProgressAverage = (record: Partial<StudentProgress>) => {
    const scores: number[] = [];
    if (gradeId === 'grade3') {
      if (record.reading && Number(record.reading) > 0) scores.push(Number(record.reading));
    }
    if (record.tajwid && Number(record.tajwid) > 0) scores.push(Number(record.tajwid));
    if (record.writing && Number(record.writing) > 0) scores.push(Number(record.writing));
    return scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
  };

  // Load progress for selected group and session
  useEffect(() => {
    async function loadSessionProgress() {
      if (!selectedGroupId || !selectedSessionId) {
        setSessionProgress({});
        return;
      }
      try {
        const [records, groupStudents] = await Promise.all([
          getStudentProgressBySession(selectedGroupId, selectedSessionId),
          getStudentsByGroup(selectedGroupId)
        ]);
        
        setStudents(groupStudents);
        
        const stateMap: Record<string, Partial<StudentProgress>> = {};
        records.forEach(r => {
          r.total = calculateProgressAverage(r);
          stateMap[r.studentId] = r;
        });
        setSessionProgress(stateMap);
      } catch (error) {
        console.error("Error loading session progress", error);
      }
    }
    loadSessionProgress();
  }, [selectedGroupId, selectedSessionId]);

  const handleScoreChange = (studentId: string, field: keyof StudentProgress, value: string) => {
    setSessionProgress(prev => {
      const current = prev[studentId] || { reading: 0, tajwid: 0, memorizedSurah: '', writing: 0 };
      let updated: Partial<StudentProgress>;
      
      if (field === 'memorizedSurah') {
        updated = { ...current, memorizedSurah: value };
      } else {
        const numValue = value === '' ? 0 : Math.min(100, Math.max(0, parseInt(value) || 0));
        updated = { ...current, [field]: numValue };
      }
      
      updated.total = calculateProgressAverage(updated);
      
      return { ...prev, [studentId]: updated };
    });
  };

  const handleSave = async () => {
    if (!selectedGroupId || !selectedSessionId) return;
    setSaving(true);
    try {
      const groupStudents = students;
      const sessionObj = masterSessions.find(s => s.id === selectedSessionId);
      const meetingNum = sessionObj?.sessionNumber || 1;
      const recordDate = meetingNum === 1 ? '2026-08-15' : meetingNum === 2 ? '2026-08-22' : new Date().toISOString().split('T')[0];
      
      for (const student of groupStudents) {
        const p = sessionProgress[student.id];
        if (p) {
          const record: StudentProgress = {
            id: p.id,
            studentId: student.id,
            groupId: selectedGroupId,
            sessionId: selectedSessionId,
            meetingNumber: meetingNum,
            semester: selectedSemester,
            date: recordDate,
            reading: p.reading || 0,
            tajwid: p.tajwid || 0,
            memorizedSurah: p.memorizedSurah || '',
            memorization: p.memorization || 0,
            writing: p.writing || 0,
            total: p.total || 0,
          };
          await saveStudentProgress(record);
        }
      }
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Real-time notification dispatch
      try {
        const groupObj = groups.find(g => g.id === selectedGroupId);
        const groupName = groupObj?.name || 'Kelompok Binaan';
        const sessionObj = masterSessions.find(s => s.id === selectedSessionId);
        const sessionLabel = sessionObj ? `Sesi ${sessionObj.sessionNumber}` : 'Sesi Kurikulum';
        const mentorName = userData?.name || 'Mentor BTQ';

        await createNotification({
          title: `Nilai ${groupName} Diperbarui`,
          message: `${mentorName} telah menginput penilaian capaian ${sessionLabel} untuk santri ${groupName}.`,
          type: 'info',
          targetRole: 'all',
          link: '/progress',
          readBy: [userData?.id || currentUser?.uid || ''].filter(Boolean),
          createdAt: new Date().toISOString(),
          createdBy: mentorName
        });
      } catch (notifErr) {
        console.warn("Could not dispatch progress notification", notifErr);
      }

      // Reload to get new IDs
      const records = await getStudentProgressBySession(selectedGroupId, selectedSessionId);
      const stateMap: Record<string, Partial<StudentProgress>> = {};
      records.forEach(r => {
        r.total = calculateProgressAverage(r);
        stateMap[r.studentId] = r;
      });
      setSessionProgress(stateMap);
      
    } catch (error) {
      console.error("Error saving progress", error);
    } finally {
      setSaving(false);
    }
  };

  const groupStudents = students;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-[#0362D0]">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-semibold text-[#172033]">Memuat data penilaian...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={theme.typography.h1}>Penilaian Tahap Kurikulum</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
              SMP Negeri 102 Jakarta
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            Formulir penilaian aspek mutu pembelajaran Al-Qur'an santri sesuai kurikulum kelompok
          </p>
        </div>
      </div>

      <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
        <div className="p-5 border-b border-[#E6E8EC] bg-[#F5F6F8]/60 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Kelompok</label>
            <Select 
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full font-bold text-xs"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              {groups.length === 0 && <option value="">Belum ada kelompok</option>}
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Semester</label>
            <Select 
              value={selectedSemester.toString()}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="w-full font-bold text-xs"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Pilih Tahap Kurikulum</label>
            <Select 
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full font-bold text-xs"
            >
              {availableSessions.map(s => {
                const statusTag = selectedSemester === 1 && s.sessionNumber <= 2 
                  ? ' [Selesai]' 
                  : selectedSemester === 1 && s.sessionNumber === 3 
                  ? ' [Tahap Aktif]' 
                  : '';
                return (
                  <option key={s.id} value={s.id}>
                    Tahap {s.sessionNumber}: {s.topic}{statusTag}
                  </option>
                );
              })}
            </Select>
          </div>
        </div>

        {/* Informasi Fokus Penilaian Sesuai Kurikulum Kelompok */}
        <div className="px-5 py-3 bg-[#0362D0]/5 border-b border-[#E6E8EC] flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-2 text-[#172033]">
            <BookOpen size={16} className="text-[#0362D0] shrink-0" />
            <span>
              {gradeId === 'grade3' 
                ? 'Kelompok 10 (Tahfizh Al-Qur\'an Juz 30): Mutu membaca, tajwid, dan menulis dirata-ratakan. Kolom Hafalan mencatat surah/ayat yang dihafalkan pada sesi ini.'
                : `Kelompok 1–9 (${selectedGroup?.name || 'Utsmani'}): Penilaian fokus pada Tajwid dan Menulis Al-Qur'an (2 Aspek Mutu).`}
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#0362D0] shrink-0 bg-white px-2.5 py-0.5 rounded-lg border border-[#0362D0]/20">
            {gradeId === 'grade3' ? 'Membaca, Tajwid, Menulis + Kolom Hafalan' : '2 Aspek Mutu'}
          </span>
        </div>

        {/* Datalist pilihan Surah Juz 30 */}
        <datalist id="juz30-surah-list">
          {JUZ_30_SURAHS.map(surah => (
            <option key={surah} value={surah} />
          ))}
        </datalist>

        <div className="hidden md:block overflow-x-auto w-full scrollbar-thin">
          <Table>
            <TableHeader className="bg-[#F5F6F8]">
              <TableRow className="border-b border-[#E6E8EC]">
                <TableHead className="w-12 text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">No</TableHead>
                <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Nama Santri</TableHead>
                {gradeId === 'grade3' && (
                  <TableHead className="text-center w-20 font-black text-[#172033] text-xs whitespace-nowrap px-3 py-3.5">Membaca</TableHead>
                )}
                <TableHead className="text-center w-20 font-black text-[#172033] text-xs whitespace-nowrap px-3 py-3.5">Tajwid</TableHead>
                <TableHead className="text-center w-20 font-black text-[#172033] text-xs whitespace-nowrap px-3 py-3.5">Menulis</TableHead>
                {gradeId === 'grade3' && (
                  <TableHead className="text-center min-w-44 font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Setoran Hafalan (Surah/Ayat)</TableHead>
                )}
                <TableHead className="text-center w-24 font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">Rata-Rata Mutu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={gradeId === 'grade3' ? 7 : 5} className="text-center py-12 text-slate-500 font-medium whitespace-nowrap">
                    Belum ada santri di kelompok ini.
                  </TableCell>
                </TableRow>
              ) : (
                groupStudents.map((student, idx) => {
                  const p = sessionProgress[student.id] || { reading: '', tajwid: '', memorizedSurah: '', writing: '', total: 0 };
                  return (
                    <TableRow key={student.id} className="hover:bg-[#F5F6F8]/60 transition-colors border-b border-[#E6E8EC]">
                      <TableCell className="text-center text-slate-500 font-bold text-xs whitespace-nowrap px-4 py-3.5">{idx + 1}</TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3.5">
                        <div className="font-extrabold text-[#172033] text-sm">{student.name}</div>
                        <div className="text-[11px] text-[#0362D0] font-bold">Kelas {student.class}</div>
                      </TableCell>
                      {gradeId === 'grade3' && (
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0" max="100" 
                            className="text-center h-9 px-1 font-bold text-xs border-[#E6E8EC]"
                            placeholder="0-100"
                            value={p.reading === 0 || p.reading === '' || p.reading === undefined ? '' : p.reading}
                            onChange={(e) => handleScoreChange(student.id, 'reading', e.target.value)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0" max="100" 
                          className="text-center h-9 px-1 font-bold text-xs border-[#E6E8EC]"
                          placeholder="0-100"
                          value={p.tajwid === 0 || p.tajwid === '' || p.tajwid === undefined ? '' : p.tajwid}
                          onChange={(e) => handleScoreChange(student.id, 'tajwid', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0" max="100" 
                          className="text-center h-9 px-1 font-bold text-xs border-[#E6E8EC]"
                          placeholder="0-100"
                          value={p.writing === 0 || p.writing === '' || p.writing === undefined ? '' : p.writing}
                          onChange={(e) => handleScoreChange(student.id, 'writing', e.target.value)}
                        />
                      </TableCell>
                      {gradeId === 'grade3' && (
                        <TableCell>
                          <Input 
                            type="text"
                            list="juz30-surah-list"
                            placeholder="Contoh: QS. An-Naba' 1-20" 
                            className="h-9 px-2 text-xs font-semibold border-[#E6E8EC] bg-white"
                            value={p.memorizedSurah || ''}
                            onChange={(e) => handleScoreChange(student.id, 'memorizedSurah', e.target.value)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-black px-2.5 py-1 rounded-lg text-xs border inline-block min-w-14",
                          (p.total || 0) >= 85 ? "text-emerald-800 bg-emerald-50 border-emerald-200" :
                          (p.total || 0) >= 70 ? "text-[#0362D0] bg-[#0362D0]/10 border-[#0362D0]/20" :
                          (p.total || 0) >= 50 ? "text-[#C99A2E] bg-[#C99A2E]/15 border-[#C99A2E]/30" : "text-[#950415] bg-[#950415]/10 border-[#950415]/20"
                        )}>{p.total || 0}%</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3 p-1">
          {groupStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium bg-[#F5F6F8] rounded-xl border border-[#E6E8EC]">
              Belum ada santri di kelompok ini.
            </div>
          ) : (
            groupStudents.map((student, idx) => {
              const p = sessionProgress[student.id] || { reading: '', tajwid: '', memorizedSurah: '', writing: '', total: 0 };
              return (
                <div key={student.id} className="bg-white border border-[#E6E8EC] rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-extrabold text-[#172033] text-sm leading-tight">{student.name}</div>
                      <div className="text-[11px] text-[#0362D0] font-bold mt-1">Kelas {student.class}</div>
                    </div>
                    <span className={cn(
                      "font-black px-2 py-1 rounded-lg text-[10px] border shrink-0 text-center",
                      (p.total || 0) >= 85 ? "text-emerald-800 bg-emerald-50 border-emerald-200" :
                      (p.total || 0) >= 70 ? "text-[#0362D0] bg-[#0362D0]/10 border-[#0362D0]/20" :
                      (p.total || 0) >= 50 ? "text-[#C99A2E] bg-[#C99A2E]/15 border-[#C99A2E]/30" : "text-[#950415] bg-[#950415]/10 border-[#950415]/20"
                    )}>Rata-rata Mutu<br/>{p.total || 0}%</span>
                  </div>

                  <div className={`grid ${gradeId === 'grade3' ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 mb-3`}>
                    {gradeId === 'grade3' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">Membaca</label>
                        <Input 
                          type="number" 
                          min="0" max="100" 
                          placeholder="0-100"
                          className="text-center h-9 px-1 font-bold text-xs border-[#E6E8EC]"
                          value={p.reading === 0 || p.reading === '' || p.reading === undefined ? '' : p.reading}
                          onChange={(e) => handleScoreChange(student.id, 'reading', e.target.value)}
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tajwid</label>
                      <Input 
                        type="number" 
                        min="0" max="100" 
                        placeholder="0-100"
                        className="text-center h-9 px-1 font-bold text-xs border-[#E6E8EC]"
                        value={p.tajwid === 0 || p.tajwid === '' || p.tajwid === undefined ? '' : p.tajwid}
                        onChange={(e) => handleScoreChange(student.id, 'tajwid', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Menulis</label>
                      <Input 
                        type="number" 
                        min="0" max="100" 
                        placeholder="0-100"
                        className="text-center h-9 px-1 font-bold text-xs border-[#E6E8EC]"
                        value={p.writing === 0 || p.writing === '' || p.writing === undefined ? '' : p.writing}
                        onChange={(e) => handleScoreChange(student.id, 'writing', e.target.value)}
                      />
                    </div>
                  </div>

                  {gradeId === 'grade3' && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block flex items-center justify-between">
                        <span>Setoran Hafalan Surah (Tahap Ini)</span>
                      </label>
                      <Input 
                        type="text"
                        list="juz30-surah-list"
                        placeholder="Contoh: QS. An-Naba' 1-20" 
                        className="h-9 px-2 font-medium text-xs border-[#E6E8EC]"
                        value={p.memorizedSurah || ''}
                        onChange={(e) => handleScoreChange(student.id, 'memorizedSurah', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-5 border-t border-[#E6E8EC] bg-[#F5F6F8]/70 flex justify-end">
          <Button onClick={handleSave} className="w-full sm:w-auto bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold py-2.5 shadow-xs cursor-pointer" disabled={saving || groupStudents.length === 0}>
            {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />} 
            {saving ? 'Menyimpan Nilai...' : 'Simpan Nilai Sesi'}
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-[#172033] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 border border-[#E6E8EC]/20">
          <div className="bg-[#C99A2E]/20 p-2 rounded-xl text-[#C99A2E]">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-black">Nilai Berhasil Disimpan</p>
            <p className="text-xs text-slate-300 font-medium">Data capaian santri telah diperbarui di sistem.</p>
          </div>
        </div>
      )}
    </div>
  );
}

