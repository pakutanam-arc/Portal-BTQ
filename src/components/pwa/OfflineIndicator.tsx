import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showRestoredToast, setShowRestoredToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestoredToast(false);
    } else if (wasOffline) {
      setShowRestoredToast(true);
      const timer = setTimeout(() => {
        setShowRestoredToast(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div 
        id="offline-banner"
        className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#172033]/95 backdrop-blur-md text-white border border-[#C99A2E]/40 shadow-2xl animate-in fade-in slide-in-from-bottom-4"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C99A2E] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C99A2E]"></span>
        </span>
        <WifiOff size={15} className="text-[#C99A2E] shrink-0" />
        <div className="flex flex-col">
          <span className="text-xs font-black text-white">Mode Offline</span>
          <span className="text-[10px] text-slate-300 font-medium">Data tersimpan lokal aktif digunakan</span>
        </div>
      </div>
    );
  }

  if (showRestoredToast) {
    return (
      <div 
        id="online-restored-banner"
        className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-950/95 backdrop-blur-md text-white border border-emerald-500/40 shadow-2xl animate-in fade-in slide-in-from-bottom-4"
      >
        <Wifi size={15} className="text-emerald-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-xs font-black text-emerald-100">Koneksi Pulih</span>
          <span className="text-[10px] text-emerald-300 font-medium">Data kembali tersinkronisasi otomatis</span>
        </div>
      </div>
    );
  }

  return null;
};
