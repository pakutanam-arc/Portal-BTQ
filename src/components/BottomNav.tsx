import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BarChart3, Menu, X, Users, Layers, UserCheck, BookMarked, Award, BookOpen, FileText } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

export function BottomNav() {
  const { userRole } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  // Navigation specifically tailored for Mentor vs Admin
  const mentorItems = [
    { icon: LayoutDashboard, label: 'Beranda', path: '/' },
    { icon: CheckSquare, label: 'Sesi Mengajar', path: '/session' },
    { icon: Award, label: 'Ujian & Sertifikasi', path: '/certifications' },
    { icon: BookOpen, label: 'Kurikulum', path: '/curriculum' },
  ];

  const adminMainItems = [
    { icon: LayoutDashboard, label: 'Beranda', path: '/' },
    { icon: CheckSquare, label: 'Absensi', path: '/attendance/students' },
    { icon: BarChart3, label: 'Progress', path: '/progress' },
  ];

  const adminMoreItems = [
    { icon: Users, label: 'Data Siswa', path: '/students' },
    { icon: Layers, label: 'Kelompok BTQ', path: '/groups' },
    { icon: CheckSquare, label: 'Sesi Mengajar', path: '/session' },
    { icon: UserCheck, label: 'Kehadiran Mentor', path: '/attendance/mentors' },
    { icon: BookMarked, label: 'Jurnal Mengajar', path: '/journals' },
    { icon: Award, label: 'Sertifikasi', path: '/certifications' },
    { icon: BookOpen, label: 'Kurikulum', path: '/curriculum' },
    { icon: FileText, label: 'Laporan', path: '/reports' },
  ];

  if (!isAdmin) {
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6E8EC] z-50 px-2 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-14">
          {mentorItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center h-full gap-1 transition-colors',
                  isActive ? 'text-[#0362D0]' : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              <item.icon size={20} className={cn("shrink-0")} />
              <span className="text-[9px] font-bold tracking-wide text-center leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bottom Navigation Bar for Admin */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6E8EC] z-50 px-2 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between h-14">
          {adminMainItems.map((item) => (
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
              <item.icon size={20} className={cn("shrink-0")} />
              <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
            </NavLink>
          ))}
          
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full gap-1 transition-colors',
              isMoreOpen ? 'text-[#0362D0]' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {isMoreOpen ? <X size={20} /> : <Menu size={20} />}
            <span className="text-[9px] font-bold tracking-wide">Menu</span>
          </button>
        </div>
      </div>

      {/* More Menu Bottom Sheet Overlay */}
      {isMoreOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-[#172033]/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {/* More Menu Content */}
      <div 
        className={cn(
          "lg:hidden fixed bottom-14 left-0 right-0 bg-white z-40 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out transform",
          isMoreOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          </div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Menu Lainnya</h3>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {adminMoreItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-2 p-2 rounded-xl transition-all',
                    isActive ? 'bg-[#0362D0]/10 text-[#0362D0]' : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      isActive ? "bg-[#0362D0] text-white shadow-md" : "bg-[#F5F6F8] text-slate-500"
                    )}>
                      <item.icon size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
