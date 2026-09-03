import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export const AttentionPanel = React.memo(function AttentionPanel() {
  return (
    <section id="dashboard-attention-panel" className="bg-[#950415]/5 p-4 sm:p-5 rounded-2xl border border-[#950415]/20 shadow-xs">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#950415]/15 text-[#950415]">
        <AlertCircle size={18} strokeWidth={2.5} />
        <h3 className="font-black text-xs uppercase tracking-wider">Perlu Perhatian</h3>
      </div>

      <div className="space-y-3">
        {/* Item 1 */}
        <Link 
          to="/groups"
          id="attention-item-group-7"
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl transition-colors block"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">Kelompok 7</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Progress BTQ 61% — di bawah rata-rata silabus.
            </p>
          </div>
        </Link>

        {/* Item 2 */}
        <Link 
          to="/groups"
          id="attention-item-group-10"
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl transition-colors block"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">Kelompok 10</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Kehadiran siswa menyentuh 72% pada sesi ini.
            </p>
          </div>
        </Link>

        {/* Item 3 */}
        <Link 
          to="/attendance/students"
          id="attention-item-students-at-risk"
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl transition-colors block"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">4 siswa terancam</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Memiliki tingkat kehadiran kumulatif di bawah 75%.
            </p>
          </div>
        </Link>

        {/* Item 4 */}
        <Link 
          to="/attendance/mentors"
          id="attention-item-mentor-checkin"
          className="flex items-start gap-2.5 p-2.5 hover:bg-[#950415]/10 rounded-xl transition-colors block"
        >
          <span className="text-xs">⚠</span>
          <div>
            <p className="text-xs font-bold text-[#172033] leading-snug">1 mentor belum check-in</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Kelompok 7 belum melakukan absensi harian.
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
});
