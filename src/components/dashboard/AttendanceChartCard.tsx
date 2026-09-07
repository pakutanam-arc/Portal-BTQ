import React, { useState, useMemo } from 'react';
import { Filter, UserCheck } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export type AttendanceFilter = 'thisWeek' | 'month' | 'sixMonths' | 'all';

export interface AttendanceSlice {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface AttendancePeriodStats {
  rate: number;
  present: number;
  permission: number;
  sick: number;
  absent: number;
  total: number;
  slices: AttendanceSlice[];
}

export interface AttendanceChartCardProps {
  periodData: Record<AttendanceFilter, AttendancePeriodStats>;
  totalStudents?: number;
  thisWeekMeetingLabel?: string;
}

export const AttendanceChartCard = React.memo(function AttendanceChartCard({ 
  periodData,
  totalStudents = 155,
  thisWeekMeetingLabel = 'pertemuan pekan ini'
}: AttendanceChartCardProps) {
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('thisWeek');

  const activeStats = useMemo(() => {
    return periodData[attendanceFilter] || periodData.thisWeek;
  }, [periodData, attendanceFilter]);

  const filterContextText = useMemo(() => {
    if (attendanceFilter === 'thisWeek') {
      return {
        scope: `${totalStudents} siswa dipantau pada ${thisWeekMeetingLabel}`,
        absentText: activeStats.absent > 0 
          ? `${activeStats.absent} siswa alpa (${activeStats.slices.find(s => s.name === 'Alpa')?.value || 0}%)`
          : 'Tidak ada siswa yang alpa (0%)'
      };
    } else if (attendanceFilter === 'month') {
      return {
        scope: `${activeStats.total} rekaman presensi kumulatif bulan ini`,
        absentText: activeStats.absent > 0
          ? `${activeStats.absent} siswa alpa (${activeStats.slices.find(s => s.name === 'Alpa')?.value || 0}%)`
          : 'Tidak ada siswa yang alpa (0%)'
      };
    } else if (attendanceFilter === 'sixMonths') {
      return {
        scope: `${activeStats.total} rekaman presensi semester (6 bulan)`,
        absentText: activeStats.absent > 0
          ? `${activeStats.absent} siswa alpa (${activeStats.slices.find(s => s.name === 'Alpa')?.value || 0}%)`
          : 'Tidak ada siswa yang alpa (0%)'
      };
    } else {
      return {
        scope: `${activeStats.total} total rekaman presensi keseluruhan`,
        absentText: activeStats.absent > 0
          ? `${activeStats.absent} siswa alpa (${activeStats.slices.find(s => s.name === 'Alpa')?.value || 0}%)`
          : 'Tidak ada siswa yang alpa (0%)'
      };
    }
  }, [attendanceFilter, totalStudents, activeStats, thisWeekMeetingLabel]);

  return (
    <div id="dashboard-attendance-chart-card" className="bg-white p-5 rounded-2xl border border-[#E6E8EC] flex flex-col justify-between shadow-xs">
      <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8]">
        <div>
          <div className="flex items-center gap-1.5">
            <UserCheck size={16} className="text-[#0362D0]" />
            <h3 className="font-bold text-[#172033] text-base">Kehadiran Siswa</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium">Distribusi rekap presensi santri</p>
        </div>
        {/* Filter Dropdown */}
        <div className="flex items-center gap-1.5 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-3 py-1">
          <Filter size={14} className="text-[#0362D0]" />
          <select 
            id="dashboard-attendance-filter-select"
            value={attendanceFilter} 
            onChange={(e) => setAttendanceFilter(e.target.value as AttendanceFilter)}
            aria-label="Filter Kehadiran Siswa"
            className="text-xs font-semibold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 focus:ring-0"
          >
            <option value="thisWeek">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="sixMonths">6 Bulan</option>
            <option value="all">Keseluruhan</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-4">
        {/* Pie Chart display */}
        <div className="md:col-span-6 h-[160px] flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeStats.slices}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {activeStats.slices.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Persentase']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E6E8EC', fontSize: '12px', fontWeight: '500' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-[#172033]">{activeStats.rate}%</span>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-0.5">Hadir</span>
          </div>
        </div>

        {/* Custom Side Legends & Fast Summary */}
        <div className="md:col-span-6 space-y-3">
          <div className="bg-[#0362D0]/5 p-3.5 rounded-xl border border-[#0362D0]/10">
            <p className="text-sm font-semibold text-[#0362D0] leading-none">
              {activeStats.rate}% Kehadiran
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1.5">
              {filterContextText.scope}
            </p>
            <p className={`text-xs font-medium mt-1 ${activeStats.absent > 0 ? 'text-[#950415]' : 'text-emerald-700'}`}>
              {filterContextText.absentText}
            </p>
          </div>

          {/* Legends list */}
          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600">
            {activeStats.slices.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.name} <span className="font-semibold text-[#172033]">({item.value}%)</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
