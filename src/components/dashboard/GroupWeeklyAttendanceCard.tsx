import React, { useState, useMemo } from 'react';
import { Users, Filter, Award, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';

export interface GroupAttendanceDetail {
  groupId: string;
  groupName: string;
  mentorName: string;
  rate: number;
  present: number;
  permission: number;
  sick: number;
  absent: number;
  total: number;
}

export interface WeeklyGroupDataPoint {
  week: number;
  label: string;
  dateLabel?: string;
  groups: GroupAttendanceDetail[];
}

export interface GroupWeeklyAttendanceCardProps {
  weeklyData: WeeklyGroupDataPoint[];
  cumulativeGroups: GroupAttendanceDetail[];
}

interface CustomGroupTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomGroupTooltip = ({ active, payload }: CustomGroupTooltipProps) => {
  if (active && payload && payload.length) {
    const item: GroupAttendanceDetail = payload[0].payload;
    const isAboveTarget = item.rate >= 80;

    return (
      <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-lg text-xs min-w-[210px]">
        <div className="pb-2 mb-2 border-b border-slate-50">
          <span className="font-bold text-[#172033] text-sm block">{item.groupName}</span>
          <span className="text-[11px] text-slate-500 font-medium">{item.mentorName}</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-600 font-medium">Tingkat Kehadiran:</span>
          <span className={`font-extrabold text-sm ${isAboveTarget ? 'text-[#0362D0]' : 'text-[#C99A2E]'}`}>
            {item.rate}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-50 text-[11px]">
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

        <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-500">Total Santri:</span>
          <span className="font-bold text-[#172033]">{item.total} Santri</span>
        </div>
      </div>
    );
  }
  return null;
};

export const GroupWeeklyAttendanceCard = React.memo(function GroupWeeklyAttendanceCard({
  weeklyData,
  cumulativeGroups
}: GroupWeeklyAttendanceCardProps) {
  // Option key: 'latest' | 'cumulative' | string(week number)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('latest');

  // Available periods for dropdown
  const periodOptions = useMemo(() => {
    const opts = [
      { id: 'latest', label: 'Pekan Terbaru' },
      ...weeklyData.map(w => ({ id: `week_${w.week}`, label: `${w.label} ${w.dateLabel ? `(${w.dateLabel})` : ''}` })),
      { id: 'cumulative', label: 'Rata-rata Kumulatif' }
    ];
    return opts;
  }, [weeklyData]);

  // Current active groups data to display
  const currentGroups = useMemo<GroupAttendanceDetail[]>(() => {
    if (selectedPeriod === 'cumulative') {
      return cumulativeGroups;
    }

    if (selectedPeriod === 'latest') {
      const latest = weeklyData.length ? weeklyData[weeklyData.length - 1] : null;
      return latest ? latest.groups : cumulativeGroups;
    }

    if (selectedPeriod.startsWith('week_')) {
      const wNum = parseInt(selectedPeriod.replace('week_', ''), 10);
      const found = weeklyData.find(w => w.week === wNum);
      return found ? found.groups : cumulativeGroups;
    }

    return cumulativeGroups;
  }, [selectedPeriod, weeklyData, cumulativeGroups]);

  // Format short names for X-Axis (e.g. "K1", "K2", ...)
  const chartData = useMemo(() => {
    return currentGroups.map(g => {
      // Shorten "Kelompok 1" to "K1" for compact responsive display
      const shortName = g.groupName.replace(/Kelompok\s*/i, 'K');
      return {
        ...g,
        shortName
      };
    });
  }, [currentGroups]);

  // Insights: highest, lowest, and average group rate
  const insights = useMemo(() => {
    if (!currentGroups.length) return null;
    let highest = currentGroups[0];
    let lowest = currentGroups[0];
    let totalRate = 0;

    currentGroups.forEach(g => {
      totalRate += g.rate;
      if (g.rate > highest.rate) highest = g;
      if (g.rate < lowest.rate) lowest = g;
    });

    const avgRate = Math.round(totalRate / currentGroups.length);

    return {
      highest,
      lowest,
      avgRate
    };
  }, [currentGroups]);

  return (
    <div id="dashboard-group-weekly-attendance-card" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
      {/* Header with Week Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-[#0362D0]" />
            <h3 className="font-bold text-[#172033] text-base">Rincian Kelompok</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">Kehadiran tiap kelompok / pekan</p>
        </div>

        {/* Filter Controls: Quick Pills & Dropdown */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center bg-slate-50 p-0.5 rounded-xl border border-slate-100">
            {weeklyData.map(w => (
              <button
                key={`pill-week-${w.week}`}
                type="button"
                onClick={() => setSelectedPeriod(`week_${w.week}`)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedPeriod === `week_${w.week}`
                    ? 'bg-[#0362D0] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#172033]'
                }`}
              >
                {w.label} {w.dateLabel ? `(${w.dateLabel})` : ''}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedPeriod('cumulative')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedPeriod === 'cumulative'
                  ? 'bg-[#0362D0] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#172033]'
              }`}
            >
              Kumulatif
            </button>
          </div>
        </div>
      </div>

      {/* Bar Chart Display */}
      <div className="py-4">
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="shortName" 
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis 
                domain={[50, 100]} 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                unit="%"
              />
              <Tooltip content={<CustomGroupTooltip />} />
              <ReferenceLine 
                y={80} 
                stroke="#C99A2E" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`group-cell-${index}`} 
                    fill={entry.rate >= 80 ? '#0362D0' : '#C99A2E'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Group Highlights */}
      {insights && (
        <div className="pt-3 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Award size={14} className="text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 block text-[10px]">Tertinggi</span>
                <span className="font-bold text-[#172033] text-xs truncate block">{insights.highest.groupName}</span>
              </div>
            </div>
            <span className="font-extrabold text-emerald-700 text-xs ml-1">{insights.highest.rate}%</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle size={14} className="text-[#C99A2E] shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 block text-[10px]">Perlu Perhatian</span>
                <span className="font-bold text-[#172033] text-xs truncate block">{insights.lowest.groupName}</span>
              </div>
            </div>
            <span className="font-extrabold text-[#C99A2E] text-xs ml-1">{insights.lowest.rate}%</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
            <div className="truncate">
              <span className="text-slate-500 block text-[10px]">Rata-rata Kelompok</span>
              <span className="font-semibold text-[#172033] text-xs">Semua Halaqah</span>
            </div>
            <span className="font-extrabold text-[#0362D0] text-xs ml-1">{insights.avgRate}%</span>
          </div>
        </div>
      )}
    </div>
  );
});
