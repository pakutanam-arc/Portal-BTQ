import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Check } from 'lucide-react';
import { Button } from './ui/Button';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [error, setError] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scannerId = "reader";
    const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
      onScanSuccess(decodedText);
      setLastScanned("Terscan!");
      setTimeout(() => setLastScanned(null), 1500);
      // Optional: don't stop the scanner immediately so we can do continuous scanning
    };
    
    const qrCodeErrorCallback = (errorMessage: string) => {
      // Ignored to prevent console spam
    };

    scannerRef.current = new Html5Qrcode(scannerId);
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    // Try to get back camera first
    scannerRef.current.start(
      { facingMode: "environment" },
      config,
      qrCodeSuccessCallback,
      qrCodeErrorCallback
    ).catch((err) => {
      console.warn("Failed to start scanner with environment camera, trying default", err);
      setError("Mencari kamera...");
      // Fallback
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
          var cameraId = devices[0].id;
          scannerRef.current?.start(
            cameraId, 
            config, 
            qrCodeSuccessCallback, 
            qrCodeErrorCallback
          ).catch(e => {
            setError("Kamera tidak dapat diakses.");
          });
        } else {
          setError("Kamera tidak ditemukan di perangkat ini.");
        }
      }).catch(err => {
        setError("Gagal mengakses daftar kamera. Pastikan izin kamera diberikan.");
      });
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(err => {
          console.error("Failed to stop scanner", err);
        });
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center">
      <div className="absolute top-6 right-6">
        <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20 rounded-full h-12 w-12 p-0">
          <X size={28} />
        </Button>
      </div>

      <div className="w-full max-w-sm px-6 flex flex-col items-center">
        <div className="flex items-center gap-2 text-white mb-6">
          <Camera size={24} />
          <h2 className="text-xl font-bold">Scan Kartu Santri</h2>
        </div>

        <div className="w-full aspect-square bg-slate-800 rounded-2xl overflow-hidden relative border-4 border-white/20 shadow-2xl">
          <div id="reader" className="w-full h-full object-cover"></div>
          {/* Overlay scanning lines */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40"></div>
          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)] shadow-emerald-500/50 -translate-y-1/2 animate-[scan_2s_ease-in-out_infinite]"></div>
          
          {lastScanned && (
            <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
              <div className="bg-emerald-500 text-white p-4 rounded-full shadow-lg">
                <Check size={48} />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 text-rose-400 text-sm font-medium text-center bg-rose-500/10 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-8 text-slate-300 text-center text-sm font-medium">
          Arahkan kamera ke QR Code di ID Card santri.<br/>
          Sistem akan otomatis mencatat <span className="text-emerald-400 font-bold">Hadir</span>.
        </div>
      </div>
    </div>
  );
}
