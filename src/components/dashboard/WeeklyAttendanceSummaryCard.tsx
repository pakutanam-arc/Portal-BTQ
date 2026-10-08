import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  LineChart as LineChartIcon, 
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Legend
} from 'recharts';

export interface WeeklyOverallAttendancePoint {
  week: number;
  label: string;
  dateLabel?: string;
  rate: number;
  present: number;
  permission: number;
  sick: number;
  absent: number;
  total: number;
  target: number;
}

export interface WeeklyAttendanceSummaryCardProps {
  data: WeeklyOverallAttendancePoint[];
  averageRate?: number;
  latestRate?: number;
}

type ChartDisplayMode = 'trend' | 'composition' | 'comparison';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  mode?: ChartDisplayMode;
}

const CustomWeeklyTooltip = ({ active, payload, mode = 'trend' }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item: WeeklyOverallAttendancePoint = payload[0].payload;
    const isAboveTarget = item.rate >= item.target;

    return (
      <div className="bg-white p-3.5 rounded-xl border border-transparent shadow-sm shadow-xl text-xs min-w-[220px] pointer-events-none">
        {/* Tooltip Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0362D0]" />
            <span className="font-extrabold text-[#172033] text-sm">{item.label}</span>
          </div>
          {item.dateLabel && (
            <span className="text-[11px] text-slate-500 font-semibold bg-slate-50 px-1.5 py-0.5 rounded">
              {item.dateLabel}
            </span>
          )}
        </div>
        
        {/* Rate highlight */}
        <div className="flex items-center justify-between mb-2.5 bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]/60">
          <span className="text-slate-600 font-medium">Tingkat Kehadiran:</span>
          <div className="text-right">
            <span className={`font-black text-sm ${isAboveTarget ? 'text-[#0362D0]' : 'text-[#C99A2E]'}`}>
              {item.rate}%
            </span>
            <span className={`block text-[9px] font-bold ${isAboveTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isAboveTarget ? 'Memenuhi KKM' : 'Di Bawah Target'}
            </span>
          </div>
        </div>

        {/* Breakdown of student counts */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
          <div className="flex items-center justify-between bg-emerald-50/60 px-2 py-1 rounded">
            <span className="text-emerald-800 font-medium">Hadir:</span>
            <span className="font-bold text-emerald-700">{item.present}</span>
          </div>
          <div className="flex items-center justify-between bg-amber-50/60 px-2 py-1 rounded">
            <span className="text-amber-800 font-medium">Izin:</span>
            <span className="font-bold text-[#C99A2E]">{item.permission}</span>
          </div>
          <div className="flex items-center justify-between bg-slate-100 px-2 py-1 rounded">
            <span className="text-slate-600 font-medium">Sakit:</span>
            <span className="font-bold text-slate-700">{item.sick}</span>
          </div>
          <div className="flex items-center justify-between bg-rose-50/60 px-2 py-1 rounded">
            <span className="text-rose-800 font-medium">Alpa:</span>
            <span className="font-bold text-[#950415]">{item.absent}</span>
          </div>
        </div>

        {/* Total students */}
        <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>Total Peserta:</span>
          <span className="font-bold text-[#172033]">{item.total} Santri</span>
        </div>
      </div>
    );
  }
  return null;
};

export const WeeklyAttendanceSummaryCard = React.memo(function WeeklyAttendanceSummaryCard({
  data,
  averageRate,
  latestRate
}: WeeklyAttendanceSummaryCardProps) {
  const [chartMode, setChartMode] = useState<ChartDisplayMode>('trend');

  // Compute metrics and pattern insights
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        average: averageRate ?? 82,
        latest: latestRate ?? 83,
        previous: 80,
        delta: 3,
        highestWeek: null,
        lowestWeek: null,
        isConsistent: true
      };
    }

    const avg = averageRate ?? Math.round(data.reduce((acc, d) => acc + d.rate, 0) / data.length);
    const latestItem = data[data.length - 1];
    const prevItem = data.length > 1 ? data[data.length - 2] : null;
    const latest = latestRate ?? (latestItem ? latestItem.rate : 80);
    const prev = prevItem ? prevItem.rate : latest;
    const delta = latest - prev;

    let highest = data[0];
    let lowest = data[0];
    let belowTargetCount = 0;

    data.forEach(d => {
      if (d.rate > highest.rate) highest = d;
      if (d.rate < lowest.rate) lowest = d;
      if (d.rate < d.target) belowTargetCount++;
    });

    return {
      average: avg,
      latest,
      previous: prev,
      delta,
      highestWeek: highest,
      lowestWeek: lowest,
      isConsistent: belowTargetCount === 0
    };
  }, [data, averageRate, latestRate]);

  const isAboveTarget = stats.latest >= 80;

  return (
    <div 
      id="dashboard-weekly-attendance-summary-card" 
      className="bg-white p-5 rounded-2xl border border-transparent shadow-sm shadow-xs flex flex-col justify-between"
    >
      {/* 1. Header & Quick View Switcher */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0362D0]/10 border border-[#0362D0]/20 flex items-center justify-center text-[#0362D0] shrink-0">
                <Calendar size={16} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-[#172033] text-base leading-tight">
                    Tren Kehadiran Mingguan
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-[#0362D0] border border-blue-200">
                    Recharts
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Visualisasi pola presensi santri per pekan pembelajaran
                </p>
              </div>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-transparent shadow-sm/90 shrink-0">
            <button
              type="button"
              onClick={() => setChartMode('trend')}
              title="Tampilkan grafik area tren persentase"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMode === 'trend'
                  ? 'bg-white text-[#0362D0] shadow-xs border border-[#E2E8F0]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LineChartIcon size={13} />
              <span>Tren</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('composition')}
              title="Tampilkan komposisi jumlah santri (Hadir, Izin, Sakit, Alpa)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMode === 'composition'
                  ? 'bg-white text-[#0362D0] shadow-xs border border-[#E2E8F0]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={13} />
              <span>Komposisi</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('comparison')}
              title="Tampilkan perbandingan capaian dengan target KKM"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMode === 'comparison'
                  ? 'bg-white text-[#0362D0] shadow-xs border border-[#E2E8F0]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 size={13} />
              <span>vs Target</span>
            </button>
          </div>
        </div>

        {/* 2. Fast Pattern Insights Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          {/* Latest Week & Trend Direction */}
          <div className="bg-[#F8FAFC] border border-transparent shadow-sm p-2.5 rounded-xl">
            <span className="text-[11px] text-slate-500 font-semibold block">Pekan Terbaru</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-[#172033]">{stats.latest}%</span>
              {stats.delta !== 0 ? (
                <span className={`text-[10px] font-bold flex items-center ${
                  stats.delta > 0 ? 'text-emerald-700' : 'text-[#950415]'
                }`}>
                  {stats.delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stats.delta > 0 ? `+${stats.delta}%` : `${stats.delta}%`}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-500 flex items-center">
                  <Minus size={11} /> 0%
                </span>
              )}
            </div>
          </div>

          {/* Semester Average */}
          <div className="bg-[#F8FAFC] border border-transparent shadow-sm p-2.5 rounded-xl">
            <span className="text-[11px] text-slate-500 font-semibold block">Rata-rata Semester</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-[#0362D0]">{stats.average}%</span>
              <span className="text-[10px] text-slate-500 font-bold">vs KKM 80%</span>
            </div>
          </div>

          {/* Peak Attendance Week */}
          <div className="bg-[#F8FAFC] border border-transparent shadow-sm p-2.5 rounded-xl">
            <span className="text-[11px] text-slate-500 font-semibold block">Puncak Kehadiran</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-black text-emerald-700">
                {stats.highestWeek ? `${stats.highestWeek.rate}%` : '88%'}
              </span>
              <span className="text-[10px] text-slate-500 font-bold truncate">
                ({stats.highestWeek ? stats.highestWeek.label : 'Pekan 3'})
              </span>
            </div>
          </div>

          {/* Pattern Status Indicator */}
          <div className={`p-2.5 rounded-xl border flex flex-col justify-center ${
            stats.isConsistent 
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900' 
              : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              Status Pola
            </span>
            <span className="text-xs font-black mt-0.5 flex items-center gap-1 truncate">
              {stats.isConsistent ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Stabil Di Atas Target</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} className="text-amber-600 shrink-0" />
                  <span>Ada Pekan Di Bawah KKM</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* 3. Recharts Dynamic Visualizer */}
        <div className="py-3">
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'trend' ? (
                /* MODE 1: SMOOTH AREA & TARGET LINE */
                <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceWeeklyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0362D0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0362D0" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    domain={[60, 100]} 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    unit="%"
                  />
                  <Tooltip content={<CustomWeeklyTooltip mode="trend" />} />
                  <ReferenceLine 
                    y={80} 
                    stroke="#C99A2E" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{
                      value: 'Target KKM 80%',
                      fill: '#C99A2E',
                      fontSize: 10,
                      fontWeight: 700,
                      position: 'top'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    name="Tingkat Kehadiran"
                    stroke="#0362D0" 
                    strokeWidth={2.8}
                    fillOpacity={1} 
                    fill="url(#attendanceWeeklyGradient)" 
                    dot={{ r: 4, fill: '#0362D0', strokeWidth: 2, stroke: '#FFFFFF' }}
                    activeDot={{ r: 6, fill: '#0362D0', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : chartMode === 'composition' ? (
                /* MODE 2: STACKED BAR COMPOSITION (HADIR, IZIN, SAKIT, ALPA) */
                <BarChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomWeeklyTooltip mode="composition" />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={24}
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: '600', paddingBottom: '4px' }}
                  />
                  <Bar dataKey="present" name="Hadir" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="permission" name="Izin" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="sick" name="Sakit" stackId="a" fill="#64748B" />
                  <Bar dataKey="absent" name="Alpa" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                /* MODE 3: COMPOSED CHART (ACTUAL RATE VS TARGET COMPARISON) */
                <ComposedChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    domain={[60, 100]} 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    unit="%"
                  />
                  <Tooltip content={<CustomWeeklyTooltip mode="comparison" />} />
                  <ReferenceLine 
                    y={80} 
                    stroke="#C99A2E" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                  />
                  <Bar 
                    dataKey="rate" 
                    name="Capaian Kehadiran" 
                    fill="#0362D0" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={36} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    name="Batas KKM (80%)" 
                    stroke="#C99A2E" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Footer Legend & Diagnostic Summary */}
      <div className="pt-3 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-slate-500 font-semibold text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0362D0]" />
            Kehadiran Aktual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#C99A2E]" />
            Target KKM (80%)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
          <Sparkles size={13} className="text-[#C99A2E]" />
          <span>
            {stats.delta >= 0 
              ? `Pola kehadiran naik +${stats.delta}% di pekan terakhir` 
              : `Pola kehadiran terkoreksi ${stats.delta}% di pekan terakhir`}
          </span>
        </div>
      </div>
    </div>
  );
});
