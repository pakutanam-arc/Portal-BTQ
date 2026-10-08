import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  ShieldCheck,
  Calendar,
  Users,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  getAcademicConfig,
  saveAcademicConfig,
  simulateAcademicRollOver,
  executeAcademicRollOver,
  AcademicConfig,
  RollOverSimulation,
  RollOverResult,
} from '../../services/academicRollOver';

interface AcademicRollOverWizardProps {
  userEmail?: string;
  onToast: (title: string, desc: string, isError?: boolean) => void;
  onSuccess?: () => void;
}

export function AcademicRollOverWizard({ userEmail, onToast, onSuccess }: AcademicRollOverWizardProps) {
  // Current config
  const [currentConfig, setCurrentConfig] = useState<AcademicConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Wizard Steps: 1 = Form, 2 = Simulation, 3 = Confirm, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [targetYear, setTargetYear] = useState('2027/2028');
  const [targetSemester, setTargetSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [autoBackup, setAutoBackup] = useState(true);

  // Simulation State
  const [simLoading, setSimLoading] = useState(false);
  const [simulation, setSimulation] = useState<RollOverSimulation | null>(null);
  const [showDetailList, setShowDetailList] = useState(false);

  // Execution State
  const [confirmInput, setConfirmInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState({ message: '', percent: 0 });
  const [result, setResult] = useState<RollOverResult | null>(null);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    setConfigLoading(true);
    try {
      const cfg = await getAcademicConfig();
      setCurrentConfig(cfg);

      // Otomatis tentukan default tahun berikutnya
      const parts = cfg.academicYear.split('/');
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        const nextStart = Number(parts[0]) + 1;
        const nextEnd = Number(parts[1]) + 1;
        setTargetYear(`${nextStart}/${nextEnd}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConfigLoading(false);
    }
  };

  // Navigasi ke Step 2 (Jalankan Simulasi)
  const handleProceedToSimulation = async () => {
    setSimLoading(true);
    try {
      const sim = await simulateAcademicRollOver();
      setSimulation(sim);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      onToast('Simulasi Gagal', 'Gagal memuat data santri untuk simulasi kenaikan kelas.', true);
    } finally {
      setSimLoading(false);
    }
  };

  // Eksekusi Transisi Resmi
  const handleExecute = async () => {
    if (confirmInput.trim().toUpperCase() !== 'TRANSISI') {
      onToast('Konfirmasi Diperlukan', 'Harap ketik kata TRANSISI dengan benar pada kotak konfirmasi.', true);
      return;
    }

    setExecuting(true);
    setProgress({ message: 'Memulai alur transisi tahun ajaran...', percent: 5 });

    try {
      const res = await executeAcademicRollOver({
        targetAcademicYear: targetYear,
        targetSemester: targetSemester,
        autoBackupFirst: autoBackup,
        userEmail,
        onProgress: (message, percent) => {
          setProgress({ message, percent });
        },
      });

      setResult(res);
      setStep(4);
      loadCurrentConfig();
      onSuccess?.();
      onToast(
        'Tahun Ajaran Berhasil Ditransisikan',
        `Tahun ajaran baru ${targetYear} (${targetSemester}) aktif. ${res.graduatedCount} santri diluluskan dan ${res.promotedTo9Count + res.promotedTo8Count} santri naik kelas.`
      );
    } catch (err: any) {
      console.error(err);
      onToast('Eksekusi Transisi Gagal', err?.message || 'Terjadi kesalahan sistem.', true);
    } finally {
      setExecuting(false);
    }
  };

  const handleResetWizard = () => {
    setStep(1);
    setSimulation(null);
    setResult(null);
    setConfirmInput('');
    setProgress({ message: '', percent: 0 });
  };

  return (
    <div className="space-y-6">
      {/* KARTU STATUS TAHUN AJARAN AKTIF */}
      <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#C99A2E]/10 text-[#C99A2E]">
                <Calendar size={20} />
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#172033]">
                Konfigurasi Kalender Akademik & Tahun Ajaran
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Status tahun ajaran dan semester aktif yang mengontrol penomoran sesi KBM di seluruh portal.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-[#0362D0] border border-blue-200 shrink-0">
            Sistem Akademik
          </span>
        </div>

        {configLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
            <RefreshCw size={16} className="animate-spin text-[#0362D0]" /> Memuat konfigurasi...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tahun Pelajaran</span>
              <p className="text-base font-black text-[#172033]">{currentConfig?.academicYear || '2026/2027'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Semester Aktif</span>
              <p className="text-base font-black text-[#0362D0]">{currentConfig?.semester || 'Ganjil'} (16 Sesi KBM)</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siklus Pertemuan</span>
              <p className="text-base font-black text-emerald-700">Pertemuan {currentConfig?.activeMeetingNumber || 1}</p>
            </div>
          </div>
        )}
      </div>

      {/* WIZARD PERGANTIAN TAHUN AJARAN */}
      <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#0362D0]/10 text-[#0362D0]">
                <GraduationCap size={20} />
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#172033]">
                Wizard Pergantian Tahun Ajaran (Academic Roll-Over)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Alur terarah untuk mengarsipkan santri kelas 9 yang lulus, mempromosikan kelas 7 dan 8, serta mereset KBM ke Pertemuan 1 dengan perlindungan data historis.
            </p>
          </div>

          {/* Step Indicator Badges */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                step === 1 ? 'bg-[#0362D0] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              1. Target
            </span>
            <span className="text-slate-300">›</span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                step === 2 ? 'bg-[#0362D0] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              2. Simulasi
            </span>
            <span className="text-slate-300">›</span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                step === 3 ? 'bg-[#0362D0] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              3. Eksekusi
            </span>
          </div>
        </div>

        {/* STEP 1: FORM TARGET TAHUN AJARAN & SEMESTER */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-[#172033] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={15} className="text-[#C99A2E]" />
                Langkah 1: Tentukan Tahun Ajaran Baru & Semester Sasaran
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#172033]">Tahun Ajaran Baru</label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-100 bg-white text-xs font-bold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#0362D0]"
                  >
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028 (Tahun Berikutnya)</option>
                    <option value="2028/2029">2028/2029</option>
                    <option value="2029/2030">2029/2030</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#172033]">Semester Sasaran</label>
                  <select
                    value={targetSemester}
                    onChange={(e) => setTargetSemester(e.target.value as 'Ganjil' | 'Genap')}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-100 bg-white text-xs font-bold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#0362D0]"
                  >
                    <option value="Ganjil">Ganjil (Awal Tahun Pelajaran Baru)</option>
                    <option value="Genap">Genap (Semester Lanjutan)</option>
                  </select>
                </div>
              </div>

              {/* Opsi Auto Backup */}
              <label className="flex items-start gap-3 p-3.5 bg-white border border-slate-100 rounded-xl cursor-pointer select-none hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#0362D0] rounded focus:ring-[#0362D0]"
                />
                <div>
                  <span className="text-xs font-black text-[#172033] flex items-center gap-1.5">
                    <Download size={13} className="text-[#0362D0]" />
                    Unduh snapshot cadangan database otomatis sebelum memproses transisi
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sangat direkomendasikan. Sistem akan otomatis mengunduh satu berkas .json cadangan penuh sebagai arsip offline sebelum perubahan status santri diterapkan.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleProceedToSimulation}
                disabled={simLoading}
                className="btn btn-primary px-6 shadow-sm"
              >
                {simLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Menghitung Simulasi Santri...
                  </>
                ) : (
                  <>
                    Lanjut: Simulasi Kenaikan Kelas
                    <ArrowRight size={16} className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PRATINJAU & SIMULASI KENAIKAN KELAS */}
        {step === 2 && simulation && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#0362D0]/5 border border-[#0362D0]/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black text-[#0362D0] uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={16} />
                  Langkah 2: Ringkasan Simulasi Kenaikan Kelas ({targetYear} • {targetSemester})
                </h4>
                <span className="text-[11px] font-bold text-slate-500">
                  Total Santri Aktif Diperiksa: {simulation.totalActiveStudents} Orang
                </span>
              </div>

              {/* 3 Kartu Ringkasan Kenaikan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-white border border-rose-200 space-y-1">
                  <span className="text-[11px] font-bold text-rose-800 uppercase">Kelas 9 → Diarsipkan Lulus</span>
                  <p className="text-lg font-black text-rose-950">{simulation.graduating.length} Santri</p>
                  <p className="text-[11px] text-slate-500">Status diubah menjadi 'Lulus'</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-1">
                  <span className="text-[11px] font-bold text-blue-800 uppercase">Kelas 8 → Naik ke Kelas 9</span>
                  <p className="text-lg font-black text-blue-950">{simulation.promotedTo9.length} Santri</p>
                  <p className="text-[11px] text-slate-500">Promosi otomatis (misal: 8A → 9A)</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">Kelas 7 → Naik ke Kelas 8</span>
                  <p className="text-lg font-black text-emerald-950">{simulation.promotedTo8.length} Santri</p>
                  <p className="text-[11px] text-slate-500">Promosi otomatis (misal: 7A → 8A)</p>
                </div>
              </div>
            </div>

            {/* Jaminan Integritas Riwayat Nilai */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong>Jaminan Integritas Nilai & Presensi Historis:</strong>
                <p className="mt-0.5 text-[11px] text-emerald-800">
                  Seluruh riwayat nilai capaian Al-Qur'an, rekam presensi, sertifikasi, dan jurnal mengajar pada semester-semester sebelumnya <strong>tidak akan terhapus</strong>. Data masa lalu tetap tersimpan utuh di sistem untuk pelaporan dan portofolio santri.
                </p>
              </div>
            </div>

            {/* Detail Daftar Sampel Perubahan */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowDetailList(!showDetailList)}
                className="w-full p-3.5 flex items-center justify-between text-xs font-black text-[#172033] bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span>Lihat Contoh Daftar Santri yang Mengalami Promosi / Kelulusan</span>
                {showDetailList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDetailList && (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
                  {simulation.graduating.slice(0, 5).map(({ student }) => (
                    <div key={student.id} className="p-2 flex items-center justify-between">
                      <span className="font-bold text-[#172033]">{student.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                        {student.class} → LULUS
                      </span>
                    </div>
                  ))}
                  {simulation.promotedTo9.slice(0, 5).map(({ student, originalClass, newClass }) => (
                    <div key={student.id} className="p-2 flex items-center justify-between">
                      <span className="font-bold text-[#172033]">{student.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        {originalClass} → {newClass}
                      </span>
                    </div>
                  ))}
                  {simulation.promotedTo8.slice(0, 5).map(({ student, originalClass, newClass }) => (
                    <div key={student.id} className="p-2 flex items-center justify-between">
                      <span className="font-bold text-[#172033]">{student.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        {originalClass} → {newClass}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigasi Buttons */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="border-slate-100 text-xs font-bold">
                <ArrowLeft size={15} className="mr-1.5" /> Kembali
              </Button>
              <Button onClick={() => setStep(3)} className="btn btn-primary px-6 shadow-sm">
                Lanjut ke Konfirmasi Eksekusi <ArrowRight size={15} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: KONFIRMASI & EKSEKUSI */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <AlertTriangle size={18} className="text-amber-600" />
                Langkah 3: Konfirmasi Tindakan Pergantian Tahun Ajaran
              </div>
              <p className="leading-relaxed">
                Anda akan menerapkan pembaruan massal:
              </p>
              <ul className="list-disc list-inside space-y-1 font-medium text-amber-900">
                <li>Tahun Ajaran aktif akan dialihkan ke <strong>{targetYear} ({targetSemester})</strong>.</li>
                <li>Penomoran siklus bimbingan akan di-reset ke <strong>Pertemuan 1</strong>.</li>
                <li>Santri Kelas 9 akan diarsipkan ke status <strong>Lulus</strong>.</li>
                <li>Santri Kelas 7 dan 8 akan dipromosikan ke tingkat di atasnya.</li>
                {autoBackup && <li>Snapshot cadangan penuh database (.json) akan otomatis diunduh terlebih dahulu.</li>}
              </ul>
            </div>

            {/* Input Konfirmasi Text */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <label className="text-xs font-black text-[#172033]">
                Ketik <span className="text-rose-600 font-extrabold tracking-wider">TRANSISI</span> untuk mengonfirmasi:
              </label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Ketik TRANSISI di sini"
                className="bg-white font-black uppercase text-[#172033]"
                disabled={executing}
              />
            </div>

            {/* Progress Bar saat Eksekusi */}
            {executing && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-[#172033]">
                  <span>{progress.message}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0362D0] transition-all duration-300 rounded-full"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tombol Aksi */}
            {!executing && (
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="border-slate-100 text-xs font-bold">
                  <ArrowLeft size={15} className="mr-1.5" /> Kembali
                </Button>
                <Button
                  onClick={handleExecute}
                  disabled={confirmInput.trim().toUpperCase() !== 'TRANSISI'}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6 shadow-sm"
                >
                  Mulai Transisi Tahun Ajaran Sekarang
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: HASIL & LAPORAN SELESAI */}
        {step === 4 && result && (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h4 className="text-base font-black text-emerald-950">
                  Pergantian Tahun Ajaran Berhasil Diselesaikan!
                </h4>
                <p className="text-xs text-emerald-800 font-medium mt-1 leading-relaxed">
                  Tahun Pelajaran <strong>{result.newAcademicYear} ({result.newSemester})</strong> kini aktif di seluruh sistem. Seluruh bimbingan KBM telah siap dimulai dari Pertemuan 1.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Santri Diluluskan</span>
                <p className="text-sm font-black text-emerald-900">{result.graduatedCount} Santri</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Naik ke Kelas 9</span>
                <p className="text-sm font-black text-emerald-900">{result.promotedTo9Count} Santri</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Naik ke Kelas 8</span>
                <p className="text-sm font-black text-emerald-900">{result.promotedTo8Count} Santri</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Total Santri Terdampak</span>
                <p className="text-sm font-black text-emerald-900">{result.totalUpdated} Santri</p>
              </div>
            </div>

            {result.backupDownloaded && (
              <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Berkas snapshot cadangan (.json) telah berhasil diunduh ke komputer Anda sebagai arsip.</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleResetWizard}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6"
              >
                Selesai & Tutup Wizard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
