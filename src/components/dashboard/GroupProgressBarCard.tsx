import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export interface GroupProgressItem {
  name: string;
  progress: number;
}

interface GroupProgressBarCardProps {
  data: GroupProgressItem[];
}

export const GroupProgressBarCard = React.memo(function GroupProgressBarCard({ data }: GroupProgressBarCardProps) {
  return (
    <div id="dashboard-group-progress-card" className="bg-white p-5 rounded-2xl border border-[#E6E8EC] flex flex-col justify-between shadow-xs">
      <div className="flex justify-between items-center pb-3 border-b border-[#F5F6F8]">
        <div>
          <h3 className="font-extrabold text-[#172033] text-sm">Progress BTQ per Kelompok</h3>
          <p className="text-[11px] text-slate-400 font-medium">Peringkat ketercapaian silabus (Utsmani)</p>
        </div>
        <span className="text-[11px] font-bold text-[#C99A2E] bg-[#C99A2E]/10 px-2.5 py-1 rounded-xl border border-[#C99A2E]/20">
          Rata-rata Progress: 68%
        </span>
      </div>

      <div className="h-[220px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={80} 
              interval={0} 
              style={{ fontSize: '10px', fontWeight: 'bold', fill: '#172033' }} 
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Progress']}
              contentStyle={{ borderRadius: '12px', border: '1px solid #E6E8EC', fontSize: '11px', fontWeight: 'bold' }}
            />
            <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => {
                const isLow = entry.progress < 60;
                return <Cell key={`cell-${index}`} fill={isLow ? '#950415' : '#0362D0'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 border-t border-[#F5F6F8] flex justify-between items-center">
        <span className="text-[10px] text-slate-400 font-semibold">
          Menampilkan seluruh {data.length} halaqah aktif
        </span>
        <Link 
          to="/groups" 
          id="dashboard-link-all-groups"
          className="text-xs text-[#0362D0] hover:underline font-extrabold flex items-center gap-0.5"
        >
          Lihat Semua Kelompok <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
});
