import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  CalendarOff, 
  ExternalLink, 
  Settings2, 
  AlertCircle, 
  Info, 
  ListFilter, 
  BookOpen, 
  CheckSquare, 
  ArrowUpRight, 
  X,
  Sparkles,
  Link2,
  CalendarCheck2,
  Users,
  ShieldCheck,
  Zap,
  Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModalPortal } from '../components/ui/ModalPortal';
import { 
  AcademicMeeting, 
  getSynchronizedMeetings, 
  formatFullDateID, 
  formatShortDateID,
  formatLocalDateString
} from '../services/academicCalendar';
import { 
  getAcademicHolidays, 
  subscribeAcademicHolidays, 
  AcademicHoliday,
  getMeetingOverrides,
  MeetingOverride
} from '../services/db/calendar';
import { 
  connectGoogleCalendar, 
  disconnectGoogleCalendar, 
  isGoogleCalendarConnected, 
  getConnectedGoogleUser,
  batchSyncMeetingsToGoogleCalendar,
  syncMeetingToGoogleCalendar,
  generateGoogleCalendarWebLink,
  getCalendarSyncStatus,
  getGoogleCalendarConfig,
  GoogleCalendarConfig,
  DEFAULT_GCAL_CONFIG,
  SyncResult
} from '../services/googleCalendar';
import { HolidayConfigModal } from '../components/dashboard/HolidayConfigModal';
import { GoogleGroupsConfigModal } from '../components/calendar/GoogleGroupsConfigModal';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME, APP_SUBTITLE } from '../assets/logo';

export default function AcademicCalendar() {
  const { userRole, currentUser } = useAuth();
  const isAdmin = userRole === 'admin' || currentUser?.email === 'admin@smpn102.sch.id';

  // Navigation State
  // Default to August 2026 (Semester 1 Start)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 7, 1)); // Month is 0-indexed (7 = August)
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed' | 'holiday'>('all');

  // Data State
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [overrides, setOverrides] = useState<MeetingOverride[]>([]);
  const [syncStatusMap, setSyncStatusMap] = useState<Record<string, { googleEventId: string; syncedAt: string; htmlLink?: string }>>({});
  
  // Google Calendar Auth & Sync State
  const [isGCalConnected, setIsGCalConnected] = useState(isGoogleCalendarConnected());
  const [gcalUser, setGcalUser] = useState(getConnectedGoogleUser());
  const [gcalConfig, setGcalConfig] = useState<GoogleCalendarConfig>(DEFAULT_GCAL_CONFIG);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; label: string; skipped?: number } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [selectedMeeting, setSelectedMeeting] = useState<AcademicMeeting | null>(null);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [activeHolidayMeeting, setActiveHolidayMeeting] = useState<AcademicMeeting | null>(null);
  const [googleGroupsModalOpen, setGoogleGroupsModalOpen] = useState(false);

  // Subscribe to Holidays, Sync Status & Config
  useEffect(() => {
    let isMounted = true;
    
    getAcademicHolidays().then(data => {
      if (isMounted) setHolidays(data);
    });

    getMeetingOverrides().then(data => {
      if (isMounted) setOverrides(data);
    });

    getCalendarSyncStatus().then(status => {
      if (isMounted) setSyncStatusMap(status);
    });

    getGoogleCalendarConfig().then(cfg => {
      if (isMounted) setGcalConfig(cfg);
    });

    const unsubscribeHolidays = subscribeAcademicHolidays((updated) => {
      if (isMounted) setHolidays(updated);
    });

    const handleAuthChange = (e: any) => {
      if (isMounted) {
        setIsGCalConnected(isGoogleCalendarConnected());
        setGcalUser(getConnectedGoogleUser());
      }
    };

    const handleCalendarUpdate = () => {
      getAcademicHolidays(true).then(data => { if (isMounted) setHolidays(data); });
      getMeetingOverrides(true).then(data => { if (isMounted) setOverrides(data); });
    };

    window.addEventListener('gcal-auth-changed', handleAuthChange);
    window.addEventListener('calendar-updated', handleCalendarUpdate);

    return () => {
      isMounted = false;
      unsubscribeHolidays();
      window.removeEventListener('gcal-auth-changed', handleAuthChange);
      window.removeEventListener('calendar-updated', handleCalendarUpdate);
    };
  }, []);

  // Synchronized meetings with holidays shifted and overrides applied
  const allMeetings = useMemo(() => {
    return getSynchronizedMeetings([], [], holidays, overrides);
  }, [holidays, overrides]);

  // Current month details
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(currentDate);
  }, [currentDate]);

  // Calendar Grid computation for Month View
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as day 0 in Indonesian standard (0 = Senin, 6 = Minggu)
    let firstDayIndex = firstDayOfMonth.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Sunday becomes 6

    const totalDays = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSaturday: boolean;
      meeting?: AcademicMeeting;
    }[] = [];

    const todayStr = formatLocalDateString(new Date());

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = formatLocalDateString(d);
      const isSat = d.getDay() === 6;
      const meeting = allMeetings.find(m => m.date === dateStr);
      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSaturday: isSat,
        meeting
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = formatLocalDateString(d);
      const isSat = d.getDay() === 6;
      const meeting = allMeetings.find(m => m.date === dateStr);
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSaturday: isSat,
        meeting
      });
    }

    // Next month padding (make total grid 35 or 42 cells)
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = formatLocalDateString(d);
      const isSat = d.getDay() === 6;
      const meeting = allMeetings.find(m => m.date === dateStr);
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSaturday: isSat,
        meeting
      });
    }

    return days;
  }, [year, month, allMeetings]);

  // Filtered meetings for agenda view
  const filteredMeetings = useMemo(() => {
    return allMeetings.filter(m => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'holiday') return m.isHoliday || m.status === 'holiday';
      return m.status === statusFilter;
    });
  }, [allMeetings, statusFilter]);

  // Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    // Jump to academic start month or current month
    setCurrentDate(new Date(2026, 7, 1));
  };

  // Google Calendar Integration Handlers
  const handleConnectGoogle = async () => {
    try {
      setSyncFeedback(null);
      await connectGoogleCalendar();
      setIsGCalConnected(true);
      setGcalUser(getConnectedGoogleUser());
      setSyncFeedback({
        type: 'success',
        message: 'Berhasil terhubung dengan Google Calendar!'
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Gagal menghubungkan Google Calendar.'
      });
    }
  };

  const handleDisconnectGoogle = () => {
    disconnectGoogleCalendar();
    setIsGCalConnected(false);
    setGcalUser(null);
    setSyncFeedback({
      type: 'success',
      message: 'Koneksi Google Calendar telah diputuskan.'
    });
  };

  const handleSyncAllToGoogle = async (forceAll = false) => {
    if (!isGCalConnected) {
      await handleConnectGoogle();
      if (!isGoogleCalendarConnected()) return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res: SyncResult = await batchSyncMeetingsToGoogleCalendar(
        allMeetings,
        {
          forceAll,
          onProgress: (processed, total, label, skipped) => {
            setSyncProgress({ current: processed, total, label, skipped });
          }
        }
      );

      // Refresh sync status
      const updatedStatus = await getCalendarSyncStatus();
      setSyncStatusMap(updatedStatus);

      if (res.success) {
        if (res.totalSkipped > 0 && res.totalSynced === 0) {
          setSyncFeedback({
            type: 'success',
            message: `Seluruh ${res.totalProcessed} sesi sudah up-to-date di Google Calendar (0 request baru, kuota API hemat 100%). Terhubung ke Google Groups ${gcalConfig.groupEmail}.`
          });
        } else {
          setSyncFeedback({
            type: 'success',
            message: `Berhasil memproses ${res.totalProcessed} sesi: ${res.totalSynced} diperbarui, ${res.totalSkipped} sudah cocok (dilewati demi efisiensi API). Target: ${gcalConfig.groupEmail}.`
          });
        }
      } else {
        setSyncFeedback({
          type: 'error',
          message: `Berhasil ${res.totalSynced} sesi, dilewati ${res.totalSkipped} sesi, kendala pada ${res.errors.length} sesi.`
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Gagal melakukan sinkronisasi otomatis.'
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleSyncSingleMeeting = async (meeting: AcademicMeeting, force = false) => {
    if (!isGCalConnected) {
      await handleConnectGoogle();
      if (!isGoogleCalendarConnected()) return;
    }

    setIsSyncing(true);
    try {
      const res = await syncMeetingToGoogleCalendar(meeting, undefined, gcalConfig, force);
      const updatedStatus = await getCalendarSyncStatus();
      setSyncStatusMap(updatedStatus);

      if (res.skipped) {
        setSyncFeedback({
          type: 'success',
          message: `Sesi ${meeting.meetingNumber > 0 ? `Pertemuan ${meeting.meetingNumber}` : 'Libur'} sudah sinkron dan tidak ada perubahan (0 pemanggilan API).`
        });
      } else {
        setSyncFeedback({
          type: 'success',
          message: `Sesi ${meeting.meetingNumber > 0 ? `Pertemuan ${meeting.meetingNumber}` : 'Libur'} berhasil disinkronkan ke Google Calendar (Grup: ${gcalConfig.groupEmail})!`
        });
      }

      if (res.htmlLink && !res.skipped) {
        window.open(res.htmlLink, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Gagal menyinkronkan pertemuan ini.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenHolidayModal = (meeting: AcademicMeeting) => {
    setActiveHolidayMeeting(meeting);
    setHolidayModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb & Title */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0362D0]/10 border border-[#0362D0]/20 text-[#0362D0] flex items-center justify-center shrink-0 shadow-xs">
              <CalendarDays size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Kalender Akademik BTQ
                </h1>
                <span className="text-xs font-bold bg-[#0362D0]/10 text-[#0362D0] px-2.5 py-0.5 rounded-full border border-[#0362D0]/20">
                  Semester Ganjil 2026/2027
                </span>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                  {holidays.length} Libur Ditetapkan
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tampilan antarmuka berstandar <strong>Google Calendar</strong> untuk memantau jadwal 16 pertemuan riil, penyesuaian hari libur fleksibel, dan sinkronisasi Google Calendar API.
              </p>
            </div>
          </div>

          {/* Google Calendar Connection Status & Quick Sync */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 self-start lg:self-auto">
              {/* Google Groups Info & Config Button */}
              <button
                type="button"
                onClick={() => setGoogleGroupsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="Atur email Google Groups dan proteksi limitasi API"
              >
                <Users size={14} className="text-[#0362D0]" />
                <span className="truncate max-w-[170px]">{gcalConfig.groupEmail}</span>
                <ShieldCheck size={13} className="text-emerald-600" />
              </button>

              {isGCalConnected ? (
                <>
                  <div className="flex items-center gap-2 px-2 text-xs text-slate-700">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold truncate max-w-[130px]">
                      {gcalUser?.email || 'Google Calendar Terhubung'}
                    </span>
                  </div>
                  
                  {/* Sync Buttons */}
                  <div className="inline-flex items-center rounded-lg shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleSyncAllToGoogle(false)}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg bg-[#0362D0] hover:bg-[#024ea7] text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                      title="Sinkronkan dengan proteksi Smart Diff (hanya kirim yang berubah demi menghemat kuota API)"
                    >
                      <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                      {isSyncing ? 'Memproses...' : 'Sinkronkan (Smart Diff)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSyncAllToGoogle(true)}
                      disabled={isSyncing}
                      className="px-2 py-1.5 rounded-r-lg bg-[#024ea7] hover:bg-[#023c82] border-l border-blue-400 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                      title="Paksa sinkronisasi ulang seluruh 16 sesi ke Google Calendar"
                    >
                      Paksa
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="text-xs text-slate-500 hover:text-rose-600 px-2 py-1 transition-colors cursor-pointer"
                    title="Putuskan koneksi Google Calendar"
                  >
                    Putus
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="gsi-material-button inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Hubungkan Google Calendar</span>
                </button>
              )}

              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#0362D0] px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                Buka Google Calendar <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* API Safety & Google Groups Badge Banner */}
        {isAdmin && (
          <>
            <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#0362D0]" /> Distribusi Otomatis:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-mono text-[11px] font-semibold">
                  {gcalConfig.groupEmail}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 text-[11px]">
                  Menghubungkan email seluruh mentor dan siswa tanpa batasan limit API
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                  <ShieldCheck size={12} className="text-emerald-600" /> Proteksi API: Smart Diff & Backoff Aktif
                </span>
                <button
                  type="button"
                  onClick={() => setGoogleGroupsModalOpen(true)}
                  className="text-[#0362D0] hover:text-[#024ea7] font-bold text-xs underline cursor-pointer"
                >
                  Kelola Pengaturan
                </button>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in ${
                syncFeedback.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-2">
                  {syncFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{syncFeedback.message}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSyncFeedback(null)} 
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Sync Progress Bar */}
            {syncProgress && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-blue-900">
                  <span>Menyinkronkan: {syncProgress.label}</span>
                  <span>
                    {syncProgress.current} / {syncProgress.total} Sesi
                    {syncProgress.skipped !== undefined && syncProgress.skipped > 0 ? ` (${syncProgress.skipped} dilewati via Smart Diff)` : ''}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#0362D0] h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main Google Calendar Header Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Controls: Today, Prev, Next, Month Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-3.5 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            Hari Ini
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Bulan Sebelumnya"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Bulan Berikutnya"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-800 capitalize select-none ml-1">
            {monthName}
          </h2>
        </div>

        {/* Filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Chips */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ongoing')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'ongoing' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Berjalan
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('upcoming')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'upcoming' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mendatang
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selesai
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('holiday')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'holiday' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Libur
            </button>
          </div>

          {/* View Toggle: Month vs Agenda */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month' 
                  ? 'bg-[#0362D0] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon size={14} />
              <span>Bulan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'agenda' 
                  ? 'bg-[#0362D0] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck2 size={14} />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: GOOGLE CALENDAR MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {/* Day Names Header (Senin - Minggu) */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-600 py-2 sm:py-3 select-none">
            <div><span className="sm:hidden">Sen</span><span className="hidden sm:inline">Senin</span></div>
            <div><span className="sm:hidden">Sel</span><span className="hidden sm:inline">Selasa</span></div>
            <div><span className="sm:hidden">Rab</span><span className="hidden sm:inline">Rabu</span></div>
            <div><span className="sm:hidden">Kam</span><span className="hidden sm:inline">Kamis</span></div>
            <div><span className="sm:hidden">Jum</span><span className="hidden sm:inline">Jumat</span></div>
            <div className="text-[#0362D0] font-black bg-blue-50/70 py-0.5 rounded-md mx-0.5 sm:mx-1">
              <span className="sm:hidden">Sab</span>
              <span className="hidden sm:inline">Sabtu (BTQ)</span>
            </div>
            <div><span className="sm:hidden">Min</span><span className="hidden sm:inline">Minggu</span></div>
          </div>

          {/* Calendar 7xN Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {calendarGrid.map((day, idx) => {
              const meeting = day.meeting;
              const hasMeeting = !!meeting;
              const isHoliday = meeting?.isHoliday || meeting?.status === 'holiday';
              const isSynced = meeting ? !!syncStatusMap[meeting.date] : false;

              // Filter out if status filter is active
              const passesFilter = !hasMeeting || statusFilter === 'all' || 
                (statusFilter === 'holiday' && isHoliday) || 
                meeting?.status === statusFilter;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (meeting) {
                      setSelectedMeeting(meeting);
                    } else if (isAdmin && day.isSaturday) {
                      // Click on blank Saturday allows setting holiday or custom session
                      handleOpenHolidayModal({
                        meetingNumber: 0,
                        date: day.dateStr,
                        dayName: 'Sabtu',
                        shortDateLabel: formatShortDateID(day.dateStr),
                        fullDateLabel: formatFullDateID(day.dateStr),
                        status: 'holiday',
                        title: 'Tandai Tanggal Libur',
                        isHoliday: true
                      });
                    }
                  }}
                  className={`min-h-[85px] sm:min-h-[125px] p-1 sm:p-2 transition-all flex flex-col justify-between relative group ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/60'
                  } ${day.isSaturday && day.isCurrentMonth ? 'bg-blue-50/20' : ''} ${
                    hasMeeting ? 'cursor-pointer hover:bg-slate-50/80' : ''
                  }`}
                >
                  {/* Date Number Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                        day.isToday
                          ? 'bg-[#0362D0] text-white shadow-xs'
                          : day.isCurrentMonth
                          ? day.isSaturday 
                            ? 'text-[#0362D0] font-black' 
                            : 'text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {/* Quick action button for Saturday */}
                    {day.isSaturday && day.isCurrentMonth && (
                      <span className="text-[9px] sm:text-[10px] font-semibold text-blue-600 bg-blue-100/60 px-1 sm:px-1.5 py-0.5 rounded">
                        07:00
                      </span>
                    )}
                  </div>

                  {/* Event Chip */}
                  {hasMeeting && passesFilter && (
                    <div className="mt-0.5 sm:mt-1 space-y-1">
                      {isHoliday ? (
                        <div 
                          className="px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] sm:text-[11px] font-bold shadow-2xs hover:bg-amber-100 transition-colors"
                          title={meeting.title}
                        >
                          <div className="flex items-center gap-1 text-amber-700">
                            <CalendarOff size={11} className="shrink-0" />
                            <span className="truncate">Libur: {meeting.notes || 'Ditiadakan'}</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-bold shadow-2xs transition-all ${
                            meeting.status === 'completed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                              : meeting.status === 'ongoing'
                              ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100 ring-1 ring-blue-400'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">
                              P{meeting.meetingNumber} • {meeting.title.replace(/^Pertemuan \d+\s*\((.+)\)$/, '$1')}
                            </span>
                            {isSynced && (
                              <span title="Tersinkron ke Google Calendar" className="text-blue-600 shrink-0">
                                <Link2 size={10} />
                              </span>
                            )}
                          </div>
                          <div className="hidden sm:flex items-center justify-between text-[10px] font-semibold opacity-75 mt-0.5">
                            <span>07:00 - 08:30 WIB</span>
                            <span>{meeting.status === 'completed' ? '✓ Hadir' : meeting.status === 'ongoing' ? '● Aktif' : 'Akan Datang'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty state placeholder for Saturday without meeting */}
                  {day.isSaturday && !hasMeeting && day.isCurrentMonth && (
                    <div className="mt-auto text-[10px] text-slate-400 text-center py-1">
                      {isAdmin ? '+ Set Libur' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: GOOGLE CALENDAR AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck2 size={18} className="text-[#0362D0]" />
              <h3 className="font-bold text-slate-800 text-sm">
                Daftar Agenda Pertemuan Semester 1 (16 Pertemuan Fleksibel)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Menampilkan {filteredMeetings.length} entri
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredMeetings.map((m) => {
              const isHoliday = m.isHoliday || m.status === 'holiday';
              const isSynced = !!syncStatusMap[m.date];

              return (
                <div 
                  key={m.date} 
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors ${
                    isHoliday ? 'bg-amber-50/40' : ''
                  }`}
                >
                  {/* Left: Date Badge */}
                  <div className="flex items-center gap-4 min-w-[220px]">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border shadow-2xs shrink-0 ${
                      isHoliday 
                        ? 'bg-amber-100/70 border-amber-300 text-amber-900' 
                        : m.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : m.status === 'ongoing'
                        ? 'bg-blue-50 border-blue-200 text-blue-800 ring-2 ring-blue-400'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <span className="text-[11px] uppercase font-bold tracking-wider">
                        {m.shortDateLabel.split(' ')[1] || 'SAB'}
                      </span>
                      <span className="text-xl leading-none">
                        {m.date.split('-')[2]}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {m.fullDateLabel}
                        </span>
                        {isSynced && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Link2 size={10} /> Google Calendar
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          <Clock size={12} className="text-[#0362D0]" /> 07:00 - 08:30 WIB
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" /> SMPN 102 Jakarta
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Meeting Topic & Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isHoliday ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          DILIBURKAN
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          m.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                            : m.status === 'ongoing'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          Pertemuan Ke-{m.meetingNumber}
                        </span>
                      )}

                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {m.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      {isHoliday 
                        ? `Alasan: ${m.notes || 'Sesi libur diset oleh admin'}. Penomoran pertemuan otomatis digeser ke pekan berikutnya tanpa mengurangi kehadiran.`
                        : 'Materi kurikulum BTQ terstandar: Orientasi, Tahsin Tilawah Al-Qur\'an, Tajwid, dan Hafalan Juz 30.'}
                    </p>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                    {/* Add to Google Calendar (Direct Web Link) */}
                    <a
                      href={generateGoogleCalendarWebLink(m, gcalConfig.groupEmail)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                      title="Tambahkan ke Google Calendar pribadi"
                    >
                      <ExternalLink size={12} />
                      <span>Ke Kalender</span>
                    </a>

                    {/* API Sync */}
                    {isGCalConnected && (
                      <button
                        type="button"
                        onClick={() => handleSyncSingleMeeting(m)}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0362D0] text-xs font-bold transition-colors cursor-pointer"
                        title="Sinkronkan dengan Google Calendar API"
                      >
                        <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                        <span>Sync API</span>
                      </button>
                    )}

                    {/* Presensi Link (If not holiday) */}
                    {!isHoliday && (
                      <Link
                        to="/attendance/students"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <CheckSquare size={12} />
                        <span>Presensi</span>
                      </Link>
                    )}

                    {/* Admin: Set / Remove Holiday */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenHolidayModal(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <Settings2 size={12} />
                        <span>{isHoliday ? 'Ubah Libur' : 'Set Libur'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAILED MEETING DRAWER / POPUP MODAL */}
      {selectedMeeting && (
        <ModalPortal isOpen={!!selectedMeeting} onClose={() => setSelectedMeeting(null)}>
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 text-white relative ${
              selectedMeeting.isHoliday 
                ? 'bg-gradient-to-r from-amber-600 to-amber-700' 
                : 'bg-gradient-to-r from-[#0362D0] to-[#172033]'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                <span>{selectedMeeting.dayName}, {selectedMeeting.shortDateLabel}</span>
                <span>•</span>
                <span>07:00 - 08:30 WIB</span>
              </div>

              <h3 className="text-xl font-black text-white">
                {selectedMeeting.title}
              </h3>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {selectedMeeting.isHoliday ? 'Status: Hari Libur' : `Pertemuan Ke-${selectedMeeting.meetingNumber}`}
                </span>
                {syncStatusMap[selectedMeeting.date] && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/80 text-white inline-flex items-center gap-1">
                    <CheckCircle2 size={12} /> Google Calendar Synced
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <Clock size={16} className="text-[#0362D0] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Waktu Pelaksanaan:</span>
                    <p>Sabtu Pagi, 07:00 - 08:30 WIB (90 Menit)</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-[#0362D0] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Lokasi:</span>
                    <p>Lingkungan SMP Negeri 102 Jakarta, Jl. Raya Cijantung, Jakarta Timur</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <BookOpen size={16} className="text-[#0362D0] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Cakupan Pembelajaran:</span>
                    <p>
                      {selectedMeeting.isHoliday 
                        ? `Sesi pembelajaran ditiadakan (${selectedMeeting.notes || 'Libur'}). Progres materi dan nomor pertemuan bergeser ke Sabtu berikutnya.`
                        : 'Standarisasi bacaan Al-Qur\'an, perbaikan makhraj dan sifat huruf, hukum tajwid tartil, serta setoran hafalan surah juz 30.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mail size={16} className="text-[#0362D0] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Distribusi Undangan Kalender:</span>
                    <p className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[11px] font-bold text-[#0362D0] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {gcalConfig.groupEmail}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Google Groups menghubungkan seluruh mentor & siswa)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={generateGoogleCalendarWebLink(selectedMeeting, gcalConfig.groupEmail)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Buka di Google Calendar</span>
                  </a>

                  {isGCalConnected && (
                    <button
                      type="button"
                      onClick={() => handleSyncSingleMeeting(selectedMeeting, true)}
                      disabled={isSyncing}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0362D0] text-xs font-bold transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                      <span>Sync API</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedMeeting;
                        setSelectedMeeting(null);
                        handleOpenHolidayModal(target);
                      }}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Settings2 size={14} />
                      <span>{selectedMeeting.isHoliday ? 'Ubah Libur' : 'Set Libur'}</span>
                    </button>
                  )}

                  {!selectedMeeting.isHoliday && (
                    <Link
                      to="/attendance/students"
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0362D0] hover:bg-[#024ea7] text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <CheckSquare size={14} />
                      <span>Presensi Siswa</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Holiday Configuration Modal */}
      {holidayModalOpen && activeHolidayMeeting && (
        <HolidayConfigModal
          isOpen={holidayModalOpen}
          onClose={() => {
            setHolidayModalOpen(false);
            setActiveHolidayMeeting(null);
          }}
          meeting={activeHolidayMeeting}
          existingHoliday={holidays.find(h => h.date === activeHolidayMeeting.date)}
          existingOverride={overrides.find(o => o.meetingNumber === activeHolidayMeeting.meetingNumber)}
          isAdmin={isAdmin}
          onHolidayUpdated={async () => {
            const freshHolidays = await getAcademicHolidays(true);
            const freshOverrides = await getMeetingOverrides(true);
            setHolidays(freshHolidays);
            setOverrides(freshOverrides);
          }}
        />
      )}

      {/* Google Groups & API Safety Modal */}
      {googleGroupsModalOpen && (
        <GoogleGroupsConfigModal
          isOpen={googleGroupsModalOpen}
          onClose={() => setGoogleGroupsModalOpen(false)}
          isAdmin={isAdmin}
          onConfigSaved={(updated) => {
            setGcalConfig(updated);
          }}
        />
      )}
    </div>
  );
}
