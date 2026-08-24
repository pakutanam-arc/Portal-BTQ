import React, { useEffect, useState } from 'react';
import { X, Loader2, Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getSystemActivities, SystemActivity } from '../../services/db';

export function ActivityLogModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchActivities() {
      setLoading(true);
      try {
        const data = await getSystemActivities();
        setActivities(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">Log Aktivitas Sistem</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-[#0362D0]">
              <Loader2 className="animate-spin mb-2" size={24} />
              <p className="text-xs text-slate-500 font-bold">Memuat aktivitas real-time...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Belum ada aktivitas baru</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Seluruh aktivitas sistem dari mentor dan admin akan tercatat di sini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4 items-start p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0", activity.bg)}>
                    {activity.icon}
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 leading-snug font-medium">
                      <span className="font-bold text-slate-900">{activity.title}</span> • {activity.description}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-center">
          <p className="text-xs text-slate-500">
            {loading ? 'Mengambil data...' : `Menampilkan ${activities.length} aktivitas terbaru`}
          </p>
        </div>
      </div>
    </div>
  );
}
