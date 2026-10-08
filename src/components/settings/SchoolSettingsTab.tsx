import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Award, 
  Calendar, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  ShieldCheck,
  GraduationCap,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  SchoolConfig, 
  DEFAULT_SCHOOL_CONFIG, 
  getSchoolConfig, 
  saveSchoolConfig 
} from '../../services/schoolConfig';

interface SchoolSettingsTabProps {
  userEmail?: string;
  onToast: (title: string, desc: string, isError?: boolean) => void;
}

export function SchoolSettingsTab({ userEmail, onToast }: SchoolSettingsTabProps) {
  const [config, setConfig] = useState<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSchoolConfig();
        setConfig(data);
      } catch (e) {
        console.error('Error loading school config:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanged(true);
  };

  const handleKkmChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (!isNaN(num)) {
      handleChange('kkm', num);
    } else if (valStr === '') {
      handleChange('kkm', 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.kkm < 50 || config.kkm > 100) {
      onToast('Nilai KKM Tidak Valid', 'Nilai KKM harus berada di rentang 50 sampai 100.', true);
      return;
    }
    if (!config.headmasterName.trim()) {
      onToast('Data Belum Lengkap', 'Nama Kepala Sekolah wajib diisi.', true);
      return;
    }

    setSaving(true);
    try {
      await saveSchoolConfig(config, userEmail);
      setHasChanged(false);
      onToast(
        'Pengaturan Sekolah Disimpan',
        `KKM (${config.kkm}), Semester (${config.semester} ${config.academicYear}), dan Kepala Sekolah berhasil diperbarui.`
      );
    } catch (err) {
      console.error('Save school config error:', err);
      onToast(
        'Penyimpanan Gagal',
        'Terjadi kendala saat menyimpan ke database Firestore. Perubahan tetap dicatat di penyimpanan lokal.',
        true
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-slate-100 rounded-3xl overflow-hidden shadow-xs bg-white">
        <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#0362D0]" />
          <p className="text-xs font-bold text-slate-500">Memuat konfigurasi profil sekolah & KKM...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-100 rounded-3xl overflow-hidden shadow-xs bg-white">
      <CardContent className="p-6 space-y-6">
        {/* Header section */}
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#172033] flex items-center gap-2">
              <Building2 size={20} className="text-[#0362D0]" />
              Pengaturan Sekolah & Lembar Rapor
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Atur KKM kelulusan, pejabat kepala sekolah, NIP, serta semester aktif yang langsung terhubung ke cetakan rapor siswa.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-[#0362D0] border border-blue-200 shrink-0 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Terhubung Langsung ke Rapor A4
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: KKM & ACADEMIC INFO */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <Award size={16} className="text-[#C99A2E]" />
                Kriteria Ketuntasan Minimal (KKM) & Periode Aktif
              </h4>
              <span className="text-[11px] font-bold text-slate-500">Acuan Kelulusan BTQ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KKM INPUT */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider flex items-center gap-1">
                  Nilai KKM Target
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={config.kkm || ''}
                    onChange={(e) => handleKkmChange(e.target.value)}
                    className="font-black text-lg text-[#0362D0] pl-4 pr-12 bg-white"
                    placeholder="75"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    Poin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Standar minimal tuntas di lembar rapor. Contoh: <strong>75</strong> atau <strong>78</strong>.
                </p>
              </div>

              {/* SEMESTER */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider">
                  Semester Berjalan
                </label>
                <select
                  value={config.semester}
                  onChange={(e) => handleChange('semester', e.target.value as 'Ganjil' | 'Genap')}
                  className="w-full h-10 px-3 font-bold text-sm text-[#172033] bg-white border border-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0362D0]"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Ditampilkan pada kop lembar penilaian rapor.
                </p>
              </div>

              {/* TAHUN AJARAN */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider">
                  Tahun Pelajaran
                </label>
                <Input
                  value={config.academicYear}
                  onChange={(e) => handleChange('academicYear', e.target.value)}
                  placeholder="2026/2027"
                  className="font-bold text-[#172033] bg-white"
                />
                <p className="text-[11px] text-slate-500 leading-tight">
                  Format tahun ajaran resmi (misal: 2026/2027).
                </p>
              </div>
            </div>

            {/* PREVIEW PREDIKAT BERDASARKAN KKM */}
            <div className="p-3 bg-white rounded-xl border border-slate-100 mt-2">
              <span className="text-[11px] font-black text-[#172033] block mb-1.5">
                Skala Predikat Otomatis dengan KKM {config.kkm}:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-800">A (Sangat Baik):</span>
                  <div className="text-emerald-900 font-extrabold text-xs">
                    ≥ {Math.max(88, config.kkm + 10)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="font-bold text-blue-800">B (Baik / Tuntas):</span>
                  <div className="text-blue-900 font-extrabold text-xs">
                    {config.kkm} - {Math.max(88, config.kkm + 10) - 1}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="font-bold text-amber-800">C (Cukup):</span>
                  <div className="text-amber-900 font-extrabold text-xs">
                    {Math.max(60, config.kkm - 8)} - {config.kkm - 1}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                  <span className="font-bold text-rose-800">D (Di Bawah KKM):</span>
                  <div className="text-rose-900 font-extrabold text-xs">
                    &lt; {Math.max(60, config.kkm - 8)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: KEPALA SEKOLAH & PENGESAH */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <GraduationCap size={16} className="text-[#0362D0]" />
                Identitas Pejabat Kepala Sekolah & Penandatangan
              </h4>
              <span className="text-[11px] font-bold text-slate-500">Tanda Tangan Sah Rapor</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider flex items-center gap-1">
                  Nama Lengkap Kepala Sekolah
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={config.headmasterName}
                  onChange={(e) => handleChange('headmasterName', e.target.value)}
                  placeholder="Dra. Hj. Sri Rahayu, M.Pd."
                  className="font-bold text-[#172033] bg-white"
                />
                <p className="text-[11px] text-slate-500 leading-tight">
                  Tercetak pada kolom tanda tangan paling kanan dengan garis bawah.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider flex items-center gap-1">
                  NIP Kepala Sekolah
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={config.headmasterNip}
                  onChange={(e) => handleChange('headmasterNip', e.target.value)}
                  placeholder="19680512 199412 2 001"
                  className="font-mono font-bold text-[#172033] bg-white"
                />
                <p className="text-[11px] text-slate-500 leading-tight">
                  Format NIP dinas 18 digit (boleh menggunakan spasi pemisah).
                </p>
              </div>
            </div>

            {/* PREVIEW TANDA TANGAN */}
            <div className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-[#172033] block mb-0.5">Pratinjau Format Tanda Tangan:</span>
                Tampilan otomatis di pojok kanan bawah rapor sesuai data di atas.
              </div>

              <div className="text-center font-serif text-xs border border-slate-200 bg-slate-50/70 p-3 rounded-lg w-52 shrink-0">
                <p className="font-bold text-black">Mengetahui,</p>
                <p className="text-slate-800 font-bold text-[11px]">Kepala {config.schoolName}</p>
                <div className="h-10"></div>
                <p className="font-bold text-black underline text-[11px]">{config.headmasterName || '(Nama Kepala Sekolah)'}</p>
                <p className="text-[10px] text-slate-600 font-sans">NIP. {config.headmasterNip || '-'}</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: IDENTITAS SEKOLAH & TITIMANGSA */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 size={16} className="text-[#0362D0]" />
              Identitas Satuan Pendidikan & Titimangsa
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider">
                  Nama Satuan Pendidikan
                </label>
                <Input
                  value={config.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  placeholder="SMP Negeri 102 Jakarta"
                  className="font-bold text-[#172033] bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider">
                  NPSN Sekolah
                </label>
                <Input
                  value={config.schoolNpsn}
                  onChange={(e) => handleChange('schoolNpsn', e.target.value)}
                  placeholder="20102557"
                  className="font-mono font-bold text-[#172033] bg-white"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider">
                  Alamat Lengkap Sekolah
                </label>
                <Input
                  value={config.schoolAddress}
                  onChange={(e) => handleChange('schoolAddress', e.target.value)}
                  placeholder="Jl. Cijantung IV, Pasar Rebo, Jakarta Timur"
                  className="font-medium text-[#172033] bg-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#172033] uppercase tracking-wider">
                  Kota Titimangsa Cetak
                </label>
                <Input
                  value={config.printCity}
                  onChange={(e) => handleChange('printCity', e.target.value)}
                  placeholder="Jakarta"
                  className="font-bold text-[#172033] bg-white"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              {hasChanged ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertCircle size={14} /> Ada perubahan yang belum disimpan.
                </span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Konfigurasi tersimpan dan aktif.
                </span>
              )}
            </span>

            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0362D0] hover:bg-[#0252b3] text-white px-6 font-bold shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-1.5" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-1.5" /> Simpan Pengaturan Sekolah
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
