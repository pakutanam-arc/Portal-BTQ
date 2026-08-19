import React from 'react';
import { Download, Printer, FileText, PieChart, BarChart } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Reports() {
  const reportTypes = [
    {
      title: 'Laporan Kehadiran Siswa',
      description: 'Rekapitulasi absensi siswa per kelompok, kelas, dan rentang tanggal.',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Laporan Kehadiran Mentor',
      description: 'Data kehadiran mentor mengajar setiap kelompok.',
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Laporan Progress BTQ',
      description: 'Perkembangan kemampuan membaca, tajwid, dan hafalan siswa.',
      icon: PieChart,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Laporan Pembelajaran',
      description: 'Progress penyelesaian materi kurikulum per kelompok.',
      icon: BarChart,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-500 mt-1 text-sm">Unduh dan cetak rekapitulasi data administrasi BTQ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${report.bg} ${report.color} shrink-0`}>
                  <report.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                  
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="bg-white">
                      <Download size={14} className="mr-2" /> Export Excel
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white">
                      <Download size={14} className="mr-2" /> Export CSV
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      <Printer size={14} className="mr-2" /> Print
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
