import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BarChart3, 
  Menu, 
  X, 
  Users, 
  Layers, 
  UserCheck, 
  BookMarked, 
  Award, 
  BookOpen, 
  FileText,
  CalendarDays,
  ShieldCheck,
  Settings,
  LogOut,
  User,
  Edit3
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { UserProfileModal } from './modals/UserProfileModal';

export function BottomNav() {
  const { userRole, userData, currentUser } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  const userName = userData?.name || currentUser?.email?.split('@')[0] || 'Pengguna';
  const roleName = isAdmin ? 'Administrator' : 'Mentor BTQ';

  const handleLogout = async () => {
    setIsMoreOpen(false);
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Main Bar Items for Admin (4 primary tabs + 1 menu button)
  const adminMainItems = [
    { icon: LayoutDashboard, label: 'Beranda', path: '/' },
    { icon: CheckSquare, label: 'Absensi', path: '/attendance/students' },
    { icon: BarChart3, label: 'Progress', path: '/progress' },
    { icon: CalendarDays, label: 'Kalender', path: '/calendar' },
  ];

  // Complete List of More Items for Admin (11 items)
  const adminMoreItems = [
    { icon: Users, label: 'Data Siswa', path: '/students' },
    { icon: Layers, label: 'Kelompok BTQ', path: '/groups' },
    { icon: CheckSquare, label: 'Sesi Mengajar', path: '/session' },
    { icon: UserCheck, label: 'Kehadiran Mentor', path: '/attendance/mentors' },
    { icon: BookMarked, label: 'Jurnal Mengajar', path: '/journals' },
    { icon: Award, label: 'Sertifikasi', path: '/certifications' },
    { icon: BookOpen, label: 'Kurikulum', path: '/curriculum' },
    { icon: CalendarDays, label: 'Kalender Akademik', path: '/calendar' },
    { icon: FileText, label: 'Laporan', path: '/reports' },
    { icon: ShieldCheck, label: 'Log Audit', path: '/audit-logs' },
    { icon: Settings, label: 'Pengaturan', path: '/settings' },
  ];

  // Main Bar Items for Mentor (4 primary tabs + 1 menu button)
  const mentorMainItems = [
    { icon: LayoutDashboard, label: 'Beranda', path: '/' },
    { icon: CheckSquare, label: 'Sesi Mengajar', path: '/session' },
    { icon: CalendarDays, label: 'Kalender', path: '/calendar' },
    { icon: Award, label: 'Sertifikasi', path: '/certifications' },
  ];

  // More Items for Mentor
  const mentorMoreItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CheckSquare, label: 'Sesi Mengajar', path: '/session' },
    { icon: CalendarDays, label: 'Kalender Akademik', path: '/calendar' },
    { icon: Award, label: 'Ujian & Sertifikasi', path: '/certifications' },
    { icon: BookOpen, label: 'Kurikulum & Panduan', path: '/curriculum' },
  ];

  const mainItems = isAdmin ? adminMainItems : mentorMainItems;
  const moreItems = isAdmin ? adminMoreItems : mentorMoreItems;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 px-2 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between h-14">
          {mainItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center h-full gap-1 transition-colors',
                  isActive ? 'text-[#0362D0]' : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              <item.icon className="icon-lg" />
              <span className="text-[9px] font-bold tracking-wide text-center truncate max-w-[64px]">{item.label}</span>
            </NavLink>
          ))}
          
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full gap-1 transition-colors cursor-pointer',
              isMoreOpen ? 'text-[#0362D0]' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {isMoreOpen ? <X className="icon-lg" /> : <Menu className="icon-lg" />}
            <span className="text-[9px] font-bold tracking-wide">Menu</span>
          </button>
        </div>
      </div>

      {/* More Menu Bottom Sheet Overlay */}
      {isMoreOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-[#172033]/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {/* More Menu Content Sheet */}
      <div 
        className={cn(
          "lg:hidden fixed bottom-14 left-0 right-0 bg-white z-40 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out transform border-t border-slate-100",
          isMoreOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4 max-h-[75vh] overflow-y-auto pb-safe">
          {/* Sheet Handle */}
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {isAdmin ? 'Menu Lengkap Admin' : 'Menu Lengkap Mentor'}
            </h3>
            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>

          {/* Grid Menu Items */}
          <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 mb-5">
            {moreItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all text-center',
                    isActive ? 'bg-[#0362D0]/10 text-[#0362D0]' : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95",
                      isActive ? "bg-[#0362D0] text-white shadow-md shadow-[#0362D0]/20" : "bg-slate-100 text-slate-600"
                    )}>
                      <item.icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-center leading-tight line-clamp-2 px-0.5">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* User Profile Card & Direct Logout Button */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div 
              onClick={() => {
                setIsMoreOpen(false);
                setIsProfileModalOpen(true);
              }}
              className="p-3 bg-slate-50 hover:bg-blue-50/60 active:bg-blue-100/60 rounded-2xl border border-slate-100 hover:border-blue-200 flex items-center justify-between cursor-pointer transition-all group"
              title="Klik untuk melihat & mengedit profil serta tanda tangan digital"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0362D0] text-white flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#172033] group-hover:text-[#0362D0] truncate transition-colors flex items-center gap-1.5">
                    <span>{userName}</span>
                    <Edit3 size={11} className="text-slate-400 group-hover:text-[#0362D0]" />
                  </div>
                  <div className="text-[10px] font-bold text-[#C99A2E] truncate">{roleName} • Edit Profil & TTD</div>
                </div>
              </div>

              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Aktif
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut size={15} />
              <span>Keluar Akun (Logout)</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Profile & Signature Modal */}
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  );
}
