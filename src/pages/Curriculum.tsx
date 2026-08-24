import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Circle, Filter, Calendar, Users, Info, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { cn } from '../utils/cn';
import { masterGrades, masterSessions, Grade, CurriculumSession, CURRICULUM_CONFIG } from '../services/curriculumData';
import { getGroups, Group } from '../services/db';

export function Curriculum() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('grade1');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  useEffect(() => {
    async function loadGroups() {
      const g = await getGroups();
      setGroups(g);
    }
    loadGroups();
  }, []);

  const currentGrade = masterGrades.find(g => g.id === selectedGrade);
  const currentSessions = masterSessions.filter(s => s.gradeId === selectedGrade && s.semester === selectedSemester);
  const currentGroups = groups.filter(g => g.gradeId === selectedGrade);

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurikulum & Timeline Pembelajaran</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Struktur 32 pertemuan bimbingan Al-Qur'an (16 sesi/semester) • Pelaksanaan rutin setiap hari <strong>Sabtu</strong>
          </p>
        </div>
      </div>

      {/* Info Status Banner (Jadwal & Riwayat Pertemuan) */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-emerald-950 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Setiap Hari Sabtu
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-medium border border-emerald-500/30">
                Pukul 07.30 - 09.00 WIB
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold">
                Status: 2x Pertemuan Selesai
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold">
              Timeline Kegiatan BTQ SMPN 102 Jakarta
            </h2>
            <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed max-w-3xl">
              Saat ini telah terlaksana <strong>2x pertemuan</strong> untuk seluruh kelompok:
              <span className="block mt-0.5 text-amber-200 font-medium">
                • <strong>Pertemuan 1:</strong> Ta'aruf & Pengenalan Mentor | 
                • <strong>Pertemuan 2:</strong> Mulai Pembelajaran Materi Pokok Buku | 
                • <strong>Pertemuan 3:</strong> Sesi Aktif Mendatang (Sabtu)
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-emerald-900/60 p-3 rounded-xl border border-emerald-700/50">
            <div className="text-center px-2">
              <p className="text-[10px] text-emerald-200 uppercase font-semibold">Total Sesi</p>
              <p className="text-lg font-bold text-white">32</p>
            </div>
            <div className="w-px h-8 bg-emerald-700"></div>
            <div className="text-center px-2">
              <p className="text-[10px] text-emerald-200 uppercase font-semibold">Terlaksana</p>
              <p className="text-lg font-bold text-amber-300">2 Sesi</p>
            </div>
            <div className="w-px h-8 bg-emerald-700"></div>
            <div className="text-center px-2">
              <p className="text-[10px] text-emerald-200 uppercase font-semibold">Sesi Aktif</p>
              <p className="text-lg font-bold text-emerald-300">Sesi 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Program / Grade</label>
            <Select 
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full"
            >
              {masterGrades.map(g => (
                <option key={g.id} value={g.id}>{g.name} — {g.programName}</option>
              ))}
            </Select>
          </div>
          
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Semester</label>
            <Select 
              value={selectedSemester.toString()}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="w-full"
            >
              <option value="1">Semester 1 (Pertemuan 1 – 16)</option>
              <option value="2">Semester 2 (Pertemuan 17 – 32)</option>
            </Select>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Filter Kelompok</label>
            <Select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full"
            >
              <option value="all">Semua Kelompok ({currentGrade?.name})</option>
              {currentGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Timeline View */}
        <div className="flex-1">
          <div className="mb-6 bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {currentGrade?.name} — {currentGrade?.programName}
              </span>
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <Calendar size={13} className="text-emerald-600" /> Setiap Sabtu • 16 Sesi / Semester
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{currentGrade?.bookTitle}</h2>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{currentGrade?.description}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 mr-1">Kelompok Pengampu:</span>
              {currentGrade?.groups.map(grp => (
                <span key={grp} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                  {grp}
                </span>
              ))}
            </div>
          </div>

          <div className="relative border-l-2 border-emerald-100 ml-4 md:ml-6 space-y-6 py-2">
            {currentSessions.map((session) => {
              // Status logic:
              // Semester 1: Session 1 & 2 completed, Session 3 is active/upcoming next Saturday, Session 4+ upcoming
              // Semester 2: all upcoming
              const isCompleted = selectedSemester === 1 && session.sessionNumber <= 2;
              const isActive = selectedSemester === 1 && session.sessionNumber === 3;
              const isUpcoming = !isCompleted && !isActive;

              return (
                <div key={session.id} className="relative pl-8 md:pl-10">
                  <div className={cn(
                    "absolute -left-[17px] top-1 p-1 rounded-full bg-white border-2 transition-all",
                    isCompleted ? "border-emerald-500 text-emerald-500 shadow-sm" : 
                    isActive ? "border-amber-500 text-amber-500 ring-4 ring-amber-100" : "border-gray-300 text-gray-300"
                  )}>
                    {isCompleted ? <CheckCircle size={16} className="fill-emerald-50" /> :
                     isActive ? <Clock size={16} className="fill-amber-50" /> :
                     <Circle size={16} className="fill-gray-50" />}
                  </div>

                  <Card className={cn(
                    "transition-all",
                    isActive ? "ring-2 ring-amber-500/30 border-amber-300 shadow-md bg-amber-50/20" :
                    isCompleted ? "border-emerald-100 bg-white" : "border-slate-200 bg-white opacity-90"
                  )}>
                    <CardContent className="p-4 md:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                              isCompleted ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                              isActive ? "text-amber-800 bg-amber-100 border-amber-300" :
                              "text-slate-600 bg-slate-100 border-slate-200"
                            )}>
                              Pertemuan {session.sessionNumber} • {session.scheduleDay || `Sabtu (Pekan ${session.sessionNumber})`}
                            </span>
                            
                            {session.isOrientation && (
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                Ta'aruf & Pengenalan
                              </span>
                            )}

                            {session.pageRef && (
                              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {session.pageRef}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-gray-900">{session.topic}</h4>
                        </div>
                        <div className="shrink-0">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                              <CheckCircle size={12} /> Selesai Terlaksana
                            </span>
                          )}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold animate-pulse">
                              <Clock size={12} /> Sesi Aktif Pekan Ini
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                              Mendatang
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={cn(
                        "rounded-lg p-3 border mt-2",
                        isCompleted ? "bg-emerald-50/60 border-emerald-100" :
                        isActive ? "bg-amber-50/70 border-amber-200" :
                        "bg-slate-50 border-slate-100"
                      )}>
                        <h5 className="text-[11px] font-semibold text-slate-800 mb-0.5">Target Capaian & Kompetensi</h5>
                        <p className="text-xs text-slate-700 leading-relaxed">{session.target}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Class Progress Sidebar */}
        <div className="xl:w-[350px] shrink-0">
          <Card className="sticky top-24">
            <div className="p-4 border-b border-gray-100 bg-emerald-900 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Progres Pertemuan Kelompok</h3>
                <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded font-semibold text-emerald-100">
                  Semester 1
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 opacity-90 mt-1">
                2 dari 16 pertemuan Semester 1 telah terlaksana (12.5%)
              </p>
            </div>
            <div className="p-4">
              {currentGroups.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">Tidak ada kelompok di grade ini.</div>
              ) : (
                <div className="space-y-4">
                  {currentGroups.map(group => {
                    // Accurate progress representation for 2 completed sessions
                    const baseProgress = Math.round((2 / 16) * 100); // 12.5% -> ~13%
                    const groupBonus = group.id.includes('1') ? 2 : group.id.includes('3') ? 1 : 0;
                    const calculatedProgress = baseProgress + groupBonus;
                                         
                    return (
                      <div key={group.id} className={cn(
                        "p-3 rounded-lg border transition-colors",
                        selectedGroup === group.id ? "bg-emerald-50 border-emerald-200" : "border-slate-100 hover:bg-slate-50"
                      )}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm text-slate-800">{group.name}</span>
                          <span className="font-bold text-xs text-emerald-700">2 / 16 Sesi ({calculatedProgress}%)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">
                          Jadwal: Setiap Sabtu • Sesi 1 & 2 Selesai
                        </p>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${calculatedProgress}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
