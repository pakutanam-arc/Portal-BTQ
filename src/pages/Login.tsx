import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  BookOpen, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  KeyRound,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'credentials'>('form');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Mohon masukkan username dan kata sandi Anda.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Append the institutional domain if only username is entered
      const cleanUsername = username.toLowerCase().trim();
      const email = cleanUsername.includes('@') 
        ? cleanUsername 
        : `${cleanUsername}@smpn102.sch.id`;

      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Username atau password tidak sesuai. Pastikan akun sudah terdaftar.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan gagal. Silakan coba kembali sesaat lagi.');
      } else {
        setError('Gagal masuk ke sistem. Silakan periksa koneksi internet Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (user: string, pass: string = '12345678') => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 overflow-hidden select-none">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/80 to-teal-950" />
      
      {/* Decorative Radial Glowing Auras */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Subtle Islamic Geometric Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
          backgroundSize: '100px 100px'
        }}
      />

      {/* Main Login Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Top Floating School Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/50 backdrop-blur-md border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold tracking-wide shadow-lg">
            <Building2 size={13} className="text-emerald-400" />
            <span>SMP NEGERI 102 JAKARTA</span>
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-emerald-300/80">TP 2026/2027</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 border border-white/20">
          
          {/* Header Section */}
          <div className="text-center mb-6">
            {/* Emblem Logo */}
            <div className="relative inline-block mb-3.5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-700/30 ring-4 ring-emerald-500/15">
                <BookOpen size={30} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-lg shadow-sm">
                <Sparkles size={12} />
              </div>
            </div>

            {/* Bismillah Accent */}
            <div className="font-serif text-emerald-800 text-sm opacity-90 tracking-wide mb-1 font-semibold">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              SI-BTQ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Sistem Informasi Bimbingan Baca Tulis Al-Qur'an
            </p>
          </div>

          {/* Quick Credential Helper Pill Bar */}
          <div className="mb-5 p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                username === 'admin' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ahmad')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                username === 'ahmad' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User size={13} className="text-teal-600" />
              <span>Mentor 1</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('nurul')}
              className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                username === 'nurul' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User size={13} className="text-teal-600" />
              <span>Mentor 2</span>
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span className="font-semibold">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username / Akun
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username (cth: admin, ahmad)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors flex items-center gap-1"
                >
                  <HelpCircle size={12} /> Bantuan
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all"
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
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-700/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Sistem Terotentikasi & Data Tersimpan Aman</span>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="text-center mt-4 text-[11px] text-slate-400/80">
          © 2026 Tim BTQ SMP Negeri 102 Jakarta • Bimbingan Sesi Sabtu
        </div>
      </motion.div>

      {/* Help / Password Guide Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <KeyRound size={18} /> Panduan Akses Akun
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Akun login dikhususkan bagi <strong>Koordinator BTQ / Admin</strong> dan <strong>Mentor Pembimbing</strong>:
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div>
                  <strong className="text-slate-800 block">Akun Admin:</strong>
                  <span>Username: <code>admin</code></span>
                </div>
                <div>
                  <strong className="text-slate-800 block">Akun Mentor:</strong>
                  <span>Username: <code>ahmad</code>, <code>nurul</code>, atau nama mentor</span>
                </div>
                <div className="pt-1 text-[11px] text-slate-500">
                  Password bawaan sistem: <code>12345678</code>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Jika mengalami kendala login, silakan hubungi Koordinator BTQ SMPN 102 Jakarta.
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
