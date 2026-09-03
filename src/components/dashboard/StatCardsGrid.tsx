import React from 'react';

export interface StatCardItem {
  label: string;
  value: string;
  sub: string;
  trend: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  color: string;
  bg: string;
  border: string;
}

interface StatCardsGridProps {
  cards: StatCardItem[];
}

export const StatCardsGrid = React.memo(function StatCardsGrid({ cards }: StatCardsGridProps) {
  return (
    <section id="dashboard-summary-statistics" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((stat, idx) => (
        <div 
          key={idx} 
          className="bg-white p-4 rounded-2xl border border-[#E6E8EC] flex flex-col justify-between hover:shadow-xs transition-all group relative overflow-hidden"
        >
          {/* Subtle brand border on hover */}
          <div className="absolute top-0 left-0 w-full h-1 bg-[#0362D0] opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none">
              {stat.label}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.bg} ${stat.color} ${stat.border}`}>
              <stat.icon size={16} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight leading-none">
              {stat.value}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              {stat.sub}
            </p>
          </div>

          {/* Micro Trend indicator */}
          <div className="mt-2.5 pt-2 border-t border-[#F5F6F8] flex items-center gap-1 text-[9px] font-bold">
            <span className={stat.trend.startsWith('↑') ? 'text-emerald-600' : 'text-slate-500'}>
              {stat.trend}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
});
