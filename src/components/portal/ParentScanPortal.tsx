import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Student, getStudents, getGroups } from '../../services/db';
import { QrCode, Search, Camera, CameraOff, AlertCircle, ArrowRight, UserCheck, BookOpen, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ParentScanPortal() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    async function loadStudentList() {
      try {
        const studentList = await getStudents();
        setStudents(studentList);
      } catch (e) {
        console.error('Error loading students in portal:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStudentList();
  }, []);

  // Filter students based on search query
  const filteredStudents = searchQuery.trim()
    ? students
        .filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.nis && s.nis.includes(searchQuery.trim())) ||
            (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  const handleStartScanner = async () => {
    setScanError(null);
    setScannerActive(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Check if decodedText contains a student URL or studentId
          handleDecodedResult(decodedText);
        },
        (errorMessage) => {
          // Ignore repetitive frame errors
        }
      );
    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      setScanError(
        'Tidak dapat mengakses kamera perangkat. Pastikan izin kamera telah diberikan atau gunakan pencarian nama/NISN di bawah.'
      );
      setScannerActive(false);
    }
  };

  const handleStopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping QR scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  const handleDecodedResult = (rawText: string) => {
    // Check if URL pattern matches /student/card/:id or contains student ID
    const urlMatch = rawText.match(/\/student\/card\/([a-zA-Z0-9_-]+)/);
    if (urlMatch && urlMatch[1]) {
      handleStopScanner();
      navigate(`/student/card/${urlMatch[1]}`);
      return;
    }

    // Check if rawText is directly a student ID or NIS
    const matchedById = students.find((s) => s.id === rawText || s.nis === rawText);
    if (matchedById) {
      handleStopScanner();
      navigate(`/student/card/${matchedById.id}`);
      return;
    }

    setScanError(`QR Code terdeteksi, namun bukan Kartu Santri SMPN 102 yang valid (${rawText.slice(0, 30)}...)`);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-[#172033] text-white pt-10 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="400" height="400" viewBox="0 0 100 100">
            <circle cx="80" cy="20" r="40" fill="currentColor" />
            <circle cx="90" cy="80" r="30" fill="currentColor" />
          </svg>
        </div>

        <div className="max-w-lg mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-[#C99A2E] mb-3 border border-white/10">
            <QrCode size={14} /> Portal Pantau Mandiri Orang Tua Siswa
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Rapor & Pantau Hafalan Santri
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            Akses cepat tanpa login untuk melihat riwayat setoran hafalan Al-Qur'an, presensi KBM, dan mengunduh rapor resmi siswa SMPN 102 Jakarta.
          </p>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-lg mx-auto px-4 -mt-10 relative z-20 space-y-6">
        {/* Method 1: Scan QR Code with Phone Camera */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center font-bold">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm text-[#172033]">Scan QR Code Kartu Santri</h3>
                <span className="text-xs text-slate-400">Arahkan kamera ke kartu pelajar siswa</span>
              </div>
            </div>

            {scannerActive ? (
              <button
                type="button"
                onClick={handleStopScanner}
                className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
              >
                <CameraOff size={14} /> Tutup Kamera
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartScanner}
                className="px-3 py-1.5 text-xs font-black bg-[#0362D0] text-white rounded-xl hover:bg-[#0252b3] shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Camera size={14} /> Buka Kamera
              </button>
            )}
          </div>

          {/* Camera Viewport */}
          {scannerActive && (
            <div className="space-y-2">
              <div
                id="qr-reader-container"
                className="w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 border-[#0362D0]"
              ></div>
              <p className="text-[11px] text-center text-slate-500 font-medium">
                Posisikan QR Code di dalam kotak pemindai sampai terdeteksi otomatis.
              </p>
            </div>
          )}

          {scanError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex gap-2">
              <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atau Cari Siswa</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        {/* Method 2: Manual Search by Name or NISN */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C99A2E]/15 text-[#C99A2E] flex items-center justify-center font-bold">
              <Search size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#172033]">Cari NISN atau Nama Santri</h3>
              <span className="text-xs text-slate-400">Ketik nomor induk atau nama lengkap santri</span>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: 102456 atau Ahmad..."
              className="w-full h-11 pl-10 pr-4 text-xs font-bold text-[#172033] bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0362D0] focus:bg-white transition-all"
            />
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Hapus
              </button>
            )}
          </div>

          {/* Autocomplete Results */}
          {filteredStudents.length > 0 && (
            <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-xs">
              {filteredStudents.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => navigate(`/student/card/${st.id}`)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50/50 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#172033] text-white flex items-center justify-center text-xs font-black">
                      {st.name.substring(0, 1)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#172033] group-hover:text-[#0362D0] transition-colors">
                        {st.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Kelas {st.class} • NIS: {st.nis || '-'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-[#0362D0] transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && filteredStudents.length === 0 && !loading && (
            <p className="text-xs text-center text-slate-400 py-3">
              Santri dengan kata kunci "{searchQuery}" tidak ditemukan.
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-black text-emerald-900">
            <UserCheck size={16} />
            <span>Kemudahan Pantau untuk Wali Murid</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
            Kartu Santri fisik yang dibagikan sekolah telah dilengkapi QR Code pribadi. Cukup scan dengan kamera WhatsApp atau aplikasi kamera bawaan HP untuk membuka laporan pembelajaran kapan saja.
          </p>
        </div>
      </div>
    </div>
  );
}
