import React from 'react';
import { BookOpen, CheckCircle, Clock, Circle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockCurriculum } from '../data/mockData';
import { cn } from '../utils/cn';

export function Curriculum() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurikulum & Timeline Pembelajaran</h1>
          <p className="text-gray-500 mt-1 text-sm">Alur materi dan target pembelajaran BTQ per minggu</p>
        </div>
        <Button>Tambah Tahap</Button>
      </div>

      <div className="max-w-4xl">
        <div className="relative border-l-2 border-emerald-100 ml-4 md:ml-6 space-y-8 py-4">
          {mockCurriculum.map((item, idx) => {
            const isCompleted = item.status === 'Selesai';
            const isActive = item.status === 'Sedang Berjalan';
            
            return (
              <div key={item.id} className="relative pl-8 md:pl-10">
                <div className={cn(
                  "absolute -left-[17px] top-1 p-1 rounded-full bg-white border-2",
                  isCompleted ? "border-emerald-500 text-emerald-500" : 
                  isActive ? "border-amber-500 text-amber-500" : "border-gray-300 text-gray-300"
                )}>
                  {isCompleted ? <CheckCircle size={20} className="fill-emerald-50" /> : 
                   isActive ? <Clock size={20} className="fill-amber-50" /> : 
                   <Circle size={20} className="fill-gray-50" />}
                </div>

                <Card className={cn("transition-all hover:shadow-md", isActive && "ring-2 ring-amber-500/20 border-amber-200")}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                          {item.week}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 mt-2">{item.stage}</h3>
                        <p className="text-gray-800 font-medium mt-1">{item.topic}</p>
                      </div>
                      <div className="shrink-0">
                        {isCompleted && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold"><CheckCircle size={16} /> Selesai</span>}
                        {isActive && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold"><Clock size={16} /> Sedang Berjalan</span>}
                        {item.status === 'Belum Mulai' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold">Belum Mulai</span>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Deskripsi Materi</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100/50">
                        <h4 className="text-sm font-semibold text-emerald-800 mb-1">Target Capaian</h4>
                        <p className="text-sm text-emerald-700 leading-relaxed">{item.target}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2 justify-end">
                      <Button variant="ghost" size="sm">Edit</Button>
                      {!isCompleted && <Button variant="outline" size="sm">Tandai Selesai</Button>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
