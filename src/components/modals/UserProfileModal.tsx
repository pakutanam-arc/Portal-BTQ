import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Check, 
  PenTool, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  GraduationCap, 
  Building2, 
  Save, 
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateMentorProfile } from '../../services/db/mentors';
import { getStoredSchoolConfig, saveAdminAndSchoolProfile, SchoolConfig } from '../../services/schoolConfig';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface SignaturePadProps {
  value?: string;
  onChange: (signatureBase64: string) => void;
  label: string;
}

function SignaturePad({ value, onChange, label }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [preview, setPreview] = useState<string>(value || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution for clean rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0F2644'; // Clean rich ink color
    }
  }, [mode]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to compressed PNG data URL
    const dataUrl = canvas.toDataURL('image/png');
    setPreview(dataUrl);
    onChange(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Silakan pilih berkas gambar (PNG atau JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPreview(result);
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <PenTool size={14} className="text-[#0362D0]" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'draw' ? 'bg-[#0362D0] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Coretan Langsung
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'upload' ? 'bg-[#0362D0] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unggah Berkas
          </button>
        </div>
      </div>

      {mode === 'draw' ? (
        <div className="relative border-2 border-dashed border-slate-300 hover:border-[#0362D0]/60 rounded-2xl bg-white overflow-hidden transition-colors">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-32 touch-none cursor-crosshair bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"
          />

          {/* Baseline guideline */}
          <div className="absolute bottom-6 left-6 right-6 border-b border-slate-200/80 pointer-events-none flex justify-between items-center text-[10px] text-slate-400 select-none">
            <span>Tanda tangani di atas garis ini</span>
            <span>Digital Signature</span>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-600 hover:text-rose-600 text-[11px] font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title="Bersihkan coretan"
            >
              <RotateCcw size={12} />
              <span>Bersihkan</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 hover:border-[#0362D0]/60 rounded-2xl p-4 bg-slate-50 text-center transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id={`sig-upload-${label.replace(/\s+/g, '-')}`}
          />
          <label
            htmlFor={`sig-upload-${label.replace(/\s+/g, '-')}`}
            className="cursor-pointer flex flex-col items-center justify-center gap-2 py-3"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0362D0] flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Klik untuk memilih gambar tanda tangan</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Format PNG (transparan disarankan) atau JPG, maks 2MB</p>
            </div>
          </label>
        </div>
      )}

      {/* Preview if exists */}
      {preview && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-20 h-10 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={preview} alt="Pratinjau Tanda Tangan" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-700 truncate">Tanda Tangan Tersimpan</p>
              <p className="text-[9.5px] text-emerald-600 font-semibold flex items-center gap-1">
                <Check size={11} /> Siap ditampilkan di lembar rapor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}

export function UserProfileModal({ isOpen, onClose, onSaved }: UserProfileModalProps) {
  const { userRole, userData, currentUser } = useAuth();
  const isAdmin = userRole === 'admin' || currentUser?.email === 'admin@smpn102.sch.id';

  // State Tabs untuk Admin
  const [activeAdminTab, setActiveAdminTab] = useState<'pembina' | 'kepsek'>('pembina');

  // Form State: Mentor
  const [mentorName, setMentorName] = useState('');
  const [mentorSignature, setMentorSignature] = useState('');

  // Form State: Admin (Pembina Rohis & Pejabat Kepala Sekolah)
  const [adminName, setAdminName] = useState('');
  const [adminNip, setAdminNip] = useState('');
  const [adminSignature, setAdminSignature] = useState('');
  const [headmasterName, setHeadmasterName] = useState('');
  const [headmasterNip, setHeadmasterNip] = useState('');
  const [headmasterSignature, setHeadmasterSignature] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sinkronkan data form saat modal terbuka
  useEffect(() => {
    if (!isOpen) {
      setSaveSuccess(false);
      setErrorMessage('');
      return;
    }

    const schoolCfg = getStoredSchoolConfig();

    if (isAdmin) {
      setAdminName(userData?.name || schoolCfg.coordinatorName || 'H. Ahmad Fauzi, S.Pd.I');
      setAdminNip(userData?.nip || schoolCfg.coordinatorNip || '19790415 200801 1 012');
      setAdminSignature(userData?.signature || schoolCfg.coordinatorSignature || '');
      setHeadmasterName(schoolCfg.headmasterName || 'Dra. Hj. Sri Rahayu, M.Pd.');
      setHeadmasterNip(schoolCfg.headmasterNip || '19680512 199412 2 001');
      setHeadmasterSignature(schoolCfg.headmasterSignature || '');
    } else {
      setMentorName(userData?.name || currentUser?.displayName || 'Kak Alumni');
      setMentorSignature(userData?.signature || '');
    }
  }, [isOpen, isAdmin, userData, currentUser]);

  if (!isOpen) return null;

  const handleSaveMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorName.trim()) {
      setErrorMessage('Nama mentor tidak boleh kosong.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      const mentorId = userData?.id || `m_${currentUser?.email?.split('@')[0] || '1'}`;
      await updateMentorProfile(mentorId, {
        name: mentorName.trim(),
        signature: mentorSignature,
        email: currentUser?.email || userData?.email || '',
      });

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Gagal menyimpan profil mentor:', err);
      setErrorMessage(err?.message || 'Gagal menyimpan profil mentor ke database.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) {
      setErrorMessage('Nama Pembina Rohis tidak boleh kosong.');
      return;
    }
    if (!headmasterName.trim()) {
      setErrorMessage('Nama Kepala Sekolah tidak boleh kosong.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      await saveAdminAndSchoolProfile({
        adminName: adminName.trim(),
        adminNip: adminNip.trim(),
        adminSignature,
        headmasterName: headmasterName.trim(),
        headmasterNip: headmasterNip.trim(),
        headmasterSignature,
        userEmail: currentUser?.email || 'admin@smpn102.sch.id',
      });

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Gagal menyimpan konfigurasi profil admin:', err);
      setErrorMessage(err?.message || 'Gagal menyimpan data ke Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0362D0] text-white flex items-center justify-center shadow-sm">
              {isAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                {isAdmin ? 'Profil Admin & Otoritas Raport' : 'Profil Mentor BTQ'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAdmin 
                  ? 'Atur nama pembina, NIP, tanda tangan, dan data Kepala Sekolah' 
                  : 'Ubah nama dan tambahkan tanda tangan digital Anda'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher Khusus Admin */}
        {isAdmin && (
          <div className="flex border-b border-slate-200 bg-slate-100/60 p-1.5 px-4 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveAdminTab('pembina')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeAdminTab === 'pembina'
                  ? 'bg-white text-[#0362D0] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <User size={14} />
              <span>1. Pembina Rohis (Admin)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('kepsek')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeAdminTab === 'kepsek'
                  ? 'bg-white text-[#0362D0] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <GraduationCap size={14} />
              <span>2. Kepala Sekolah</span>
            </button>
          </div>
        )}

        {/* Body Form */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check size={16} className="text-emerald-600" />
              <span>Profil berhasil disimpan! Data telah disinkronkan ke seluruh sistem.</span>
            </div>
          )}

          {/* Form Mentor */}
          {!isAdmin && (
            <form id="mentor-profile-form" onSubmit={handleSaveMentor} className="space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Akun Terdaftar</p>
                  <p className="text-xs font-extrabold text-[#172033] mt-0.5 truncate max-w-[240px]">
                    {currentUser?.email || userData?.email || 'mentor@smpn102.sch.id'}
                  </p>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Mentor Aktif
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Tampilan Mentor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  placeholder="Contoh: Kak Fikri atau Ustadz Ahmad, S.Pd.I"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0362D0] focus:ring-2 focus:ring-[#0362D0]/10 outline-none transition-all"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama ini otomatis tercantum di Beranda, Kartu Tanda Santri, Rapot Peserta, dan Jurnal Mengajar.
                </p>
              </div>

              {/* Tanda Tangan Mentor */}
              <SignaturePad
                value={mentorSignature}
                onChange={setMentorSignature}
                label="Tanda Tangan Digital Mentor BTQ"
              />
            </form>
          )}

          {/* Form Admin */}
          {isAdmin && (
            <form id="admin-profile-form" onSubmit={handleSaveAdmin} className="space-y-4">
              {activeAdminTab === 'pembina' ? (
                <>
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                    <p className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-700" />
                      <span>Profil Pembina Rohis (Kolom Tengah Rapor)</span>
                    </p>
                    <p className="text-[10.5px] text-amber-800/80 mt-0.5 leading-relaxed">
                      Nama, NIP, dan tanda tangan ini otomatis tampil pada kolom tanda tangan tengah di setiap lembar rapor siswa.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Lengkap Pembina Rohis (Admin) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Contoh: H. Ahmad Fauzi, S.Pd.I"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0362D0] focus:ring-2 focus:ring-[#0362D0]/10 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      NIP Pembina Rohis (Opsional)
                    </label>
                    <input
                      type="text"
                      value={adminNip}
                      onChange={(e) => setAdminNip(e.target.value)}
                      placeholder="Contoh: 19790415 200801 1 012"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-[#0362D0] focus:ring-2 focus:ring-[#0362D0]/10 outline-none transition-all"
                    />
                  </div>

                  <SignaturePad
                    value={adminSignature}
                    onChange={setAdminSignature}
                    label="Tanda Tangan Digital Pembina Rohis"
                  />
                </>
              ) : (
                <>
                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                    <p className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-[#0362D0]" />
                      <span>Pejabat Kepala Sekolah (Kolom Kanan Rapor)</span>
                    </p>
                    <p className="text-[10.5px] text-blue-800/80 mt-0.5 leading-relaxed">
                      Identitas resmi pimpinan sekolah yang mengesahkan lembar rapor capaian santri binaan BTQ.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Lengkap Kepala Sekolah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={headmasterName}
                      onChange={(e) => setHeadmasterName(e.target.value)}
                      placeholder="Contoh: Dra. Hj. Sri Rahayu, M.Pd."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#0362D0] focus:ring-2 focus:ring-[#0362D0]/10 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      NIP Kepala Sekolah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={headmasterNip}
                      onChange={(e) => setHeadmasterNip(e.target.value)}
                      placeholder="Contoh: 19680512 199412 2 001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-[#0362D0] focus:ring-2 focus:ring-[#0362D0]/10 outline-none transition-all"
                      required
                    />
                  </div>

                  <SignaturePad
                    value={headmasterSignature}
                    onChange={setHeadmasterSignature}
                    label="Tanda Tangan Digital Kepala Sekolah"
                  />
                </>
              )}
            </form>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="submit"
            form={isAdmin ? 'admin-profile-form' : 'mentor-profile-form'}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0362D0] hover:bg-[#024ea7] text-white text-xs font-extrabold shadow-md shadow-[#0362D0]/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
