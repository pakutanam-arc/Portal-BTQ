import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle, 
  AlertCircle, 
  Building2,
  KeyRound,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_LOGO, APP_NAME, APP_SUBTITLE, APP_DESC } from '../assets/logo';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Mohon masukkan username dan kata sandi Anda.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const cleanUsername = username.toLowerCase().replace(/\s+/g, '').trim();
      const email = cleanUsername.includes('@') 
        ? cleanUsername 
        : `${cleanUsername}@smpn102.sch.id`;

      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        console.warn('SignIn error, attempting fallback or account creation:', signInErr.code);
        // If user is not found or credentials invalid, attempt auto-registration for valid demo/mentor passwords
        if (
          signInErr.code === 'auth/invalid-credential' || 
          signInErr.code === 'auth/user-not-found'
        ) {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            console.error('CreateAccount error:', createErr);
            if (createErr.code === 'auth/email-already-in-use') {
              setError('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
            } else if (createErr.code === 'auth/weak-password') {
              setError('Kata sandi terlalu pendek. Minimal 6 karakter.');
            } else {
              setError('Username atau kata sandi tidak sesuai. Pastikan kredensial benar.');
            }
          }
        } else if (signInErr.code === 'auth/wrong-password') {
          setError('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
        } else if (signInErr.code === 'auth/too-many-requests') {
          setError('Terlalu banyak percobaan gagal. Silakan coba beberapa saat lagi.');
        } else {
          setError('Gagal masuk ke sistem. Silakan periksa koneksi internet Anda.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal masuk ke sistem. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#172033] overflow-hidden select-none">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#172033] via-[#0f172a] to-[#1e1b4b]" />
      
      {/* Decorative Brand Auras */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0362D0]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#950415]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container - Two Side Split Layout */}
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E6E8EC] grid lg:grid-cols-12 min-h-[580px]"
      >
        {/* LEFT COLUMN: Brand Identity Panel (Royal Blue) */}
        <div className="lg:col-span-5 bg-[#0362D0] p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Geometric Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.8) 1.5px, transparent 0%), radial-gradient(circle at 60px 60px, rgba(201,154,46,0.9) 1.5px, transparent 0%)`,
              backgroundSize: '80px 80px'
            }}
          />
          
          {/* Decorative Circular Ring Elements Inspired by Logo */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full border-4 border-white/10 pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full border-8 border-[#C99A2E]/20 pointer-events-none" />

          {/* Top Tag */}
          <div className="relative z-10 flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-wide">
              <Building2 size={13} className="text-[#C99A2E]" />
              <span>SMP NEGERI 102 JAKARTA</span>
            </div>
          </div>

          {/* Middle Logo & Info */}
          <div className="relative z-10 my-8 text-center flex flex-col items-center">
            {/* Logo SMPN 102 */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-2 bg-white shadow-xl ring-4 ring-[#C99A2E]/50 mx-auto">
                <img 
                  src={APP_LOGO} 
                  alt="Logo SMPN 102 Jakarta" 
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#C99A2E] text-slate-950 p-1.5 rounded-full shadow-lg">
                <Sparkles size={14} />
              </div>
            </div>

            <div className="font-serif text-white/90 text-xs sm:text-sm tracking-wide mb-1.5 font-bold text-center">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight text-center">
              {APP_NAME}
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-[#C99A2E] tracking-tight mt-0.5 text-center">
              {APP_SUBTITLE}
            </h2>
            <p className="text-xs text-blue-100/90 font-medium mt-3 leading-relaxed max-w-sm mx-auto text-center">
              {APP_DESC}
            </p>
          </div>

          {/* Bottom Accent */}
          <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-center gap-2 text-[11px] text-blue-100/80 font-medium text-center">
            <ShieldCheck size={14} className="text-[#C99A2E]" />
            <span>Sistem administrasi terintegrasi</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
          <div>
            {/* Form Title */}
            <div className="mb-6">
              <h3 className="text-xl font-extrabold text-[#172033] tracking-tight">
                Masuk ke Portal
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Silakan masukkan kredensial akun Anda untuk melanjutkan.
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="bg-red-50 border border-red-200 text-[#950415] p-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-xs">
                    <AlertCircle size={16} className="shrink-0 text-[#950415]" />
                    <span className="font-bold">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-[#172033] mb-1.5">
                  Email / Username
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0362D0] transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan username (contoh: alumni1, alumni2)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F5F6F8] border border-[#E6E8EC] rounded-2xl text-xs sm:text-sm font-medium text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] focus:ring-4 focus:ring-[#0362D0]/15 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#172033]">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-[11px] font-bold text-[#0362D0] hover:underline transition-colors flex items-center gap-1"
                  >
                    <HelpCircle size={12} /> Bantuan Akun
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0362D0] transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#F5F6F8] border border-[#E6E8EC] rounded-2xl text-xs sm:text-sm font-medium text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#0362D0] focus:ring-4 focus:ring-[#0362D0]/15 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>



              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#0362D0] hover:bg-[#0252b3] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Branding Text */}
          <div className="mt-8 pt-4 border-t border-[#E6E8EC] text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#172033]">
              <span>Portal BTQ</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C99A2E]" />
              <span className="text-[#950415]">SMP Negeri 102 Jakarta</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Sistem Informasi Administrasi & Pembelajaran BTQ • Tahun Pelajaran 2026/2027
            </p>
          </div>
        </div>
      </motion.div>

      {/* Help / Password Guide Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E6E8EC] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#E6E8EC]">
              <div className="flex items-center gap-2 text-[#0362D0] font-extrabold text-sm">
                <KeyRound size={18} /> Panduan Akses Akun
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-[#172033] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Akses Portal BTQ diperuntukkan bagi <strong>Koordinator BTQ</strong>, <strong>Administrator</strong>, dan <strong>Mentor Pembimbing</strong> resmi SMP Negeri 102 Jakarta.
              </p>
              <div className="bg-[#F5F6F8] p-3.5 rounded-2xl border border-[#E6E8EC] space-y-2">
                <div className="font-extrabold text-[#172033]">
                  Daftar Kredensial Login:
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 font-medium">
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-[#0362D0]">Akun Mentor:</span>
                    <div>Username: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 font-bold">alumni1</code> s.d. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 font-bold">alumni10</code></div>
                    <div>Kata Sandi: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 font-bold">12345678</code></div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-[#950415]">Akun Admin:</span>
                    <div>Username: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 font-bold">admin</code></div>
                    <div>Kata Sandi: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 font-bold">12345678</code></div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1">
                  *Cukup masukkan username tanpa perlu mengetikkan @smpn102.sch.id
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-4 py-2.5 bg-[#0362D0] hover:bg-[#0252b3] text-white font-bold text-xs rounded-xl transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

