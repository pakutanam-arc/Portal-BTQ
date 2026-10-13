import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  CalendarDays, 
  ChevronRight, 
  Sparkles,
  Info,
  ExternalLink,
  CalendarOff,
  Settings2,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AcademicMeeting, getSynchronizedMeetings, formatFullDateID } from '../../services/academicCalendar';
import { getAcademicHolidays, subscribeAcademicHolidays, AcademicHoliday } from '../../services/db/calendar';
import { HolidayConfigModal } from './HolidayConfigModal';

interface AcademicCalendarCardProps {
  allAttendance?: { meetingNumber?: number; date?: string }[];
  journals?: { meetingNumber?: number; date?: string; title?: string }[];
  onSelectMeeting?: (meetingNumber: number) => void;
  selectedMeetingNumber?: number;
  isAdmin?: boolean;
}

export const AcademicCalendarCard: React.FC<AcademicCalendarCardProps> = ({
  allAttendance = [],
  journals = [],
  onSelectMeeting,
  selectedMeetingNumber,
  isAdmin = true
}) => {
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact');
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [activeConfigMeeting, setActiveConfigMeeting] = useState<AcademicMeeting | null>(null);

  // Muat & dengarkan perubahan hari libur dari Firestore
  useEffect(() => {
    let isMounted = true;
    getAcademicHolidays().then(data => {
      if (isMounted) setHolidays(data);
    });

    const unsubscribe = subscribeAcademicHolidays((updatedList) => {
      if (isMounted) setHolidays(updatedList);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const meetings = getSynchronizedMeetings(allAttendance, journals, holidays);
  
  // Ambil pertemuan aktif
  const currentMeeting = meetings.find(m => m.status === 'ongoing' && !m.isHoliday) || 
                         meetings.find(m => m.meetingNumber === 3) || 
                         meetings[0];

  const holidayCount = holidays.length;

  const displayedMeetings = viewMode === 'compact' 
    ? meetings.slice(0, 8 + holidayCount) 
    : meetings;

  const handleTileClick = (meeting: AcademicMeeting) => {
    if (isAdmin) {
      setActiveConfigMeeting(meeting);
      setConfigModalOpen(true);
    } else if (onSelectMeeting && meeting.meetingNumber > 0) {
      onSelectMeeting(meeting.meetingNumber);
    }
  };

  const activeHolidayObj = activeConfigMeeting 
    ? holidays.find(h => h.date === activeConfigMeeting.date)
    : undefined;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-base">Kalender Akademik BTQ</h3>
              <span className="text-[11px] font-semibold bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Semester 1 (Fleksibel)
              </span>
              {holidayCount > 0 && (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  {holidayCount} Libur Diset
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal sesi berbasis <strong>Pertemuan Ke-</strong> riil (Sabtu Pagi). {isAdmin ? 'Klik tanggal kartu untuk menandai libur atau reschedule.' : 'Tanggal riil tersinkronisasi otomatis.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0362D0] hover:bg-[#024ea7] text-white transition-colors shadow-2xs"
          >
            <CalendarIcon size={13} />
            <span>Tampilan Google Calendar</span>
            <ChevronRight size={13} />
          </Link>
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'compact' ? 'full' : 'compact')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
          >
            {viewMode === 'compact' ? `Lihat Semua (${meetings.length})` : 'Tampilan Ringkas (8)'}
          </button>
        </div>
      </div>

      {/* Info Banner Fleksibel */}
      <div className="mt-3.5 mb-4 px-3.5 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Info size={15} className="text-emerald-600 shrink-0" />
          <span>
            Pertemuan aktif saat ini: <strong>Pertemuan {currentMeeting.meetingNumber} ({currentMeeting.shortDateLabel})</strong>. Jika ada hari libur, sesi otomatis digeser tanpa mengurangi kehadiran santri.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {isAdmin && (
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Settings2 size={12} className="text-[#0362D0]" /> Klik tanggal untuk set libur
            </span>
          )}
          <Link 
            to="/attendance" 
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 hover:underline"
          >
            Presensi Siswa <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Grid Pertemuan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {displayedMeetings.map((item, index) => {
          const isSelected = selectedMeetingNumber === item.meetingNumber && !item.isHoliday;
          const isCompleted = item.status === 'completed';
          const isOngoing = item.status === 'ongoing';
          const isHoliday = item.isHoliday || item.status === 'holiday';

          let statusBg = 'bg-slate-50 border-slate-200 text-slate-600';
          let statusBadge = (
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
              <Clock size={10} /> Terjadwal
            </span>
          );

          if (isHoliday) {
            statusBg = 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/30 text-amber-950';
            statusBadge = (
              <span className="text-[10px] text-amber-800 font-bold flex items-center gap-0.5 bg-amber-100 px-1 py-0.2 rounded">
                <CalendarOff size={10} className="text-amber-700" /> Libur
              </span>
            );
          } else if (isCompleted) {
            statusBg = 'bg-emerald-50/50 border-emerald-200/70 text-slate-800';
            statusBadge = (
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                <CheckCircle2 size={10} className="text-emerald-600" /> Selesai
              </span>
            );
          } else if (isOngoing) {
            statusBg = 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 text-slate-900';
            statusBadge = (
              <span className="text-[10px] text-blue-700 font-bold flex items-center gap-0.5">
                <Sparkles size={10} className="text-blue-600" /> Aktif
              </span>
            );
          }

          return (
            <div
              key={`${item.date}-${index}`}
              onClick={() => handleTileClick(item)}
              title={isAdmin ? 'Klik untuk atur libur / reschedule' : item.fullDateLabel}
              className={`p-2.5 rounded-xl border transition-all text-left relative cursor-pointer hover:shadow-md hover:scale-[1.02] ${statusBg} ${
                isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-bold text-xs">
                  {isHoliday ? (
                    <span className="text-amber-900 font-black">Libur</span>
                  ) : (
                    <span className="text-slate-800 font-black">P-{item.meetingNumber}</span>
                  )}
                </span>
                {statusBadge}
              </div>

              <div className="text-[13px] font-bold tracking-tight">
                {item.shortDateLabel}
              </div>

              <div className="text-[10px] mt-0.5 truncate font-medium">
                {isHoliday ? (
                  <span className="text-amber-800 font-bold truncate block" title={item.notes}>
                    {item.notes || 'Diliburkan'}
                  </span>
                ) : (
                  <span className="text-slate-500">{item.dayName}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Pengaturan Hari Libur (Admin) */}
      <HolidayConfigModal
        isOpen={configModalOpen}
        onClose={() => {
          setConfigModalOpen(false);
          setActiveConfigMeeting(null);
        }}
        meeting={activeConfigMeeting}
        existingHoliday={activeHolidayObj}
        isAdmin={isAdmin}
      />
    </div>
  );
};
