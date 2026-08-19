import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/students': 'Data Siswa',
  '/groups': 'Kelompok',
  '/attendance/students': 'Absensi Siswa',
  '/attendance/mentors': 'Kehadiran Mentor',
  '/progress': 'Progress BTQ',
  '/curriculum': 'Kurikulum & Timeline',
  '/reports': 'Laporan',
  '/settings': 'Pengaturan',
};

export function Header({ isMobile }: { isMobile?: boolean }) {
  const location = useLocation();
  const currentPathName = routeNames[location.pathname] || 'Dashboard';

  return (
    <header className={`h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 w-full shrink-0 ${isMobile ? 'border-none h-auto' : ''}`}>
      <div>
        <h2 className="text-lg font-bold text-slate-800 hidden sm:block lg:block">{currentPathName}</h2>
        <p className="text-xs text-slate-500 hidden sm:block lg:block">TA 2026/2027 • Semester Ganjil</p>
      </div>

      <div className="flex items-center gap-4 lg:gap-6 ml-auto">
        <div className="relative hidden md:block">
          <input 
            type="text" 
            placeholder="Cari data..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" size={16} />
        </div>
        
        <button className="relative p-2 bg-slate-100 rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors">
          <Bell size={18} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500 flex items-center justify-center text-white text-xs font-medium">
            <User size={16} />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-slate-800 leading-tight">Admin Pusat</p>
            <p className="text-[10px] text-slate-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
