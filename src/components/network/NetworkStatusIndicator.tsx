import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldCheck, Info, X } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Bar status konektivitas ringan di bagian paling atas layout
 */
export function NetworkStatusBar() {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestoredNotice(false);
    } else if (wasOffline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div
        id="offline-top-bar"
        className="w-full bg-amber-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm relative z-40 transition-all animate-in slide-in-from-top duration-300"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <WifiOff size={14} className="shrink-0" />
        <span className="truncate">
          <strong>Mode Offline Aktif</strong> — Data presensi & nilai tetap tersimpan aman di HP/Laptop dan akan disinkronkan otomatis saat online.
        </span>
      </div>
    );
  }

  if (showRestoredNotice) {
    return (
      <div
        id="online-restored-top-bar"
        className="w-full bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm relative z-40 transition-all animate-in slide-in-from-top duration-300"
      >
        <CheckCircle2 size={14} className="shrink-0 text-emerald-200" />
        <span>
          <strong>Koneksi Internet Pulih</strong> — Sinkronisasi data lokal ke cloud Firestore kembali aktif.
        </span>
      </div>
    );
  }

  return null;
}

/**
 * Badge status konektivitas di dalam Header
 */
export function NetworkStatusBadge() {
  const isOnline = useOnlineStatus();
  const [showDetails, setShowDetails] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await fetch('/favicon.ico', { cache: 'no-store', method: 'HEAD' }).catch(() => {});
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer select-none ${
          isOnline
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-400/50'
        }`}
        title={isOnline ? 'Tersambung ke Cloud Firestore' : 'Mode Offline - Data tersimpan di perangkat'}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {isOnline ? (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
            </>
          )}
        </span>

        {isOnline ? (
          <>
            <Wifi size={12} className="text-emerald-700 hidden sm:inline shrink-0" />
            <span className="hidden sm:inline">Online</span>
          </>
        ) : (
          <>
            <WifiOff size={12} className="text-amber-700 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">Mode Offline</span>
          </>
        )}
      </button>

      {/* POPOVER DETAIL KONEKTIVITAS */}
      {showDetails && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#172033]">
                    {isOnline ? 'Koneksi Terhubung' : 'Mode Offline (Luring)'}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">Status Jaringan Sekolah</span>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 rounded-md text-slate-400 hover:text-[#172033] hover:bg-slate-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div
              className={`p-3 rounded-xl text-xs space-y-1.5 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                  : 'bg-amber-50 text-amber-950 border border-amber-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {isOnline ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Firebase Firestore Aktif</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} className="text-amber-700 shrink-0" />
                    <span>Data Tersimpan di HP / Laptop</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {isOnline
                  ? 'Semua perubahan data absensi, nilai, dan jurnal KBM disinkronkan secara langsung ke basis data cloud sekolah.'
                  : 'Koneksi internet terputus. Anda tetap dapat menginput nilai dan absensi tanpa hambatan. Seluruh rekaman tersimpan lokal di perangkat dan akan disinkronkan saat terhubung kembali.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold text-slate-400">Arsitektur Offline-First PWA</span>
              <button
                onClick={handleManualCheck}
                disabled={checking}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#0362D0] hover:bg-[#0362D0]/10 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Memeriksa...' : 'Cek Status'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const NetworkStatusIndicator = NetworkStatusBadge;
