import React from 'react';
import { Users, Layers, BookOpen, UserCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { mockGroups, mockStudents, mockMentors } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '../components/ui/Badge';

export function Dashboard() {
  const statCards = [
    { label: 'Total Siswa', value: mockStudents.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Kelompok', value: mockGroups.length, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Kehadiran Hari Ini', value: '94%', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Rata-rata Progress', value: '68%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const attendanceData = [
    { name: 'Hadir', value: 85, fill: '#10b981' },
    { name: 'Izin', value: 8, fill: '#f59e0b' },
    { name: 'Sakit', value: 5, fill: '#3b82f6' },
    { name: 'Alpa', value: 2, fill: '#ef4444' },
  ];

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden max-w-[1200px] mx-auto w-full">
      {/* Top Stats Row */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Columns */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        {/* Groups Table Section */}
        <section className="bg-white rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
              Ringkasan 10 Kelompok BTQ
            </h3>
            <button className="text-xs text-emerald-600 font-semibold hover:underline">Lihat Semua</button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-sm border-collapse min-w-[500px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="py-3 font-medium">Kelompok</th>
                  <th className="py-3 font-medium">Mentor</th>
                  <th className="py-3 font-medium text-center">Siswa</th>
                  <th className="py-3 font-medium">Progress</th>
                  <th className="py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockGroups.slice(0, 5).map((group, idx) => {
                  const mentor = mockMentors.find(m => m.id === group.mentorId);
                  const studentsCount = mockStudents.filter(s => s.groupId === group.id).length;
                  const attendance = 85 + Math.floor(Math.random() * 12);
                  const progress = 55 + Math.floor(Math.random() * 35);
                  
                  let status = "success";
                  let statusLabel = "SANGAT BAIK";
                  let statusBg = "bg-emerald-100 text-emerald-700";
                  let barColor = "bg-emerald-500";
                  
                  if (progress < 60 || attendance < 80) {
                    status = "danger"; 
                    statusLabel = "PERHATIAN";
                    statusBg = "bg-rose-100 text-rose-700";
                    barColor = "bg-rose-400";
                  } else if (progress < 75 || attendance < 90) {
                    status = "warning"; 
                    statusLabel = "BERKEMBANG";
                    statusBg = "bg-amber-100 text-amber-700";
                    barColor = "bg-amber-400";
                  } else if (progress < 85) {
                    statusLabel = "BAIK";
                  }

                  return (
                    <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">{group.name}</td>
                      <td className="py-3 text-slate-600">{mentor?.name}</td>
                      <td className="py-3 text-center text-slate-600">{studentsCount}</td>
                      <td className="py-3">
                        <div className="w-full max-w-[120px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{width: `${progress}%`}}></div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBg}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Right Sidebar Column */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        {/* Timeline Widget */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shrink-0 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
            <span>Timeline Kurikulum</span>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Minggu 08</span>
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-1 bg-emerald-500 rounded-full h-10"></div>
              <div>
                <p className="text-xs font-bold text-slate-800">Tahap 3: Tajwid Dasar</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Nun Mati, Tanwin & Qalqalah</p>
              </div>
            </div>
            <div className="flex gap-3 opacity-50">
              <div className="w-1 bg-slate-300 rounded-full h-10"></div>
              <div>
                <p className="text-xs font-bold text-slate-800">Tahap 4: Kelancaran</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Target: Surat Pendek Al-Bayyinah</p>
              </div>
            </div>
          </div>
        </section>

        {/* Activity Widget */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 flex-1 flex flex-col overflow-hidden shadow-sm">
          <h3 className="font-bold text-slate-700 mb-3">Aktivitas Terbaru</h3>
          <div className="space-y-4 overflow-y-auto pr-2 pb-2 flex-1">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs shrink-0">✅</div>
              <div className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Mentor Kelompok 3</span> mengisi absensi harian (100% hadir).
                <p className="text-slate-400 text-[10px] mt-0.5">2 menit yang lalu</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs shrink-0">📈</div>
              <div className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Ahmad Zaki</span> (Kel-1) naik status ke "Sangat Baik".
                <p className="text-slate-400 text-[10px] mt-0.5">15 menit yang lalu</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs shrink-0">📝</div>
              <div className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Admin</span> memperbarui kurikulum Tahap 4.
                <p className="text-slate-400 text-[10px] mt-0.5">1 jam yang lalu</p>
              </div>
            </div>
            <div className="flex gap-3 items-start opacity-70">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">🔔</div>
              <div className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">Notifikasi:</span> 3 siswa di Kelompok 4 butuh pendampingan.
                <p className="text-slate-400 text-[10px] mt-0.5">3 jam yang lalu</p>
              </div>
            </div>
          </div>
          <button className="w-full mt-4 py-2 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
            Lihat Log Lengkap
          </button>
        </section>
      </div>
    </div>
  );
}
