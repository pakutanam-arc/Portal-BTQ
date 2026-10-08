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
    <section id="dashboard-summary-statistics" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
      {cards.map((stat, idx) => (
        <div 
          key={idx} 
          className="bg-white p-5 rounded-2xl border border-transparent flex flex-col justify-between shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
        >
          {/* Subtle gradient background effect */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2 transition-opacity group-hover:opacity-20 ${stat.bg.replace('bg-', 'bg-')}`} />
          
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
              {stat.label}
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color} border border-white/50 shadow-inner`}>
              <stat.icon size={18} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-4 relative z-10">
            <p className="text-3xl font-black tracking-tight text-[#172033]">
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {stat.sub}
            </p>
          </div>

          {/* Micro Trend indicator */}
          <div className="mt-4 pt-3 border-t border-transparent flex items-center gap-1.5 text-xs font-semibold relative z-10">
            <span className={stat.trend.startsWith('↑') ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md'}>
              {stat.trend}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
});
