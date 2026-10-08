import React from 'react';
import { Clock } from 'lucide-react';
import { SystemActivity } from '../../services/db';

interface RecentActivitiesCardProps {
  activities: SystemActivity[];
  onOpenModal: () => void;
}

export const RecentActivitiesCard = React.memo(function RecentActivitiesCard({
  activities,
  onOpenModal
}: RecentActivitiesCardProps) {
  return (
    <section id="dashboard-recent-activities-card" className="bg-white rounded-2xl border border-transparent shadow-sm p-4 sm:p-5 flex-1 flex flex-col overflow-hidden shadow-xs">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-transparent shadow-sm">
        <h3 className="font-bold text-[#172033] text-base">
          Aktivitas Terbaru
        </h3>
        <Clock size={16} className="text-slate-400" />
      </div>

      <div className="space-y-4 overflow-y-auto pr-1 pb-2 flex-1 max-h-[250px]">
        {activities.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-500 h-full">
            <span className="text-2xl mb-2">📭</span>
            <p className="text-sm font-semibold">Belum ada aktivitas baru</p>
            <p className="text-xs mt-0.5">Sistem akan mencatat aktivitas secara otomatis.</p>
          </div>
        ) : (
          activities.slice(0, 5).map((act, idx) => (
            <div key={act.id} className="flex gap-3 items-start relative pl-4">
              {idx < Math.min(activities.length, 5) - 1 && (
                <div className="absolute left-[4.5px] top-[16px] bottom-[-16px] w-[1.5px] bg-[#f1f5f9]" />
              )}
              <div className={`w-2.5 h-2.5 rounded-full absolute left-[-0.5px] top-[6px] ring-4 ${
                act.type === 'progress' ? 'bg-[#0362D0] ring-[#0362D0]/10' : 
                act.type === 'journal' ? 'bg-[#C99A2E] ring-[#C99A2E]/10' : 
                'bg-[#950415] ring-[#950415]/10'
              }`} />
              <div className="text-sm text-slate-600 leading-relaxed">
                <span className="font-semibold text-[#172033]">{act.title}</span> • {act.description}
                <p className="text-slate-500 text-xs mt-1 font-medium">{act.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        id="btn-view-all-activities"
        type="button"
        onClick={onOpenModal}
        className="btn btn-secondary w-full mt-4"
      >
        Lihat Semua Aktivitas
      </button>
    </section>
  );
});
