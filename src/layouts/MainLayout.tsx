import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Menu } from 'lucide-react';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-slate-800 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full relative">
        <div className='absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none' style={{backgroundImage: 'radial-gradient(#064e3b 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
        
        {/* Mobile Header Toggle */}
        <div className="lg:hidden flex items-center p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-md"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1">
            <Header isMobile />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block sticky top-0 z-10 shrink-0">
          <Header />
        </div>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden relative z-0">
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
