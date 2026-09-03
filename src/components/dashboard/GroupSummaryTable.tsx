import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { getGradeForGroup } from '../../services/curriculumData';

export interface GroupDetailItem {
  id: string;
  name: string;
  mentorName: string;
  studentsCount: number;
  progress: number;
  attendance: number;
  status: 'Baik' | 'Perlu Dipantau' | 'Perlu Pendampingan';
}

interface GroupSummaryTableProps {
  groups: GroupDetailItem[];
}

export const GroupSummaryTable = React.memo(function GroupSummaryTable({ groups }: GroupSummaryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups.filter((g) => {
      const matchesSearch = !q || g.name.toLowerCase().includes(q) || g.mentorName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [groups, searchQuery, statusFilter]);

  return (
    <div id="dashboard-group-summary-card" className="bg-white rounded-2xl border border-[#E6E8EC] overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-[#E6E8EC] bg-[#F5F6F8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-extrabold text-[#172033] text-sm sm:text-base">
            Ringkasan Kelompok BTQ
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Pantau status belajar dan kehadiran per halaqah</p>
        </div>

        {/* Dynamic search / filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input 
              id="group-search-input"
              type="text" 
              placeholder="Cari kelompok / mentor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 h-9 bg-white border border-[#E6E8EC] rounded-xl text-xs text-[#172033] focus:border-[#0362D0] focus:ring-1 focus:ring-[#0362D0] outline-none w-full sm:w-48 placeholder:text-slate-400 font-medium"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-[#E6E8EC] rounded-xl h-9 px-2">
            <select 
              id="group-status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter status kelompok"
              className="text-xs font-bold text-[#172033] bg-transparent outline-none cursor-pointer border-none p-0 pr-1 focus:ring-0"
            >
              <option value="ALL">Semua Status</option>
              <option value="Baik">Baik</option>
              <option value="Perlu Dipantau">Dipantau</option>
              <option value="Perlu Pendampingan">Pendampingan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto w-full scrollbar-thin">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold">
            Tidak ada kelompok yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="text-slate-400 border-b border-[#E6E8EC] text-[10px] uppercase tracking-wider font-extrabold bg-[#F5F6F8]/50 whitespace-nowrap">
                <th className="py-3.5 px-5">Kelompok</th>
                <th className="py-3.5 px-3">Mentor</th>
                <th className="py-3.5 px-3 text-center">Siswa</th>
                <th className="py-3.5 px-3 text-center">Kehadiran</th>
                <th className="py-3.5 px-3">Progress</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8EC]">
              {filteredGroups.map((item) => {
                let statusBadge = '';
                if (item.status === 'Baik') {
                  statusBadge = 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20';
                } else if (item.status === 'Perlu Dipantau') {
                  statusBadge = 'bg-[#C99A2E]/10 text-[#C99A2E] border-[#C99A2E]/20';
                } else {
                  statusBadge = 'bg-[#950415]/10 text-[#950415] border-[#950415]/20';
                }
                return (
                  <tr key={item.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                    <td className="py-3 px-5 whitespace-nowrap">
                      <div className="font-bold text-[#172033]">{item.name}</div>
                      <div className="text-[10px] font-bold text-[#0362D0] bg-[#0362D0]/10 px-1.5 py-0.5 rounded w-fit mt-0.5 whitespace-nowrap">
                        {getGradeForGroup({ id: item.id, name: item.name }).name} - {getGradeForGroup({ id: item.id, name: item.name }).programName}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#172033] whitespace-nowrap">{item.mentorName}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700 whitespace-nowrap">{item.studentsCount} siswa</td>
                    <td className="py-3 px-3 text-center font-bold text-[#0362D0] whitespace-nowrap">{item.attendance}%</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <div className="w-24 bg-[#E6E8EC] h-1.5 rounded-full overflow-hidden shrink-0">
                          <div 
                            className={`h-full ${item.status === 'Perlu Pendampingan' ? 'bg-[#950415]' : 'bg-[#0362D0]'}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black">{item.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase border whitespace-nowrap ${statusBadge}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-3 p-1">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold bg-[#F5F6F8] rounded-xl border border-[#E6E8EC]">
            Tidak ada kelompok yang cocok.
          </div>
        ) : (
          filteredGroups.map((item) => {
            let statusBadge = '';
            if (item.status === 'Baik') {
              statusBadge = 'bg-[#0362D0]/10 text-[#0362D0] border-[#0362D0]/20';
            } else if (item.status === 'Perlu Dipantau') {
              statusBadge = 'bg-[#C99A2E]/10 text-[#C99A2E] border-[#C99A2E]/20';
            } else {
              statusBadge = 'bg-[#950415]/10 text-[#950415] border-[#950415]/20';
            }
            const gr = getGradeForGroup({ id: item.id, name: item.name });
            
            return (
              <div key={item.id} className="bg-white border border-[#E6E8EC] rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-extrabold text-[#172033] text-sm leading-tight">{item.name}</h4>
                    <p className="text-[10px] font-bold text-[#0362D0] bg-[#0362D0]/10 px-1.5 py-0.5 rounded w-fit mt-1">
                      {gr.name} - {gr.programName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Mentor: {item.mentorName}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusBadge}`}>
                    {item.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-[#F5F6F8] p-2 rounded-lg text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Siswa</p>
                    <p className="text-xs font-black text-[#172033]">{item.studentsCount}</p>
                  </div>
                  <div className="bg-[#0362D0]/5 p-2 rounded-lg text-center border border-[#0362D0]/10">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Kehadiran</p>
                    <p className="text-xs font-black text-[#0362D0]">{item.attendance}%</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Progress BTQ</span>
                    <span className="text-xs font-black text-[#172033]">{item.progress}%</span>
                  </div>
                  <div className="w-full bg-[#E6E8EC] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.status === 'Perlu Pendampingan' ? 'bg-[#950415]' : 'bg-[#0362D0]'}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
