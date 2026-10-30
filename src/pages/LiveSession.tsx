import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { theme } from '../theme';
import { 
  Calendar, Save, Loader2, BookOpen, Users, UserCheck, AlertCircle, 
  MessageSquare, MessageCircle, CheckCircle, ChevronRight, ChevronLeft, Award, ChevronDown, 
  Hash, CheckSquare, Edit3, PlusCircle, Camera, Sliders, Search, CheckCircle2, 
  Sparkles, Check, X, CalendarOff, UserPlus, UserMinus, FileText, Filter
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
import { computeLiveSessionMetrics, calculateStudentTotalScore } from '../utils/sessionMetrics';

const QRScanner = React.lazy(() => import('../components/QRScanner').then(m => ({ default: m.QRScanner })));
import { 
  getGroups, 
  getMentors, 
  getStudentsByGroup, getStudents, 
  getStudentAttendance, 
  getStudentProgressByMeeting,
  getTeachingJournals,
  saveStudentAttendance,
  saveMultipleStudentProgress,
  saveTeachingJournal,
  createNotification,
  addStudent,
  deleteStudent,
  deactivateStudent,
  activateStudent,
  Group, 
  Student, 
  StudentProgress,
  TeachingJournal
} from '../services/db';
import { masterSessions, getGradeForGroup, JUZ_30_SURAHS } from '../services/curriculumData';
import { recordSuccessfulScan } from '../services/scanHistory';
import { getMeetingRealDate, formatShortDateID } from '../services/academicCalendar';
import { getAcademicHolidays, subscribeAcademicHolidays, AcademicHoliday } from '../services/db/calendar';

type WizardStep = 1 | 2 | 3;

export function LiveSession() {
  const { currentUser, userData, userRole } = useAuth();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  
  // Wizard step state: 1 = Presensi, 2 = Nilai KBM, 3 = Jurnal Mengajar
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  // Step 2 filter: show only Hadir students by default for focused grading, or all students
  const [showOnlyPresentInGrading, setShowOnlyPresentInGrading] = useState<boolean>(true);
  // Attendance filter in Step 1
  const [attendanceFilter, setAttendanceFilter] = useState<string>('ALL');
  // Mobile collapsible session configuration panel
  const [showMobileConfig, setShowMobileConfig] = useState<boolean>(false);

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

      let targetSessIds: string[] = [];
      if (matchedJournal.sessionIds && Array.isArray(matchedJournal.sessionIds)) {
        targetSessIds = matchedJournal.sessionIds.filter(id => availableSessions.some(s => s.id === id));
      }
      if (targetSessIds.length === 0 && matchedJournal.sessionId) {
        if (availableSessions.some(s => s.id === matchedJournal.sessionId)) {
          targetSessIds = [matchedJournal.sessionId];
        }
      }

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
      
      const finishedSet = new Set<string>();
      journals.forEach(j => {
        if (j.sessionId) finishedSet.add(j.sessionId);
        if (j.sessionIds && Array.isArray(j.sessionIds)) {
          j.sessionIds.forEach(id => finishedSet.add(id));
        }
      });

      if (finishedSet.size === 0 && selectedSemester === 1) {
        masterSessions
          .filter(s => s.semester === 1 && s.sessionNumber <= 2 && s.gradeId === currentGradeId)
          .forEach(s => finishedSet.add(s.id));
      }

      setCompletedSessionIds(Array.from(finishedSet));

      const maxMeetingNum = journals.reduce((max, j) => Math.max(max, j.meetingNumber || 0), 0);
      const count = Math.max(journals.length, maxMeetingNum, finishedSet.size);
      setCompletedMeetingCount(count);

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
        
        const attendanceRecords = await getStudentAttendance(selectedGroup, selectedDate, meetingNumber);
        const newAtt: Record<string, { status: string, notes: string }> = {};
        stds.forEach(s => {
          const rec = attendanceRecords.find(r => r.studentId === s.id);
          newAtt[s.id] = rec ? { status: rec.status, notes: rec.notes || '' } : { status: 'Alpa', notes: '' };
        });
        setAttendance(newAtt);
        
        const primarySessionId = selectedSessionIds[0] || `session_${meetingNumber}`;
        const progRecords = await getStudentProgressByMeeting(selectedGroup, meetingNumber, primarySessionId);
        const newProg: Record<string, Partial<StudentProgress>> = {};
        stds.forEach(s => {
          const pr = progRecords.find(p => p.studentId === s.id);
          const attStatus = newAtt[s.id]?.status || 'Alpa';

          const savedR = (pr?.reading && pr.reading > 0) ? pr.reading : 0;
          const savedT = (pr?.tajwid && pr.tajwid > 0) ? pr.tajwid : 0;
          const savedW = (pr?.writing && pr.writing > 0) ? pr.writing : 0;
          const savedM = currentGradeId === 'grade3' ? ((pr?.memorization && pr.memorization > 0) ? pr.memorization : 0) : 0;

          if (attStatus !== 'Hadir') {
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

  // Real-time Live Session Statistics & Progress Bar Calculations
  const sessionStats = useMemo(() => {
    const metrics = computeLiveSessionMetrics(
      students.map(s => s.id),
      attendance,
      progress
    );
    return {
      total: metrics.totalStudents,
      hadir: metrics.hadirCount,
      izin: metrics.izinCount,
      sakit: metrics.sakitCount,
      alpa: metrics.alpaCount,
      hadirPercent: metrics.presentRatePercent,
      scoredPresent: metrics.scoredPresentCount,
      scoredPercent: metrics.scoringProgressPercent,
      avgScore: metrics.averageClassScore
    };
  }, [students, attendance, progress]);

  // Handle Attendance Change with automatic Progress sync based on meetingNumber
  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));

    setProgress(prev => {
      const current = (prev[studentId] || {}) as any;
      if (status !== 'Hadir') {
        const savedR = (current.reading && current.reading > 0) ? current.reading : (current._savedReading || 0);
        const savedT = (current.tajwid && current.tajwid > 0) ? current.tajwid : (current._savedTajwid || 0);
        const savedW = (current.writing && current.writing > 0) ? current.writing : (current._savedWriting || 0);
        const savedM = (current.memorization && current.memorization > 0) ? current.memorization : (current._savedMemorization || 0);

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
        const r = (current.reading && current.reading > 0) ? current.reading : (current._savedReading || 0);
        const t = (current.tajwid && current.tajwid > 0) ? current.tajwid : (current._savedTajwid || 0);
        const w = (current.writing && current.writing > 0) ? current.writing : (current._savedWriting || 0);
        const m = currentGradeId === 'grade3' 
          ? ((current.memorization && current.memorization > 0) ? current.memorization : (current._savedMemorization || 0)) 
          : 0;
        
        const calculatedTotal = calculateStudentTotalScore({ reading: r, tajwid: t, writing: w, memorization: m });

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
      updated.total = calculateStudentTotalScore(updated);

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
          if (r > 0) scores.push(r);
          if (t > 0) scores.push(t);
          if (w > 0) scores.push(w);
          if (m > 0) scores.push(m);
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

  // Fill default baseline score for unscored present students
  const applyBaselineScoreToUnscored = (baseline: number) => {
    setProgress(prev => {
      const next = { ...prev };
      students.forEach(s => {
        const isHadir = (attendance[s.id]?.status || 'Alpa') === 'Hadir';
        if (!isHadir) return;
        const curr = next[s.id] || {};
        if (!curr.total || curr.total === 0) {
          next[s.id] = {
            ...curr,
            tajwid: baseline,
            reading: baseline,
            writing: baseline,
            memorization: currentGradeId === 'grade3' ? baseline : (curr.memorization || 0),
            total: baseline
          };
        }
      });
      return next;
    });
    setToast({
      show: true,
      type: 'info',
      message: `Nilai Dasar ${baseline} Diterapkan`,
      description: `Santri hadir yang belum dinilai telah diisi nilai awal ${baseline}.`
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
          if (r > 0) scores.push(r);
          if (t > 0) scores.push(t);
          if (w > 0) scores.push(w);
          if (m > 0) scores.push(m);
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
        try {
          const allStudents = await getStudents();
          const trueStudent = allStudents.find(s => s.id === scannedId);
          if (trueStudent) {
            const allGroups = await getGroups();
            const trueGroup = allGroups.find(g => g.id === trueStudent.groupId);
            
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
      const attToSave = students.map(s => ({
        studentId: s.id,
        groupId: selectedGroup,
        date: selectedDate,
        meetingNumber: meetingNumber,
        status: attendance[s.id]?.status || 'Alpa',
        notes: attendance[s.id]?.notes || ''
      }));
      
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
              ayatRange: p.ayatRange || '',
              notes: p.notes || '',
              memorization: p.memorization || 0,
              writing: p.writing || 0,
              total: p.total || 0,
            });
          }
        }
      }

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

      await Promise.all([
        saveStudentAttendance(attToSave),
        saveMultipleStudentProgress(progsToSave),
        saveTeachingJournal(journalObj)
      ]);
      
      await loadGroupJournalStats();

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
        description: `Absensi (${sessionStats.hadir} Hadir), Nilai & Jurnal telah tercatat di database.` 
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
      text += `Rincian Penilaian:\n`;
      text += `• Membaca: ${progressData?.reading || 0}\n`;
      text += `• Tajwid: ${progressData?.tajwid || 0}\n`;
      text += `• Menulis: ${progressData?.writing || 0}\n`;
      if (progressData?.memorization !== undefined && progressData?.memorization > 0) {
        text += `• Tahfidz/Hafalan: ${progressData?.memorization || 0}\n`;
      }
      if (progressData?.memorizedSurah) {
        text += `• Setoran Hafalan: ${progressData.memorizedSurah}${progressData.ayatRange ? ` (${progressData.ayatRange})` : ''}\n`;
      }
      text += `• Total Nilai: ${progressData?.total || 0}\n`;
      if (progressData?.notes) {
        text += `\nCatatan Mentor: "${progressData.notes}"\n`;
      }
      text += `\nKami mohon dukungan dan motivasi dari ayah/bunda agar ananda senantiasa istiqomah membaca dan menghafal Al-Qur'an. Terima kasih.`;
    } else {
      text += `\n\nMohon kerja sama ayah/bunda untuk memastikan kehadiran dan kelancaran kegiatan belajar ananda pada pertemuan berikutnya. Terima kasih.`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

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

  // Filtered students for Step 1 (Presensi)
  const filteredAttendanceStudents = useMemo(() => {
    return students.filter(st => {
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchesText = st.name.toLowerCase().includes(q) || (st.nis && st.nis.toLowerCase().includes(q));
        if (!matchesText) return false;
      }
      if (attendanceFilter !== 'ALL') {
        const status = attendance[st.id]?.status || 'Alpa';
        if (status !== attendanceFilter) return false;
      }
      return true;
    });
  }, [students, studentSearch, attendanceFilter, attendance]);

  // Filtered students for Step 2 (Nilai KBM)
  const filteredGradingStudents = useMemo(() => {
    return students.filter(st => {
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchesText = st.name.toLowerCase().includes(q) || (st.nis && st.nis.toLowerCase().includes(q));
        if (!matchesText) return false;
      }
      if (showOnlyPresentInGrading) {
        return (attendance[st.id]?.status || 'Alpa') === 'Hadir';
      }
      return true;
    });
  }, [students, studentSearch, showOnlyPresentInGrading, attendance]);

  const wizardSteps: { step: WizardStep; title: string; shortTitle: string; subtitle: string; icon: React.ElementType; metric: string }[] = [
    {
      step: 1,
      title: '1. Presensi Kehadiran',
      shortTitle: '1. Presensi',
      subtitle: 'Absensi & Scan QR',
      icon: UserCheck,
      metric: `${sessionStats.hadir}/${sessionStats.total} Hadir`
    },
    {
      step: 2,
      title: '2. Input Nilai KBM',
      shortTitle: '2. Nilai KBM',
      subtitle: 'Tabel Nilai Langsung',
      icon: Award,
      metric: `${sessionStats.scoredPresent}/${sessionStats.hadir} Dinilai`
    },
    {
      step: 3,
      title: '3. Jurnal & Simpan',
      shortTitle: '3. Jurnal',
      subtitle: 'Catatan & Finalisasi',
      icon: BookOpen,
      metric: journalMaterial.trim() ? 'Terisi ✓' : 'Belum Diisi'
    }
  ];

  const activeGroupName = currentGroupObj?.name || 'Kelompok';
  const activeTahapSummary = selectedTahapObjects.length === 0
    ? 'Pilih Tahap'
    : selectedTahapObjects.length === 1
    ? `Tahap ${selectedTahapObjects[0].sessionNumber}: ${selectedTahapObjects[0].topic}`
    : `${selectedTahapObjects.length} Tahap (${selectedTahapObjects.map(s => 'T' + s.sessionNumber).join(', ')})`;

  return (
    <div className="flex flex-col gap-2.5 sm:gap-4 w-full pb-10">
      {/* 1. UNIFIED COMPACT COMMAND HEADER + MOBILE SESSION SUMMARY */}
      <div className="bg-[#172033] rounded-2xl p-3.5 sm:p-5 text-white border border-slate-800 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-[#C99A2E] mb-0.5">
              <span>{activeGroupName}</span>
              <span aria-hidden="true">·</span>
              <span>{currentGradeObj.programName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{formatShortDateID(selectedDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
                Sesi Mengajar Terpadu
              </h1>
              <div className="flex lg:hidden items-center gap-1.5 shrink-0">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[11px] font-bold tabular-nums border",
                  editingJournalId
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                )}>
                  {editingJournalId ? `Edit Ke-${meetingNumber}` : `Pertemuan Ke-${meetingNumber}`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileConfig(prev => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{showMobileConfig ? 'Tutup' : 'Atur Sesi'}</span>
                  <ChevronDown size={13} className={cn("transition-transform", showMobileConfig && "rotate-180")} />
                </button>
              </div>
            </div>
            {/* Compact syllabus target line on mobile & desktop */}
            <div className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
              Silabus: <strong className="text-white">{activeTahapSummary}</strong>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs shrink-0">
            <div className="bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700">
              <span className="text-slate-400 block text-[11px]">Riwayat Kelompok</span>
              <span className="text-white font-bold text-sm tabular-nums">
                {completedMeetingCount} Pertemuan Terlaksana
              </span>
            </div>
            <div className="bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700">
              <span className="text-slate-400 block text-[11px]">Status Sesi Ini</span>
              <span className={cn(
                "font-bold text-sm tabular-nums",
                editingJournalId ? "text-amber-400" : "text-emerald-400"
              )}>
                {editingJournalId ? `Edit Pertemuan Ke-${meetingNumber}` : `Pertemuan Baru Ke-${meetingNumber}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN-ONLY CURRICULUM CONSISTENCY ALERT */}
      <CurriculumSyncAlert groupIdFilter={selectedGroup} />

      {/* 2. SESSION CONFIGURATION BAR (Hidden on mobile unless "Atur Sesi" is toggled, always visible on >= md) */}
      <div className={cn(
        "bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 space-y-2.5",
        !showMobileConfig && "hidden md:block"
      )}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Kelompok */}
          <div className="space-y-1">
            <label className="text-[11px] sm:text-xs font-bold text-slate-700">Kelompok Binaan</label>
            <Select 
              value={selectedGroup} 
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setEditingJournalId(null);
              }} 
              className="w-full font-bold text-xs h-9 sm:h-10 bg-slate-50 border-slate-200 focus:bg-white"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </div>

          {/* Tanggal Sesi */}
          <div className="space-y-1">
            <label className="text-[11px] sm:text-xs font-bold text-slate-700">Tanggal Kegiatan</label>
            <Input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 sm:h-10 font-bold text-xs tabular-nums"
            />
          </div>

          {/* Pertemuan Ke- */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">Pertemuan Ke-</label>
              <span className="text-[10px] sm:text-[11px] text-[#0362D0] font-semibold tabular-nums">
                {completedMeetingCount}x Selesai
              </span>
            </div>
            <Select
              value={meetingNumber.toString()}
              onChange={(e) => syncMeetingData(parseInt(e.target.value) || 1)}
              className={cn(
                "h-9 sm:h-10 font-bold text-xs cursor-pointer tabular-nums",
                editingJournalId ? "bg-amber-50 text-amber-900 border-amber-300" : "text-[#0362D0]"
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
          <div className="space-y-1">
            <label className="text-[11px] sm:text-xs font-bold text-slate-700">Semester</label>
            <Select
              value={selectedSemester.toString()}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="w-full font-bold text-xs h-9 sm:h-10 bg-slate-50 border-slate-200 focus:bg-white"
            >
              <option value="1">Semester 1 (Tahap 1 – 16)</option>
              <option value="2">Semester 2 (Tahap 17 – 32)</option>
            </Select>
          </div>

          {/* Tahap Kurikulum / Silabus */}
          <div className="col-span-2 lg:col-span-1 space-y-1 relative">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">Tahap Kurikulum</label>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Multi-pilih</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTahapDropdown(!showTahapDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#172033] h-9 sm:h-10 transition-colors cursor-pointer text-left"
            >
              <span className="truncate pr-1">
                {selectedTahapObjects.length === 0 ? 'Pilih Tahap...' :
                 selectedTahapObjects.length === 1 ? `Tahap ${selectedTahapObjects[0].sessionNumber}: ${selectedTahapObjects[0].topic}` :
                 `${selectedTahapObjects.length} Tahap: ${selectedTahapObjects.map(s => 'Tahap ' + s.sessionNumber).join(', ')}`}
              </span>
              <ChevronDown size={14} className="text-slate-500 shrink-0" />
            </button>

            <AnimatePresence>
              {showTahapDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-1 w-full sm:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 max-h-80 overflow-y-auto divide-y divide-slate-100"
                >
                  <div className="text-xs font-bold text-slate-600 pb-2 px-1 flex justify-between items-center">
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
                            <div className="font-bold flex items-center justify-between gap-1">
                              <span>Tahap {s.sessionNumber}: {s.topic}</span>
                              {isFinished && (
                                <span className="text-[11px] text-emerald-700 font-semibold shrink-0 ml-1">
                                  · Selesai
                                </span>
                              )}
                            </div>
                            {s.pageRef && (
                              <div className="text-[11px] text-slate-500 mt-0.5">Materi: Hal. {s.pageRef}</div>
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

        {/* Desktop Syllabus Metadata Line */}
        <div className="hidden md:flex pt-2 border-t border-slate-100 flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-[#172033]">Target Silabus Hari Ini:</span>
            <span>
              {selectedTahapObjects.map(s => `Tahap ${s.sessionNumber} (${s.topic})`).join(' · ') || 'Belum dipilih'}
            </span>
          </div>
          <span className="text-slate-500">
            {currentGradeId === 'grade3' ? 'Fokus: Tahsin, Tajwid & Hafalan Juz 30' : 'Fokus: Tilawati, Tajwid & Menulis'}
          </span>
        </div>
      </div>

      {/* 3. HORIZONTAL 3-STEP WIZARD BAR (Zero truncation on 390px mobile & desktop) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        {wizardSteps.map((item) => {
          const Icon = item.icon;
          const isActive = activeStep === item.step;
          const isCompleted =
            (item.step === 1 && sessionStats.hadir > 0) ||
            (item.step === 2 && sessionStats.hadir > 0 && sessionStats.scoredPresent === sessionStats.hadir) ||
            (item.step === 3 && Boolean(journalMaterial.trim()));

          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStep(item.step)}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-left transition-all cursor-pointer",
                isActive
                  ? "bg-white text-[#172033] shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-[#172033] hover:bg-white/50"
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                <div
                  className={cn(
                    "w-5 h-5 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center shrink-0 font-bold text-xs transition-colors",
                    isActive
                      ? "bg-[#0362D0] text-white"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  )}
                >
                  {isCompleted && !isActive ? <Check size={12} /> : <Icon size={12} />}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold leading-tight">
                    <span className="sm:hidden">{item.shortTitle}</span>
                    <span className="hidden sm:inline">{item.title}</span>
                  </div>
                  <div className="hidden sm:block text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-bold tabular-nums shrink-0",
                  isActive ? "text-[#0362D0]" : isCompleted ? "text-emerald-700" : "text-slate-500"
                )}
              >
                {item.metric}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. DESKTOP LIVE ATTENDANCE & GRADING STATS BAR (Hidden on mobile so student cards appear immediately above the fold) */}
      <div className="hidden md:grid bg-white rounded-2xl p-4 border border-slate-200 grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: 4 Interactive Status Pills + Progress Bar */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#172033]">
              Rekap Presensi ({sessionStats.total} Santri)
            </span>
            <span className="font-bold text-emerald-700 tabular-nums">
              {sessionStats.hadirPercent}% Hadir
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Hadir', count: sessionStats.hadir, bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-800', activeBg: 'bg-emerald-100 border-emerald-500 ring-1 ring-emerald-500/30', numColor: 'text-emerald-700' },
              { label: 'Izin', count: sessionStats.izin, bg: 'bg-amber-50/80 border-amber-200 text-amber-800', activeBg: 'bg-amber-100 border-amber-500 ring-1 ring-amber-500/30', numColor: 'text-amber-700' },
              { label: 'Sakit', count: sessionStats.sakit, bg: 'bg-blue-50/80 border-blue-200 text-blue-800', activeBg: 'bg-blue-100 border-blue-500 ring-1 ring-blue-500/30', numColor: 'text-blue-700' },
              { label: 'Alpa', count: sessionStats.alpa, bg: 'bg-rose-50/80 border-rose-200 text-rose-800', activeBg: 'bg-rose-100 border-rose-500 ring-1 ring-rose-500/30', numColor: 'text-rose-700' }
            ].map(st => (
              <button
                key={st.label}
                type="button"
                onClick={() => {
                  setActiveStep(1);
                  setAttendanceFilter(prev => prev === st.label ? 'ALL' : st.label);
                }}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer",
                  attendanceFilter === st.label ? st.activeBg : st.bg
                )}
                title={`Klik untuk filter santri ${st.label}`}
              >
                <span className="text-xs font-bold">{st.label}</span>
                <span className={cn("text-sm font-black tabular-nums", st.numColor)}>{st.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Grading Progress & Class Average */}
        <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#172033]">Progres Nilai KBM</span>
            <span className="font-bold text-[#0362D0] tabular-nums">
              {sessionStats.scoredPresent}/{sessionStats.hadir} Santri Hadir ({sessionStats.scoredPercent}%)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${sessionStats.scoredPercent}%` }}
              className="h-full bg-[#0362D0] transition-all duration-300 rounded-full"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Rata-rata Kelas: <strong className="text-[#172033] tabular-nums">{sessionStats.avgScore > 0 ? sessionStats.avgScore : '-'}</strong>
            </span>
            {sessionStats.hadir === 0 ? (
              <span className="text-amber-700 font-semibold">Tandai Hadir dulu</span>
            ) : sessionStats.scoredPresent === sessionStats.hadir ? (
              <span className="text-emerald-700 font-bold">Semua dinilai ✓</span>
            ) : (
              <span className="text-slate-500 tabular-nums">
                Sisa {sessionStats.hadir - sessionStats.scoredPresent} belum dinilai
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Holiday Warning Banner */}
      {activeHoliday && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-950">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-800">
            <CalendarOff size={18} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-xs text-amber-950">
              Sesi Diliburkan Admin · &ldquo;{activeHoliday.reason}&rdquo;
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Tanggal ini ditandai sebagai hari libur resmi. Pembelajaran KBM dan presensi ditiadakan dan telah digeser otomatis ke pekan berikutnya.
            </p>
          </div>
        </div>
      )}

      {/* 5. WIZARD STEP CONTENT VIEWPORT */}
      <AnimatePresence mode="wait">
        {activeStep === 1 && (
          <motion.div
            key="wizard-step-1-attendance"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {/* Step 1 Compact Toolbar Above Student Cards ("Bagian Atas Daftar Kartu Siswa") */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs sm:text-base font-bold text-[#172033]">
                    Presensi Kehadiran ({sessionStats.hadir}/{sessionStats.total} Hadir)
                  </h2>
                  {/* Mobile Inline Status Summary Pills */}
                  <div className="flex md:hidden items-center gap-1 text-[10px] font-bold tabular-nums">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">H:{sessionStats.hadir}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">I:{sessionStats.izin}</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">S:{sessionStats.sakit}</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">A:{sessionStats.alpa}</span>
                  </div>
                </div>

                {/* Single-Row Quick Action Buttons */}
                <div className="grid grid-cols-4 sm:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllAttendance('Hadir')}
                    className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl text-[11px] sm:text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <Check size={12} /> Hadir Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-2.5 py-1.5 bg-[#172033] text-white rounded-xl text-[11px] sm:text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <Camera size={12} /> Scan QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllAttendance('Alpa')}
                    className="px-2 py-1.5 bg-white text-rose-700 border border-rose-200 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <X size={12} /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-2 py-1.5 bg-white text-[#0362D0] border border-[#0362D0]/30 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer inline-flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    <PlusCircle size={12} /> + Santri
                  </button>
                </div>
              </div>

              {/* Search & Status Filter Strip */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NIS santri..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:ring-2 focus:ring-[#0362D0] outline-none h-8 sm:h-9"
                  />
                </div>

                <div className="grid grid-cols-5 sm:inline-flex items-center bg-slate-200/70 p-0.5 rounded-xl text-[11px] sm:text-xs">
                  {(['ALL', 'Hadir', 'Izin', 'Sakit', 'Alpa'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAttendanceFilter(st)}
                      className={cn(
                        "px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer text-center whitespace-nowrap",
                        attendanceFilter === st
                          ? "bg-white text-[#172033] shadow-2xs"
                          : "text-slate-600 hover:text-[#172033]"
                      )}
                    >
                      {st === 'ALL' ? 'Semua' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <StudentTableSkeleton rowCount={6} variant="attendance" />
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users size={36} className="mx-auto mb-3 text-slate-300" />
                <h4 className="text-sm font-bold text-[#172033]">Belum ada santri di kelompok ini</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Tambahkan santri binaan baru ke kelompok ini untuk mulai mencatat presensi dan nilai.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(true)}
                  className="mt-4 px-4 py-2 bg-[#0362D0] hover:bg-[#0250AA] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle size={15} />
                  <span>Tambah Santri Pertama</span>
                </button>
              </div>
            ) : (
              <>
                {/* MOBILE STUDENT CARDS FOR STEP 1 (md:hidden) */}
                <div className="md:hidden p-2.5 space-y-2.5 bg-slate-50/60">
                  {filteredAttendanceStudents.map((student, idx) => {
                    const currentStatus = attendance[student.id]?.status || 'Alpa';
                    const isHadir = currentStatus === 'Hadir';
                    const noteVal = progress[student.id]?.notes || attendance[student.id]?.notes || '';

                    const borderAccent =
                      currentStatus === 'Hadir' ? 'border-l-emerald-600' :
                      currentStatus === 'Izin' ? 'border-l-amber-500' :
                      currentStatus === 'Sakit' ? 'border-l-blue-600' : 'border-l-rose-500';

                    const statusBadgeStyle =
                      currentStatus === 'Hadir' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      currentStatus === 'Izin' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      currentStatus === 'Sakit' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-rose-50 text-rose-800 border-rose-200';

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "bg-white rounded-xl border border-slate-200 border-l-4 p-3 shadow-2xs space-y-2.5 transition-all",
                          borderAccent
                        )}
                      >
                        {/* BAGIAN ATAS KARTU SISWA (Eye-Catching Tinted Card Header) */}
                        <div className="bg-slate-50/90 -mx-3 -mt-3 px-3 py-2 rounded-t-xl border-b border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-[#172033] text-white font-black text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-[#172033] text-xs leading-snug truncate">
                                {student.name}
                              </div>
                              <div className="text-[10px] text-slate-500 tabular-nums">
                                Kelas {student.class} · {student.nis ? `NIS ${student.nis}` : 'Aktif'}
                              </div>
                            </div>
                          </div>

                          {/* Right of Card Header: Active Status Badge + WA & Manage Icons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", statusBadgeStyle)}>
                              {currentStatus}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSendWA(student, currentStatus, progress[student.id])}
                              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                              title="Kirim WA ke Orang Tua"
                            >
                              <MessageCircle size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionStudent(student)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Kelola Santri"
                            >
                              <UserMinus size={13} />
                            </button>
                          </div>
                        </div>

                        {/* 4-Column Thumb-Friendly Status Buttons */}
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                          {[
                            { label: 'Hadir', active: 'bg-emerald-600 text-white shadow-2xs' },
                            { label: 'Izin', active: 'bg-amber-500 text-white shadow-2xs' },
                            { label: 'Sakit', active: 'bg-blue-600 text-white shadow-2xs' },
                            { label: 'Alpa', active: 'bg-rose-600 text-white shadow-2xs' }
                          ].map(opt => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => handleAttendanceChange(student.id, opt.label)}
                              className={cn(
                                "py-1.5 px-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
                                currentStatus === opt.label
                                  ? opt.active
                                  : "text-slate-600 hover:text-[#172033]"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Compact Note Input */}
                        <input
                          type="text"
                          placeholder={isHadir ? "Catatan kehadiran / evaluasi singkat..." : `Keterangan alasan ${currentStatus.toLowerCase()}...`}
                          value={noteVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleProgressChange(student.id, 'notes', val);
                            setAttendance(prev => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], notes: val }
                            }));
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] outline-none"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP COMPACT TABLE FOR STEP 1 (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 min-w-[200px]">Nama Santri</th>
                        <th className="py-3 px-4 w-72 text-center">Status Kehadiran</th>
                        <th className="py-3 px-4 min-w-[220px]">Keterangan / Catatan Singkat</th>
                        <th className="py-3 px-4 w-24 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredAttendanceStudents.map((student, idx) => {
                        const currentStatus = attendance[student.id]?.status || 'Alpa';
                        const isHadir = currentStatus === 'Hadir';
                        const noteVal = progress[student.id]?.notes || attendance[student.id]?.notes || '';

                        return (
                          <tr
                            key={student.id}
                            className={cn(
                              "transition-colors hover:bg-slate-50/80",
                              isHadir ? "bg-white" : "bg-slate-50/40"
                            )}
                          >
                            <td className="py-2.5 px-4 text-center font-bold text-slate-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-[#172033] text-xs sm:text-sm">
                                {student.name}
                              </div>
                              <div className="text-[11px] text-slate-500 tabular-nums">
                                Kelas {student.class} · {student.nis ? `NIS ${student.nis}` : 'Aktif'}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/70 max-w-[280px] mx-auto">
                                {[
                                  { label: 'Hadir', active: 'bg-emerald-600 text-white' },
                                  { label: 'Izin', active: 'bg-amber-500 text-white' },
                                  { label: 'Sakit', active: 'bg-blue-600 text-white' },
                                  { label: 'Alpa', active: 'bg-rose-600 text-white' }
                                ].map(opt => (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => handleAttendanceChange(student.id, opt.label)}
                                    className={cn(
                                      "flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer whitespace-nowrap",
                                      currentStatus === opt.label
                                        ? opt.active
                                        : "text-slate-600 hover:text-[#172033]"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                placeholder={isHadir ? "Catatan kehadiran / evaluasi..." : `Alasan ${currentStatus.toLowerCase()}...`}
                                value={noteVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleProgressChange(student.id, 'notes', val);
                                  setAttendance(prev => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], notes: val }
                                  }));
                                }}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSendWA(student, currentStatus, progress[student.id])}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Kirim WA ke Orang Tua"
                                >
                                  <MessageCircle size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionStudent(student)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Kelola / Nonaktifkan Santri"
                                >
                                  <UserMinus size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeStep === 2 && (
          <motion.div
            key="wizard-step-2-grading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {/* Step 2 Compact Toolbar Above Student Cards ("Bagian Atas Daftar Kartu Siswa") */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-base font-bold text-[#172033]">
                    Input Nilai KBM
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0362D0] border border-blue-200 text-[10px] sm:text-xs font-bold tabular-nums">
                    {sessionStats.scoredPresent}/{sessionStats.hadir} Dinilai {sessionStats.avgScore > 0 ? `· Rerata ${sessionStats.avgScore}` : ''}
                  </span>
                </div>

                {/* Quick Fill Unscored Baseline */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs">
                  <span className="text-slate-600 font-semibold whitespace-nowrap">Isi Nilai Awal:</span>
                  <div className="flex items-center gap-1">
                    {[75, 80, 85].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => applyBaselineScoreToUnscored(val)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-[#0362D0] hover:text-white text-[#172033] font-bold tabular-nums transition-colors cursor-pointer"
                        title={`Isi nilai awal ${val} untuk santri hadir yang belum dinilai`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Combined Search + Filter Strip (Single row on mobile & desktop!) */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari santri..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:ring-2 focus:ring-[#0362D0] outline-none h-8 sm:h-9"
                  />
                </div>

                <div className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-xl text-[11px] sm:text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowOnlyPresentInGrading(true)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap text-center",
                      showOnlyPresentInGrading
                        ? "bg-white text-[#172033] shadow-2xs"
                        : "text-slate-600 hover:text-[#172033]"
                    )}
                  >
                    Hadir ({sessionStats.hadir})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOnlyPresentInGrading(false)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap text-center",
                      !showOnlyPresentInGrading
                        ? "bg-white text-[#172033] shadow-2xs"
                        : "text-slate-600 hover:text-[#172033]"
                    )}
                  >
                    Semua ({sessionStats.total})
                  </button>
                </div>
              </div>
            </div>

            {sessionStats.hadir === 0 && showOnlyPresentInGrading ? (
              <div className="p-10 sm:p-12 text-center">
                <UserCheck size={36} className="mx-auto mb-3 text-amber-500" />
                <h4 className="text-sm font-bold text-[#172033]">Belum Ada Santri Berstatus Hadir</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Silakan tandai kehadiran santri pada Langkah 1 terlebih dahulu, atau klik tombol di bawah untuk menandai semua santri hadir.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    ← Ke Langkah 1 (Presensi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllAttendance('Hadir')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tandai Semua Hadir Sekarang
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* MOBILE STUDENT CARDS FOR STEP 2 (md:hidden) */}
                <div className="md:hidden p-2.5 space-y-2.5 bg-slate-50/60">
                  {filteredGradingStudents.map((student, idx) => {
                    const currentStatus = attendance[student.id]?.status || 'Alpa';
                    const isHadir = currentStatus === 'Hadir';
                    const p = progress[student.id] || {};
                    const totalScore = p.total || 0;

                    const gradeText = !isHadir
                      ? currentStatus
                      : totalScore >= 85
                      ? 'Sangat Baik'
                      : totalScore >= 75
                      ? 'Baik'
                      : totalScore > 0
                      ? 'Bimbingan'
                      : 'Belum Dinilai';

                    const borderAccent = !isHadir
                      ? 'border-l-slate-300 opacity-75'
                      : totalScore >= 85
                      ? 'border-l-emerald-600'
                      : totalScore >= 75
                      ? 'border-l-[#0362D0]'
                      : totalScore > 0
                      ? 'border-l-rose-600'
                      : 'border-l-amber-500';

                    const scoreBadgeClass = !isHadir
                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                      : totalScore >= 85
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : totalScore >= 75
                      ? 'bg-blue-50 text-[#0362D0] border-blue-200'
                      : totalScore > 0
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200';

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "bg-white rounded-xl border border-slate-200 border-l-4 p-3 shadow-2xs space-y-2.5",
                          borderAccent
                        )}
                      >
                        {/* BAGIAN ATAS KARTU SISWA (Eye-Catching Tinted Card Header) */}
                        <div className="bg-slate-50/90 -mx-3 -mt-3 px-3 py-2 rounded-t-xl border-b border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-[#172033] text-white font-black text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-[#172033] text-xs leading-snug truncate">
                                {student.name}
                              </div>
                              <div className="text-[10px] text-slate-500 tabular-nums">
                                Kelas {student.class} · <span className={isHadir ? "text-emerald-700 font-semibold" : "text-rose-600 font-semibold"}>{currentStatus}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right of Card Header: Prominent Average Score Pill + Rubric Drawer & WA */}
                          <div className="flex items-center gap-1 shrink-0">
                            <div className={cn("px-2 py-0.5 rounded-lg border text-right tabular-nums", scoreBadgeClass)}>
                              <span className="text-[11px] font-black block leading-tight">
                                {isHadir && totalScore > 0 ? `${totalScore}/100` : '-'}
                              </span>
                              <span className="text-[9px] font-bold block leading-tight">
                                {gradeText}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForDrawer(student)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-[#0362D0] rounded-lg transition-colors cursor-pointer"
                              title="Buka Slider Rubrik Detail"
                            >
                              <Sliders size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendWA(student, currentStatus, p)}
                              className="p-1.5 bg-emerald-50 border border-emerald-200/70 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                              title="Kirim Laporan via WA"
                            >
                              <MessageCircle size={13} />
                            </button>
                          </div>
                        </div>

                        {/* 4-COLUMN DIRECT NUMERIC SCORE GRID (Fits 100% on 390px phone!) */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { field: 'tajwid' as const, label: 'Tajwid', val: p.tajwid },
                            { field: 'reading' as const, label: 'Baca', val: p.reading },
                            { field: 'writing' as const, label: 'Tulis', val: p.writing },
                            { field: 'memorization' as const, label: 'Hafalan', val: p.memorization }
                          ].map(item => (
                            <div key={item.field} className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 text-center">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                {item.label}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!isHadir}
                                placeholder="0"
                                value={item.val ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  handleProgressChange(student.id, item.field, val);
                                }}
                                className="w-full h-8 text-center font-black text-xs rounded-md bg-white border border-slate-200 text-[#172033] focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none tabular-nums disabled:opacity-50"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Setoran Juz 30 & Ayat Row */}
                        <div className="grid grid-cols-12 gap-1.5">
                          <select
                            disabled={!isHadir}
                            value={p.memorizedSurah || ''}
                            onChange={(e) => handleProgressChange(student.id, 'memorizedSurah', e.target.value)}
                            className="col-span-7 h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-[#172033] focus:bg-white focus:border-[#0362D0] outline-none cursor-pointer disabled:opacity-50"
                          >
                            <option value="">- Setoran Surat Juz 30 -</option>
                            {JUZ_30_SURAHS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            disabled={!isHadir}
                            placeholder="Ayat (mis: 1-15)"
                            value={p.ayatRange || ''}
                            onChange={(e) => handleProgressChange(student.id, 'ayatRange', e.target.value)}
                            className="col-span-5 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP COMPACT SCORE TABLE FOR STEP 2 (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 min-w-[180px]">Nama Santri</th>
                        <th className="py-3 px-2 w-24 text-center">Tajwid</th>
                        <th className="py-3 px-2 w-24 text-center">Baca</th>
                        <th className="py-3 px-2 w-24 text-center">Tulis</th>
                        <th className="py-3 px-2 w-24 text-center">Hafalan</th>
                        <th className="py-3 px-3 min-w-[230px]">Setoran Juz 30 & Ayat</th>
                        <th className="py-3 px-3 w-28 text-center">Rata-rata</th>
                        <th className="py-3 px-3 w-24 text-right">Detail / WA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredGradingStudents.map((student, idx) => {
                        const currentStatus = attendance[student.id]?.status || 'Alpa';
                        const isHadir = currentStatus === 'Hadir';
                        const p = progress[student.id] || {};
                        const totalScore = p.total || 0;

                        const gradeText = !isHadir
                          ? currentStatus
                          : totalScore >= 85
                          ? 'Sangat Baik'
                          : totalScore >= 75
                          ? 'Baik'
                          : totalScore > 0
                          ? 'Bimbingan'
                          : 'Belum';

                        return (
                          <tr
                            key={student.id}
                            className={cn(
                              "transition-colors hover:bg-slate-50/90",
                              !isHadir && "bg-slate-50/50 opacity-60"
                            )}
                          >
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-[#172033] truncate max-w-[200px]" title={student.name}>
                                {student.name}
                              </div>
                              <div className="text-[11px] text-slate-500 tabular-nums">
                                Kelas {student.class} · {isHadir ? 'Hadir' : currentStatus}
                              </div>
                            </td>

                            {/* Tajwid */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!isHadir}
                                placeholder="0"
                                value={p.tajwid ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  handleProgressChange(student.id, 'tajwid', val);
                                }}
                                className="w-16 h-9 text-center font-bold text-xs rounded-lg bg-slate-50 border border-slate-200 text-[#172033] focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none tabular-nums disabled:opacity-50"
                              />
                            </td>

                            {/* Baca */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!isHadir}
                                placeholder="0"
                                value={p.reading ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  handleProgressChange(student.id, 'reading', val);
                                }}
                                className="w-16 h-9 text-center font-bold text-xs rounded-lg bg-slate-50 border border-slate-200 text-[#172033] focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none tabular-nums disabled:opacity-50"
                              />
                            </td>

                            {/* Tulis */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!isHadir}
                                placeholder="0"
                                value={p.writing ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  handleProgressChange(student.id, 'writing', val);
                                }}
                                className="w-16 h-9 text-center font-bold text-xs rounded-lg bg-slate-50 border border-slate-200 text-[#172033] focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none tabular-nums disabled:opacity-50"
                              />
                            </td>

                            {/* Hafalan */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!isHadir}
                                placeholder="0"
                                value={p.memorization ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  handleProgressChange(student.id, 'memorization', val);
                                }}
                                className="w-16 h-9 text-center font-bold text-xs rounded-lg bg-slate-50 border border-slate-200 text-[#172033] focus:bg-white focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none tabular-nums disabled:opacity-50"
                              />
                            </td>

                            {/* Setoran Surah Juz 30 & Ayat */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <select
                                  disabled={!isHadir}
                                  value={p.memorizedSurah || ''}
                                  onChange={(e) => handleProgressChange(student.id, 'memorizedSurah', e.target.value)}
                                  className="w-36 h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-[#172033] focus:bg-white focus:border-[#0362D0] outline-none cursor-pointer disabled:opacity-50"
                                >
                                  <option value="">- Pilih Surat -</option>
                                  {JUZ_30_SURAHS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  disabled={!isHadir}
                                  placeholder="Ayat"
                                  value={p.ayatRange || ''}
                                  onChange={(e) => handleProgressChange(student.id, 'ayatRange', e.target.value)}
                                  className="w-20 h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] outline-none disabled:opacity-50"
                                />
                              </div>
                            </td>

                            {/* Rata-rata (Total) */}
                            <td className="py-2 px-3 text-center">
                              <div className="font-black text-sm text-[#172033] tabular-nums">
                                {isHadir ? (totalScore > 0 ? totalScore : '-') : '-'}
                              </div>
                              <div className={cn(
                                "text-[10px] font-bold",
                                !isHadir ? "text-slate-400" :
                                totalScore >= 85 ? "text-emerald-700" :
                                totalScore >= 75 ? "text-[#0362D0]" :
                                totalScore > 0 ? "text-rose-600" : "text-slate-400"
                              )}>
                                {gradeText}
                              </div>
                            </td>

                            {/* Actions: Drawer Slider & WA */}
                            <td className="py-2 px-3 text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentForDrawer(student)}
                                  className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0362D0] rounded-lg transition-colors cursor-pointer"
                                  title="Buka Slider Rubrik & Catatan Santri"
                                >
                                  <Sliders size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendWA(student, currentStatus, p)}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                                  title="Kirim Laporan Nilai via WhatsApp"
                                >
                                  <MessageCircle size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeStep === 3 && (
          <motion.div
            key="wizard-step-3-journal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#172033]">
                  Langkah 3: Jurnal Mengajar & Evaluasi Sesi
                </h2>
                <p className="text-xs text-slate-500">
                  Dokumentasikan materi yang dibahas, pencapaian halaman/surat, dan rencana untuk pertemuan berikutnya sebelum menyimpan.
                </p>
              </div>
              <div className="text-xs text-slate-600 font-semibold tabular-nums">
                Pertemuan Ke-{meetingNumber} · {selectedDate}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Session Readiness Summary Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Rekap Presensi Sesi Ini</span>
                  <span className="font-bold text-[#172033] text-sm tabular-nums mt-0.5 block">
                    {sessionStats.hadir} Hadir · {sessionStats.izin} Izin · {sessionStats.sakit} Sakit · {sessionStats.alpa} Alpa
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kelengkapan Nilai KBM</span>
                  <span className="font-bold text-[#0362D0] text-sm tabular-nums mt-0.5 block">
                    {sessionStats.scoredPresent} dari {sessionStats.hadir} Santri Hadir Dinilai (Rata-rata: {sessionStats.avgScore || 0})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tahap Silabus Tercatat</span>
                  <span className="font-bold text-[#172033] text-sm mt-0.5 block truncate">
                    {selectedTahapObjects.map(s => `Tahap ${s.sessionNumber}`).join(', ') || '-'}
                  </span>
                </div>
              </div>

              {/* Journal Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#172033]">
                        Materi yang Dibahas
                      </label>
                      {selectedTahapObjects.length > 0 && !journalMaterial && (
                        <button
                          type="button"
                          onClick={() => setJournalMaterial(selectedTahapObjects.map(s => `Tahap ${s.sessionNumber}: ${s.topic}`).join(' & '))}
                          className="text-[11px] font-bold text-[#0362D0] hover:underline cursor-pointer"
                        >
                          + Isi Otomatis dari Silabus
                        </button>
                      )}
                    </div>
                    <textarea 
                      value={journalMaterial}
                      onChange={e => setJournalMaterial(e.target.value)}
                      placeholder="Contoh: Pengenalan Makharijul Huruf, Praktik Tilawati Jilid 3"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#0362D0] outline-none min-h-[85px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#172033] mb-1.5">
                      Kendala / Catatan Evaluasi Kelas
                    </label>
                    <textarea 
                      value={journalObstacles}
                      onChange={e => setJournalObstacles(e.target.value)}
                      placeholder="Contoh: Sebagian santri masih perlu bimbingan membedakan huruf dzal dan zai..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#0362D0] outline-none min-h-[85px]"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#172033] mb-1.5">
                      Pencapaian Halaman / Surat
                    </label>
                    <input 
                      value={journalPages}
                      onChange={e => setJournalPages(e.target.value)}
                      placeholder="Contoh: Tilawati Hal. 20-25 / QS. An-Naba 1-15"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#0362D0] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#172033] mb-1.5">
                      Rencana Pertemuan Berikutnya
                    </label>
                    <textarea 
                      value={journalNextPlan}
                      onChange={e => setJournalNextPlan(e.target.value)}
                      placeholder="Contoh: Melanjutkan halaman 26 dan evaluasi bacaan bergilir"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#0362D0] outline-none min-h-[85px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
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
        onNotesChange={(studentId, noteVal) => {
          handleProgressChange(studentId, 'notes', noteVal);
          setAttendance(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], notes: noteVal }
          }));
        }}
        studentNotes={selectedStudentForDrawer ? (progress[selectedStudentForDrawer.id]?.notes || attendance[selectedStudentForDrawer.id]?.notes || '') : ''}
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

      {/* Responsive Wizard Navigation & Save Action Bar (Never overflows on 390px mobile) */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Previous Step or Session Info */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          {activeStep > 1 ? (
            <button
              type="button"
              onClick={() => setActiveStep((prev) => (prev - 1) as WizardStep)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft size={15} />
              <span>Langkah Sebelumnya</span>
            </button>
          ) : (
            <div className="text-xs text-slate-600 font-medium">
              {editingJournalId ? (
                <span className="text-amber-700 font-bold flex items-center gap-1.5">
                  <Edit3 size={14} /> Mode Edit Pertemuan Ke-{meetingNumber}
                </span>
              ) : (
                <span>Pertemuan Ke-<strong>{meetingNumber}</strong> · {sessionStats.hadir} Hadir</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Next Step & Save Buttons (Responsive Grid on Mobile) */}
        <div className={cn(
          "grid gap-2 sm:flex sm:items-center sm:justify-end",
          activeStep < 3 ? "grid-cols-2" : "grid-cols-1"
        )}>
          {activeStep < 3 && (
            <button
              type="button"
              onClick={() => setActiveStep((prev) => (prev + 1) as WizardStep)}
              className="px-3.5 sm:px-5 py-2.5 bg-[#172033] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="truncate">{activeStep === 1 ? 'Lanjut Nilai' : 'Lanjut Jurnal'}</span>
              <ChevronRight size={14} className="shrink-0" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || students.length === 0 || !!activeHoliday}
            className={cn(
              "px-4 sm:px-6 py-2.5 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer",
              activeHoliday
                ? "bg-amber-600 opacity-60 cursor-not-allowed"
                : editingJournalId
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[#0362D0] hover:bg-[#024a9e]"
            )}
          >
            {saving ? (
              <><Loader2 size={15} className="animate-spin shrink-0" /> <span>Menyimpan...</span></>
            ) : activeHoliday ? (
              <><CalendarOff size={15} className="shrink-0" /> <span>Sesi Diliburkan</span></>
            ) : (
              <><Save size={15} className="shrink-0" /> <span className="truncate">{editingJournalId ? 'Update Sesi' : 'Simpan Sesi'}</span></>
            )}
          </button>
        </div>
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

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Kelompok Binaan
                  </span>
                  <span className="text-xs font-extrabold text-[#172033]">
                    {currentGroupObj?.name || 'Kelompok Binaan'}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#0362D0]">
                  Terkunci Khusus Kelompok Ini
                </span>
              </div>

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
