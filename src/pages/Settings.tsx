import React, { useState } from 'react';
import { theme } from '../theme';
import { User, Bell, Shield, Database, Save, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';

export function Settings() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'security'>('profile');
  const [showToast, setShowToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
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
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-[#E6E8EC] hover:bg-[#F5F6F8]'
            }`}
          >
            <User size={18} className={activeTab === 'profile' ? 'text-[#C99A2E]' : 'text-slate-400'} /> Profil Akun
          </button>
          <button 
            onClick={() => setActiveTab('academic')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'academic' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-[#E6E8EC] hover:bg-[#F5F6F8]'
            }`}
          >
            <Database size={18} className={activeTab === 'academic' ? 'text-[#C99A2E]' : 'text-slate-400'} /> Tahun Ajaran & Akademik
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 font-bold rounded-2xl border transition-all text-sm text-left cursor-pointer ${
              activeTab === 'security' 
                ? 'bg-[#172033] text-white border-[#172033] shadow-xs' 
                : 'bg-white text-slate-600 border-[#E6E8EC] hover:bg-[#F5F6F8]'
            }`}
          >
            <Shield size={18} className={activeTab === 'security' ? 'text-[#C99A2E]' : 'text-slate-400'} /> Keamanan & Password
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'profile' && (
            <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-black text-[#172033] border-b border-[#E6E8EC] pb-4">Informasi Profil Pengelola</h3>
                
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-[#0362D0] flex items-center justify-center text-white text-2xl font-black border-4 border-white shadow-md shrink-0">
                    {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'AP'}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" className="border-[#E6E8EC] text-[#172033] font-bold">Ubah Foto Profil</Button>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Format JPG/PNG, ukuran maksimal 2MB.</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Nama Lengkap</label>
                    <Input defaultValue={userData?.name || 'Administrator Portal BTQ'} className="font-bold text-[#172033]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Role / Jabatan</label>
                    <Input defaultValue={userData?.role ? userData.role.toUpperCase() : 'ADMINISTRATOR'} disabled className="bg-[#F5F6F8] font-bold text-slate-500 border-[#E6E8EC]" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Email Utama</label>
                    <Input defaultValue={userData?.email || 'admin.btq@smpn102.sch.id'} type="email" className="font-bold text-[#172033]" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Instansi / Sekolah</label>
                    <Input defaultValue="SMP Negeri 102 Jakarta" disabled className="bg-[#F5F6F8] font-bold text-[#172033] border-[#E6E8EC]" />
                  </div>

                  <div className="pt-4 md:col-span-2 flex justify-end">
                    <Button type="submit" className="bg-[#0362D0] hover:bg-[#0252b3] text-white font-black px-6 py-2.5 rounded-xl cursor-pointer">
                      <Save size={16} className="mr-2" /> Simpan Perubahan
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'academic' && (
            <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-lg font-black text-[#172033] border-b border-[#E6E8EC] pb-4">Tahun Ajaran & Kalender Akademik</h3>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Tahun Ajaran Aktif</label>
                      <select className="w-full h-10 px-3 rounded-xl border border-[#E6E8EC] bg-[#F5F6F8] text-xs font-bold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#0362D0]">
                        <option>2025/2026</option>
                        <option selected>2026/2027</option>
                        <option>2027/2028</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Semester Aktif</label>
                      <select className="w-full h-10 px-3 rounded-xl border border-[#E6E8EC] bg-[#F5F6F8] text-xs font-bold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#0362D0]">
                        <option selected>Ganjil (16 Tahap)</option>
                        <option>Genap (16 Tahap)</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" className="bg-[#0362D0] hover:bg-[#0252b3] text-white font-black px-6 py-2.5 rounded-xl cursor-pointer">
                      <Save size={16} className="mr-2" /> Perbarui Konfigurasi
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-lg font-black text-[#172033] border-b border-[#E6E8EC] pb-4">Keamanan Akun & Password</h3>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Password Lama</label>
                    <Input type="password" placeholder="••••••••" className="font-bold text-[#172033]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Password Baru</label>
                    <Input type="password" placeholder="••••••••" className="font-bold text-[#172033]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Konfirmasi Password Baru</label>
                    <Input type="password" placeholder="••••••••" className="font-bold text-[#172033]" />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" className="bg-[#950415] hover:bg-[#7a0311] text-white font-black px-6 py-2.5 rounded-xl cursor-pointer">
                      <Shield size={16} className="mr-2" /> Ubah Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-[#172033] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 border border-[#E6E8EC]/20">
          <CheckCircle className="text-[#C99A2E] shrink-0" size={24} />
          <div>
            <p className="text-sm font-black">Pengaturan Berhasil Disimpan</p>
            <p className="text-xs text-slate-300 font-medium">Perubahan profil dan konfigurasi portal telah diperbarui.</p>
          </div>
        </div>
      )}
    </div>
  );
}

