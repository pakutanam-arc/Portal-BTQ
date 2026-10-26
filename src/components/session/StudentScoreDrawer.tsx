import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  CheckCircle2, 
  Award, 
  Sparkles, 
  BookOpen, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  TrendingUp, 
  Sliders,
  FileText
} from 'lucide-react';
import { Student, StudentProgress } from '../../services/db';
import { JUZ_30_SURAHS, Grade } from '../../services/curriculumData';
import { cn } from '../../utils/cn';

interface StudentScoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  progress: Partial<StudentProgress>;
  status: string;
  onProgressChange: (studentId: string, field: keyof StudentProgress, value: any) => void;
  onStatusChange: (studentId: string, status: string) => void;
  onNotesChange?: (studentId: string, notes: string) => void;
  studentNotes?: string;
  currentGrade: Grade;
  meetingNumber: number;
  onPrevStudent?: () => void;
  onNextStudent?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  studentIndex?: number;
  totalStudents?: number;
  onSendWA?: (student: Student, status: string, progressData?: any) => void;
}

export function StudentScoreDrawer({
  isOpen,
  onClose,
  student,
  progress,
  status,
  onProgressChange,
  onStatusChange,
  onNotesChange,
  studentNotes = '',
  currentGrade,
  meetingNumber,
  onPrevStudent,
  onNextStudent,
  hasPrev = false,
  hasNext = false,
  studentIndex = 0,
  totalStudents = 0,
  onSendWA
}: StudentScoreDrawerProps) {
  if (!isOpen || !student) return null;

  const isGrade3 = currentGrade.id === 'grade3';

  const reading = progress.reading ?? 0;
  const tajwid = progress.tajwid ?? 0;
  const writing = progress.writing ?? 0;
  const memorization = progress.memorization ?? 0;
  const memorizedSurah = progress.memorizedSurah || '';
  const total = progress.total ?? 0;

  const scoreBadge = total >= 85 
    ? { label: 'Sangat Baik (A)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : total >= 75
    ? { label: 'Baik (B)', color: 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20' }
    : total > 0
    ? { label: 'Perlu Bimbingan (C)', color: 'bg-rose-50 text-rose-700 border-rose-200' }
    : { label: 'Belum Dinilai', color: 'bg-slate-100 text-slate-600 border-slate-200' };

  const handleQuickPreset = (field: keyof StudentProgress, value: number) => {
    onProgressChange(student.id, field, value);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#172033]/60 backdrop-blur-xs transition-opacity"
        />

        {/* Drawer panel */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 pointer-events-none">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-screen max-w-md bg-white pointer-events-auto flex flex-col shadow-2xl border-l border-slate-100 h-full max-h-screen"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#172033] to-[#1E293B] text-white flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0362D0] flex items-center justify-center text-white font-black shrink-0 border border-white/20">
                  <User size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-xs sm:text-sm leading-tight text-white truncate max-w-[140px] sm:max-w-[190px]" title={student.name}>
                      {student.name}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/15 text-slate-200 border border-white/20 shrink-0">
                      {student.class}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium truncate mt-0.5">
                    NIS: {student.nis || '-'} • Ke-{meetingNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {totalStudents > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                    {studentIndex + 1}/{totalStudents}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer shrink-0 border border-white/20"
                  aria-label="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Attendance Status Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                Status Presensi:
              </span>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                {[
                  { label: 'Hadir', activeClass: 'bg-emerald-600 text-white font-black shadow-2xs' },
                  { label: 'Izin', activeClass: 'bg-amber-500 text-white font-black shadow-2xs' },
                  { label: 'Sakit', activeClass: 'bg-blue-600 text-white font-black shadow-2xs' },
                  { label: 'Alpa', activeClass: 'bg-rose-600 text-white font-black shadow-2xs' }
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onStatusChange(student.id, item.label)}
                    className={cn(
                      "px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                      status === item.label
                        ? item.activeClass
                        : "text-slate-600 hover:text-[#172033]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Score Form Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {status !== 'Hadir' ? (
                <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#172033]">Santri Berstatus {status}</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Penilaian akademik KBM tidak diaktifkan karena santri tidak hadir pada sesi ini. Ubah status ke <strong>Hadir</strong> untuk memberi nilai.
                  </p>
                  <button
                    type="button"
                    onClick={() => onStatusChange(student.id, 'Hadir')}
                    className="mt-4 px-4 py-2 bg-[#0362D0] text-white rounded-xl text-xs font-bold hover:bg-[#0250AA] transition-colors cursor-pointer"
                  >
                    Ubah ke Hadir
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary Score Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Rata-Rata Mutu Kualitas
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-black text-[#172033]">{total}</span>
                        <span className="text-xs text-slate-500 font-bold">/ 100</span>
                      </div>
                    </div>
                    <span className={cn("px-3 py-1 rounded-xl text-xs font-black border", scoreBadge.color)}>
                      {scoreBadge.label}
                    </span>
                  </div>

                  {/* 1. Nilai Membaca (Grade 3 / Tahfidz or general) */}
                  {isGrade3 && (
                    <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                          <BookOpen size={14} className="text-[#0362D0]" />
                          Kelancaran Membaca Al-Qur'an
                        </label>
                        <span className="text-sm font-black text-[#0362D0]">{reading}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={reading}
                          onChange={(e) => onProgressChange(student.id, 'reading', parseInt(e.target.value) || 0)}
                          className="w-full accent-[#0362D0] cursor-pointer"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={reading}
                          onChange={(e) => onProgressChange(student.id, 'reading', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-16 h-9 text-center font-black text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {[75, 80, 85, 90, 95].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleQuickPreset('reading', val)}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer",
                              reading === val 
                                ? "bg-[#0362D0] text-white border-[#0362D0]" 
                                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Tajwid & Makhraj */}
                  <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#C99A2E]" />
                        Tajwid & Ketepatan Makhraj
                      </label>
                      <span className="text-sm font-black text-[#C99A2E]">{tajwid}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={tajwid}
                        onChange={(e) => onProgressChange(student.id, 'tajwid', parseInt(e.target.value) || 0)}
                        className="w-full accent-[#C99A2E] cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tajwid}
                        onChange={(e) => onProgressChange(student.id, 'tajwid', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-16 h-9 text-center font-black text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {[75, 80, 85, 90, 95].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleQuickPreset('tajwid', val)}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer",
                            tajwid === val 
                              ? "bg-[#C99A2E] text-white border-[#C99A2E]" 
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Kaidah Menulis / Rasm */}
                  <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                        <Sliders size={14} className="text-slate-600" />
                        Kaidah Menulis Huruf Hijaiyah
                      </label>
                      <span className="text-sm font-black text-slate-700">{writing}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={writing}
                        onChange={(e) => onProgressChange(student.id, 'writing', parseInt(e.target.value) || 0)}
                        className="w-full accent-slate-700 cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={writing}
                        onChange={(e) => onProgressChange(student.id, 'writing', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-16 h-9 text-center font-black text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {[75, 80, 85, 90, 95].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleQuickPreset('writing', val)}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer",
                            writing === val 
                              ? "bg-slate-800 text-white border-slate-800" 
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Setoran Hafalan Surah (Khusus Kelas 9 / Kelompok 10 Grade 3) */}
                  {isGrade3 && (
                    <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                          <Award size={14} className="text-emerald-600" />
                          Setoran Hafalan (Juz 30)
                        </label>
                        <span className="text-sm font-black text-emerald-700">{memorization}</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Nama Surah / Ayat:</span>
                        <input
                          type="text"
                          list="drawer-juz30-surahs"
                          placeholder="Pilih atau ketik surah (misal: QS. An-Naba' 1-20)"
                          value={memorizedSurah}
                          onChange={(e) => onProgressChange(student.id, 'memorizedSurah', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#172033] focus:bg-white focus:ring-2 focus:ring-[#0362D0] outline-none"
                        />
                        <datalist id="drawer-juz30-surahs">
                          {JUZ_30_SURAHS.map(s => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={memorization}
                          onChange={(e) => onProgressChange(student.id, 'memorization', parseInt(e.target.value) || 0)}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={memorization}
                          onChange={(e) => onProgressChange(student.id, 'memorization', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-16 h-9 text-center font-black text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* 5. Catatan Khusus Santri */}
                  {onNotesChange && (
                    <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                      <label className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-500" />
                        Catatan Khusus Mentor untuk Santri Ini
                      </label>
                      <textarea
                        rows={2}
                        value={studentNotes}
                        onChange={(e) => onNotesChange(student.id, e.target.value)}
                        placeholder="Contoh: Perlu perhatian di huruf Ra tebal/tipis, adab membaca baik..."
                        className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0362D0] outline-none font-medium"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 shrink-0 pb-safe pb-6 sm:pb-4">
              {/* WhatsApp Notification Direct Button */}
              {onSendWA && (
                <button
                  type="button"
                  onClick={() => onSendWA(student, status, progress)}
                  className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageCircle size={14} className="text-emerald-600" />
                  <span>Kirim Laporan WA ke Ortu</span>
                </button>
              )}

              {/* Prev / Next Santri Navigation Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={onPrevStudent}
                  className="py-2.5 px-2 bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} className="shrink-0" />
                  <span className="truncate">Sebelumnya</span>
                </button>

                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextStudent}
                  className="py-2.5 px-2 bg-[#0362D0] hover:bg-[#0250AA] active:bg-[#013F88] disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <span className="truncate">Lanjut Santri</span>
                  <ChevronRight size={16} className="shrink-0" />
                </button>
              </div>

              {/* Dedicated Selesai / Tutup Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-[#172033] border border-slate-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Check size={15} className="text-emerald-600" />
                <span>Selesai & Tutup Nilai</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
