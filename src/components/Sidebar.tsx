import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  CheckSquare, 
  UserCheck, 
  BarChart3, 
  BookOpen, 
  FileText, 
  Settings,
  BookMarked
} from 'lucide-react';
import { cn } from '../utils/cn';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Data Siswa', path: '/students' },
  { icon: Layers, label: 'Kelompok', path: '/groups' },
  { icon: CheckSquare, label: 'Absensi Siswa', path: '/attendance/students' },
  { icon: UserCheck, label: 'Kehadiran Mentor', path: '/attendance/mentors' },
  { icon: BarChart3, label: 'Progress BTQ', path: '/progress' },
  { icon: BookOpen, label: 'Kurikulum', path: '/curriculum' },
  { icon: FileText, label: 'Laporan', path: '/reports' },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="w-64 bg-[#064e3b] text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 flex items-center justify-between border-b border-emerald-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <img src="/3f2fdbb3-951c-4f74-a712-4d183db9de07.jpg" alt="Logo BTQ" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Admin SMP 102</h1>
            <p className="text-[10px] text-emerald-200/70 uppercase tracking-wider">Sistem Administrasi</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 py-4 space-y-1">
        <div className='px-4 mb-2 mt-2 text-[10px] text-emerald-300 uppercase font-semibold tracking-widest'>Navigasi Utama</div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-white/10 border-r-4 border-amber-400 text-white' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-emerald-800/50 bg-emerald-950/20">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive 
                ? 'bg-white/10 text-white' 
                : 'text-emerald-100/70 hover:bg-white/5 hover:text-white'
            )
          }
        >
          <Settings size={18} />
          Pengaturan
        </NavLink>
      </div>
    </aside>
  );
}
