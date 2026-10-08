import React from 'react';
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
  Info
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
  Legend 
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-transparent shadow-sm bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0362D0]/10 text-[#0362D0] border border-[#0362D0]/20">
                {targetGrade.programName}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {groupName || 'Halaqah'} • Kelas {student.class}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#172033] tracking-tight">
              {student.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              NIS: {student.nis || '-'} • Riwayat perkembangan nilai kualitas tiap tahap
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* KPI Mini Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Skor Terkini */}
            <div className="p-3 bg-white rounded-xl border border-transparent shadow-sm shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Nilai Terkini (T{student.latestSessionNumber})</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-[#172033]">{student.progressScore}</span>
                <span className="text-[10px] font-bold text-slate-500">/ 100</span>
              </div>
              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                student.statusCategory === 'Sangat Baik' 
                  ? 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20'
                  : student.statusCategory === 'Baik'
                  ? 'bg-[#C99A2E]/10 text-[#C99A2E] border-[#C99A2E]/20'
                  : 'bg-[#950415]/10 text-[#950415] border-[#950415]/20'
              }`}>
                {student.statusCategory}
              </span>
            </div>

            {/* Status Tren Tahap */}
            <div className="p-3 bg-white rounded-xl border border-transparent shadow-sm shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Status Tren</span>
              <div className="flex items-center gap-1.5 mt-2">
                {student.trend === 'Meningkat' ? (
                  <>
                    <TrendingUp size={20} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-emerald-600 block">Meningkat</span>
                      <span className="text-[10px] text-emerald-700 font-bold">+{Math.abs(student.trendDiff)} poin</span>
                    </div>
                  </>
                ) : student.trend === 'Menurun' ? (
                  <>
                    <TrendingDown size={20} className="text-rose-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-rose-600 block">Menurun</span>
                      <span className="text-[10px] text-rose-700 font-bold">-{Math.abs(student.trendDiff)} poin</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Minus size={20} className={student.progressScore >= 75 ? "text-amber-600 shrink-0" : "text-slate-600 shrink-0"} />
                    <div>
                      <span className={`text-xs font-black block ${student.progressScore >= 75 ? "text-amber-600" : "text-slate-700"}`}>Konsisten</span>
                      <span className={`text-[10px] font-bold ${student.progressScore >= 75 ? "text-amber-700" : "text-slate-500"}`}>Stabil</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Total Perubahan (T1 ke T Terkini) */}
            <div className="p-3 bg-white rounded-xl border border-transparent shadow-sm shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Pertumbuhan Total</span>
              <p className={`text-xl font-black mt-1 ${
                overallDiff > 0 ? 'text-emerald-600' : overallDiff < 0 ? 'text-rose-600' : 'text-slate-700'
              }`}>
                {overallDiff > 0 ? `+${overallDiff}` : overallDiff} poin
              </p>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                Sejak Tahap 1
              </span>
            </div>

            {/* Standar Ketuntasan (KKM 75) */}
            <div className="p-3 bg-white rounded-xl border border-transparent shadow-sm shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Ketuntasan (KKM 75)</span>
              <p className="text-xl font-black mt-1 text-[#172033]">
                {student.progressScore >= 75 ? (
                  <span className="text-emerald-600 flex items-center gap-1 text-sm font-black">
                    <CheckCircle2 size={16} /> Tuntas
                  </span>
                ) : (
                  <span className="text-[#950415] flex items-center gap-1 text-sm font-black">
                    <AlertCircle size={16} /> Perlu Remidi
                  </span>
                )}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                Presensi: {student.attendanceRate}%
              </span>
            </div>
          </div>

          {/* Area / Line Chart Perkembangan */}
          <div className="bg-slate-50 p-4 rounded-xl border border-transparent shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="text-xs font-black text-[#172033]">
                  Grafik Nilai Kualitas per Tahap
                </h4>
                <p className="text-[11px] text-[#475569] font-medium">
                  Perkembangan nilai bacaan dari tahap awal hingga terkini
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-[#0362D0]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0362D0]" /> Nilai Rata-Rata
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

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0362D0" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0362D0" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={{ stroke: '#f1f5f9' }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[50, 100]} 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#f1f5f9' }}
                    tickLine={false}
                  />
                  <ReferenceLine 
                    y={75} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    label={{ value: 'KKM 75', fill: '#ef4444', fontSize: 10, position: 'right' }} 
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
          </div>

          {/* Tabel Rekapitulasi Rincian Tiap Tahap */}
          <div>
            <h4 className="text-xs font-black text-[#172033] mb-2">
              Rekapitulasi Capaian per Tahap
            </h4>
            <div className="border border-transparent shadow-sm rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-transparent shadow-sm">
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
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
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

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-4 border-t border-transparent shadow-sm bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>

          <Link
            to="/session"
            onClick={onClose}
            className="px-4 py-2 bg-[#0362D0] hover:bg-[#0362D0]/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Buka Lembar Sesi Mengajar</span>
            <ChevronRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}
