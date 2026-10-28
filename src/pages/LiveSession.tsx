import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { theme } from '../theme';
import { 
  Calendar, Save, Loader2, BookOpen, Users, UserCheck, AlertCircle, 
  MessageSquare, MessageCircle, CheckCircle, ChevronRight, Award, ChevronDown, 
  Hash, CheckSquare, Edit3, PlusCircle, Camera, Sliders, Search, CheckCircle2, 
  Sparkles, Check, X, CalendarOff, UserPlus, UserMinus, Trash2, ShieldAlert
} from 'lucide-react';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { CurriculumSyncAlert } from '../components/CurriculumSyncAlert';
import { StudentScoreDrawer } from '../components/session/StudentScoreDrawer';
import { StudentTableSkeleton } from '../components/students/StudentTableSkeleton';
import { StudentActionModal } from '../components/students/StudentActionModal';
import { ModalPortal } from '../components/ui/ModalPortal';
import { sortStudents } from '../utils/studentUtils';

const QRScanner = React.lazy(() => import('../components/QRScanner').then(m => ({ default: m.QRScanner })));
import { 
  getGroups, 
  getMentors, 
  getStudentsByGroup, getStudents, 
  getStudentAttendance, 
  getStudentProgressBySession,
  getStudentProgressByMeeting,
  getTeachingJournals,
  saveStudentAttendance,
  saveStudentProgress,
  saveMultipleStudentProgress,
  saveTeachingJournal,
  createNotification,
  addStudent,
  deleteStudent,
  deactivateStudent,
  activateStudent,
  Group, 
  Student, 
  Mentor,
  StudentProgress,
  TeachingJournal
} from '../services/db';
import { masterGrades, masterSessions, getGradeForGroup, JUZ_30_SURAHS } from '../services/curriculumData';
import { recordSuccessfulScan } from '../services/scanHistory';
import { getMeetingRealDate, formatShortDateID } from '../services/academicCalendar';
import { getAcademicHolidays, subscribeAcademicHolidays, AcademicHoliday } from '../services/db/calendar';

export function LiveSession() {
  const { currentUser, userData, userRole } = useAuth();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  
  // Real meeting counter & edit mode state
  const [meetingNumber, setMeetingNumber] = useState<number>(1);
  const [completedMeetingCount, setCompletedMeetingCount] = useState<number>(0);
  const [completedSessionIds, setCompletedSessionIds] = useState<string[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [showTahapDropdown, setShowTahapDropdown] = useState<boolean>(false);

  // Editing existing meeting state
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [groupJournals, setGroupJournals] = useState<TeachingJournal[]>([]);
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

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, type: 'success' | 'error' | 'warning' | 'info', message: string, description?: string }>({ show: false, type: 'success', message: '' });
  
  // States for unified data
  const [attendance, setAttendance] = useState<Record<string, { status: string, notes: string }>>({});
  const [progress, setProgress] = useState<Record<string, Partial<StudentProgress>>>({});
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  
  // Journal states
  const [journalMaterial, setJournalMaterial] = useState('');
  const [journalPages, setJournalPages] = useState('');
  const [journalObstacles, setJournalObstacles] = useState('');
  const [journalNextPlan, setJournalNextPlan] = useState('');

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // States for Mentor Add & Manage/Delete Student
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState<{
    name: string;
    nis: string;
    class: string;
    gender: 'L' | 'P';
  }>({
    name: '',
    nis: '',
    class: '7A',
    gender: 'L',
  });
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [actionStudent, setActionStudent] = useState<Student | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [groupsData, mentorsData] = await Promise.all([
          getGroups(),
          getMentors()
        ]);
        
        let mentorAssignedGroups = groupsData;
        
        if (isMentor) {
          const userEmailLower = currentUser?.email?.toLowerCase();
          const matchedMentor = mentorsData.find(
            m => (userData?.id && m.id === userData.id) ||
                 (currentUser?.uid && m.id === currentUser.uid) ||
                 (userEmailLower && m.email?.toLowerCase() === userEmailLower) ||
                 (userData?.groupId && m.groupId === userData.groupId)
          );
          
          const mentorId = matchedMentor?.id || userData?.id || currentUser?.uid;
          const assignedGroupId = matchedMentor?.groupId || userData?.groupId;
          
          const matched = groupsData.filter(g => 
            g.mentorId === mentorId || 
            (assignedGroupId && g.id === assignedGroupId)
          );
          
          if (matched.length > 0) {
            mentorAssignedGroups = matched;
          }
        }
        
        setGroups(mentorAssignedGroups);
        
        if (mentorAssignedGroups.length > 0) {
          setSelectedGroup(mentorAssignedGroups[0].id);
        }
      } catch (error) {
        console.error("Error loading groups:", error);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [userRole, userData, currentUser, isMentor]);

  const currentGroupObj = groups.find(g => g.id === selectedGroup);
  const currentGradeObj = getGradeForGroup(currentGroupObj);
  const currentGradeId = currentGradeObj.id;
  const availableSessions = masterSessions.filter(s => s.gradeId === currentGradeId && s.semester === selectedSemester);

  // Auto-sync available sessions and select default active Tahap if none selected
  useEffect(() => {
    if (availableSessions.length > 0) {
      const valid = selectedSessionIds.filter(id => availableSessions.some(s => s.id === id));
      if (valid.length > 0) {
        setSelectedSessionIds(valid);
      } else {
        const defaultSession = availableSessions.find(s => s.sessionNumber === 2) || availableSessions[0];
        setSelectedSessionIds([defaultSession.id]);
      }
    }
  }, [selectedGroup, currentGradeId, selectedSemester]);

  // Sync meeting data for a specific meeting number
  const syncMeetingData = (targetMeetingNum: number, journals: TeachingJournal[] = groupJournals) => {
    setMeetingNumber(targetMeetingNum);

    const matchedJournal = journals.find(j => 
      j.meetingNumber === targetMeetingNum ||
      (targetMeetingNum === 1 && (j.id === 'journal_seed_1' || j.id === 'journal_seed_3' || j.sessionId === 'session_1')) ||
      (targetMeetingNum === 2 && (j.id === 'journal_seed_2' || j.id === 'journal_seed_4' || j.sessionId === 'session_2'))
    );

    if (matchedJournal) {
      setEditingJournalId(matchedJournal.id);
      if (matchedJournal.date) {
        setSelectedDate(matchedJournal.date);
      }

      // Sync Tahap Kurikulum based on matched journal or meeting number
      let targetSessIds: string[] = [];
      if (matchedJournal.sessionIds && Array.isArray(matchedJournal.sessionIds)) {
        targetSessIds = matchedJournal.sessionIds.filter(id => availableSessions.some(s => s.id === id));
      }
      if (targetSessIds.length === 0 && matchedJournal.sessionId) {
        if (availableSessions.some(s => s.id === matchedJournal.sessionId)) {
          targetSessIds = [matchedJournal.sessionId];
        }
      }

      // Fallback matching by sessionNumber (e.g. meeting 1 -> sessionNumber 1, meeting 2 -> sessionNumber 2)
      if (targetSessIds.length === 0) {
        const sessByNum = availableSessions.find(s => s.sessionNumber === targetMeetingNum);
        if (sessByNum) {
          targetSessIds = [sessByNum.id];
        } else if (availableSessions.length > 0) {
          targetSessIds = [availableSessions[0].id];
        }
      }

      if (targetSessIds.length > 0) {
        setSelectedSessionIds(targetSessIds);
      }

      setJournalMaterial(matchedJournal.materialTaught || '');
      setJournalPages(matchedJournal.pagesCovered || '');
      setJournalObstacles(matchedJournal.studentObstacles || '');
      setJournalNextPlan(matchedJournal.nextPlan || '');
    } else {
      // New meeting number
      setEditingJournalId(null);
      const fallbackRealDate = getMeetingRealDate(targetMeetingNum);
      setSelectedDate(fallbackRealDate || new Date().toISOString().split('T')[0]);

      const targetSess = availableSessions.find(s => s.sessionNumber === targetMeetingNum);
      if (targetSess) {
        setSelectedSessionIds([targetSess.id]);
      } else if (availableSessions.length > 0) {
        const nextUnfinished = availableSessions.find(s => !completedSessionIds.includes(s.id)) || availableSessions[0];
        setSelectedSessionIds([nextUnfinished.id]);
      }

      setJournalMaterial('');
      setJournalPages('');
      setJournalObstacles('');
      setJournalNextPlan('');
    }
  };

  // Load Group Journals history to determine meeting count & completed Tahaps
  const loadGroupJournalStats = async () => {
    if (!selectedGroup) return;
    try {
      const res = await getTeachingJournals(selectedGroup, 100);
      const journals = res.data || [];
      setGroupJournals(journals);
      
      // 1. Identify completed Tahap IDs
      const finishedSet = new Set<string>();
      journals.forEach(j => {
        if (j.sessionId) finishedSet.add(j.sessionId);
        if (j.sessionIds && Array.isArray(j.sessionIds)) {
          j.sessionIds.forEach(id => finishedSet.add(id));
        }
      });

      // Add seed completed Tahaps for Semester 1 (Tahap 1 & 2) if first time
      if (finishedSet.size === 0 && selectedSemester === 1) {
        masterSessions
          .filter(s => s.semester === 1 && s.sessionNumber <= 2 && s.gradeId === currentGradeId)
          .forEach(s => finishedSet.add(s.id));
      }

      setCompletedSessionIds(Array.from(finishedSet));

      // 2. Calculate count of completed meetings so far
      const maxMeetingNum = journals.reduce((max, j) => Math.max(max, j.meetingNumber || 0), 0);
      const count = Math.max(journals.length, maxMeetingNum, finishedSet.size);
      setCompletedMeetingCount(count);

      // Auto-sync meeting data
      const activeMeetingNum = editingJournalId 
        ? meetingNumber 
        : (count + 1);

      syncMeetingData(activeMeetingNum, journals);
    } catch (err) {
      console.error("Error loading journal stats:", err);
    }
  };

  useEffect(() => {
    loadGroupJournalStats();
  }, [selectedGroup, selectedSemester, currentGradeId]);

  // Load Session Data for students, attendance, & progress (Synced with meetingNumber)
  useEffect(() => {
    async function loadSessionData() {
      if (!selectedGroup) return;
      setLoading(true);
      try {
        const rawStds = await getStudentsByGroup(selectedGroup);
        const stds = sortStudents(rawStds);
        setStudents(stds);
        
        // 1. Load Attendance for Meeting Number & Date (Default 'Alpa' for new unrecorded meetings)
        const attendanceRecords = await getStudentAttendance(selectedGroup, selectedDate, meetingNumber);
        const newAtt: Record<string, { status: string, notes: string }> = {};
        stds.forEach(s => {
          const rec = attendanceRecords.find(r => r.studentId === s.id);
          newAtt[s.id] = rec ? { status: rec.status, notes: rec.notes || '' } : { status: 'Alpa', notes: '' };
        });
        setAttendance(newAtt);
        
        // 2. Load Progress for Meeting Number & Sync with Attendance Status
        const primarySessionId = selectedSessionIds[0] || `session_${meetingNumber}`;
        const progRecords = await getStudentProgressByMeeting(selectedGroup, meetingNumber, primarySessionId);
        const newProg: Record<string, Partial<StudentProgress>> = {};
        stds.forEach(s => {
          const pr = progRecords.find(p => p.studentId === s.id);
          const attStatus = newAtt[s.id]?.status || 'Alpa';

          // Preserve any saved or baseline values for restoration when student is marked Hadir
          const savedR = (pr?.reading && pr.reading > 0) ? pr.reading : 0;
          const savedT = (pr?.tajwid && pr.tajwid > 0) ? pr.tajwid : 0;
          const savedW = (pr?.writing && pr.writing > 0) ? pr.writing : 0;
          const savedM = currentGradeId === 'grade3' ? ((pr?.memorization && pr.memorization > 0) ? pr.memorization : 0) : 0;

          if (attStatus !== 'Hadir') {
            // Absent students (default Alpa/Izin/Sakit) automatically receive 0 progress scores for this meeting
            newProg[s.id] = {
              ...(pr || {}),
              reading: 0,
              tajwid: 0,
              memorization: 0,
              writing: 0,
              total: 0,
              _savedReading: savedR,
              _savedTajwid: savedT,
              _savedWriting: savedW,
              _savedMemorization: savedM,
            } as any;
          } else {
            // Present students load saved progress or default base score 0
            newProg[s.id] = pr || { 
              reading: savedR, 
              tajwid: savedT, 
              memorization: savedM, 
              writing: savedW,
              total: 0,
              _savedReading: savedR,
              _savedTajwid: savedT,
              _savedWriting: savedW,
              _savedMemorization: savedM,
            } as any;
          }
        });
        setProgress(newProg);
        
      } catch (error) {
        console.error("Error loading session data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSessionData();
  }, [selectedGroup, selectedDate, selectedSessionIds, meetingNumber]);

  // Handle Attendance Change with automatic Progress sync based on meetingNumber
  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));

    setProgress(prev => {
      const current = (prev[studentId] || {}) as any;
      if (status !== 'Hadir') {
        // Cache current non-zero scores before zeroing out
        const savedR = (current.reading && current.reading > 0) ? current.reading : (current._savedReading || 0);
        const savedT = (current.tajwid && current.tajwid > 0) ? current.tajwid : (current._savedTajwid || 0);
        const savedW = (current.writing && current.writing > 0) ? current.writing : (current._savedWriting || 0);
        const savedM = (current.memorization && current.memorization > 0) ? current.memorization : (current._savedMemorization || 0);

        // Automatically zero out progress for absent students in this meeting
        return {
          ...prev,
          [studentId]: {
            ...current,
            reading: 0,
            tajwid: 0,
            writing: 0,
            memorization: 0,
            total: 0,
            _savedReading: savedR,
            _savedTajwid: savedT,
            _savedWriting: savedW,
            _savedMemorization: savedM,
          }
        };
      } else {
        // Restore previous scores or standard base score (0) if returning to Hadir
        const r = (current.reading && current.reading > 0) ? current.reading : (current._savedReading || 0);
        const t = (current.tajwid && current.tajwid > 0) ? current.tajwid : (current._savedTajwid || 0);
        const w = (current.writing && current.writing > 0) ? current.writing : (current._savedWriting || 0);
        const m = currentGradeId === 'grade3' 
          ? ((current.memorization && current.memorization > 0) ? current.memorization : (current._savedMemorization || 0)) 
          : 0;
        
        const scores: number[] = [];
        if (currentGradeId === 'grade3' && r > 0) scores.push(r);
        if (t > 0) scores.push(t);
        if (w > 0) scores.push(w);
        const calculatedTotal = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return {
          ...prev,
          [studentId]: {
            ...current,
            reading: r,
            tajwid: t,
            writing: w,
            memorization: m,
            total: calculatedTotal
          }
        };
      }
    });
  };

  const handleProgressChange = (studentId: string, field: keyof StudentProgress, value: any) => {
    setProgress(prev => {
      const current = prev[studentId] || {};
      const updated = {
        ...current,
        [field]: value
      };
      
      const scores: number[] = [];
      const r = typeof updated.reading === 'number' ? updated.reading : parseInt(updated.reading as any) || 0;
      const t = typeof updated.tajwid === 'number' ? updated.tajwid : parseInt(updated.tajwid as any) || 0;
      const w = typeof updated.writing === 'number' ? updated.writing : parseInt(updated.writing as any) || 0;
      
      if (currentGradeId === 'grade3') {
        if (r > 0) scores.push(r);
      }
      if (t > 0) scores.push(t);
      if (w > 0) scores.push(w);

      const calculatedTotal = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      updated.total = calculatedTotal;

      return {
        ...prev,
        [studentId]: updated
      };
    });
  };

  const setAllAttendance = (status: string) => {
    setAttendance(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], status };
      });
      return next;
    });

    setProgress(prev => {
      const nextProg = { ...prev };
      students.forEach(s => {
        const current = (nextProg[s.id] || {}) as any;
        if (status !== 'Hadir') {
          const savedR = (current.reading && current.reading > 0) ? current.reading : (current._savedReading || 0);
          const savedT = (current.tajwid && current.tajwid > 0) ? current.tajwid : (current._savedTajwid || 0);
          const savedW = (current.writing && current.writing > 0) ? current.writing : (current._savedWriting || 0);
          const savedM = (current.memorization && current.memorization > 0) ? current.memorization : (current._savedMemorization || 0);

          nextProg[s.id] = {
            ...current,
            reading: 0,
            tajwid: 0,
            writing: 0,
            memorization: 0,
            total: 0,
            _savedReading: savedR,
            _savedTajwid: savedT,
            _savedWriting: savedW,
            _savedMemorization: savedM,
          };
        } else {
          const r = (current.reading && current.reading > 0) ? current.reading : (current._savedReading || 0);
          const t = (current.tajwid && current.tajwid > 0) ? current.tajwid : (current._savedTajwid || 0);
          const w = (current.writing && current.writing > 0) ? current.writing : (current._savedWriting || 0);
          const m = currentGradeId === 'grade3' 
            ? ((current.memorization && current.memorization > 0) ? current.memorization : (current._savedMemorization || 0)) 
            : 0;
          
          const scores: number[] = [];
          if (currentGradeId === 'grade3' && r > 0) scores.push(r);
          if (t > 0) scores.push(t);
          if (w > 0) scores.push(w);
          const calculatedTotal = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

          nextProg[s.id] = {
            ...current,
            reading: r,
            tajwid: t,
            writing: w,
            memorization: m,
            total: calculatedTotal
          };
        }
      });
      return nextProg;
    });
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      const parts = decodedText.split('/');
      const scannedId = parts[parts.length - 1];
      
      const foundStudent = students.find(s => s.id === scannedId);
      if (foundStudent) {
        setAttendance(prev => ({
          ...prev,
          [scannedId]: { ...prev[scannedId], status: 'Hadir' }
        }));

        // Record successful scan in current session's attendance history
        try {
          const currentGroupObj = groups.find(g => g.id === selectedGroup);
          recordSuccessfulScan({
            studentId: foundStudent.id,
            studentName: foundStudent.name,
            studentNis: foundStudent.nis,
            studentClass: foundStudent.class,
            groupName: currentGroupObj?.name || 'Kelompok BTQ',
            status: 'Hadir',
            verificationStatus: 'Terverifikasi QR',
            mentorEmail: currentUser?.email,
            method: 'QR_SCAN'
          }, currentUser?.email);
        } catch (e) {
          console.warn('Failed to record scan in session history', e);
        }
        
        // Play success beep using Web Audio API
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          }
        } catch (audioErr) {
          console.warn("Audio feedback failed");
        }

        // Ensure progress is also restored/set for Hadir
        setProgress(prev => {
          const nextProg = { ...prev };
          const current = (nextProg[scannedId] || {}) as any;
          const r = (current.reading && current.reading > 0) ? current.reading : (current._savedReading || 0);
          const t = (current.tajwid && current.tajwid > 0) ? current.tajwid : (current._savedTajwid || 0);
          const w = (current.writing && current.writing > 0) ? current.writing : (current._savedWriting || 0);
          const m = currentGradeId === 'grade3' 
            ? ((current.memorization && current.memorization > 0) ? current.memorization : (current._savedMemorization || 0)) 
            : 0;
          
          const scores: number[] = [];
          if (currentGradeId === 'grade3' && r > 0) scores.push(r);
          if (t > 0) scores.push(t);
          if (w > 0) scores.push(w);
          const calculatedTotal = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

          nextProg[scannedId] = {
            ...current,
            reading: r,
            tajwid: t,
            writing: w,
            memorization: m,
            total: calculatedTotal
          };
          return nextProg;
        });
      } else {
        // Find out which group the student belongs to
        try {
          const allStudents = await getStudents();
          const trueStudent = allStudents.find(s => s.id === scannedId);
          if (trueStudent) {
            const allGroups = await getGroups();
            const trueGroup = allGroups.find(g => g.id === trueStudent.groupId);
            
            // Play error beep
            try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.setValueAtTime(100, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
              }
            } catch(e) {}

            return "TIDAK VALID: " + trueStudent.name + " berada di " + (trueGroup ? trueGroup.name : "Kelompok lain") + ".";
          } else {
            return "QR Code tidak dikenali atau siswa tidak terdaftar.";
          }
        } catch (dbErr) {
          return "Siswa tidak terdaftar di kelompok ini.";
        }
      }
    } catch (e) {
      console.warn("Invalid QR code format");
      return "Format QR Code tidak valid.";
    }
  };

  const toggleTahapSelection = (sessionId: string) => {
    setSelectedSessionIds(prev => {
      if (prev.includes(sessionId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedGroup || students.length === 0 || selectedSessionIds.length === 0) return;
    setSaving(true);
    
    try {
      // 1. Prepare Attendance (synced with meetingNumber)
      const attToSave = students.map(s => ({
        studentId: s.id,
        groupId: selectedGroup,
        date: selectedDate,
        meetingNumber: meetingNumber,
        status: attendance[s.id]?.status || 'Alpa',
        notes: attendance[s.id]?.notes || ''
      }));
      
      // 2. Prepare Progress for each selected Tahap (synced with meetingNumber)
      const progsToSave: StudentProgress[] = [];
      for (const sessId of selectedSessionIds) {
        for (const s of students) {
          const p = progress[s.id];
          if (p) {
            progsToSave.push({
              id: p.id,
              studentId: s.id,
              groupId: selectedGroup,
              sessionId: sessId,
              meetingNumber: meetingNumber,
              semester: selectedSemester,
              date: selectedDate,
              reading: p.reading || 0,
              tajwid: p.tajwid || 0,
              memorizedSurah: p.memorizedSurah || '',
              memorization: p.memorization || 0,
              writing: p.writing || 0,
              total: p.total || 0,
            });
          }
        }
      }

      // 3. Construct multi-stage title & Prepare Journal (Update if editing, create if new)
      const mentorName = userData?.name || currentUser?.displayName || 'Mentor';
      const selectedTahapObjects = availableSessions.filter(s => selectedSessionIds.includes(s.id));
      const sessionTitleStr = selectedTahapObjects.map(s => `Tahap ${s.sessionNumber}: ${s.topic}`).join(' & ');

      const journalObj: TeachingJournal = {
        id: editingJournalId || undefined,
        groupId: selectedGroup,
        groupName: currentGroupObj?.name || '',
        mentorId: currentGroupObj?.mentorId || '',
        mentorName,
        date: selectedDate,
        meetingNumber: meetingNumber,
        sessionId: selectedSessionIds[0],
        sessionIds: selectedSessionIds,
        sessionTitle: sessionTitleStr,
        materialTaught: journalMaterial || 'Materi Sesuai Silabus Kurikulum',
        pagesCovered: journalPages,
        studentObstacles: journalObstacles,
        nextPlan: journalNextPlan,
        createdAt: new Date().toISOString()
      };

      // 4. Execute atomic batch writes concurrently for instant save (reduced from 80+ roundtrips to 3)
      await Promise.all([
        saveStudentAttendance(attToSave),
        saveMultipleStudentProgress(progsToSave),
        saveTeachingJournal(journalObj)
      ]);
      
      // Reload stats to reflect changes in meeting list
      await loadGroupJournalStats();

      // 4. Notifications
      const isEdit = !!editingJournalId;
      await createNotification({
        title: `Pertemuan Ke-${meetingNumber} (${currentGroupObj?.name}) ${isEdit ? 'Diperbarui' : 'Selesai'}`,
        message: `${mentorName} telah ${isEdit ? 'memperbarui' : 'menyelesaikan'} input Absensi, Progress (${sessionTitleStr}), dan Jurnal Mengajar.`,
        type: 'success',
        targetRole: 'all',
        link: '/session',
        readBy: [userData?.id || currentUser?.uid || ''].filter(Boolean),
        createdAt: new Date().toISOString(),
        createdBy: mentorName
      });

      setToast({ 
        show: true, 
        type: 'success', 
        message: isEdit ? `Perubahan Pertemuan Ke-${meetingNumber} Berhasil Diperbarui!` : `Pertemuan Ke-${meetingNumber} Berhasil Disimpan!`,
        description: `Absensi, Progress & Jurnal tercatat.` 
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('attendance-updated'));
        window.dispatchEvent(new CustomEvent('progress-updated'));
        window.dispatchEvent(new CustomEvent('journal-updated'));
        window.dispatchEvent(new CustomEvent('db-cache-invalidated', { detail: { keyPrefix: '' } }));
      }
      
    } catch (error) {
      console.error("Error saving live session:", error);
      setToast({ show: true, type: 'error', message: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan data sesi mengajar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendWA = (student: Student, status: string, progressData?: any) => {
    let text = `Assalamu'alaikum Wr. Wb. Menginformasikan bahwa ananda ${student.name} pada kegiatan BTQ hari ini berstatus ${status}.`;
    
    if (status === 'Hadir') {
      text = `Assalamu'alaikum Wr. Wb. Menginformasikan perkembangan KBM BTQ ananda ${student.name} hari ini.\n\n`;
      text += `Catatan Penilaian:\n`;
      text += `- Membaca: ${progressData?.reading || 0}\n`;
      text += `- Tajwid: ${progressData?.tajwid || 0}\n`;
      if (progressData?.memorization !== undefined) {
        text += `- Tahfidz: ${progressData?.memorization || 0}\n`;
      }
      text += `\nKami mohon bantuan motivasi dari ayah/bunda agar ananda lebih semangat belajar dan menghafal. Terima kasih.`;
    } else {
      text += `\n\nMohon kerja sama ayah/bunda untuk memastikan kehadiran dan kelancaran kegiatan belajar ananda. Terima kasih.`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Helper reload students after CRUD operations in LiveSession
  const reloadSessionStudents = async () => {
    if (!selectedGroup) return;
    const stds = await getStudentsByGroup(selectedGroup, true);
    const sorted = sortStudents(stds);
    setStudents(sorted);
    return sorted;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      setToast({ show: true, type: 'error', message: 'Pilih kelompok terlebih dahulu' });
      return;
    }
    const trimmedName = newStudentForm.name.trim();
    if (!trimmedName) return;

    setIsSubmittingStudent(true);
    try {
      const generatedNis = newStudentForm.nis.trim() || `102${String(Math.floor(1000 + Math.random() * 9000))}`;
      const newId = await addStudent({
        name: trimmedName,
        nis: generatedNis,
        class: newStudentForm.class,
        gender: newStudentForm.gender,
        groupId: selectedGroup,
        status: 'Aktif'
      });

      // Default attendance to 'Hadir' and initial progress
      setAttendance(prev => ({
        ...prev,
        [newId]: { status: 'Hadir', notes: '' }
      }));

      setProgress(prev => ({
        ...prev,
        [newId]: {
          reading: 80,
          tajwid: 80,
          writing: 80,
          memorization: currentGradeId === 'grade3' ? 80 : 0,
          total: 80
        }
      }));

      await reloadSessionStudents();

      setToast({
        show: true,
        type: 'success',
        message: 'Santri Baru Berhasil Ditambahkan',
        description: `Santri "${trimmedName}" telah terdaftar ke kelompok ini dan tersinkronisasi ke Firebase.`
      });

      // Reset form
      setNewStudentForm({
        name: '',
        nis: '',
        class: '7A',
        gender: 'L'
      });
      setIsAddStudentOpen(false);
    } catch (err: any) {
      console.error("Error adding student in live session:", err);
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Menambahkan Santri',
        description: err?.message || 'Terjadi kendala saat menyimpan santri ke database cloud Firestore.'
      });
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleDeactivateStudent = async (student: Student) => {
    setIsActionLoading(true);
    try {
      await deactivateStudent(student.id);
      await reloadSessionStudents();
      setActionStudent(null);
      setToast({
        show: true,
        type: 'success',
        message: 'Santri Berhasil Dinonaktifkan',
        description: `Santri "${student.name}" telah dinonaktifkan dan disembunyikan dari sesi mengajar ini. Data tersinkron ke Firebase.`
      });
    } catch (err: any) {
      console.error("Error deactivating student:", err);
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Menonaktifkan Santri',
        description: err?.message || 'Terjadi kesalahan saat memperbarui status santri di Firebase.'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleActivateStudent = async (student: Student) => {
    setIsActionLoading(true);
    try {
      await activateStudent(student.id);
      await reloadSessionStudents();
      setActionStudent(null);
      setToast({
        show: true,
        type: 'success',
        message: 'Santri Berhasil Diaktifkan Kembali',
        description: `Santri "${student.name}" telah diaktifkan kembali di kelompok ini.`
      });
    } catch (err: any) {
      console.error("Error activating student:", err);
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Mengaktifkan Santri',
        description: err?.message || 'Terjadi kesalahan saat memperbarui status santri di Firebase.'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePermanentDeleteStudent = async (student: Student) => {
    setIsActionLoading(true);
    try {
      await deleteStudent(student.id);
      
      // Clean local attendance and progress states
      setAttendance(prev => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
      setProgress(prev => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });

      await reloadSessionStudents();
      setActionStudent(null);
      setToast({
        show: true,
        type: 'success',
        message: 'Santri Berhasil Dihapus Permanen',
        description: `Data santri "${student.name}" telah dihapus permanen dari database Firebase.`
      });
    } catch (err: any) {
      console.error("Error deleting student:", err);
      setToast({
        show: true,
        type: 'error',
        message: 'Gagal Menghapus Santri',
        description: err?.message || 'Terjadi kesalahan saat menghapus data santri dari Firebase.'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const selectedTahapObjects = availableSessions.filter(s => selectedSessionIds.includes(s.id));

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] rounded-3xl p-6 lg:p-8 text-white shadow-md border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-100 text-xs font-bold mb-3 border border-white/10">
            <BookOpen size={14} className="text-[#C99A2E]" /> Manajemen Kelas & Sesi Mengajar
          </div>
          <h1 className={theme.typography.h1.replace('text-[#172033]', 'text-white')}>
            Sesi Mengajar Terpadu
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
            Merekam absensi, capaian Tahap kurikulum, dan jurnal pertemuan secara fleksibel. Bisa membuat pertemuan baru atau mengedit pertemuan lalu tanpa menambah jumlah pertemuan.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="relative z-10 bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-md flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#C99A2E] text-slate-950 flex items-center justify-center font-black">
            <Hash size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-300 font-extrabold uppercase block tracking-wider">
              Total Pertemuan Kelompok
            </span>
            <div className="text-lg font-black text-white">
              {completedMeetingCount} Pertemuan Terlaksana
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN-ONLY CURRICULUM CONSISTENCY ALERT */}
      <CurriculumSyncAlert groupIdFilter={selectedGroup} />

      {/* Configuration Cards */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Kelompok */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Kelompok Binaan</label>
            <Select 
              value={selectedGroup} 
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setEditingJournalId(null);
              }} 
              className="w-full font-bold text-xs h-12 bg-slate-50 border-transparent focus:bg-white focus:border-slate-200"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </div>

          {/* Tanggal Sesi */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Tanggal Kegiatan</label>
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-12 font-bold text-xs"
            />
          </div>

          {/* Pertemuan Ke- (Auto Sync) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Pertemuan Ke-</label>
              <span className="text-[10px] text-[#0362D0] font-extrabold">
                {completedMeetingCount}x Selesai
              </span>
            </div>
            <Select
              value={meetingNumber.toString()}
              onChange={(e) => syncMeetingData(parseInt(e.target.value) || 1)}
              className={cn(
                "h-12 font-black text-xs cursor-pointer",
                editingJournalId ? "bg-orange-50 text-orange-800 border-orange-300 font-extrabold" : "text-[#0362D0]"
              )}
            >
              {Array.from({ length: 32 }, (_, i) => i + 1).map((num) => {
                const isCompleted = num <= completedMeetingCount || groupJournals.some(j => j.meetingNumber === num || (num === 1 && j.id === 'journal_seed_1') || (num === 2 && j.id === 'journal_seed_2'));
                const mDate = getMeetingRealDate(num, groupJournals, holidays);
                const dateLabel = mDate ? `(${formatShortDateID(mDate)}) ` : '';
                return (
                  <option key={num} value={num}>
                    Pertemuan Ke-{num} {dateLabel}{isCompleted ? `(Selesai - Edit)` : num === completedMeetingCount + 1 ? `(Pertemuan Baru)` : ''}
                  </option>
                );
              })}
            </Select>
          </div>

          {/* Semester */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Semester</label>
            <Select value={selectedSemester.toString()} onChange={(e) => setSelectedSemester(parseInt(e.target.value))} className="w-full font-bold text-xs h-12 bg-slate-50 border-transparent focus:bg-white focus:border-slate-200">
              <option value="1">Semester 1 (Tahap 1 – 16)</option>
              <option value="2">Semester 2 (Tahap 17 – 32)</option>
            </Select>
          </div>

          {/* Tahap Kurikulum / Silabus (Multi-Select Popup) */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Tahap Kurikulum</label>
              <span className="text-[10px] text-amber-600 font-extrabold">Bisa Pilih &gt;1</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTahapDropdown(!showTahapDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold text-[#172033] h-12 transition-colors cursor-pointer text-left"
            >
              <span className="truncate pr-1">
                {selectedTahapObjects.length === 0 ? 'Pilih Tahap...' :
                 selectedTahapObjects.length === 1 ? `Tahap ${selectedTahapObjects[0].sessionNumber}: ${selectedTahapObjects[0].topic}` :
                 `${selectedTahapObjects.length} Tahap: ${selectedTahapObjects.map(s => 'Tahap ' + s.sessionNumber).join(', ')}`}
              </span>
              <ChevronDown size={14} className="text-slate-500 shrink-0" />
            </button>

            {/* Dropdown Multi-Select Menu */}
            <AnimatePresence>
              {showTahapDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-1 w-full sm:w-[380px] bg-white border border-slate-100 rounded-2xl shadow-xl p-3 max-h-80 overflow-y-auto divide-y divide-slate-100"
                >
                  <div className="text-[10px] font-black uppercase text-slate-400 pb-2 px-1 flex justify-between items-center">
                    <span>Pilih Tahap Kurikulum</span>
                    <button 
                      type="button"
                      onClick={() => setShowTahapDropdown(false)}
                      className="text-[#0362D0] hover:underline cursor-pointer font-bold"
                    >
                      Selesai ✕
                    </button>
                  </div>
                  <div className="pt-2 space-y-1">
                    {availableSessions.map((s, idx) => {
                      const isSelected = selectedSessionIds.includes(s.id);
                      const isFinished = completedSessionIds.includes(s.id);
                      return (
                        <label 
                          key={`avail_session_${s.id}_${idx}`} 
                          className={cn(
                            "flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors",
                            isSelected ? "bg-[#0362D0]/10 text-[#0362D0] font-bold" : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTahapSelection(s.id)}
                            className="mt-0.5 rounded text-[#0362D0] focus:ring-[#0362D0] w-4 h-4 cursor-pointer"
                          />
                          <div className="flex-1 text-xs">
                            <div className="font-extrabold flex items-center justify-between gap-1">
                              <span>Tahap {s.sessionNumber}: {s.topic}</span>
                              {isFinished && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded flex items-center gap-1 shrink-0 ml-1">
                                  <CheckCircle size={10} /> Selesai
                                </span>
                              )}
                            </div>
                            {s.pageRef && (
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">Materi: Hal. {s.pageRef}</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Selected Tahap Summary Chips */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
        <span className="text-xs font-black text-[#172033] flex items-center gap-1.5">
          <CheckSquare size={14} className="text-[#0362D0]" /> Tahap Terpilih Hari Ini:
        </span>
        <AnimatePresence mode="popLayout">
          {selectedTahapObjects.map((s, idx) => (
            <motion.span 
              key={`selected_session_${s.id}_${idx}`}
              initial={{ opacity: 0, scale: 0.8, x: -6 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 6 }}
              transition={{ duration: 0.2 }}
              className="px-3 py-1 bg-white text-[#0362D0] border border-[#0362D0]/30 rounded-xl text-xs font-black shadow-2xs flex items-center gap-1.5"
            >
              Tahap {s.sessionNumber}: {s.topic}
              {completedSessionIds.includes(s.id) && (
                <span className="text-[10px] text-emerald-600 font-bold">(Sudah Pernah)</span>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Banner Peringatan Hari Libur Terkonfirmasi */}
      {activeHoliday && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-3xl flex items-start gap-3.5 text-amber-950 shadow-xs animate-in fade-in">
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
              Tanggal ini telah ditandai sebagai hari libur resmi oleh Admin. Pembelajaran KBM dan presensi ditiadakan dan tidak diperhitungkan dalam evaluasi kehadiran santri. Sesi pertemuan telah otomatis digeser ke Sabtu berikutnya di Kalender Akademik.
            </p>
          </div>
        </div>
      )}

      {/* Main Student List with Smooth Transition */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={`session_${meetingNumber}_${selectedSessionIds.join('_')}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden"
        >
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-extrabold text-[#172033] text-sm sm:text-base">Daftar Santri & Evaluasi KBM</h3>
                <span className="text-[10px] font-bold bg-[#0362D0]/10 text-[#0362D0] px-2.5 py-0.5 rounded-full border border-[#0362D0]/20">
                  Materi: {currentGradeObj.programName}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pertemuan Ke-<strong>{meetingNumber}</strong> • Target: <strong className="text-[#172033]">{selectedTahapObjects.map(s => `Tahap ${s.sessionNumber}`).join(', ')}</strong> • {currentGradeId === 'grade3' ? 'Penilaian tahsin & hafalan Juz 30' : 'Materi seragam tilawati & tajwid'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Search Filter */}
              <div className="relative flex-1 sm:w-56 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama / NIS..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:ring-2 focus:ring-[#0362D0] outline-none"
                />
              </div>

              {/* Tombol Tambah Santri Kelompok Binaan */}
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(true)}
                className="px-3.5 py-2 bg-[#0362D0] hover:bg-[#0250AA] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-sm"
                title="Tambah santri baru khusus ke kelompok binaan ini"
              >
                <PlusCircle size={15} />
                <span className="whitespace-nowrap">Tambah Santri</span>
              </button>

              <button 
                onClick={() => setShowScanner(true)} 
                className="px-3.5 py-2 bg-[#172033] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Camera size={14} /> Scan
              </button>
              <button 
                onClick={() => setAllAttendance('Hadir')} 
                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                title="Tandai semua santri hadir"
              >
                <Check size={14} /> Semua Hadir
              </button>
              <button 
                onClick={() => setAllAttendance('Alpa')} 
                className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                title="Tandai semua santri Alpa (default tidak hadir)"
              >
                <X size={14} /> Semua Alpa
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <StudentTableSkeleton rowCount={6} variant="attendance" />
            </div>
          ) : students.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Users size={40} className="mx-auto mb-3 text-slate-300" />
              <h4 className="text-base font-extrabold text-[#172033]">Belum ada santri di kelompok ini</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Silakan tambahkan santri binaan baru untuk kelompok ini langsung dari sesi mengajar.
              </p>
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(true)}
                className="mt-4 px-4 py-2.5 bg-[#0362D0] hover:bg-[#0250AA] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>+ Tambah Santri Pertama</span>
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {students
                .filter(st => {
                  if (!studentSearch.trim()) return true;
                  const query = studentSearch.toLowerCase();
                  return st.name.toLowerCase().includes(query) || (st.nis && st.nis.toLowerCase().includes(query));
                })
                .map((student, idx) => {
                  const currentStatus = attendance[student.id]?.status || 'Alpa';
                  const p = progress[student.id] || {};
                  const isHadir = currentStatus === 'Hadir';
                  const scoreTotal = p.total ?? (isHadir ? 80 : 0);

                  const scoreBadge = !isHadir 
                    ? { label: currentStatus, color: 'bg-slate-100 text-slate-600 border-slate-200' }
                    : scoreTotal >= 85 
                    ? { label: `${scoreTotal}% • Sangat Baik`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                    : scoreTotal >= 75
                    ? { label: `${scoreTotal}% • Baik`, color: 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20' }
                    : { label: `${scoreTotal}% • Perlu Bimbingan`, color: 'bg-rose-50 text-rose-700 border-rose-200' };

                  return (
                    <div 
                      key={student.id} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 bg-white",
                        isHadir ? "border-slate-200/80 shadow-2xs hover:shadow-md hover:border-[#0362D0]/40" : "border-slate-100 bg-slate-50/60 opacity-80"
                      )}
                    >
                      {/* Top: Student Info & Quick WA */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                            isHadir ? "bg-[#0362D0]/10 text-[#0362D0]" : "bg-slate-200 text-slate-500"
                          )}>
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-black text-[#172033] text-sm leading-tight line-clamp-1">
                              {student.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black border border-slate-200">
                                Kelas {student.class}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {student.nis ? `NIS ${student.nis}` : 'Santri Aktif'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSendWA(student, currentStatus, p)}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                            title="Kirim Laporan WA ke Wali Santri"
                          >
                            <MessageCircle size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActionStudent(student)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Kelola / Hapus Santri dari Kelompok Ini"
                          >
                            <UserMinus size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Segmented Control for Attendance */}
                      <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/50">
                        {[
                          { label: 'Hadir', active: 'bg-emerald-600 text-white shadow-2xs' },
                          { label: 'Izin', active: 'bg-amber-500 text-white shadow-2xs' },
                          { label: 'Sakit', active: 'bg-blue-600 text-white shadow-2xs' },
                          { label: 'Alpa', active: 'bg-rose-600 text-white shadow-2xs' }
                        ].map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => handleAttendanceChange(student.id, opt.label)}
                            className={cn(
                              "flex-1 py-1 text-xs font-black rounded-lg transition-all text-center cursor-pointer",
                              currentStatus === opt.label 
                                ? opt.active 
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Score Summary & Action Drawer Trigger */}
                      {isHadir ? (
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] font-black uppercase text-slate-400">Evaluasi Sesi:</span>
                            <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black border", scoreBadge.color)}>
                              {scoreBadge.label}
                            </span>
                          </div>

                          {/* Mini Score Pills */}
                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            {currentGradeId === 'grade3' && (
                              <div className="p-1 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-[9px] text-slate-400 font-bold block">Baca</span>
                                <span className="text-xs font-black text-[#0362D0]">{p.reading ?? 0}</span>
                              </div>
                            )}
                            <div className="p-1 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-bold block">Tajwid</span>
                              <span className="text-xs font-black text-[#C99A2E]">{p.tajwid ?? 0}</span>
                            </div>
                            <div className="p-1 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-bold block">Tulis</span>
                              <span className="text-xs font-black text-slate-700">{p.writing ?? 0}</span>
                            </div>
                            {currentGradeId === 'grade3' && (
                              <div className="p-1 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-[9px] text-slate-400 font-bold block">Hafal</span>
                                <span className="text-xs font-black text-emerald-700">{p.memorization ?? 0}</span>
                              </div>
                            )}
                          </div>

                          {/* Tactile Button to Open Drawer */}
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForDrawer(student)}
                            className="w-full py-2 bg-gradient-to-r from-[#0362D0] to-[#0250AA] hover:from-[#0250AA] hover:to-[#013F88] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                          >
                            <Sliders size={13} />
                            <span>Input / Sesuaikan Nilai</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-100 text-center py-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            Presensi {currentStatus} • Nilai dinonaktifkan
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Student Score Input Drawer Component */}
      <StudentScoreDrawer
        isOpen={Boolean(selectedStudentForDrawer)}
        onClose={() => setSelectedStudentForDrawer(null)}
        student={selectedStudentForDrawer}
        progress={selectedStudentForDrawer ? (progress[selectedStudentForDrawer.id] || {}) : {}}
        status={selectedStudentForDrawer ? (attendance[selectedStudentForDrawer.id]?.status || 'Alpa') : 'Alpa'}
        onProgressChange={handleProgressChange}
        onStatusChange={handleAttendanceChange}
        currentGrade={currentGradeObj}
        meetingNumber={meetingNumber}
        studentIndex={selectedStudentForDrawer ? students.findIndex(s => s.id === selectedStudentForDrawer.id) : 0}
        totalStudents={students.length}
        hasPrev={selectedStudentForDrawer ? students.findIndex(s => s.id === selectedStudentForDrawer.id) > 0 : false}
        hasNext={selectedStudentForDrawer ? students.findIndex(s => s.id === selectedStudentForDrawer.id) < students.length - 1 : false}
        onPrevStudent={() => {
          if (!selectedStudentForDrawer) return;
          const idx = students.findIndex(s => s.id === selectedStudentForDrawer.id);
          if (idx > 0) setSelectedStudentForDrawer(students[idx - 1]);
        }}
        onNextStudent={() => {
          if (!selectedStudentForDrawer) return;
          const idx = students.findIndex(s => s.id === selectedStudentForDrawer.id);
          if (idx < students.length - 1) setSelectedStudentForDrawer(students[idx + 1]);
        }}
        onSendWA={(st, stStatus, stProg) => handleSendWA(st, stStatus, stProg)}
      />

      {/* Journal Section with Smooth Motion */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={`journal_${meetingNumber}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, delay: 0.05, ease: "easeOut" }}
          className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden mt-2"
        >
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="font-extrabold text-[#172033] text-sm sm:text-base">Jurnal Mengajar & Catatan Sesi</h3>
            <p className="text-xs text-slate-500 mt-0.5">Dokumentasi materi, kendala, dan rencana target untuk Pertemuan Ke-{meetingNumber}.</p>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#172033] mb-1.5 uppercase tracking-wider">Materi yang Dibahas</label>
                <textarea 
                  value={journalMaterial}
                  onChange={e => setJournalMaterial(e.target.value)}
                  placeholder="Contoh: Pengenalan Makharijul Huruf, Praktik Tilawati Jilid 3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0362D0] outline-none min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#172033] mb-1.5 uppercase tracking-wider">Kendala / Catatan Santri</label>
                <textarea 
                  value={journalObstacles}
                  onChange={e => setJournalObstacles(e.target.value)}
                  placeholder="Contoh: Sebagian santri kesulitan membedakan huruf dzal dan zai..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0362D0] outline-none min-h-[80px]"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#172033] mb-1.5 uppercase tracking-wider">Pencapaian Halaman / Surat</label>
                <input 
                  value={journalPages}
                  onChange={e => setJournalPages(e.target.value)}
                  placeholder="Hal 20-25 / Al-Fatihah"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0362D0] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#172033] mb-1.5 uppercase tracking-wider">Rencana Tahap Berikutnya</label>
                <textarea 
                  value={journalNextPlan}
                  onChange={e => setJournalNextPlan(e.target.value)}
                  placeholder="Contoh: Lanjut ujian jilid 3 dan pengenalan hukum nun mati"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0362D0] outline-none min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Save Action (Positioned safely above mobile BottomNav) */}
      <div className="sticky bottom-20 sm:bottom-4 z-40 bg-white/95 backdrop-blur-xl border border-slate-100 p-3.5 sm:p-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="text-xs font-bold text-slate-600 text-center sm:text-left">
          {editingJournalId ? (
            <span className="text-orange-700 font-extrabold flex items-center gap-1.5">
              <Edit3 size={14} /> Memperbarui Data Pertemuan Ke-{meetingNumber} (Tanggal {selectedDate})
            </span>
          ) : (
            <span>Merekam data untuk <strong>Pertemuan Ke-{meetingNumber}</strong> ({selectedTahapObjects.length} Tahap Kurikulum Terpilih).</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || students.length === 0 || !!activeHoliday}
          className={cn(
            "w-full sm:w-auto px-8 py-3.5 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer",
            activeHoliday ? "bg-amber-600 hover:bg-amber-600 opacity-60 cursor-not-allowed" : editingJournalId ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/25" : "bg-[#0362D0] hover:bg-[#024a9e] shadow-[#0362D0]/20"
          )}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Menyimpan Data...</>
          ) : activeHoliday ? (
            <><CalendarOff size={18} /> Sesi Pertemuan Diliburkan</>
          ) : (
            <><Save size={18} /> {editingJournalId ? 'Update Sesi Mengajar' : 'Simpan Sesi Mengajar'}</>
          )}
        </button>
      </div>

      {toast.show && (
        <Toast
          message={toast.message}
          description={toast.description}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}

      {showScanner && (
        <React.Suspense fallback={
          <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
            <p className="text-sm text-slate-300">Menyiapkan modul pemindai...</p>
          </div>
        }>
          <QRScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
          />
        </React.Suspense>
      )}

      {/* Student Action Modal (Nonaktifkan & Hapus Permanen) */}
      <StudentActionModal
        isOpen={Boolean(actionStudent)}
        onClose={() => setActionStudent(null)}
        student={actionStudent}
        group={currentGroupObj}
        onDeactivate={handleDeactivateStudent}
        onActivate={handleActivateStudent}
        onPermanentDelete={handlePermanentDeleteStudent}
        isLoading={isActionLoading}
      />

      {/* Modal Tambah Santri Baru Khusus Kelompok Binaan */}
      {isAddStudentOpen && (
        <ModalPortal 
          isOpen={isAddStudentOpen} 
          onClose={() => !isSubmittingStudent && setIsAddStudentOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 space-y-5 max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto animate-in zoom-in-95 duration-150 my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#0362D0]/10 text-[#0362D0] rounded-xl border border-[#0362D0]/20">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#172033]">
                    Tambah Santri Kelompok
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Santri baru akan tersimpan langsung ke database cloud Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingStudent && setIsAddStudentOpen(false)}
                disabled={isSubmittingStudent}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddStudent} className="space-y-4">
              {/* Kelompok Info Box (Terkunci) */}
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Kelompok Binaan
                  </span>
                  <span className="text-xs font-extrabold text-[#172033]">
                    {currentGroupObj?.name || 'Kelompok Binaan'}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-[#0362D0]/10 text-[#0362D0] text-[10px] font-black rounded-lg border border-[#0362D0]/20">
                  Terkunci Khusus Kelompok Ini
                </span>
              </div>

              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nama Lengkap Santri <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Fatih"
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none"
                  autoFocus
                />
              </div>

              {/* NIS & Jenis Kelamin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    NIS (Nomor Induk Siswa)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 102948 (Otomatis bila kosong)"
                    value={newStudentForm.nis}
                    onChange={(e) => setNewStudentForm(prev => ({ ...prev, nis: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Kosongkan jika ingin dibuatkan otomatis
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newStudentForm.gender}
                    onChange={(e) => setNewStudentForm(prev => ({ ...prev, gender: e.target.value as 'L' | 'P' }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#172033] focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none cursor-pointer"
                  >
                    <option value="L">Laki-laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>
              </div>

              {/* Kelas */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Kelas SMPN 102 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStudentForm.class}
                  onChange={(e) => setNewStudentForm(prev => ({ ...prev, class: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#172033] focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none cursor-pointer"
                >
                  <optgroup label="Kelas 7">
                    {['7A','7B','7C','7D','7E','7F','7G','7H'].map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Kelas 8">
                    {['8A','8B','8C','8D','8E','8F','8G','8H'].map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Kelas 9">
                    {['9A','9B','9C','9D','9E','9F','9G','9H'].map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  disabled={isSubmittingStudent}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent || !newStudentForm.name.trim()}
                  className="px-5 py-2.5 bg-[#0362D0] hover:bg-[#0250AA] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingStudent ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan ke Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan & Tambahkan ke Sesi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
