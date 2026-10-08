import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { APP_LOGO, APP_NAME, APP_SUBTITLE } from '../assets/logo';
import { NetworkStatusBar } from '../components/network/NetworkStatusIndicator';

export function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-[#172033] flex font-sans w-full print:bg-white print:min-h-0 print:block">
      
      {/* Sidebar Component (Desktop Only) */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-100 print:hidden">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen w-full relative lg:pl-64 pb-16 lg:pb-0 print:pl-0 print:pb-0 print:min-h-0 print:block">
        
        {/* Offline & Connectivity Ambient Top Bar */}
        <NetworkStatusBar />

        {/* Top Navbar */}
        <div className="flex items-center bg-white border-b border-slate-100 sticky top-0 z-30 shrink-0 h-16 w-full shadow-xs relative print:hidden">
          {/* Subtle Maroon & Gold Accent Line Under Navbar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0362D0] via-[#C99A2E] to-[#950415]" />
          
          <div className="flex items-center lg:hidden pl-4 shrink-0">
            <div className="flex items-center gap-3 pr-2 py-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-[#C99A2E]/50 bg-white p-0.5 shadow-sm">
                <img 
                  src={APP_LOGO} 
                  alt="Logo SMPN 102" 
                  className="w-full h-full object-cover rounded-lg" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-bold text-sm text-[#172033] mb-0.5">{APP_NAME}</span>
                <span className="text-xs text-[#C99A2E] font-medium truncate">{APP_SUBTITLE}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 h-full flex items-center w-full min-w-0">
            <Header />
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:px-10 relative z-0 mx-auto w-full max-w-[1440px] print:p-0 print:m-0 print:max-w-none print:w-full">
          <Outlet />
        </main>
        
        {/* Footer (Desktop Only) */}
        <div className="h-10 bg-white border-t border-slate-100 px-4 lg:px-8 flex items-center justify-between shrink-0 z-10 hidden lg:flex text-xs text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#172033]">Portal BTQ</span>
            <span>•</span>
            <span className="font-medium text-[#950415]">SMP Negeri 102 Jakarta</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span className="w-2 h-2 bg-[#0362D0] rounded-full animate-pulse" />
            <span>Sistem Terkoneksi & Aktif</span>
          </div>
        </div>

        {/* Bottom Nav (Mobile Only) */}
        <div className="print:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
