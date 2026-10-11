import React, { useState } from 'react';
import { X, AlertTriangle, UserX, UserCheck, Trash2, ShieldAlert } from 'lucide-react';
import { Student, Group } from '../../services/db/types';
import { StudentAbsenceAlert } from '../../services/db/students';
import { Button } from '../ui/Button';

interface StudentActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  group?: Group;
  absenceAlert?: StudentAbsenceAlert;
  onDeactivate: (student: Student) => Promise<void>;
  onActivate: (student: Student) => Promise<void>;
  onPermanentDelete: (student: Student) => Promise<void>;
  isLoading: boolean;
}

export function StudentActionModal({
  isOpen,
  onClose,
  student,
  group,
  absenceAlert,
  onDeactivate,
  onActivate,
  onPermanentDelete,
  isLoading
}: StudentActionModalProps) {
  const [confirmPermanent, setConfirmPermanent] = useState(false);

  if (!isOpen || !student) return null;

  const isInactive = student.status === 'Nonaktif' || student.status === 'Non-Aktif';

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#172033]">
                Tindakan Kelola Santri
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih opsi penonaktifan atau penghapusan data santri
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Student Summary Info */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-sm font-black text-[#172033]">{student.name}</div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                NIS: {student.nis || '-'} • Kelas {student.class || '-'} • {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
              </div>
            </div>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md border shrink-0 ${
              isInactive 
                ? 'bg-slate-200 text-slate-700 border-slate-300' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {student.status || 'Aktif'}
            </span>
          </div>
          <div className="text-xs text-slate-600 font-bold">
            Kelompok: <span className="text-[#0362D0] font-black">{group?.name || 'Belum Ada Kelompok'}</span>
          </div>
        </div>

        {/* 3x Alpa Absence Alert Banner */}
        {absenceAlert?.hasAlert && (
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-black text-amber-950 uppercase tracking-wide">
                Peringatan Presensi Santri
              </div>
              <p className="text-amber-900 font-medium leading-relaxed">
                Santri ini tercatat <span className="font-black underline">{absenceAlert.isConsecutiveAlert ? `${absenceAlert.consecutiveAlpaCount} kali Alpa berturut-turut` : `${absenceAlert.totalAlpaCount} kali Alpa`}</span> pada pertemuan terakhir{absenceAlert.recentDates.length > 0 ? ` (${absenceAlert.recentDates.join(', ')})` : ''}.
              </p>
              <p className="text-[11px] text-amber-800 font-semibold">
                Sistem menyarankan opsi <strong>Nonaktifkan Santri</strong> agar nama santri tidak lagi muncul pada sesi mengajar berikutnya.
              </p>
            </div>
          </div>
        )}

        {/* Action Choice Cards */}
        <div className="space-y-3.5">
          {/* Option 1: Deactivate or Reactivate */}
          {isInactive ? (
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <UserCheck size={16} />
                  </div>
                  <span className="font-extrabold text-xs text-emerald-950">Aktifkan Kembali Santri</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Pemulihan
                </span>
              </div>
              <p className="text-xs text-emerald-900/80 font-medium leading-relaxed">
                Santri akan dikembalikan ke status Aktif dan akan kembali muncul di daftar kelas dan sesi presensi mengajar.
              </p>
              <Button 
                onClick={() => onActivate(student)} 
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl shadow-xs"
              >
                <UserCheck size={14} className="mr-1.5" /> Aktifkan Kembali Santri
              </Button>
            </div>
          ) : (
            <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <UserX size={16} />
                  </div>
                  <span className="font-extrabold text-xs text-amber-950">Nonaktifkan Santri</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  Direkomendasikan
                </span>
              </div>
              <p className="text-xs text-amber-900/90 font-medium leading-relaxed">
                Santri disembunyikan total dari sesi mengajar pembina dan presensi kelas. <strong>Seluruh riwayat nilai, presensi, dan rapor historis tetap aman tersimpan di database.</strong>
              </p>
              <Button 
                onClick={() => onDeactivate(student)} 
                disabled={isLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-2.5 rounded-xl shadow-xs"
              >
                <UserX size={14} className="mr-1.5" /> Nonaktifkan Santri Ini
              </Button>
            </div>
          )}

          {/* Option 2: Permanent Delete */}
          <div className="border border-rose-200 bg-rose-50/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <Trash2 size={16} />
                </div>
                <span className="font-extrabold text-xs text-rose-950">Hapus Permanen dari Database</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                Permanen
              </span>
            </div>
              <p className="text-xs text-rose-900/90 font-medium leading-relaxed">
                Menghapus dokumen santri secara langsung dan permanen dari database <strong>Cloud Firestore</strong> (bukan penyimpanan lokal). Gunakan opsi ini jika data santri merupakan kesalahan input atau duplikat.
              </p>
            
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input 
                type="checkbox"
                checked={confirmPermanent}
                onChange={e => setConfirmPermanent(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
              />
              <span className="text-[11px] text-rose-950 font-bold select-none">
                Saya yakin ingin menghapus santri ini secara permanen dari Cloud Firestore.
              </span>
            </label>

            <Button 
              onClick={() => onPermanentDelete(student)} 
              disabled={isLoading || !confirmPermanent}
              className={`w-full font-black text-xs py-2.5 rounded-xl transition-all shadow-xs ${
                confirmPermanent 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-rose-200 text-rose-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={14} className="mr-1.5" /> Hapus Dokumen Permanen
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end border-t border-slate-100">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
            className="font-bold border-slate-200 text-xs px-5 py-2"
          >
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
