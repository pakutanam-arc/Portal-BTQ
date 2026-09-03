const fs = require('fs');
let code = fs.readFileSync('src/pages/Certifications.tsx', 'utf8');

const tableBlockStart = code.indexOf('<div className="overflow-x-auto">');
const tableBlockEnd = code.indexOf('</div>', code.indexOf('</table>', tableBlockStart)) + 6;

if (tableBlockStart !== -1 && code.indexOf('</table>', tableBlockStart) !== -1) {
    const tableReplacement = `
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="text-slate-400 border-b border-[#E6E8EC] text-[10px] uppercase tracking-wider font-extrabold bg-[#F5F6F8]/50">
                  <th className="py-3.5 px-4">Nama Santri</th>
                  <th className="py-3.5 px-4">Kelompok & Kelas</th>
                  <th className="py-3.5 px-4">Kategori Ujian / Target</th>
                  <th className="py-3.5 px-4">Status Kesiapan</th>
                  <th className="py-3.5 px-4 text-center">Nilai Ujian</th>
                  <th className="py-3.5 px-4">Nomor Piagam & Tgl</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E8EC]">
                {filteredCertifications.map(cert => {
                  const statusObj = STATUSES.find(s => s.key === cert.status) || STATUSES[0];
                  const StatusIcon = statusObj.icon;
                  return (
                    <tr key={cert.id} className="hover:bg-[#F5F6F8]/60 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#172033] text-xs sm:text-sm">
                          {cert.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          NIS: {cert.studentNis || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172033]">{cert.groupName}</div>
                        <div className="text-[11px] text-slate-500 font-medium">Kelas {cert.studentClass}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0362D0]/10 text-[#0362D0] font-bold border border-[#0362D0]/20 text-xs">
                          <Award size={13} /> {cert.category}
                        </span>
                        {cert.notes && (
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 max-w-xs font-medium">
                            {cert.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 border",
                            statusObj.bg,
                            statusObj.color
                          )}>
                            <StatusIcon size={12} /> {cert.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-sm text-[#172033]">{cert.examScore || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172033] text-[11px]">
                          {cert.certificateNumber || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {cert.examDate || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenForm(cert)}
                            className="p-1.5 text-slate-400 hover:text-[#0362D0] hover:bg-[#0362D0]/10 rounded-xl transition-colors cursor-pointer"
                            title="Edit / Update Data"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(cert.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-3 p-3">
            {filteredCertifications.map(cert => {
              const statusObj = STATUSES.find(s => s.key === cert.status) || STATUSES[0];
              const StatusIcon = statusObj.icon;
              return (
                <div key={cert.id} className="bg-white border border-[#E6E8EC] rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-extrabold text-[#172033] text-sm leading-tight">{cert.studentName}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {cert.groupName} • Kelas {cert.studentClass}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black inline-flex items-center gap-1 border shrink-0",
                      statusObj.bg,
                      statusObj.color
                    )}>
                      <StatusIcon size={10} /> {cert.status}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0362D0]/10 text-[#0362D0] font-bold border border-[#0362D0]/20 text-[10px]">
                      <Award size={12} /> {cert.category}
                    </span>
                    {cert.notes && (
                      <div className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 font-medium bg-[#F5F6F8] p-2 rounded-lg">
                        {cert.notes}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[#F5F6F8] p-2 rounded-lg text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Nilai Ujian</p>
                      <p className="text-sm font-black text-[#172033]">{cert.examScore || '-'}</p>
                    </div>
                    <div className="bg-[#F5F6F8] p-2 rounded-lg text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Tgl Ujian</p>
                      <p className="text-xs font-black text-[#172033]">{cert.examDate || '-'}</p>
                    </div>
                  </div>
                  
                  {cert.certificateNumber && (
                    <div className="mb-4">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">No. Piagam</p>
                      <p className="text-[11px] font-bold text-[#172033]">{cert.certificateNumber}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-[#E6E8EC]">
                    <button
                      onClick={() => handleOpenForm(cert)}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 text-[#0362D0] border border-[#0362D0]/30 hover:bg-[#0362D0]/5 rounded-xl font-bold text-[11px] transition-colors"
                    >
                      <Edit3 size={14} /> Update
                    </button>
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl font-bold text-[11px] transition-colors"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>`;
          
    code = code.substring(0, tableBlockStart) + tableReplacement + code.substring(tableBlockEnd);
}

fs.writeFileSync('src/pages/Certifications.tsx', code);
