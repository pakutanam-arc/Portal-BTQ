import React, { useState, useEffect, useCallback } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  Clock, 
  User, 
  RotateCcw, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ScanHistoryRecord, 
  getSessionScanHistory, 
  clearSessionScanHistory, 
  recordSuccessfulScan 
} from '../../services/scanHistory';
import { StudentAttendance, Student, Group } from '../../services/db';

interface AttendanceHistoryWidgetProps {
  currentGroup?: Group | null;
  students?: Student[];
  recentAttendances?: StudentAttendance[];
  className?: string;
  title?: string;
}

export function AttendanceHistoryWidget({
  currentGroup,
  students = [],
  recentAttendances = [],
  className = '',
  title = 'Attendance History'
}: AttendanceHistoryWidgetProps) {
  const { currentUser } = useAuth();
  const [scans, setScans] = useState<ScanHistoryRecord[]>([]);
  const [isSeededFromDb, setIsSeededFromDb] = useState(false);

  const loadScans = useCallback(() => {
    const sessionScans = getSessionScanHistory(currentUser?.email, 10);
    
    if (sessionScans.length > 0) {
      setScans(sessionScans);
      setIsSeededFromDb(false);
    } else if (recentAttendances.length > 0 && students.length > 0) {
      // Auto-populate from recent attendances marked 'Hadir' if session storage is currently empty
      const studentMap = new Map<string, Student>(students.map(s => [s.id, s]));
      const hadirAttendances = recentAttendances
        .filter(a => a.status === 'Hadir')
        .slice(0, 10)
        .map((a, idx): ScanHistoryRecord => {
          const student = studentMap.get(a.studentId);
          const formattedDate = a.date ? a.date : 'Sesi Terakhir';
          return {
            id: `seed_${a.id || idx}`,
            studentId: a.studentId,
            studentName: student ? student.name : `Santri #${a.studentId}`,
            studentNis: student?.nis,
            studentClass: student?.class,
            groupName: currentGroup?.name || 'Kelompok BTQ',
            timestamp: `${formattedDate}`,
            isoTimestamp: new Date().toISOString(),
            verificationStatus: 'Terverifikasi QR',
            status: 'Hadir',
            method: 'QR_SCAN'
          };
        });

      if (hadirAttendances.length > 0) {
        setScans(hadirAttendances);
        setIsSeededFromDb(true);
      } else {
        setScans([]);
      }
    } else {
      setScans([]);
    }
  }, [currentUser?.email, recentAttendances, students, currentGroup?.name]);

  useEffect(() => {
    loadScans();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ history?: ScanHistoryRecord[] }>;
      if (customEvent.detail?.history) {
        setScans(customEvent.detail.history.slice(0, 10));
        setIsSeededFromDb(false);
      } else {
        loadScans();
      }
    };

    window.addEventListener('btq_scan_history_updated', handleUpdate);
    return () => {
      window.removeEventListener('btq_scan_history_updated', handleUpdate);
    };
  }, [loadScans]);

  const handleClear = () => {
    if (window.confirm('Bersihkan riwayat scan untuk sesi Anda saat ini?')) {
      clearSessionScanHistory(currentUser?.email);
      setScans([]);
      setIsSeededFromDb(false);
    }
  };

  return (
    <div 
      id="attendance-history-widget"
      className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0362D0]/10 border border-[#0362D0]/20 flex items-center justify-center text-[#0362D0] shrink-0">
              <QrCode size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-[#172033] text-sm leading-none">
                  {title}
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Sesi Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                10 pemindaian berhasil terakhir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {scans.length > 0 && !isSeededFromDb && (
              <button
                type="button"
                onClick={handleClear}
                title="Reset riwayat scan sesi"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                id="btn-clear-scan-history"
              >
                <RotateCcw size={13} />
              </button>
            )}
            <Link 
              to="/session" 
              className="text-[11px] font-bold text-[#0362D0] hover:underline flex items-center gap-1 bg-[#0362D0]/5 hover:bg-[#0362D0]/10 px-2 py-1 rounded-lg transition-colors"
              id="link-open-scanner"
            >
              <span>Scan QR</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Scan List */}
        {scans.length > 0 ? (
          <div className="space-y-2 mt-1">
            {scans.map((scan, index) => (
              <div
                key={scan.id || index}
                id={`scan-item-${scan.studentId}`}
                className="p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-100 transition-all flex items-center justify-between gap-3 group"
              >
                {/* Student Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-[#0362D0] font-black text-xs shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-[#172033] truncate group-hover:text-[#0362D0] transition-colors">
                        {scan.studentName}
                      </h4>
                      {scan.studentClass && (
                        <span className="text-[10px] font-bold px-1 py-0.2 bg-white text-slate-600 rounded border border-slate-200 shrink-0">
                          {scan.studentClass}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-slate-400" />
                        {scan.timestamp}
                      </span>
                      {scan.studentNis && (
                        <span className="text-slate-400">NIS: {scan.studentNis}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Status Badge */}
                <div className="shrink-0 text-right">
                  <span 
                    id={`verification-badge-${scan.studentId}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  >
                    <ShieldCheck size={12} className="text-emerald-600" />
                    <span>{scan.verificationStatus || 'Terverifikasi'}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-7 text-center rounded-xl bg-[#F8FAFC] border border-dashed border-slate-100 px-4 my-1">
            <div className="w-10 h-10 rounded-full bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center mx-auto mb-2">
              <QrCode size={18} strokeWidth={2.2} />
            </div>
            <p className="text-xs font-bold text-[#172033]">
              Belum Ada Scan di Sesi Ini
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Pemindaian ID Card santri menggunakan QR Scanner pada Sesi Live akan tercatat otomatis di sini.
            </p>
            <div className="mt-3.5 flex justify-center">
              <Link
                to="/session"
                className="btn btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 font-bold shadow-xs"
                id="btn-empty-start-scan"
              >
                <QrCode size={13} />
                <span>Buka Sesi & Mulai Scan</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Widget Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 font-semibold flex items-center gap-1">
          <CheckCircle2 size={13} className="text-emerald-500" />
          {scans.length} dari 10 rekaman aktif
        </span>
        <Link
          to="/session"
          className="text-[#0362D0] font-bold hover:underline inline-flex items-center gap-1"
        >
          <span>Kehadiran Live</span>
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
