import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, TrendingDown, Users, Clock, BookOpen } from 'lucide-react';

export interface AttentionAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  link: string;
  badge?: string;
  metric?: string;
}

export interface AttentionPanelProps {
  alerts?: AttentionAlert[];
  isLoading?: boolean;
}

export const AttentionPanel = React.memo(function AttentionPanel({ alerts = [], isLoading = false }: AttentionPanelProps) {
  if (isLoading) {
    return (
      <section id="dashboard-attention-panel" className="bg-[#950415]/5 p-4 sm:p-5 rounded-2xl border border-[#950415]/20 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#950415]/15 text-[#950415]">
          <AlertCircle size={18} strokeWidth={2.5} />
          <h3 className="font-black text-xs uppercase tracking-wider">Perlu Perhatian</h3>
        </div>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white/60 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  // Jika semua kelompok aman dan tidak ada indikator berisiko
  if (alerts.length === 0) {
    return (
      <section id="dashboard-attention-panel" className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-emerald-200/60 text-emerald-800">
          <CheckCircle2 size={18} strokeWidth={2.5} className="text-emerald-600" />
          <h3 className="font-black text-xs uppercase tracking-wider">Kondisi Halaqah Optimal</h3>
        </div>
        <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 flex flex-col gap-2">
          <p className="text-xs font-bold text-emerald-900 leading-snug">
            Seluruh kelompok mencapai standar KKM ≥ 75%
          </p>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            Tidak ada kelompok tertinggal silabus, absensi dalam batas wajar, dan jurnal mentor terisi tertib.
          </p>
          <Link 
            to="/reports" 
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0362D0] hover:underline mt-1 pt-1 border-t border-slate-100"
          >
            <span>Buka Laporan Terperinci</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="dashboard-attention-panel" className="bg-[#950415]/5 p-4 sm:p-5 rounded-2xl border border-[#950415]/20 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#950415]/15 text-[#950415]">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} strokeWidth={2.5} />
          <h3 className="font-black text-xs uppercase tracking-wider">Perlu Perhatian</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#950415]/15 text-[#950415]">
          {alerts.length} Isu Terdeteksi
        </span>
      </div>

      <div className="space-y-2.5">
        {alerts.map((item) => {
          const isDanger = item.type === 'danger';
          return (
            <Link 
              key={item.id}
              to={item.link}
              id={`attention-item-${item.id}`}
              className="flex items-start justify-between gap-2 p-2.5 bg-white/70 hover:bg-white border border-[#950415]/15 hover:border-[#950415]/30 rounded-xl transition-all group block shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <span className={`text-xs mt-0.5 shrink-0 ${isDanger ? 'text-[#950415]' : 'text-amber-600'}`}>
                  ⚠
                </span>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-[#172033] leading-snug group-hover:text-[#0362D0] transition-colors">
                      {item.title}
                    </p>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        isDanger 
                          ? 'bg-[#950415]/10 text-[#950415] border-[#950415]/20' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium mt-0.5 leading-tight">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:text-[#0362D0] shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          );
        })}
      </div>
    </section>
  );
});
