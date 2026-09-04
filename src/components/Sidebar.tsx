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
  BookMarked,
  Award,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { APP_LOGO, APP_NAME, APP_SUBTITLE } from '../assets/logo';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['admin', 'mentor'] },
  { icon: CheckSquare, label: 'Sesi Mengajar', path: '/session', roles: ['admin', 'mentor'] },
  { icon: Award, label: 'Ujian & Sertifikasi', path: '/certifications', roles: ['admin', 'mentor'] },
  { icon: BookOpen, label: 'Kurikulum', path: '/curriculum', roles: ['admin', 'mentor'] },
  { icon: Users, label: 'Data Siswa', path: '/students', roles: ['admin'] },
  { icon: Layers, label: 'Kelompok BTQ', path: '/groups', roles: ['admin'] },
  { icon: UserCheck, label: 'Kehadiran Mentor', path: '/attendance/mentors', roles: ['admin'] },
  { icon: CheckSquare, label: 'Presensi Siswa', path: '/attendance/students', roles: ['admin'] },
  { icon: BarChart3, label: 'Progress Siswa', path: '/progress', roles: ['admin'] },
  { icon: BookMarked, label: 'Jurnal Mengajar', path: '/journals', roles: ['admin'] },
  { icon: FileText, label: 'Laporan', path: '/reports', roles: ['admin'] },
  { icon: ShieldCheck, label: 'Log Audit Sistem', path: '/audit-logs', roles: ['admin'] },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { userRole } = useAuth();
  
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole || 'mentor'));

  return (
    <aside className="w-64 bg-[#172033] text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-40 border-r border-[#950415]/30 shadow-xl">
      {/* Top Header Branding */}
      <div className="p-5 flex items-center gap-3.5 border-b border-slate-700/60 bg-[#121929] relative">
        {/* Subtle gold accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#950415] via-[#C99A2E] to-[#0362D0]" />
        
        <div className="w-11 h-11 bg-white rounded-xl p-0.5 flex items-center justify-center shrink-0 shadow-md ring-2 ring-[#C99A2E]/50">
          <img 
            src={APP_LOGO} 
            alt="Logo SMPN 102 Jakarta" 
            className="w-full h-full object-cover rounded-lg" 
            referrerPolicy="no-referrer" 
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-white">
            {APP_NAME}
          </h1>
          <p className="text-xs font-medium text-[#C99A2E] truncate mt-0.5">
            {APP_SUBTITLE}
          </p>
        </div>
      </div>
      
      {/* Decorative Gold Accent Divider */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C99A2E]/40 to-transparent" />

      {/* Navigation Links */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        <div className="px-5 mb-2 mt-1 text-[10px] text-slate-400 uppercase font-extrabold tracking-widest flex items-center justify-between">
          <span>Navigasi Utama</span>
          <span className="w-2 h-2 rounded-full bg-[#C99A2E]" />
        </div>
        
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'nav-item-layout px-5 py-3 text-xs sm:text-sm font-semibold transition-all relative group',
                isActive 
                  ? 'bg-[#0362D0] text-white shadow-md' 
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Gold Active State Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C99A2E] rounded-r-sm shadow-sm" />
                )}
                <item.icon className={cn("icon-nav", isActive ? "text-white" : "text-slate-400 group-hover:text-[#C99A2E]")} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Settings Link */}
      {userRole === 'admin' && (
        <div className="p-4 border-t border-slate-800 bg-[#121929]">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'nav-item-layout px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all relative',
                isActive 
                  ? 'bg-[#0362D0] text-white' 
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
              )
            }
          >
            <Settings className="icon-nav text-[#C99A2E]" />
            <span className="truncate">Pengaturan</span>
          </NavLink>
        </div>
      )}
    </aside>
  );
}

