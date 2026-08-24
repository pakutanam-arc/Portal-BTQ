import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Activity {
  id: string;
  icon: string;
  bg: string;
  content: React.ReactNode;
  time: string;
}

const mockActivities: Activity[] = [
  { id: '1', icon: '✅', bg: 'bg-emerald-100', content: <><span className="font-bold text-slate-800">Mentor Kelompok 3</span> mengisi absensi harian (100% hadir).</>, time: '2 menit yang lalu' },
  { id: '2', icon: '📈', bg: 'bg-blue-100', content: <><span className="font-bold text-slate-800">Ahmad Zaki</span> (Kel-1) naik status ke "Sangat Baik".</>, time: '15 menit yang lalu' },
  { id: '3', icon: '📝', bg: 'bg-amber-100', content: <><span className="font-bold text-slate-800">Admin</span> memperbarui kurikulum Tahap 4.</>, time: '1 jam yang lalu' },
  { id: '4', icon: '🔔', bg: 'bg-slate-100', content: <><span className="font-bold text-slate-800">Notifikasi:</span> 3 siswa di Kelompok 4 butuh pendampingan.</>, time: '3 jam yang lalu' },
  { id: '5', icon: '✅', bg: 'bg-emerald-100', content: <><span className="font-bold text-slate-800">Mentor Kelompok 1</span> menyimpan laporan hafalan siswa.</>, time: '4 jam yang lalu' },
  { id: '6', icon: '✅', bg: 'bg-emerald-100', content: <><span className="font-bold text-slate-800">Mentor Kelompok 2</span> mengisi absensi harian (90% hadir).</>, time: 'Kemarin, 15:30' },
  { id: '7', icon: '⚠️', bg: 'bg-rose-100', content: <><span className="font-bold text-slate-800">Sistem:</span> Terdeteksi 5 siswa absen berturut-turut di Kel-7.</>, time: 'Kemarin, 14:00' },
  { id: '8', icon: '📝', bg: 'bg-amber-100', content: <><span className="font-bold text-slate-800">Admin</span> mencetak Laporan Bulanan.</>, time: '2 hari yang lalu' },
];

export function ActivityLogModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
        
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {mockActivities.map((activity, idx) => (
            <div key={activity.id} className="flex gap-4 items-start p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0", activity.bg)}>
                {activity.icon}
              </div>
              <div>
                <p className="text-sm text-slate-600 leading-snug">{activity.content}</p>
                <p className="text-slate-400 text-xs mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-center">
          <p className="text-xs text-slate-500">Menampilkan 8 aktivitas terakhir</p>
        </div>
      </div>
    </div>
  );
}