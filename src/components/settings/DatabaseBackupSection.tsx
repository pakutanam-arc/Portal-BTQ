import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Clock,
  Sparkles,
  X,
  FileCheck2,
  FolderDown,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  exportFullDatabaseBackup,
  validateBackupFile,
  restoreFullDatabaseBackup,
  BackupSnapshot,
  RestoreStats,
} from '../../services/backupRestore';

interface DatabaseBackupSectionProps {
  userEmail?: string;
  onToast: (title: string, desc: string, isError?: boolean) => void;
}

export function DatabaseBackupSection({ userEmail, onToast }: DatabaseBackupSectionProps) {
  // Backup states
  const [exportLoading, setExportLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem('sibtq_last_backup_time') || null;
  });

  // Restore states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedSnapshot, setParsedSnapshot] = useState<BackupSnapshot | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ message: string; percent: number }>({
    message: '',
    percent: 0,
  });
  const [restoreStats, setRestoreStats] = useState<RestoreStats | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Export (One-Click Backup)
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const snapshot = await exportFullDatabaseBackup(userEmail);
      const nowStr = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      localStorage.setItem('sibtq_last_backup_time', nowStr);
      setLastBackupTime(nowStr);

      onToast(
        'Cadangan Berhasil Diunduh',
        `Snapshot ${snapshot.metadata.totalRecords} data (${snapshot.summary.totalStudents} santri, ${snapshot.summary.totalStudentAttendance} presensi) telah tersimpan.`
      );
    } catch (err: any) {
      console.error('Gagal mengekspor database:', err);
      onToast('Ekspor Cadangan Gagal', err?.message || 'Terjadi kesalahan saat mengekspor database.', true);
    } finally {
      setExportLoading(false);
    }
  };

  // Process selected file
  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      onToast('Format Berkas Ditolak', 'Harap pilih berkas cadangan berekstensi .json resmi SI-BTQ.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const validation = validateBackupFile(content);

      if (!validation.isValid || !validation.snapshot) {
        onToast('Validasi Gagal', validation.error || 'Berkas cadangan tidak valid.', true);
        setSelectedFile(null);
        setParsedSnapshot(null);
        return;
      }

      setSelectedFile(file);
      setParsedSnapshot(validation.snapshot);
      setRestoreStats(null);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetRestore = () => {
    setSelectedFile(null);
    setParsedSnapshot(null);
    setRestoreStats(null);
    setRestoreProgress({ message: '', percent: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!parsedSnapshot) return;
    setRestoreLoading(true);
    setRestoreProgress({ message: 'Menyiapkan proses pemulihan...', percent: 5 });

    try {
      const result = await restoreFullDatabaseBackup(
        parsedSnapshot,
        userEmail,
        (message, percent) => {
          setRestoreProgress({ message, percent });
        }
      );

      setRestoreStats(result.stats);
      onToast(
        'Database Berhasil Dipulihkan',
        `Sebanyak ${result.stats.totalRestored} data telah berhasil disinkronkan ke Firestore dan memori lokal.`
      );
    } catch (err: any) {
      console.error('Gagal memulihkan database:', err);
      onToast('Pemulihan Database Gagal', err?.message || 'Terjadi kesalahan sistem saat memulihkan data.', true);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KARTU CADANGAN SATU-KLIK (ONE-CLICK BACKUP) */}
      <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#0362D0]/10 text-[#0362D0]">
                <HardDrive size={20} />
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#172033]">
                Cadangan Mandiri Satu-Klik (One-Click Backup JSON)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Unduh snapshot lengkap seluruh database portal dalam satu berkas terenkapsulasi untuk disimpan di Google Drive sekolah sebagai cadangan offline aman.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
            Mandiri & Terstruktur
          </span>
        </div>

        {/* Cakupan Data yang Disertakan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Santri & Kelompok</span>
            <p className="font-black text-[#172033] text-sm">150+ Santri / 10 Halaqah</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Presensi Harian</span>
            <p className="font-black text-[#172033] text-sm">Santri & Mentor</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Akademik & KBM</span>
            <p className="font-black text-[#172033] text-sm">Capaian & Jurnal</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Kelulusan</span>
            <p className="font-black text-[#172033] text-sm">Ujian & Sertifikat</p>
          </div>
        </div>

        {/* Action & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Clock size={15} className="text-slate-400 shrink-0" />
            <span>
              Cadangan Terakhir:{' '}
              <strong className="text-[#172033]">
                {lastBackupTime || 'Belum pernah diunduh pada sesi ini'}
              </strong>
            </span>
          </div>

          <Button
            onClick={handleExport}
            disabled={exportLoading || restoreLoading}
            className="btn btn-primary px-6 shrink-0 shadow-sm cursor-pointer"
          >
            {exportLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Mengekstrak Snapshot Database...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Unduh Snapshot Database (.json)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. KARTU PEMULIHAN DATABASE (IMPORT & RESTORE JSON) */}
      <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Upload size={20} />
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#172033]">
                Pemulihan Database (Import & Restore JSON)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Pulihkan atau perbarui seluruh data portal dari berkas cadangan snapshot .json resmi tanpa menghapus riwayat yang sudah valid.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            Mode Administrator
          </span>
        </div>

        {/* AREA UNGGAH / DRAG & DROP BERKAS */}
        {!selectedFile && !restoreStats && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#0362D0] bg-[#0362D0]/5 scale-[0.99]'
                : 'border-slate-100 hover:border-[#0362D0]/60 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-50 text-[#0362D0] flex items-center justify-center border border-slate-100">
              <FileJson size={28} />
            </div>
            <p className="text-sm font-black text-[#172033]">
              Tarik & Lepas berkas cadangan .json di sini
            </p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Atau klik untuk menelusuri berkas dari komputer / Google Drive Anda
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
              <ShieldCheck size={13} className="text-[#0362D0]" />
              Format resmi: SI-BTQ-SMPN102-Full-Backup_*.json
            </div>
          </div>
        )}

        {/* PRATINJAU DATA BERKAS YANG DIPILIH */}
        {selectedFile && parsedSnapshot && !restoreStats && (
          <div className="p-5 rounded-2xl border border-[#0362D0]/20 bg-[#0362D0]/5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0362D0] text-white flex items-center justify-center shrink-0">
                  <FileCheck2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#172033] break-all">{selectedFile.name}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Waktu Snapshot: {new Date(parsedSnapshot.exportedAt).toLocaleString('id-ID')} | Pembuat: {parsedSnapshot.metadata.exportedBy || 'Admin'}
                  </p>
                </div>
              </div>
              {!restoreLoading && (
                <button
                  onClick={handleResetRestore}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Ganti berkas"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Grid Ringkasan Isi Berkas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Santri</span>
                <p className="font-black text-[#172033] text-sm">{parsedSnapshot.summary.totalStudents}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Kelompok</span>
                <p className="font-black text-[#172033] text-sm">{parsedSnapshot.summary.totalGroups}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Presensi</span>
                <p className="font-black text-[#172033] text-sm">{parsedSnapshot.summary.totalStudentAttendance}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Capaian</span>
                <p className="font-black text-[#172033] text-sm">{parsedSnapshot.summary.totalStudentProgress}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Jurnal KBM</span>
                <p className="font-black text-[#172033] text-sm">{parsedSnapshot.summary.totalTeachingJournals}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sertifikat</span>
                <p className="font-black text-[#172033] text-sm">{parsedSnapshot.summary.totalCertifications}</p>
              </div>
            </div>

            {/* Peringatan Keamanan & Konfirmasi */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Rekaman data yang ada di Firestore akan digabungkan (*safe upsert/merge*). Data baru akan ditambahkan dan perubahan status akan diselaraskan dengan aman tanpa merusak struktur relasi santri.
              </span>
            </div>

            {/* Progress Bar (saat proses restore berjalan) */}
            {restoreLoading && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-[#172033]">
                  <span>{restoreProgress.message}</span>
                  <span>{restoreProgress.percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0362D0] transition-all duration-300 rounded-full"
                    style={{ width: `${restoreProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tombol Eksekusi */}
            {!restoreLoading && (
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleResetRestore}
                  className="text-xs font-bold border-slate-100"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleExecuteRestore}
                  className="bg-[#0362D0] hover:bg-[#024ea7] text-white font-bold text-xs px-5 shadow-sm"
                >
                  <Sparkles size={14} className="mr-1.5" />
                  Mulai Pemulihan Database Sekarang
                </Button>
              </div>
            )}
          </div>
        )}

        {/* HASIL PEMULIHAN SUKSES */}
        {restoreStats && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-950">
                  Pemulihan Database Selesai ({restoreStats.totalRestored} Dokumen Berhasil Disinkronkan)
                </h4>
                <p className="text-xs text-emerald-800 font-medium mt-0.5 leading-relaxed">
                  Seluruh koleksi data telah dimuat ke Firestore dan memori cache aplikasi telah disegarkan seketika.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Santri Dipulihkan</span>
                <p className="text-sm font-black text-emerald-900">{restoreStats.students} Data</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Presensi Dipulihkan</span>
                <p className="text-sm font-black text-emerald-900">{restoreStats.studentAttendance} Data</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Capaian Belajar</span>
                <p className="text-sm font-black text-emerald-900">{restoreStats.studentProgress} Data</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Jurnal KBM</span>
                <p className="text-sm font-black text-emerald-900">{restoreStats.teachingJournals} Data</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={handleResetRestore}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                Selesai & Tutup Pratinjau
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
