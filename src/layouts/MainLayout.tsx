import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Menu } from 'lucide-react';
import { cn } from '../utils/cn';
import { APP_LOGO, APP_NAME, APP_SUBTITLE } from '../assets/logo';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#172033] flex font-sans w-full">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#172033]/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out w-64 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={() => {
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen w-full relative lg:pl-64">
        {/* Top Navbar with Hamburger */}
        <div className="flex items-center bg-white border-b border-[#E6E8EC] sticky top-0 z-30 shrink-0 h-16 w-full shadow-xs relative">
          {/* Subtle Maroon & Gold Accent Line Under Navbar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0362D0] via-[#C99A2E] to-[#950415]" />

          <div className="flex items-center lg:hidden pl-3 shrink-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-[#172033] hover:bg-[#F5F6F8] rounded-xl shrink-0"
              aria-label="Toggle Menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 pl-1 pr-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-[#C99A2E]/50 bg-white p-0.5 shadow-xs">
                <img 
                  src={APP_LOGO} 
                  alt="Logo SMPN 102" 
                  className="w-full h-full object-cover rounded-md" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xs text-[#172033] tracking-tight leading-none">{APP_NAME}</span>
                <span className="text-[9px] text-[#C99A2E] font-bold truncate">{APP_SUBTITLE}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 h-full flex items-center w-full min-w-0">
            <Header />
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-0">
          <Outlet />
        </main>
        
        {/* Footer */}
        <div className="h-10 bg-white border-t border-[#E6E8EC] px-4 lg:px-8 flex items-center justify-between shrink-0 z-10 hidden sm:flex text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#172033]">Portal BTQ</span>
            <span>•</span>
            <span className="font-semibold text-[#950415]">SMP Negeri 102 Jakarta</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="w-2 h-2 bg-[#0362D0] rounded-full animate-pulse" />
            <span>Sistem Terkoneksi & Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}

