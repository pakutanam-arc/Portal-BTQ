const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Add theme import
if (!code.includes("import { theme } from '../theme';")) {
    code = code.replace("import { APP_LOGO, APP_NAME, APP_SUBTITLE, APP_DESC } from '../assets/logo';", 
                        "import { APP_LOGO, APP_NAME, APP_SUBTITLE, APP_DESC } from '../assets/logo';\nimport { theme } from '../theme';");
}

// 2. Change outer div container
code = code.replace(
    '<div className="flex-1 flex flex-col gap-6 overflow-hidden max-w-[1240px] mx-auto w-full px-4 sm:px-6 py-6 bg-[#F5F6F8] text-[#172033]">',
    '<div className="flex flex-col gap-4 sm:gap-6 w-full">'
);

// 3. Make the Header responsive
code = code.replace(
    '<h1 className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight">',
    '<h1 className={theme.typography.h1}>'
);

// 4. Update the Stats grid to be a bit more responsive
code = code.replace(
    '<section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">',
    '<section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">'
);

// 5. Replace Group summary table with responsive table+cards
const tableBlockStart = code.indexOf('<div className="overflow-x-auto">');
const tableBlockEnd = code.indexOf('</div>', code.indexOf('</table>', tableBlockStart)) + 6;

if (tableBlockStart !== -1 && code.indexOf('</table>', tableBlockStart) !== -1) {
    const tableReplacement = `
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  Tidak ada kelompok yang cocok dengan kriteria pencarian.
                </div>
              ) : (
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-[#E6E8EC] text-[10px] uppercase tracking-wider font-extrabold bg-[#F5F6F8]/50">
                      <th className="py-3 px-5">Kelompok</th>
                      <th className="py-3">Mentor</th>
                      <th className="py-3 text-center">Siswa</th>
                      <th className="py-3 text-center">Kehadiran</th>
                      <th className="py-3">Progress</th>
                      <th className="py-3 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E8EC]">
                    {filteredGroups.map((item, idx) => {
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
                          <td className="py-3 px-5 font-bold text-[#172033]">{item.name}</td>
                          <td className="py-3 font-semibold text-[#172033]">{item.mentorName}</td>
                          <td className="py-3 text-center font-bold text-slate-700">{item.studentsCount} siswa</td>
                          <td className="py-3 text-center font-bold text-[#0362D0]">{item.attendance}%</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-24 bg-[#E6E8EC] h-1.5 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className={\`h-full \${item.status === 'Perlu Pendampingan' ? 'bg-[#950415]' : 'bg-[#0362D0]'}\`}
                                  style={{ width: \`\${item.progress}%\` }}
                                />
                              </div>
                              <span className="text-[11px] font-black">{item.progress}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className={\`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase border \${statusBadge}\`}>
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
                  
                  return (
                    <div key={item.id} className="bg-white border border-[#E6E8EC] rounded-xl p-4 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-extrabold text-[#172033] text-sm leading-tight">{item.name}</h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-1">Mentor: {item.mentorName}</p>
                        </div>
                        <span className={\`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border \${statusBadge}\`}>
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
                            className={\`h-full \${item.status === 'Perlu Pendampingan' ? 'bg-[#950415]' : 'bg-[#0362D0]'}\`}
                            style={{ width: \`\${item.progress}%\` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>`;
    code = code.substring(0, tableBlockStart) + tableReplacement + code.substring(tableBlockEnd);
}

fs.writeFileSync('src/pages/Dashboard.tsx', code);
