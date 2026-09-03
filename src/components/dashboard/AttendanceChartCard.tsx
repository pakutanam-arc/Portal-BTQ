import React, { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

type AttendanceFilter = 'today' | 'week' | 'month';

interface AttendanceSlice {
  name: string;
  value: number;
  color: string;
}

const ATTENDANCE_DATA_MAP: Record<AttendanceFilter, AttendanceSlice[]> = {
  today: [
    { name: 'Hadir', value: 91, color: '#0362D0' },
    { name: 'Izin', value: 4, color: '#C99A2E' },
    { name: 'Sakit', value: 3, color: '#94A3B8' },
    { name: 'Alpa', value: 2, color: '#950415' }
  ],
  week: [
    { name: 'Hadir', value: 93, color: '#0362D0' },
    { name: 'Izin', value: 3, color: '#C99A2E' },
    { name: 'Sakit', value: 2, color: '#94A3B8' },
    { name: 'Alpa', value: 2, color: '#950415' }
  ],
  month: [
    { name: 'Hadir', value: 89, color: '#0362D0' },
    { name: 'Izin', value: 5, color: '#C99A2E' },
    { name: 'Sakit', value: 4, color: '#94A3B8' },
    { name: 'Alpa', value: 2, color: '#950415' }
  ]
};

const SUMMARY_MAP: Record<AttendanceFilter, { percentage: string; presentText: string }> = {
  today: { percentage: '91%', presentText: '91% Kehadiran' },
  week: { percentage: '93%', presentText: '93% Kehadiran' },
  month: { percentage: '89%', presentText: '89% Kehadiran' }
};

export const AttendanceChartCard = React.memo(function AttendanceChartCard() {
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('today');

  const currentAttendanceData = useMemo(() => {
    return ATTENDANCE_DATA_MAP[attendanceFilter];
  }, [attendanceFilter]);

  const summary = SUMMARY_MAP[attendanceFilter];

  return (
    <div id="dashboard-attendance-chart-card" className="bg-white p-5 rounded-2xl border border-[#E6E8EC] flex flex-col justify-between shadow-xs">
      <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8]">
        <div>
          <h3 className="font-extrabold text-[#172033] text-sm">Kehadiran Siswa</h3>
          <p className="text-[11px] text-slate-400 font-medium">Distribusi rekap presensi harian santri</p>
        </div>
        {/* Filter Dropdown */}
        <div className="flex items-center gap-1 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-2.5 py-1">
          <Filter size={12} className="text-[#0362D0]" />
          <select 
            id="dashboard-attendance-filter-select"
            value={attendanceFilter} 
            onChange={(e) => setAttendanceFilter(e.target.value as AttendanceFilter)}
            aria-label="Filter Kehadiran Siswa"
            className="text-[11px] font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 focus:ring-0"
          >
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-4">
        {/* Pie Chart display */}
        <div className="md:col-span-6 h-[160px] flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={currentAttendanceData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {currentAttendanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Persentase']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E6E8EC', fontSize: '11px', fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-[#172033]">{summary.percentage}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hadir</span>
          </div>
        </div>

        {/* Custom Side Legends & Fast Summary */}
        <div className="md:col-span-6 space-y-3">
          <div className="bg-[#0362D0]/5 p-3 rounded-xl border border-[#0362D0]/10">
            <p className="text-xs font-black text-[#0362D0] leading-none">
              {summary.presentText}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              126 siswa dipantau hari ini
            </p>
            <p className="text-[10px] text-[#950415] font-bold mt-1">
              11 siswa belum hadir / alpa
            </p>
          </div>

          {/* Legends list */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
            {currentAttendanceData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
