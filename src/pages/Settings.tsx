import React, { useState } from 'react';
import { theme } from '../theme';
import { 
  User, 
  Shield, 
  Database, 
  Save, 
  CheckCircle, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Info, 
  ArrowRight, 
  Clock, 
  Sparkles,
  Layers,
  Building2
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { runDataHealthCheck, forceSyncGroupProgress, HealthCheckResult } from '../services/dataHealthCheck';
import { DatabaseBackupSection } from '../components/settings/DatabaseBackupSection';
import { AcademicRollOverWizard } from '../components/settings/AcademicRollOverWizard';
import { SchoolSettingsTab } from '../components/settings/SchoolSettingsTab';

export function Settings() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'school' | 'profile' | 'academic' | 'security' | 'database'>('school');
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState<{ title: string; desc: string; isError?: boolean }>({
    title: 'Pengaturan Berhasil Disimpan',
    desc: 'Perubahan profil dan konfigurasi portal telah diperbarui.'
  });

  // Health Check States
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(() => {
    try {
      const saved = localStorage.getItem('btq_last_health_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [lastCheckedDate, setLastCheckedDate] = useState<string | null>(() => {
    return localStorage.getItem('btq_last_health_check_date') || null;
  });
  const [syncingGroupId, setSyncingGroupId] = useState<string | null>(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastText({
      title: 'Pengaturan Berhasil Disimpan',
      desc: 'Perubahan profil dan konfigurasi portal telah diperbarui.'
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleRunHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const res = await runDataHealthCheck();
      setHealthResult(res);
      const nowStr = new Date().toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      setLastCheckedDate(nowStr);
      try {
        localStorage.setItem('btq_last_health_check_date', nowStr);
        localStorage.setItem('btq_last_health_result', JSON.stringify(res));
      } catch (e) {
        console.error(e);
      }

      setToastText({
        title: res.hasDiscrepancy ? 'Audit Selesai: Ada Selisih Data' : 'Audit Selesai: Data Konsisten',
        desc: res.hasDiscrepancy 
          ? `Ditemukan ${res.discrepancies.length} kelompok dengan selisih jumlah pertemuan.` 
          : 'Semua jurnal mengajar dan capaian santri telah cocok 100%.'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
      setToastText({
        title: 'Audit Gagal',
        desc: 'Terjadi kesalahan saat memproses data Firestore.',
        isError: true
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleForceSync = async (groupId: string, groupName: string) => {
    setSyncingGroupId(groupId);
    try {
      await forceSyncGroupProgress(groupId);
      if (healthResult) {
        const remaining = healthResult.discrepancies.filter(d => d.groupId !== groupId);
        const updated: HealthCheckResult = {
          discrepancies: remaining,
          hasDiscrepancy: remaining.length > 0
        };
        setHealthResult(updated);
        try {
          localStorage.setItem('btq_last_health_result', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
      }
      setToastText({
        title: 'Sinkronisasi Berhasil',
        desc: `Data capaian santri ${groupName} telah diselaraskan dengan jurnal mengajar.`
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
      setToastText({
        title: 'Sinkronisasi Gagal',
        desc: 'Terjadi kendala saat menyinkronkan data kelompok.',
        isError: true
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setSyncingGroupId(null);
    }
  };

  const handleSyncAll = async () => {
    if (!healthResult || healthResult.discrepancies.length === 0) return;
    setSyncAllLoading(true);
    try {
      for (const item of healthResult.discrepancies) {
        await forceSyncGroupProgress(item.groupId);
      }
      const updated: HealthCheckResult = {
        hasDiscrepancy: false,
        discrepancies: []
      };
      setHealthResult(updated);
      try {
        localStorage.setItem('btq_last_health_result', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      setToastText({
        title: 'Semua Kelompok Tersinkron',
        desc: 'Seluruh selisih data capaian santri telah berhasil diselaraskan.'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error(err);
      setToastText({
        title: 'Sinkronisasi Sebagian Gagal',
        desc: 'Gagal menyelesaikan sinkronisasi untuk sebagian data.',
        isError: true
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setSyncAllLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={theme.typography.h1}>Pengaturan Sistem Portal</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
              Pengaturan Administrator
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            Kelola identitas profil, akun pengelola, serta tahun akademik aktif Portal BTQ SMP Negeri 102 Jakarta
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation Sidebar for Settings */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('school')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'school' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <Building2 size={18} className={activeTab === 'school' ? 'text-[#C99A2E]' : 'text-slate-400'} /> Pengaturan Sekolah & KKM
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <User size={18} className={activeTab === 'profile' ? 'text-[#C99A2E]' : 'text-slate-400'} /> Profil Akun
          </button>
          <button 
            onClick={() => setActiveTab('academic')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'academic' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <Database size={18} className={activeTab === 'academic' ? 'text-[#C99A2E]' : 'text-slate-400'} /> Tahun Ajaran & Akademik
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'security' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <Shield size={18} className={activeTab === 'security' ? 'text-[#C99A2E]' : 'text-slate-400'} /> Keamanan & Password
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center justify-between px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'database' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database size={18} className={activeTab === 'database' ? 'text-[#C99A2E]' : 'text-slate-400'} />
              <span>Database & Cadangan Data</span>
            </div>
            {healthResult?.hasDiscrepancy ? (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            ) : healthResult && !healthResult.hasDiscrepancy ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'school' && (
            <SchoolSettingsTab
              userEmail={userData?.email}
              onToast={(title, desc, isError) => {
                setToastText({ title, desc, isError });
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4500);
              }}
            />
          )}

          {activeTab === 'profile' && (
            <Card className="border border-slate-100 rounded-3xl overflow-hidden shadow-xs bg-white">
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-black text-[#172033] border-b border-slate-100 pb-4">Informasi Profil Pengelola</h3>
                
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-[#0362D0] flex items-center justify-center text-white text-2xl font-black border-4 border-white shadow-md shrink-0">
                    {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'AP'}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" className="border-slate-100 text-[#172033] font-bold">Ubah Foto Profil</Button>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Format JPG/PNG, ukuran maksimal 2MB.</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6 pt-2">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                      Identitas Utama
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Nama Lengkap</label>
                        <Input defaultValue={userData?.name || 'Administrator Portal BTQ'} className="font-bold text-[#172033]" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Role / Jabatan</label>
                        <Input defaultValue={userData?.role ? userData.role.toUpperCase() : 'ADMINISTRATOR'} disabled className="bg-[#f1f5f9]/50 font-bold text-slate-500 border-slate-100" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                      Informasi Kontak & Instansi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Email Utama</label>
                        <Input defaultValue={userData?.email || 'admin.btq@smpn102.sch.id'} type="email" className="font-bold text-[#172033]" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Instansi / Sekolah</label>
                        <Input defaultValue="SMP Negeri 102 Jakarta" disabled className="bg-[#f1f5f9]/50 font-bold text-[#172033] border-slate-100" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" className="btn btn-primary px-6">
                      <Save size={16} /> Simpan Perubahan
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'academic' && (
            <AcademicRollOverWizard
              userEmail={userData?.email}
              onToast={(title, desc, isError) => {
                setToastText({ title, desc, isError });
                setShowToast(true);
                setTimeout(() => setShowToast(false), 4500);
              }}
            />
          )}

          {activeTab === 'security' && (
            <Card className="border border-slate-100 rounded-3xl overflow-hidden shadow-xs bg-white">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-lg font-black text-[#172033] border-b border-slate-100 pb-4">Keamanan Akun & Password</h3>
                <form onSubmit={handleSave} className="space-y-6 pt-2">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                      Ubah Kata Sandi
                    </h4>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Password Lama</label>
                      <Input type="password" placeholder="••••••••" className="font-bold text-[#172033] bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Password Baru</label>
                      <Input type="password" placeholder="••••••••" className="font-bold text-[#172033] bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Konfirmasi Password Baru</label>
                      <Input type="password" placeholder="••••••••" className="font-bold text-[#172033] bg-white" />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" className="btn btn-danger px-6">
                      <Shield size={16} /> Ubah Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6">
              {/* Cadangan Mandiri Satu-Klik & Pemulihan (Backup & Restore JSON) */}
              <DatabaseBackupSection 
                userEmail={userData?.email}
                onToast={(title, desc, isError) => {
                  setToastText({ title, desc, isError });
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 4500);
                }}
              />

              {/* Audit Kesehatan & Integritas Data */}
              <Card className="border border-slate-100 rounded-3xl overflow-hidden shadow-xs bg-white">
              <CardContent className="p-6 space-y-6">
                {/* Header Section */}
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#172033] flex items-center gap-2">
                      <Activity size={20} className="text-[#0362D0]" />
                      Audit Kesehatan & Integritas Data
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Verifikasi konsistensi antara sesi Jurnal Mengajar dan rekaman Capaian Progres santri.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    Mode Manual (Hemat Kuota)
                  </span>
                </div>

                {/* Panduan & Tanda Kapan Perlu Digunakan */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-[#172033] uppercase tracking-wider">
                    <Info size={16} className="text-[#0362D0]" />
                    Panduan Penggunaan (Tanda Kapan Perlu Digunakan)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                    <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-amber-900">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        Kapan Harus Dijalankan:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-amber-800 font-medium text-[11px] sm:text-xs">
                        <li>Dicurigai ada nilai/progres santri yang belum tercatat padahal mentor sudah mengisi jurnal.</li>
                        <li>Setelah melakukan impor data santri massal atau perbaikan manual di database.</li>
                      </ul>
                    </div>

                    <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-emerald-900">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        Kapan TIDAK Perlu Dijalankan:
                      </div>
                      <p className="text-emerald-800 font-medium text-[11px] sm:text-xs">
                        Pada bimbingan Sabtu rutin normal, <strong>tidak perlu dijalankan</strong>. Pemeriksaan otomatis saat login telah dinonaktifkan sehingga menghemat <strong>1.000+ operasi baca (Read) Firestore</strong> setiap sesi.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Card */}
                <div className="p-5 rounded-2xl border border-slate-100 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Pemeriksaan Terakhir</span>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#172033]">
                        <Clock size={14} className="text-slate-400" />
                        {lastCheckedDate ? lastCheckedDate : 'Belum pernah diperiksa pada perangkat ini'}
                      </div>
                    </div>
                    <div>
                      {healthResult ? (
                        healthResult.hasDiscrepancy ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle size={13} className="text-amber-600" />
                            Ditemukan {healthResult.discrepancies.length} Kelompok Selisih
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Semua Data Konsisten & Lengkap
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Status Siap Diperiksa
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-slate-500 font-medium">
                      Tekan tombol untuk membandingkan jumlah sesi jurnal mengajar mentor dengan capaian santri di Firestore.
                    </p>
                    <Button 
                      onClick={handleRunHealthCheck} 
                      disabled={healthLoading || syncAllLoading}
                      className="btn btn-primary px-5 shrink-0 whitespace-nowrap shadow-sm"
                    >
                      {healthLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Memeriksa Database...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={15} />
                          Jalankan Audit Data Manual
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Hasil Pemeriksaan Detail */}
                {healthResult && (
                  <div className="space-y-4 pt-2">
                    {healthResult.hasDiscrepancy ? (
                      <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                              <AlertTriangle size={18} className="text-amber-600" />
                              Daftar Kelompok yang Memerlukan Penyelarasan
                            </h4>
                            <p className="text-xs text-amber-800 mt-0.5 font-medium">
                              Terdapat pertemuan di jurnal yang belum memiliki catatan capaian pada santri kelompok tersebut.
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={handleSyncAll}
                            disabled={syncAllLoading || !!syncingGroupId}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0"
                          >
                            {syncAllLoading ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Menyelaraskan Semua...
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} className="mr-1" />
                                Selaraskan Semua Kelompok
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="divide-y divide-amber-200/60 border border-amber-200 rounded-xl overflow-hidden bg-white">
                          {healthResult.discrepancies.map(item => (
                            <div key={item.groupId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-[#172033]">{item.groupName}</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  Pertemuan di Jurnal: <span className="font-bold text-[#172033]">{item.sessionCount} Sesi</span> | 
                                  Pertemuan di Progres: <span className="font-bold text-amber-700">{item.progressCount} Sesi</span>
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleForceSync(item.groupId, item.groupName)}
                                disabled={syncingGroupId === item.groupId || syncAllLoading}
                                className="text-xs font-bold border-slate-100 hover:border-[#0362D0] hover:text-[#0362D0]"
                              >
                                {syncingGroupId === item.groupId ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-[#0362D0] border-t-transparent rounded-full animate-spin mr-1.5" />
                                    Menyelaraskan...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw size={13} className="mr-1.5" />
                                    Selaraskan Kelompok Ini
                                  </>
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-emerald-950">Integritas Data Sempurna (100% Sinkron)</h4>
                          <p className="text-xs text-emerald-800 font-medium mt-0.5 leading-relaxed">
                            Seluruh rekaman sesi mengajar mentor dan capaian progres belajar santri di 10 kelompok berada dalam kondisi konsisten dan lengkap. Tidak ada tindakan perbaikan yang dibutuhkan.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-8 right-8 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 border ${
          toastText.isError ? 'bg-rose-900 border-rose-700' : 'bg-[#172033] border-slate-100/20'
        }`}>
          {toastText.isError ? (
            <AlertTriangle className="text-rose-400 shrink-0" size={24} />
          ) : (
            <CheckCircle className="text-[#C99A2E] shrink-0" size={24} />
          )}
          <div>
            <p className="text-sm font-black">{toastText.title}</p>
            <p className="text-xs text-slate-300 font-medium">{toastText.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}

