import React from 'react';
import { Calendar, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

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

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomWeeklyTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item: WeeklyOverallAttendancePoint = payload[0].payload;
    const isAboveTarget = item.rate >= item.target;

    return (
      <div className="bg-white p-3.5 rounded-xl border border-[#E6E8EC] shadow-lg text-xs min-w-[200px]">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#F5F6F8]">
          <span className="font-bold text-[#172033] text-sm">{item.label}</span>
          {item.dateLabel && (
            <span className="text-[11px] text-slate-500 font-medium">{item.dateLabel}</span>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-600 font-medium">Tingkat Kehadiran:</span>
          <span className={`font-extrabold text-sm ${isAboveTarget ? 'text-[#0362D0]' : 'text-[#C99A2E]'}`}>
            {item.rate}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#F5F6F8] text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Hadir:</span>
            <span className="font-semibold text-emerald-700">{item.present}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Izin:</span>
            <span className="font-semibold text-[#C99A2E]">{item.permission}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Sakit:</span>
            <span className="font-semibold text-slate-600">{item.sick}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Alpa:</span>
            <span className="font-semibold text-[#950415]">{item.absent}</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-[#F5F6F8] flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-500">Total Siswa:</span>
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
  const computedAverage = averageRate ?? (
    data.length ? Math.round(data.reduce((acc, d) => acc + d.rate, 0) / data.length) : 82
  );
  const computedLatest = latestRate ?? (
    data.length ? data[data.length - 1].rate : 83
  );
  const isAboveTarget = computedLatest >= 80;

  return (
    <div id="dashboard-weekly-attendance-summary-card" className="bg-white p-5 rounded-2xl border border-[#E6E8EC] shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F5F6F8] gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Calendar size={16} className="text-[#0362D0]" />
            <h3 className="font-bold text-[#172033] text-base">Ringkasan Pekanan Kehadiran Siswa</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">Kehadiran keseluruhan siswa / pekan</p>
        </div>

        {/* Status Chip */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#0362D0]/5 border border-[#0362D0]/15 rounded-xl text-xs font-semibold text-[#0362D0]">
            <TrendingUp size={13} />
            <span>Pekan Ini: {computedLatest}%</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs font-medium text-slate-600">
            <span>Rata-rata: {computedAverage}%</span>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="py-4">
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceWeeklyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0362D0" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0362D0" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="label" 
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                domain={[60, 100]} 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                unit="%"
              />
              <Tooltip content={<CustomWeeklyTooltip />} />
              <ReferenceLine 
                y={80} 
                stroke="#C99A2E" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
              />
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke="#0362D0" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#attendanceWeeklyGradient)" 
                dot={{ r: 4, fill: '#0362D0', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6, fill: '#0362D0' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Metrics / Insights */}
      <div className="pt-3 border-t border-[#F5F6F8] grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="bg-[#F5F6F8] p-2.5 rounded-xl">
          <span className="text-slate-500 block text-[11px]">Rata-rata Semester</span>
          <span className="font-bold text-[#172033] text-sm">{computedAverage}%</span>
        </div>
        <div className="bg-[#F5F6F8] p-2.5 rounded-xl">
          <span className="text-slate-500 block text-[11px]">Target Kehadiran</span>
          <span className="font-bold text-[#C99A2E] text-sm">80% KKM</span>
        </div>
        <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl flex items-center gap-1.5 ${
          isAboveTarget ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
        }`}>
          {isAboveTarget ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
          )}
          <span className="text-[11px] font-semibold leading-tight">
            {isAboveTarget ? 'Stabil di atas batas KKM' : 'Perlu evaluasi absensi'}
          </span>
        </div>
      </div>
    </div>
  );
});
