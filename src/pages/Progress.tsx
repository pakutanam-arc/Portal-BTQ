import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Search, Loader2, Save, FileText, CheckCircle } from 'lucide-react';
import { getStudents, getGroups, getAllStudentProgress, saveStudentProgress, getMentors, createNotification, Student, Group, StudentProgress } from '../services/db';
import { masterGrades, masterSessions } from '../services/curriculumData';
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
        const [studentsRes, groupsRes, mentorsRes] = await Promise.all([
          getStudents(),
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
        setStudents(studentsRes);
        
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
  const gradeId = selectedGroup?.gradeId || 'grade1';
  const availableSessions = masterSessions.filter(s => s.gradeId === gradeId && s.semester === selectedSemester);
  
  // Set default session when grade or semester changes
  useEffect(() => {
    if (availableSessions.length > 0) {
      if (!availableSessions.find(s => s.id === selectedSessionId)) {
        // Default to active session 3 if available in semester 1, else session 2, else first
        const defaultSession = availableSessions.find(s => s.sessionNumber === 3) || 
                               availableSessions.find(s => s.sessionNumber === 2) || 
                               availableSessions[0];
        setSelectedSessionId(defaultSession.id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [gradeId, selectedSemester, availableSessions, selectedSessionId]);

  // Load progress for selected group and session
  useEffect(() => {
    async function loadSessionProgress() {
      if (!selectedGroupId || !selectedSessionId) {
        setSessionProgress({});
        return;
      }
      try {
        // ideally we would filter by sessionId on the query, but we fetch all and filter client-side for simplicity here
        const allProgress = await getAllStudentProgress();
        const records = allProgress.filter(p => p.groupId === selectedGroupId && p.sessionId === selectedSessionId);
        
        const stateMap: Record<string, Partial<StudentProgress>> = {};
        records.forEach(r => {
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
    const numValue = Math.min(100, Math.max(0, parseInt(value) || 0));
    setSessionProgress(prev => {
      const current = prev[studentId] || { reading: 0, tajwid: 0, memorization: 0, writing: 0 };
      const updated = { ...current, [field]: numValue };
      
      updated.total = Math.round(
        ((updated.reading || 0) + (updated.tajwid || 0) + (updated.memorization || 0) + (updated.writing || 0)) / 4
      );
      
      return { ...prev, [studentId]: updated };
    });
  };

  const handleSave = async () => {
    if (!selectedGroupId || !selectedSessionId) return;
    setSaving(true);
    try {
      const groupStudents = students.filter(s => s.groupId === selectedGroupId);
      
      for (const student of groupStudents) {
        const p = sessionProgress[student.id];
        if (p) {
          const record: StudentProgress = {
            id: p.id,
            studentId: student.id,
            groupId: selectedGroupId,
            sessionId: selectedSessionId,
            semester: selectedSemester,
            date: new Date().toISOString().split('T')[0], // Use current date for update
            reading: p.reading || 0,
            tajwid: p.tajwid || 0,
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
      const allProgress = await getAllStudentProgress();
      const records = allProgress.filter(pr => pr.groupId === selectedGroupId && pr.sessionId === selectedSessionId);
      const stateMap: Record<string, Partial<StudentProgress>> = {};
      records.forEach(r => {
        stateMap[r.studentId] = r;
      });
      setSessionProgress(stateMap);
      
    } catch (error) {
      console.error("Error saving progress", error);
    } finally {
      setSaving(false);
    }
  };

  const groupStudents = students.filter(s => s.groupId === selectedGroupId);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-emerald-600">
          <Loader2 size={32} className="animate-spin" />
          <p className="font-medium text-slate-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penilaian Sesi Kurikulum</h1>
          <p className="text-gray-500 mt-1 text-sm">Input nilai progress siswa per pertemuan materi</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Kelompok</label>
            <Select 
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              {groups.length === 0 && <option value="">Belum ada kelompok</option>}
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Semester</label>
            <Select 
              value={selectedSemester.toString()}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="w-full"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Pertemuan Sesi (Jadwal Sabtu)</label>
            <Select 
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full"
            >
              {availableSessions.map(s => {
                const statusTag = selectedSemester === 1 && s.sessionNumber <= 2 
                  ? ' [Selesai]' 
                  : selectedSemester === 1 && s.sessionNumber === 3 
                  ? ' [Sesi Aktif]' 
                  : '';
                return (
                  <option key={s.id} value={s.id}>
                    Pertemuan {s.sessionNumber} ({s.scheduleDay || 'Sabtu'}): {s.topic}{statusTag}
                  </option>
                );
              })}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="text-center w-24">Membaca</TableHead>
                <TableHead className="text-center w-24">Tajwid</TableHead>
                <TableHead className="text-center w-24">Hafalan</TableHead>
                <TableHead className="text-center w-24">Menulis</TableHead>
                <TableHead className="text-center w-24">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Belum ada siswa di kelompok ini.
                  </TableCell>
                </TableRow>
              ) : (
                groupStudents.map((student, idx) => {
                  const p = sessionProgress[student.id] || { reading: '', tajwid: '', memorization: '', writing: '', total: 0 };
                  return (
                    <TableRow key={student.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-center text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{student.name}</div>
                        <div className="text-xs text-emerald-700 font-medium">Kelas {student.class}</div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0" max="100" 
                          className="text-center h-8 px-1"
                          value={p.reading}
                          onChange={(e) => handleScoreChange(student.id, 'reading', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0" max="100" 
                          className="text-center h-8 px-1"
                          value={p.tajwid}
                          onChange={(e) => handleScoreChange(student.id, 'tajwid', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0" max="100" 
                          className="text-center h-8 px-1"
                          value={p.memorization}
                          onChange={(e) => handleScoreChange(student.id, 'memorization', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0" max="100" 
                          className="text-center h-8 px-1"
                          value={p.writing}
                          onChange={(e) => handleScoreChange(student.id, 'writing', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold px-2 py-1 rounded",
                          p.total >= 85 ? "text-emerald-700 bg-emerald-50" :
                          p.total >= 70 ? "text-blue-700 bg-blue-50" :
                          p.total >= 50 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"
                        )}>{p.total || 0}%</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <Button onClick={handleSave} className="w-full sm:w-auto" disabled={saving || groupStudents.length === 0}>
            {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />} 
            {saving ? 'Menyimpan...' : 'Simpan Nilai'}
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <div className="bg-emerald-500/20 p-1.5 rounded-full text-emerald-400">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-medium">Nilai berhasil disimpan</p>
            <p className="text-xs text-gray-400">Data penilaian sesi telah diperbarui.</p>
          </div>
        </div>
      )}
    </div>
  );
}
