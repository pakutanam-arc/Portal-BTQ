import React from 'react';
import { User, Bell, Shield, Database, Save } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
        <p className="text-gray-500 mt-1 text-sm">Kelola preferensi akun dan konfigurasi aplikasi BTQ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation Sidebar for Settings */}
        <div className="lg:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white text-emerald-700 font-medium rounded-lg border border-emerald-100 shadow-sm text-sm text-left">
            <User size={18} /> Profil Admin
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm text-left">
            <Database size={18} /> Tahun Ajaran & Akademik
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm text-left">
            <Bell size={18} /> Notifikasi
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm text-left">
            <Shield size={18} /> Keamanan & Password
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Informasi Profil</h3>
              
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-bold border-4 border-white shadow-sm shrink-0">
                  AP
                </div>
                <div>
                  <Button variant="outline" size="sm">Ubah Foto</Button>
                  <p className="text-xs text-gray-500 mt-2">JPG, GIF atau PNG. Maksimal 1MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Nama Lengkap</label>
                  <Input defaultValue="Admin Pusat" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Role / Jabatan</label>
                  <Input defaultValue="Administrator" disabled className="bg-gray-50 text-gray-500" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Email Utama</label>
                  <Input defaultValue="admin.btq@smpn102.sch.id" type="email" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Nomor Telepon</label>
                  <Input defaultValue="0812-3456-7890" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button>
                  <Save size={16} className="mr-2" /> Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">Tahun Ajaran Aktif</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Tahun Ajaran</label>
                  <select className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option>2025/2026</option>
                    <option selected>2026/2027</option>
                    <option>2027/2028</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Semester</label>
                  <select className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option selected>Ganjil</option>
                    <option>Genap</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="outline">Perbarui Sistem</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
