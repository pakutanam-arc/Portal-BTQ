import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Apple, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { ModalPortal } from '../ui/ModalPortal';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({ 
  className = '', 
  compact = false 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-install-pwa"
        onClick={handleInstallClick}
        disabled={installing}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#0362D0] to-[#024bb0] text-white shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-98 transition-all cursor-pointer border border-[#0362D0]/30 ${className}`}
        title="Pasang aplikasi Portal BTQ di perangkat Anda"
      >
        <Download size={14} className="animate-bounce" />
        <span>{compact ? 'Install' : 'Install Aplikasi'}</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-install-pwa-ios"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-[#172033] border border-slate-300 shadow-xs transition-all cursor-pointer ${className}`}
          title="Petunjuk pasang di iPhone / iPad"
        >
          <Apple size={14} />
          <span>{compact ? 'Pasang di iOS' : 'Install di iOS'}</span>
        </button>

        {showIOSGuide && (
          <ModalPortal isOpen={showIOSGuide} onClose={() => setShowIOSGuide(false)}>
            <div 
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto my-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#172033] text-white flex items-center justify-center font-bold">
                    <Apple size={18} />
                  </div>
                  <h3 className="text-sm font-black text-[#172033]">Pasang di iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs font-medium text-slate-600">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                  <span className="w-6 h-6 rounded-full bg-[#0362D0] text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                  <p>Tekan tombol <strong>Share / Bagikan</strong> (ikon kotak dengan panah ke atas) pada bilah navigasi Safari.</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                  <span className="w-6 h-6 rounded-full bg-[#0362D0] text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                  <p>Gulir ke bawah dan pilih menu <strong>Add to Home Screen (Tambah ke Layar Utama)</strong>.</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                  <span className="w-6 h-6 rounded-full bg-[#0362D0] text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                  <p>Ketuk <strong>Add (Tambah)</strong> di pojok kanan atas. Aplikasi akan muncul di layar beranda iPhone Anda.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-[#172033] text-white font-bold text-xs hover:bg-[#0f172a] transition-all cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </ModalPortal>
        )}
      </>
    );
  }

  return null;
};
