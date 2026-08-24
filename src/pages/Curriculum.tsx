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
    <div className="space-y-6 max-w-[1240px] mx-auto pb-12">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#172033] tracking-tight">Kurikulum & Timeline Pembelajaran</h1>
            <span className="px-3 py-0.5 rounded-full bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
              32 Sesi / Tahun
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            Struktur 32 pertemuan bimbingan Al-Qur'an (16 sesi/semester) • Pelaksanaan rutin setiap hari <strong>Sabtu</strong>
          </p>
        </div>
      </div>

      {/* Info Status Banner (Jadwal & Riwayat Pertemuan) */}
      <div className="bg-gradient-to-r from-[#172033] via-[#0362D0] to-[#172033] text-white rounded-3xl p-6 shadow-md border border-[#E6E8EC]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#C99A2E] text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Setiap Hari Sabtu
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-100 text-xs font-bold border border-white/10">
                Pukul 07.30 - 09.00 WIB
              </span>
              <span className="px-3 py-1 rounded-full bg-[#0362D0]/40 text-blue-100 text-xs font-black border border-blue-300/30">
                Status: 2 Sesi Pertemuan Terlaksana
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Timeline Kegiatan BTQ SMP Negeri 102 Jakarta
            </h2>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed max-w-3xl font-medium">
              Saat ini telah terlaksana <strong>2x pertemuan</strong> untuk seluruh kelompok binaan:
              <span className="block mt-1 text-[#C99A2E] font-bold">
                • <strong>Pertemuan 1:</strong> Ta'aruf & Pengenalan Mentor | 
                • <strong>Pertemuan 2:</strong> Mulai Pembelajaran Materi Pokok Buku | 
                • <strong>Pertemuan 3:</strong> Sesi Aktif Mendatang (Sabtu)
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="text-center px-2">
              <p className="text-[10px] text-slate-300 uppercase font-bold">Total Sesi</p>
              <p className="text-xl font-black text-white">32</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center px-2">
              <p className="text-[10px] text-slate-300 uppercase font-bold">Terlaksana</p>
              <p className="text-xl font-black text-[#C99A2E]">2 Sesi</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center px-2">
              <p className="text-[10px] text-slate-300 uppercase font-bold">Sesi Aktif</p>
              <p className="text-xl font-black text-emerald-400">Sesi 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
        <div className="p-5 bg-[#F5F6F8]/60 flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Program / Grade</label>
            <Select 
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full font-bold text-[#172033]"
            >
              {masterGrades.map(g => (
                <option key={g.id} value={g.id}>{g.name} — {g.programName}</option>
              ))}
            </Select>
          </div>
          
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Semester</label>
            <Select 
              value={selectedSemester.toString()}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="w-full font-bold text-[#172033]"
            >
              <option value="1">Semester 1 (Pertemuan 1 – 16)</option>
              <option value="2">Semester 2 (Pertemuan 17 – 32)</option>
            </Select>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-black text-[#172033] uppercase tracking-wider">Filter Kelompok</label>
            <Select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full font-bold text-[#172033]"
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
          <div className="mb-6 bg-white p-6 rounded-3xl border border-[#E6E8EC] shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="px-3 py-1 rounded-xl bg-[#0362D0]/10 text-[#0362D0] text-xs font-black border border-[#0362D0]/20">
                {currentGrade?.name} — {currentGrade?.programName}
              </span>
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <Calendar size={13} className="text-[#0362D0]" /> Setiap Sabtu • 16 Sesi / Semester
              </span>
            </div>
            <h2 className="text-lg font-black text-[#172033] mb-1">{currentGrade?.bookTitle}</h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-3 font-medium">{currentGrade?.description}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#E6E8EC]">
              <span className="text-xs font-black text-[#172033] mr-1">Kelompok Pengampu:</span>
              {currentGrade?.groups.map(grp => (
                <span key={grp} className="px-2.5 py-0.5 rounded-lg bg-[#F5F6F8] text-[#172033] text-xs font-bold border border-[#E6E8EC]">
                  {grp}
                </span>
              ))}
            </div>
          </div>

          <div className="relative border-l-2 border-[#E6E8EC] ml-4 md:ml-6 space-y-6 py-2">
            {currentSessions.map((session) => {
              const isCompleted = selectedSemester === 1 && session.sessionNumber <= 2;
              const isActive = selectedSemester === 1 && session.sessionNumber === 3;
              const isUpcoming = !isCompleted && !isActive;

              return (
                <div key={session.id} className="relative pl-8 md:pl-10">
                  <div className={cn(
                    "absolute -left-[17px] top-1 p-1 rounded-full bg-white border-2 transition-all",
                    isCompleted ? "border-emerald-600 text-emerald-600 shadow-xs" : 
                    isActive ? "border-[#C99A2E] text-[#C99A2E] ring-4 ring-[#C99A2E]/20" : "border-slate-300 text-slate-300"
                  )}>
                    {isCompleted ? <CheckCircle size={16} className="fill-emerald-50" /> :
                     isActive ? <Clock size={16} className="fill-amber-50" /> :
                     <Circle size={16} className="fill-slate-50" />}
                  </div>

                  <Card className={cn(
                    "transition-all border rounded-3xl overflow-hidden shadow-xs",
                    isActive ? "ring-2 ring-[#C99A2E] border-[#C99A2E] bg-[#C99A2E]/5" :
                    isCompleted ? "border-[#E6E8EC] bg-white" : "border-[#E6E8EC] bg-white opacity-90"
                  )}>
                    <CardContent className="p-5 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                              isCompleted ? "text-emerald-800 bg-emerald-50 border-emerald-200" :
                              isActive ? "text-[#172033] bg-[#C99A2E]/20 border-[#C99A2E]" :
                              "text-slate-600 bg-[#F5F6F8] border-[#E6E8EC]"
                            )}>
                              Pertemuan {session.sessionNumber} • {session.scheduleDay || `Sabtu (Pekan ${session.sessionNumber})`}
                            </span>
                            
                            {session.isOrientation && (
                              <span className="text-[10px] font-extrabold text-[#950415] bg-[#950415]/10 px-2.5 py-1 rounded-lg border border-[#950415]/20">
                                Ta'aruf & Pengenalan
                              </span>
                            )}

                            {session.pageRef && (
                              <span className="text-[10px] font-bold text-slate-600 bg-[#F5F6F8] px-2.5 py-1 rounded-lg border border-[#E6E8EC]">
                                {session.pageRef}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-black text-[#172033]">{session.topic}</h4>
                        </div>
                        <div className="shrink-0">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                              <CheckCircle size={13} /> Selesai Terlaksana
                            </span>
                          )}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C99A2E]/20 text-[#172033] text-xs font-black border border-[#C99A2E]/40 animate-pulse">
                              <Clock size={13} /> Sesi Aktif Pekan Ini
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F5F6F8] text-slate-500 text-xs font-bold border border-[#E6E8EC]">
                              Mendatang
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={cn(
                        "rounded-2xl p-4 border mt-3",
                        isCompleted ? "bg-emerald-50/50 border-emerald-100" :
                        isActive ? "bg-white border-[#C99A2E]/30" :
                        "bg-[#F5F6F8] border-[#E6E8EC]"
                      )}>
                        <h5 className="text-xs font-black text-[#172033] mb-1">Target Capaian & Kompetensi</h5>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{session.target}</p>
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
          <Card className="sticky top-24 border border-[#E6E8EC] rounded-3xl overflow-hidden shadow-xs bg-white">
            <div className="p-5 border-b border-[#E6E8EC] bg-[#172033] text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm">Progres Pertemuan Kelompok</h3>
                <span className="text-[10px] bg-[#C99A2E] text-slate-950 px-2.5 py-0.5 rounded-md font-black">
                  Semester 1
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                2 dari 16 pertemuan Semester 1 telah terlaksana (12.5%)
              </p>
            </div>
            <div className="p-5">
              {currentGroups.length === 0 ? (
                <div className="text-center py-6 text-xs font-medium text-slate-500">Tidak ada kelompok di grade ini.</div>
              ) : (
                <div className="space-y-3.5">
                  {currentGroups.map(group => {
                    const baseProgress = Math.round((2 / 16) * 100);
                    const groupBonus = group.id.includes('1') ? 2 : group.id.includes('3') ? 1 : 0;
                    const calculatedProgress = baseProgress + groupBonus;
                                         
                    return (
                      <div key={group.id} className={cn(
                        "p-3.5 rounded-2xl border transition-colors",
                        selectedGroup === group.id ? "bg-[#0362D0]/10 border-[#0362D0]" : "border-[#E6E8EC] bg-white hover:bg-[#F5F6F8]"
                      )}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-extrabold text-sm text-[#172033]">{group.name}</span>
                          <span className="font-black text-xs text-[#0362D0]">2 / 16 Sesi ({calculatedProgress}%)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mb-2">
                          Jadwal: Setiap Sabtu • Sesi 1 & 2 Selesai
                        </p>
                        <div className="w-full bg-[#F5F6F8] h-2 rounded-full overflow-hidden border border-[#E6E8EC]">
                          <div 
                            className="bg-[#0362D0] h-full rounded-full transition-all" 
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

