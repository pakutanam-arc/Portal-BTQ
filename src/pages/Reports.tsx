import React from 'react';
import { theme } from '../theme';
import { Download, Printer, FileText, PieChart, BarChart, FileSpreadsheet, Sparkles } from 'lucide-react';

export function Reports() {
  const reportTypes = [
    {
      title: 'Laporan Kehadiran Santri',
      description: 'Rekapitulasi absensi santri per kelompok, kelas, dan rentang tanggal kegiatan BTQ.',
      icon: FileText,
      color: 'text-[#0362D0]',
      bg: 'bg-[#0362D0]/10',
    },
    {
      title: 'Laporan Kehadiran Mentor',
      description: 'Data kehadiran mentor dan ustadz pembimbing dalam mengajar setiap kelompok.',
      icon: FileText,
      color: 'text-[#172033]',
      bg: 'bg-[#172033]/10',
    },
    {
      title: 'Laporan Progress BTQ & Hafalan',
      description: 'Perkembangan kemampuan membaca (Jilid/Juz), tajwid, dan hafalan hafiz santri.',
      icon: PieChart,
      color: 'text-[#C99A2E]',
      bg: 'bg-[#C99A2E]/20',
    },
    {
      title: 'Laporan Pembelajaran & Jurnal',
      description: 'Progress penyelesaian target kurikulum dan catatan pembimbing per kelompok.',
      icon: BarChart,
      color: 'text-[#950415]',
      bg: 'bg-[#950415]/10',
    }
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] rounded-3xl p-6 lg:p-8 text-white shadow-md border border-[#E6E8EC] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-100 text-xs font-bold mb-3 border border-white/10">
            <FileSpreadsheet size={14} className="text-[#C99A2E]" /> Pusat Laporan Administrasi
          </div>
          <h1 className={theme.typography.h1.replace('text-[#172033]', '')}>
            Laporan & Rekapitulasi Data
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
            Unduh dan cetak rekapitulasi data absensi, progress santri, kehadiran mentor, serta laporan berkala pembelajaran BTQ SMP Negeri 102 Jakarta.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-6 border border-[#E6E8EC] shadow-xs hover:border-[#0362D0]/40 transition-all flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3.5 rounded-2xl ${report.bg} ${report.color} shrink-0 font-bold`}>
                <report.icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-[#172033]">{report.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{report.description}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E6E8EC] flex flex-wrap gap-2 justify-end">
              <button 
                onClick={() => alert(`Mengeksport ${report.title} format Excel...`)}
                className="px-3 py-2 bg-[#F5F6F8] hover:bg-[#0362D0] hover:text-white text-[#172033] font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-[#E6E8EC] cursor-pointer"
              >
                <Download size={14} /> Export Excel
              </button>
              <button 
                onClick={() => alert(`Mengeksport ${report.title} format CSV...`)}
                className="px-3 py-2 bg-[#F5F6F8] hover:bg-[#172033] hover:text-white text-[#172033] font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-[#E6E8EC] cursor-pointer"
              >
                <Download size={14} /> Export CSV
              </button>
              <button 
                onClick={() => window.print()}
                className="px-3 py-2 bg-[#C99A2E]/20 hover:bg-[#C99A2E] hover:text-slate-950 text-[#172033] font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-[#C99A2E]/30 cursor-pointer"
              >
                <Printer size={14} /> Cetak
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

