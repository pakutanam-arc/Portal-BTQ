import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Trash2, 
  Sparkles,
  Info,
  CalendarOff,
  SunMedium,
  Edit3,
  RotateCcw,
  BookOpen,
  Save
} from 'lucide-react';
import { AcademicMeeting, formatFullDateID } from '../../services/academicCalendar';
import { 
  saveAcademicHoliday, 
  deleteAcademicHoliday, 
  AcademicHoliday,
  saveMeetingOverride,
  deleteMeetingOverride,
  MeetingOverride
} from '../../services/db/calendar';
import { ModalPortal } from '../ui/ModalPortal';

interface HolidayConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: AcademicMeeting | null;
  existingHoliday?: AcademicHoliday;
  existingOverride?: MeetingOverride;
  onHolidayUpdated?: () => void;
  isAdmin?: boolean;
}

export const HolidayConfigModal: React.FC<HolidayConfigModalProps> = ({
  isOpen,
  onClose,
  meeting,
  existingHoliday,
  existingOverride,
  onHolidayUpdated,
  isAdmin = true
}) => {
  const [activeTab, setActiveTab] = useState<'reschedule' | 'holiday'>('reschedule');
  const [reason, setReason] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (meeting) {
      setReason(existingHoliday?.reason || meeting.notes || '');
      setCustomDate(existingOverride?.customDate || meeting.date || '');
      setCustomTitle(existingOverride?.customTitle || meeting.title || '');
      setActiveTab(existingHoliday || meeting.isHoliday ? 'holiday' : 'reschedule');
      setError(null);
      setSuccessMsg(null);
    }
  }, [meeting, existingHoliday, existingOverride, isOpen]);

  if (!isOpen || !meeting) return null;

  const isHoliday = !!existingHoliday || meeting.isHoliday;
  const isOverridden = !!existingOverride || (customDate && customDate !== meeting.date) || (customTitle && customTitle !== meeting.title);
  const targetDate = meeting.date;

  const quickReasons = [
    'Libur Nasional / Keagamaan',
    'Penilaian Tengah Semester (PTS)',
    'Penilaian Akhir Semester (PAS)',
    'Kegiatan Lomba & Porseni Sekolah',
    'Jeda Tengah Semester'
  ];

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Mohon cantumkan keterangan alasan libur');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveAcademicHoliday({
        date: targetDate,
        reason: reason.trim(),
        semester: 1,
        academicYear: '2026/2027',
        createdBy: 'Admin BTQ'
      });
      onHolidayUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Gagal menyimpan hari libur:", err);
      setError(err?.message || 'Gagal menyimpan data hari libur ke Cloud Firestore');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHoliday = async () => {
    setLoading(true);
    setError(null);

    try {
      await deleteAcademicHoliday(targetDate);
      onHolidayUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Gagal menghapus hari libur:", err);
      setError(err?.message || 'Gagal menghapus status libur dari Cloud Firestore');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (meeting.meetingNumber === 0) return;
    if (!customDate) {
      setError('Tanggal pelaksanaan tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveMeetingOverride({
        meetingNumber: meeting.meetingNumber,
        customDate: customDate !== meeting.date ? customDate : undefined,
        customTitle: customTitle.trim() !== meeting.title ? customTitle.trim() : undefined
      });
      setSuccessMsg('Perubahan jadwal & topik berhasil disimpan!');
      onHolidayUpdated?.();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Gagal menyimpan penyesuaian pertemuan:", err);
      setError(err?.message || 'Gagal menyimpan perubahan jadwal pertemuan.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetOverride = async () => {
    if (meeting.meetingNumber === 0) return;
    setLoading(true);
    setError(null);

    try {
      await deleteMeetingOverride(meeting.meetingNumber);
      onHolidayUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Gagal mereset jadwal pertemuan:", err);
      setError(err?.message || 'Gagal mereset jadwal ke default.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div 
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-3rem)] overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b shrink-0 ${
          isHoliday ? 'bg-amber-500/10 border-amber-200' : 'bg-[#0362D0]/10 border-[#0362D0]/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isHoliday 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'bg-[#0362D0] text-white shadow-sm'
            }`}>
              {isHoliday ? <CalendarOff size={20} /> : <Edit3 size={20} />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">
                {meeting.meetingNumber > 0 
                  ? `Kelola Pertemuan Ke-${meeting.meetingNumber}` 
                  : 'Kelola Hari Libur Akademik'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatFullDateID(targetDate)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        {meeting.meetingNumber > 0 && (
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab('reschedule'); setError(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'reschedule'
                  ? 'bg-white text-[#0362D0] shadow-2xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 size={14} />
              <span>Ubah Jadwal & Topik</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('holiday'); setError(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'holiday'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarOff size={14} />
              <span>Status Hari Libur</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: RESCHEDULE & CUSTOM TITLE */}
          {activeTab === 'reschedule' && meeting.meetingNumber > 0 && (
            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Sesi Efektif:</span>
                  <span className="font-bold text-[#0362D0]">
                    Pertemuan Ke-{meeting.meetingNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tanggal Asli (Sistem):</span>
                  <span className="font-semibold text-slate-700">
                    {formatFullDateID(meeting.date)}
                  </span>
                </div>
              </div>

              {/* Input Tanggal Pelaksanaan Custom */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Tanggal Pelaksanaan Pertemuan</span>
                  <span className="text-[10px] text-slate-400 font-normal">Format: Tanggal Riil</span>
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0362D0]/20 focus:border-[#0362D0] text-slate-800 font-medium bg-white"
                />
              </div>

              {/* Input Judul Topik Custom */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Judul / Topik Pertemuan</span>
                  <span className="text-[10px] text-slate-400 font-normal">Agenda Silabus</span>
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Contoh: Pertemuan 9 (Penguatan Mutqin Juz 30)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0362D0]/20 focus:border-[#0362D0] text-slate-800 font-medium bg-white"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
                <Info size={16} className="text-[#0362D0] shrink-0 mt-0.5" />
                <div>
                  <strong>Fleksibilitas Agenda:</strong> Mengubah tanggal atau topik di sini akan menyesuaikan tampilan kalender secara terpusat di Firestore untuk seluruh akun.
                </div>
              </div>

              {isAdmin ? (
                <div className="pt-2 flex items-center gap-2">
                  {existingOverride && (
                    <button
                      type="button"
                      onClick={handleResetOverride}
                      disabled={loading}
                      title="Kembalikan ke jadwal bawaan sistem"
                      className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>Reset</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !customDate}
                    className="flex-2 py-2.5 px-4 rounded-xl bg-[#0362D0] hover:bg-[#024ea7] active:bg-blue-900 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    <span>Simpan Perubahan Jadwal</span>
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 font-medium py-1">
                  Hanya akun Admin yang dapat mengubah jadwal kalender.
                </div>
              )}
            </form>
          )}

          {/* TAB 2: HOLIDAY CONFIGURATION */}
          {(activeTab === 'holiday' || meeting.meetingNumber === 0) && (
            <div className="space-y-4">
              {isHoliday ? (
                /* MODE: SUDAH LIBUR -> OPSI AKTIFKAN KEMBALI */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-amber-900">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                        Status: Sesi Diliburkan
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      Alasan: &ldquo;{existingHoliday?.reason || meeting.notes || 'Hari Libur Sekolah'}&rdquo;
                    </p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Pada tanggal ini, sesi BTQ ditiadakan dan tidak diperhitungkan dalam persentase absensi santri. Sesi pertemuan berikutnya otomatis dialihkan ke Sabtu depan.
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleRemoveHoliday}
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <SunMedium size={16} />
                        )}
                        <span>Batalkan Status Libur & Aktifkan Kembali Sesi</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* MODE: SESI AKTIF -> OPSI SET LIBUR */
                <form onSubmit={handleSaveHoliday} className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Jadwal Sesi:</span>
                      <span className="font-bold text-slate-800">
                        Pertemuan Ke-{meeting.meetingNumber} ({meeting.shortDateLabel})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Materi Pokok:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[240px]">
                        {meeting.title}
                      </span>
                    </div>
                  </div>

                  {/* Input Alasan Libur */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Alasan Pertemuan Diliburkan</span>
                      <span className="text-[11px] text-amber-600 font-semibold">*Wajib diisi</span>
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Contoh: Libur Maulid Nabi, Jeda PTS, Kegiatan Sekolah..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-medium"
                    />

                    {/* Quick Suggestion Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {quickReasons.map((pill) => (
                        <button
                          key={pill}
                          type="button"
                          onClick={() => setReason(pill)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Informational Guidance */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Sistem Otomatis:</strong> Sesi <strong>Pertemuan Ke-{meeting.meetingNumber}</strong> akan secara otomatis digeser ke Sabtu berikutnya. Santri <strong>tidak akan tercatat alpa</strong> pada tanggal libur ini.
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !reason.trim()}
                        className="flex-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CalendarOff size={15} />
                        )}
                        <span>Tandai Sebagai Hari Libur</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 font-medium py-1">
                      Hanya akun Admin yang dapat menandai jadwal libur.
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
