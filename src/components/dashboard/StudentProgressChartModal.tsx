import React, { useState } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  Info,
  UserCheck,
  Clock,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Grade } from '../../services/curriculumData';

export interface SessionHistoryItem {
  sessionNumber: number;
  sessionId: string;
  topic: string;
  pageRef?: string;
  date: string;
  reading: number;
  tajwid: number;
  writing: number;
  memorization?: number;
  memorizedSurah?: string;
  total: number;
  diffFromPrev: number;
  status: 'Meningkat' | 'Menurun' | 'Konsisten';
}

export interface StudentAttendanceHistoryItem {
  meetingNumber: number;
  date: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  notes?: string;
}

export interface StudentWithStats {
  id: string;
  name: string;
  nis: string;
  groupId: string;
  class: string;
  gender: string;
  status: string;
  currentStage: string;
  progressScore: number;
  attendanceRate: number;
  attendanceHistory?: StudentAttendanceHistoryItem[];
  statusCategory: 'Sangat Baik' | 'Baik' | 'Perlu Bimbingan';
  sessionHistory: SessionHistoryItem[];
  trend: 'Meningkat' | 'Menurun' | 'Konsisten';
  trendDiff: number;
  latestSessionNumber: number;
}

interface StudentProgressChartModalProps {
  student: StudentWithStats | null;
  onClose: () => void;
  targetGrade: Grade;
  groupName?: string;
}

export function StudentProgressChartModal({ 
  student, 
  onClose, 
  targetGrade,
  groupName 
}: StudentProgressChartModalProps) {
  if (!student) return null;

  const [activeTab, setActiveTab] = useState<'progress' | 'attendance'>('progress');

  const isGrade3 = targetGrade.id === 'grade3';
  const history = student.sessionHistory || [];
  const latestSession = history[history.length - 1];
  const firstSession = history[0];

  const overallDiff = firstSession && latestSession 
    ? latestSession.total - firstSession.total 
    : 0;

  // Chart data formatting
  const chartData = history.map((item) => ({
    name: `Tahap ${item.sessionNumber}`,
    total: item.total,
    reading: item.reading,
    tajwid: item.tajwid,
    writing: item.writing,
    memorization: isGrade3 ? item.memorization : undefined,
    topic: item.topic,
    pageRef: item.pageRef,
    date: item.date,
  }));

  // Attendance history formatting murni data riil
  const attendanceHistory: StudentAttendanceHistoryItem[] = student.attendanceHistory || [];

  const hadirCount = attendanceHistory.filter(a => a.status === 'Hadir').length;
  const izinCount = attendanceHistory.filter(a => a.status === 'Izin').length;
  const sakitCount = attendanceHistory.filter(a => a.status === 'Sakit').length;
  const alpaCount = attendanceHistory.filter(a => a.status === 'Alpa').length;

  const attendanceChartData = attendanceHistory.map((item) => ({
    name: `P${item.meetingNumber}`,
    meetingNumber: item.meetingNumber,
    date: item.date,
    status: item.status,
    notes: item.notes || '-',
    score: item.status === 'Hadir' ? 100 : item.status === 'Izin' ? 65 : item.status === 'Sakit' ? 65 : 25,
  }));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[calc(100vw-16px)] sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-3.5 sm:p-5 border-b border-transparent shadow-sm bg-slate-50 gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20">
                {targetGrade.programName}
              </span>
              <span className="text-xs font-semibold text-slate-500 truncate">
                {groupName || 'Halaqah'} • Kelas {student.class}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#172033] tracking-tight truncate">
              {student.name}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
              NIS: {student.nis || '-'} • Riwayat perkembangan & presensi halaqah
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher: Grafik Nilai vs Grafik Kehadiran */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 sm:p-1.5 gap-1 overflow-x-auto w-full">
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-white text-[#0362D0] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BookOpen size={15} />
            <span>Grafik Nilai</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-white text-[#0362D0] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserCheck size={15} />
            <span>Grafik Kehadiran</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              student.attendanceRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {student.attendanceRate}%
            </span>
          </button>
        </div>

        <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto overflow-x-hidden w-full max-w-full">
          {activeTab === 'progress' ? (
            <div className="space-y-4 sm:space-y-5 w-full">
              {/* KPI Mini Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* Skor Terkini */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Nilai Terkini (T{student.latestSessionNumber})</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-[#172033]">
                  {history.length > 0 ? student.progressScore : '-'}
                </span>
                <span className="text-[10px] font-bold text-slate-500">/ 100</span>
              </div>
              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                history.length === 0
                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                  : student.statusCategory === 'Sangat Baik' 
                  ? 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20'
                  : student.statusCategory === 'Baik'
                  ? 'bg-[#C99A2E]/10 text-[#C99A2E] border-[#C99A2E]/20'
                  : 'bg-[#950415]/10 text-[#950415] border-[#950415]/20'
              }`}>
                {history.length > 0 ? student.statusCategory : 'Belum Ada Nilai'}
              </span>
            </div>

            {/* Status Tren Tahap */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Status Tren</span>
              <div className="flex items-center gap-1.5 mt-2">
                {history.length < 2 ? (
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-400 block truncate">—</span>
                    <span className="text-[10px] text-slate-400 block truncate">Perlu &gt;1 sesi</span>
                  </div>
                ) : student.trend === 'Meningkat' ? (
                  <>
                    <TrendingUp size={18} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-emerald-600 block truncate">Meningkat</span>
                      <span className="text-[10px] text-emerald-700 font-bold block truncate">+{Math.abs(student.trendDiff)} poin</span>
                    </div>
                  </>
                ) : student.trend === 'Menurun' ? (
                  <>
                    <TrendingDown size={18} className="text-rose-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-rose-600 block truncate">Menurun</span>
                      <span className="text-[10px] text-rose-700 font-bold block truncate">-{Math.abs(student.trendDiff)} poin</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Minus size={18} className={student.progressScore >= 75 ? "text-amber-600 shrink-0" : "text-slate-600 shrink-0"} />
                    <div className="min-w-0">
                      <span className={`text-xs font-black block truncate ${student.progressScore >= 75 ? "text-amber-600" : "text-slate-700"}`}>Konsisten</span>
                      <span className={`text-[10px] font-bold block truncate ${student.progressScore >= 75 ? "text-amber-700" : "text-slate-500"}`}>Stabil</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Total Perubahan (T1 ke T Terkini) */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Pertumbuhan</span>
              <p className={`text-lg sm:text-xl font-black mt-1 ${
                history.length < 2 ? 'text-slate-400' : overallDiff > 0 ? 'text-emerald-600' : overallDiff < 0 ? 'text-rose-600' : 'text-slate-700'
              }`}>
                {history.length < 2 ? '-' : overallDiff > 0 ? `+${overallDiff} poin` : `${overallDiff} poin`}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 truncate">
                {history.length < 2 ? 'Belum ada data' : 'Sejak Tahap 1'}
              </span>
            </div>

            {/* Standar Ketuntasan (KKM 75) */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">KKM 75</span>
              <div className="mt-1">
                {history.length === 0 ? (
                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">
                    Belum Dinilai
                  </span>
                ) : student.progressScore >= 75 ? (
                  <span className="text-emerald-600 flex items-center gap-1 text-xs sm:text-sm font-black">
                    <CheckCircle2 size={15} /> Tuntas
                  </span>
                ) : (
                  <span className="text-[#950415] flex items-center gap-1 text-xs sm:text-sm font-black">
                    <AlertCircle size={15} /> Remidi
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 truncate">
                {attendanceHistory.length > 0 ? `Hadir: ${student.attendanceRate}%` : 'Presensi: -'}
              </span>
            </div>
          </div>

          {/* Area / Line Chart Perkembangan */}
          <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs w-full max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-black text-[#172033]">
                  Grafik Nilai Kualitas per Tahap
                </h4>
                <p className="text-[11px] text-[#475569] font-medium">
                  Perkembangan nilai bacaan dari tahap awal hingga terkini
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-[#0362D0]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0362D0]" /> Rata-Rata
                </span>
                {isGrade3 && (
                  <span className="flex items-center gap-1 text-[#0284c7]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> Membaca
                  </span>
                )}
                <span className="flex items-center gap-1 text-[#C99A2E]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C99A2E]" /> Tajwid
                </span>
                <span className="flex items-center gap-1 text-[#8b5cf6]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Menulis
                </span>
                {isGrade3 && (
                  <span className="flex items-center gap-1 text-[#10b981]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Hafalan
                  </span>
                )}
              </div>
            </div>
            {chartData.length === 0 ? (
              <div className="h-56 sm:h-64 w-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Catatan Progres</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Nilai belum diinput oleh mentor di database Firestore.</p>
              </div>
            ) : (
            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0362D0" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0362D0" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[50, 100]} 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <ReferenceLine 
                    y={75} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    label={{ value: 'KKM 75', fill: '#ef4444', fontSize: 9, position: 'right' }} 
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const dataItem = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs">
                            <p className="font-extrabold text-[#172033] mb-1">{label}</p>
                            <p className="text-[10px] text-slate-500 font-semibold mb-2">
                              {dataItem.pageRef ? `${dataItem.pageRef} • ` : ''}{dataItem.date}
                            </p>
                            <div className="space-y-1 font-bold">
                              <div className="flex justify-between gap-4 text-[#0362D0]">
                                <span>Nilai Rata-Rata:</span>
                                <strong>{dataItem.total}</strong>
                              </div>
                              {isGrade3 && (
                                <div className="flex justify-between gap-4 text-[#0284c7] font-semibold text-[11px]">
                                  <span>Kelancaran Membaca:</span>
                                  <span>{dataItem.reading}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-4 text-[#C99A2E] font-semibold text-[11px]">
                                <span>Tajwid & Makhraj:</span>
                                <span>{dataItem.tajwid}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-purple-600 font-semibold text-[11px]">
                                <span>Kaidah Menulis:</span>
                                <span>{dataItem.writing}</span>
                              </div>
                              {isGrade3 && (dataItem.memorizedSurah || dataItem.memorization) && (
                                <div className="flex justify-between gap-4 text-emerald-600 font-semibold text-[11px]">
                                  <span>Setoran Hafalan:</span>
                                  <span>{dataItem.memorizedSurah || `Skor ${dataItem.memorization}`}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#0362D0" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    dot={{ r: 4, fill: '#0362D0', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#0362D0' }}
                  />
                  {isGrade3 && (
                    <Line 
                      type="monotone" 
                      dataKey="reading" 
                      stroke="#0284c7" 
                      strokeWidth={1.5} 
                      strokeDasharray="3 3" 
                      dot={false} 
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="tajwid" 
                    stroke="#C99A2E" 
                    strokeWidth={1.5} 
                    dot={false} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="writing" 
                    stroke="#8b5cf6" 
                    strokeWidth={1.5} 
                    dot={false} 
                  />
                  {isGrade3 && (
                    <Line 
                      type="monotone" 
                      dataKey="memorization" 
                      stroke="#10b981" 
                      strokeWidth={1.5} 
                      dot={false} 
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>

          {/* Tabel Rekapitulasi Rincian Tiap Tahap */}
          <div className="w-full">
            <h4 className="text-xs font-black text-[#172033] mb-2">
              Rekapitulasi Capaian per Tahap
            </h4>
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-2xs scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[550px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3">Sesi Tahap</th>
                    <th className="py-2.5 px-3">{isGrade3 ? 'Target Kurikulum' : 'Materi / Halaman'}</th>
                    {isGrade3 && <th className="py-2.5 px-2 text-center">Membaca</th>}
                    <th className="py-2.5 px-2 text-center">Tajwid</th>
                    <th className="py-2.5 px-2 text-center">Menulis</th>
                    {isGrade3 && <th className="py-2.5 px-3 text-center text-emerald-700">Setoran Hafalan</th>}
                    <th className="py-2.5 px-3 text-center">Nilai Rata-Rata</th>
                    <th className="py-2.5 px-3 text-right">Evaluasi Tren</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h, i) => {
                    const isFirst = i === 0;
                    return (
                      <tr key={h.sessionId || i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-extrabold text-[#172033]">
                          Tahap {h.sessionNumber}
                          <span className="block text-[10px] text-slate-400 font-normal">{h.date}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {isGrade3 ? (h.pageRef ? `${h.pageRef}` : 'Juz 30') : (h.pageRef ? `Hal. ${h.pageRef}` : targetGrade.programName)}
                          <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[160px]">{h.topic}</span>
                        </td>
                        {isGrade3 && <td className="py-2.5 px-2 text-center font-bold text-slate-700">{h.reading}</td>}
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700">{h.tajwid}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700">{h.writing}</td>
                        {isGrade3 && (
                          <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700">
                            {h.memorizedSurah || (h.pageRef ? `${h.pageRef}` : 'QS. An-Naba')}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md font-black text-xs bg-[#0362D0]/10 text-[#0362D0]">
                            {h.total}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isFirst ? (
                            <span className="text-[10px] text-slate-400 font-bold">Baseline Awal</span>
                          ) : h.diffFromPrev > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600">
                              <TrendingUp size={12} /> +{h.diffFromPrev} Naik
                            </span>
                          ) : h.diffFromPrev < 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-600">
                              <TrendingDown size={12} /> {h.diffFromPrev} Turun
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-black ${h.total >= 75 ? 'text-amber-600' : 'text-slate-500'}`}>
                              <Minus size={12} /> — Konsisten
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analisis & Rekomendasi Pedagogis Mentor */}
          <div className="p-3 sm:p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
            <div className="flex items-start gap-2.5">
              <Info size={16} className="text-[#0362D0] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-black text-[#0362D0] mb-0.5">
                  Diagnosis & Catatan Pedagogis Mentor
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {student.trend === 'Meningkat' ? (
                    <>
                      Perkembangan santri menunjukkan <strong>tren peningkatan yang positif</strong> (+{Math.abs(student.trendDiff)} poin dari sesi sebelumnya). Kelancaran membaca dan makharijul huruf terpantau semakin matang. Disarankan terus mempertahankan konsistensi bimbingan harakat dan tanda sukun.
                    </>
                  ) : student.trend === 'Menurun' ? (
                    <>
                      Nilai kualitas santri mengalami <strong>penurunan ({student.trendDiff} poin)</strong> pada tahap terakhir. Evaluasi menunjukkan santri mengalami kendala pada aspek ketelitian tajwid atau panjang mad. Disarankan memberikan sesi talaqqi pengulangan pada halaman ini sebelum lanjut ke materi berikutnya.
                    </>
                  ) : (
                    <>
                      Perkembangan santri berada pada fase <strong>konsisten / stabil</strong> pada nilai {student.progressScore}. Dorong santri untuk memperbanyak latihan mandiri di luar jam halaqah agar kelancaran melafalkan huruf dapat melompat ke predikat Sangat Baik.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB KEHADIRAN & PRESENSI PEKAN KBM */
        <div className="space-y-4 sm:space-y-5 w-full">
          {/* 4 KPI Mini Badges Kehadiran */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* Tingkat Kehadiran */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Persentase Hadir</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-xl sm:text-2xl font-black ${
                  student.attendanceRate >= 85 ? 'text-emerald-600' : student.attendanceRate >= 75 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {student.attendanceRate}%
                </span>
              </div>
              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                student.attendanceRate >= 85 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : student.attendanceRate >= 75
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {student.attendanceRate >= 85 ? 'Sangat Rajin' : student.attendanceRate >= 75 ? 'Cukup Tertib' : 'Perlu Perhatian'}
              </span>
            </div>

            {/* Total Pertemuan Hadir */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Total Hadir</span>
              <p className="text-xl sm:text-2xl font-black text-[#172033] mt-1">
                {hadirCount} <span className="text-xs font-bold text-slate-400">/ {attendanceHistory.length}</span>
              </p>
              <span className="text-[10px] text-emerald-600 font-bold block mt-0.5 truncate">
                Pertemuan KBM
              </span>
            </div>

            {/* Izin & Sakit */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Izin & Sakit</span>
              <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                {izinCount + sakitCount} <span className="text-xs font-bold text-slate-400">kali</span>
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
                Izin: {izinCount} • Sakit: {sakitCount}
              </span>
            </div>

            {/* Alpa / Tanpa Keterangan */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Alpa</span>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${alpaCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {alpaCount} <span className="text-xs font-bold text-slate-400">kali</span>
              </p>
              <span className={`text-[10px] font-bold block mt-0.5 truncate ${alpaCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {alpaCount > 0 ? 'Perlu konfirmasi' : 'Nihil alpa'}
              </span>
            </div>
          </div>

          {/* Visualisasi Grafik Batang / Bar Presensi Per Pertemuan Pekan KBM */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-xs w-full max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-black text-[#172033]">
                  Grafik Status Kehadiran per Pertemuan Pekan KBM
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Riwayat visual status kehadiran santri pada setiap pekan halaqah
                </p>
              </div>

              {/* Status Legend Pill Indicators */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Hadir
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Izin
                </span>
                <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Sakit
                </span>
                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Alpa
                </span>
              </div>
            </div>

            <div className="h-[200px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#475569' }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    ticks={[25, 65, 100]}
                    tickFormatter={(val) => val === 100 ? 'Hadir' : val === 65 ? 'Izin/Skt' : 'Alpa'}
                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      const isHadir = data.status === 'Hadir';
                      const isIzin = data.status === 'Izin';
                      const isSakit = data.status === 'Sakit';
                      const statusColor = isHadir 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                        : isIzin 
                        ? 'text-amber-700 bg-amber-50 border-amber-200' 
                        : isSakit 
                        ? 'text-blue-700 bg-blue-50 border-blue-200' 
                        : 'text-rose-700 bg-rose-50 border-rose-200';

                      return (
                        <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-200 text-xs min-w-[190px]">
                          <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-100">
                            <span className="font-extrabold text-[#172033]">Pertemuan {data.meetingNumber}</span>
                            <span className="text-[10px] text-slate-500">{data.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold">Status:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${statusColor}`}>
                              {data.status}
                            </span>
                          </div>
                          {data.notes && data.notes !== '-' && (
                            <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="font-bold text-slate-500 block mb-0.5">Catatan:</span>
                              {data.notes}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {attendanceChartData.map((entry, index) => {
                      const color = entry.status === 'Hadir' 
                        ? '#10B981' 
                        : entry.status === 'Izin' 
                        ? '#F59E0B' 
                        : entry.status === 'Sakit' 
                        ? '#3B82F6' 
                        : '#EF4444';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabel Rekapitulasi Riwayat Pertemuan Presensi */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden w-full">
            <div className="p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-[#172033]">
                  Rincian Riwayat Pertemuan Santri
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Daftar pertemuan KBM dan status presensi yang tercatat
                </p>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 sm:py-1 rounded-lg border border-slate-200 shrink-0">
                {attendanceHistory.length} Pertemuan
              </span>
            </div>

            <div className="w-full overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                    <th className="py-2.5 px-3">Pekan / Pertemuan</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Status Presensi</th>
                    <th className="py-2.5 px-3">Catatan Mentor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {attendanceHistory.map((item, idx) => {
                    const isHadir = item.status === 'Hadir';
                    const isIzin = item.status === 'Izin';
                    const isSakit = item.status === 'Sakit';
                    const badgeClass = isHadir
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isIzin
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : isSakit
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-extrabold text-[#172033]">
                          Pertemuan {item.meetingNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {item.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isHadir ? 'bg-emerald-500' : isIzin ? 'bg-amber-500' : isSakit ? 'bg-blue-500' : 'bg-rose-500'
                            }`} />
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnosis & Rekomendasi Kedisiplinan Kehadiran Santri */}
          <div className={`p-3 sm:p-3.5 rounded-xl border ${
            alpaCount > 0 
              ? 'bg-rose-50/70 border-rose-200/80' 
              : student.attendanceRate >= 85 
              ? 'bg-emerald-50/70 border-emerald-200/80' 
              : 'bg-blue-50/70 border-blue-200/80'
          }`}>
            <div className="flex items-start gap-2.5">
              {alpaCount > 0 ? (
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Info size={16} className={student.attendanceRate >= 85 ? "text-emerald-700 shrink-0 mt-0.5" : "text-[#0362D0] shrink-0 mt-0.5"} />
              )}
              <div>
                <h5 className={`text-xs font-black mb-0.5 ${
                  alpaCount > 0 
                    ? 'text-rose-700' 
                    : student.attendanceRate >= 85 
                    ? 'text-emerald-800' 
                    : 'text-[#0362D0]'
                }`}>
                  Evaluasi Kedisiplinan & Presensi Kehadiran
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {alpaCount > 0 ? (
                    <>
                      Santri tercatat memiliki <strong>{alpaCount} kali ketidakhadiran tanpa keterangan (Alpa)</strong>. Hal ini dapat menghambat kontinuitas target hafalan dan kelancaran jilid santri. Disarankan mentor segera mengonfirmasi alasan ketidakhadiran kepada wali kelas atau wali santri.
                    </>
                  ) : student.attendanceRate >= 85 ? (
                    <>
                      Santri menunjukkan <strong>tingkat istiqomah dan kedisiplinan yang sangat baik ({student.attendanceRate}%)</strong>. Kehadiran rutin ini berkorelasi positif dengan penguasaan makhraj dan kelancaran membaca Al-Qur'an santri. Pertahankan apresiasi positif kepada santri!
                    </>
                  ) : (
                    <>
                      Tingkat kehadiran santri berada pada angka <strong>{student.attendanceRate}%</strong> dengan catatan beberapa kali izin/sakit. Disarankan memberikan modul latihan mandiri di rumah atau sesi talaqqi singkat sebelum/sesudah jam halaqah agar santri tidak tertinggal materi silabus.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-center p-3 sm:p-4 border-t border-slate-100 bg-white gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors text-center"
          >
            Tutup
          </button>

          <Link
            to="/session"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-[#0362D0] hover:bg-[#0362D0]/90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Buka Sesi Mengajar</span>
            <ChevronRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}
