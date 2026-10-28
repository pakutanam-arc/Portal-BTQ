import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Save, 
  Info, 
  Lock, 
  ExternalLink,
  Cpu,
  Sparkles
} from 'lucide-react';
import { 
  GoogleCalendarConfig, 
  DEFAULT_GCAL_CONFIG, 
  getGoogleCalendarConfig, 
  saveGoogleCalendarConfig 
} from '../../services/googleCalendar';
import { ModalPortal } from '../ui/ModalPortal';

interface GoogleGroupsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onConfigSaved?: (config: GoogleCalendarConfig) => void;
}

export function GoogleGroupsConfigModal({
  isOpen,
  onClose,
  isAdmin,
  onConfigSaved
}: GoogleGroupsConfigModalProps) {
  const [config, setConfig] = useState<GoogleCalendarConfig>(DEFAULT_GCAL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getGoogleCalendarConfig().then(cfg => {
        setConfig(cfg);
        setLoading(false);
      });
      setSaveSuccess(false);
      setEmailError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email.trim());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (config.enableGroupInvite && !validateEmail(config.groupEmail)) {
      setEmailError('Format email Google Groups tidak valid. Contoh: rohis-102@googlegroups.com');
      return;
    }

    setSaving(true);
    setEmailError(null);
    try {
      const updated = await saveGoogleCalendarConfig(config);
      setSaveSuccess(true);
      if (onConfigSaved) onConfigSaved(updated);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setEmailError(err.message || 'Gagal menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#0362D0] via-[#024ea7] to-[#172033] text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
            <Users size={14} />
            <span>Google Groups & API Safety Integration</span>
          </div>

          <h3 className="text-xl font-black text-white flex items-center gap-2">
            Pengaturan Google Groups & Proteksi Kuota API
          </h3>
          <p className="text-xs text-white/80 mt-1 max-w-lg">
            Kombinasi alamat grup tunggal (Google Groups) dan pembatasan request cerdas untuk menjaga kestabilan kalender dan menghindari limitasi Google Calendar.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-8 h-8 border-3 border-[#0362D0] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Memuat preferensi kalender...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Card 1: Google Groups Address */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Alamat Google Groups (Distribusi Otomatis)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Satu email grup yang menaungi seluruh email guru/mentor dan santri/wali.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full shrink-0">
                    Satu Undangan untuk Semua
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Email Google Groups:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="email"
                        value={config.groupEmail}
                        onChange={(e) => {
                          setConfig({ ...config, groupEmail: e.target.value });
                          setEmailError(null);
                        }}
                        disabled={!isAdmin || saving}
                        placeholder="rohis-102@googlegroups.com"
                        className="w-full text-xs font-mono font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0362D0] disabled:bg-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, groupEmail: 'rohis-102@googlegroups.com' })}
                      disabled={!isAdmin || saving}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold text-[#0362D0] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      title="Kembalikan ke default rohis-102@googlegroups.com"
                    >
                      Default
                    </button>
                  </div>
                  {emailError && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} /> {emailError}
                    </p>
                  )}
                </div>

                {/* Toggle Enable Group Invite */}
                <label className="flex items-center gap-3 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={config.enableGroupInvite}
                    onChange={(e) => setConfig({ ...config, enableGroupInvite: e.target.checked })}
                    disabled={!isAdmin || saving}
                    className="w-4 h-4 rounded text-[#0362D0] focus:ring-[#0362D0] border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">
                      Kaitkan Google Groups ini pada setiap event Google Calendar
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      Event akan mengundang alamat grup ini sehingga semua mentor dan santri menerima jadwal tanpa perlu menginput email satu per satu.
                    </p>
                  </div>
                </label>
              </div>

              {/* Card 2: Safe API & Rate-Limit Protections */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Proteksi Keamanan & Efisiensi Kuota API
                    </h4>
                    <p className="text-xs text-slate-500">
                      Mencegah limitasi Google Calendar (Rate Limit 500 req/100s dan anti-spam email).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Smart Diff Sync */}
                  <label className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5 cursor-pointer hover:border-slate-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.smartDiffEnabled}
                      onChange={(e) => setConfig({ ...config, smartDiffEnabled: e.target.checked })}
                      disabled={!isAdmin || saving}
                      className="w-4 h-4 rounded text-[#0362D0] focus:ring-[#0362D0] border-slate-300 mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Zap size={13} className="text-amber-500" /> Smart Diff Sync
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Lewati sesi yang tidak mengalami perubahan (0 pemanggilan API). Hanya kirim sesi baru atau yang jadwalnya bergeser.
                      </p>
                    </div>
                  </label>

                  {/* Adaptive Throttling */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Clock size={13} className="text-[#0362D0]" /> Jeda Antar Request (Throttle)
                    </label>
                    <select
                      value={config.throttleMs}
                      onChange={(e) => setConfig({ ...config, throttleMs: Number(e.target.value) })}
                      disabled={!isAdmin || saving}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0362D0]"
                    >
                      <option value={200}>200 ms (Cepat)</option>
                      <option value={300}>300 ms (Standar Aman - Rekomendasi)</option>
                      <option value={500}>500 ms (Konservatif / Sangat Aman)</option>
                    </select>
                    <p className="text-slate-400 text-[10px]">
                      Menghindari penumpukan burst requests ke server Google.
                    </p>
                  </div>
                </div>

                {/* Notification Mode (sendUpdates) */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Mode Notifikasi Email Google Calendar (sendUpdates):
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                      Pencegah Email Spam Limit
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                      config.sendUpdates === 'none' 
                        ? 'border-[#0362D0] bg-blue-50/50 text-blue-900 font-semibold' 
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="sendUpdates"
                        value="none"
                        checked={config.sendUpdates === 'none'}
                        onChange={() => setConfig({ ...config, sendUpdates: 'none' })}
                        disabled={!isAdmin || saving}
                        className="mt-0.5 text-[#0362D0]"
                      />
                      <div>
                        <span>Mode Senyap (none)</span>
                        <p className="text-[10px] font-normal text-slate-500">
                          Rekomendasi utama: Event disinkronkan langsung ke kalender anggota tanpa mengirim email blast beruntun.
                        </p>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                      config.sendUpdates === 'all' 
                        ? 'border-[#0362D0] bg-blue-50/50 text-blue-900 font-semibold' 
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="sendUpdates"
                        value="all"
                        checked={config.sendUpdates === 'all'}
                        onChange={() => setConfig({ ...config, sendUpdates: 'all' })}
                        disabled={!isAdmin || saving}
                        className="mt-0.5 text-[#0362D0]"
                      />
                      <div>
                        <span>Kirim Email Undangan (all)</span>
                        <p className="text-[10px] font-normal text-slate-500">
                          Google mengirim notifikasi email resmi ke grup saat jadwal baru/perubahan dibuat.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Built-in Safety Highlights */}
                <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3 text-xs text-blue-900 space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-blue-950">
                    <Sparkles size={14} className="text-[#0362D0]" /> Mekanisme Keamanan Bawaan Aktif:
                  </span>
                  <ul className="space-y-1 text-[11px] list-disc list-inside text-blue-900/90">
                    <li>
                      <strong>Exponential Backoff + Jitter:</strong> Jika Google merespons status 429 atau 503, sistem otomatis mencoba ulang dengan jeda berjenjang acak.
                    </li>
                    <li>
                      <strong>Token Isolation In-Memory:</strong> Akses token Google disimpan sementara di memori runtime (tidak disimpan di localStorage terbuka), bebas dari celah kebocoran script.
                    </li>
                    <li>
                      <strong>Efisiensi 100x Lipat:</strong> Mengundang 1 email Google Groups setara dengan mengundang ratusan siswa, memangkas biaya kuota Google API secara drastis.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feedback Success */}
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
                  <CheckCircle2 size={16} />
                  <span>Pengaturan Google Groups dan Proteksi API berhasil disimpan!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <a
                  href="https://groups.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0362D0] transition-colors"
                >
                  <ExternalLink size={12} /> Buka Google Groups Console
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>

                  {isAdmin && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0362D0] hover:bg-[#024ea7] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
