import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Menu } from 'lucide-react';
import { cn } from '../utils/cn';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false); // We don't need the mobile overlay state on desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-slate-800 flex font-sans w-full">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity"
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen w-full relative lg:pl-64">
        <div className='absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none' style={{backgroundImage: 'radial-gradient(#064e3b 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
        
        {/* Header with Hamburger */}
        <div className="flex items-center bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0 h-16 w-full">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 ml-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-md shrink-0 lg:hidden"
            aria-label="Toggle Menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1 h-full flex items-center w-full min-w-0">
            <Header />
          </div>
        </div>

        <main className="flex-1 p-4 lg:p-8 relative z-0">
          <Outlet />
        </main>
        
        <div className='h-10 bg-white border-t border-slate-200 px-4 lg:px-8 flex items-center justify-between shrink-0 z-10 hidden sm:flex'>
          <div className='text-[10px] text-slate-400 uppercase tracking-widest font-semibold'>SMP Negeri 102 Jakarta • BTQ Management System v1.0</div>
          <div className='flex items-center gap-3 text-[10px] text-slate-500 font-medium'>
            <span className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse'></span>
            Server Online
          </div>
        </div>
      </div>
    </div>
  );
}
