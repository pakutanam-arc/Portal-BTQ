import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  AlertOctagon, 
  ArrowRight, 
  ShieldCheck, 
  X, 
  Layers,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  validateCurriculumConsistency, 
  CurriculumValidationReport, 
  CurriculumValidationIssue 
} from '../utils/curriculumValidator';
import { cn } from '../utils/cn';

interface CurriculumSyncAlertProps {
  className?: string;
  groupIdFilter?: string;
  compact?: boolean;
}

export function CurriculumSyncAlert({ className, groupIdFilter, compact = false }: CurriculumSyncAlertProps) {
  const { userRole, userData } = useAuth();
  const navigate = useNavigate();

  // STRICT SECURITY CHECK: Strictly visible ONLY to admin user
  const isAdmin = userRole === 'admin' || userData?.email === 'admin@smpn102.sch.id';

  const [report, setReport] = useState<CurriculumValidationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [dismissed, setDismissed] = useState<boolean>(false);

  const runValidation = async () => {
    setLoading(true);
    try {
      const res = await validateCurriculumConsistency(groupIdFilter);
      setReport(res);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      runValidation();
    }
  }, [isAdmin, groupIdFilter]);

  // If not admin or dismissed, render nothing
  if (!isAdmin || dismissed) {
    return null;
  }

  if (loading && !report) {
    return (
      <div className={cn("p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs text-slate-500 font-medium", className)}>
        <RefreshCw size={14} className="animate-spin text-[#0362D0]" />
        <span>Memvalidasi konsistensi Sesi Mengajar & Kurikulum...</span>
      </div>
    );
  }

  if (!report || !report.hasIssues) {
    return (
      <div className={cn("p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-medium shadow-2xs", className)}>
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
          <div>
            <div className="font-extrabold flex items-center gap-2 text-emerald-950">
              <span>Konsistensi Kurikulum & Sesi Mengajar Valid</span>
              <span className="px-2 py-0.5 bg-emerald-200/60 text-emerald-800 text-[10px] font-black rounded-md uppercase">Khusus Admin</span>
            </div>
            <p className="text-[11px] text-emerald-700">Seluruh {report?.totalJournalsChecked || 0} rekam jurnal mengajar selaras dengan 32 Tahap Kurikulum.</p>
          </div>
        </div>
        <button 
          onClick={runValidation} 
          title="Refresh Validasi"
          className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
    );
  }

  const filteredIssues = report.issues.filter(issue => {
    if (filterType === 'error') return issue.severity === 'error';
    if (filterType === 'warning') return issue.severity === 'warning';
    return true;
  });

  return (
    <div className={cn("bg-amber-50/90 border border-amber-300/80 rounded-3xl shadow-sm overflow-hidden transition-all duration-200", className)}>
      {/* Alert Header Banner */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shrink-0 mt-0.5 shadow-2xs">
            <ShieldAlert size={20} className="font-black" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-extrabold text-amber-950 text-sm sm:text-base">
                Alert Konsistensi Kurikulum & Sesi Mengajar
              </h3>
              <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-md uppercase tracking-wider border border-amber-300">
                🛡️ Khusus Admin
              </span>
            </div>
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Terdeteksi <strong>{report.issues.length} ketidaksesuaian data</strong> ({report.errorCount} Error, {report.warningCount} Peringatan) pada rekam 'Pertemuan Ke-' versus 'Tahap Kurikulum'.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3.5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {expanded ? (
              <>
                <span>Sembunyikan</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Tinjau ({report.issues.length})</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
          
          <button
            onClick={runValidation}
            disabled={loading}
            title="Muat Ulang Validasi"
            className="p-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setDismissed(true)}
            title="Tutup Alert"
            className="p-2 hover:bg-amber-200/60 text-amber-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Issue List Drawer */}
      {expanded && (
        <div className="border-t border-amber-200/80 bg-white/80 p-4 sm:p-5 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-100">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  filterType === 'all' 
                    ? "bg-amber-900 text-white" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Semua ({report.issues.length})
              </button>
              {report.errorCount > 0 && (
                <button
                  onClick={() => setFilterType('error')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                    filterType === 'error' 
                      ? "bg-rose-600 text-white" 
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  )}
                >
                  <AlertOctagon size={12} /> Error ({report.errorCount})
                </button>
              )}
              {report.warningCount > 0 && (
                <button
                  onClick={() => setFilterType('warning')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                    filterType === 'warning' 
                      ? "bg-amber-600 text-white" 
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  )}
                >
                  <AlertTriangle size={12} /> Peringatan ({report.warningCount})
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-semibold">
              Terakhir diperiksa: {new Date(report.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>

          {/* List of Detected Issues */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredIssues.map((issue) => {
              const isError = issue.severity === 'error';

              return (
                <div 
                  key={issue.id}
                  className={cn(
                    "p-4 rounded-2xl border text-xs space-y-2 transition-all",
                    isError 
                      ? "bg-rose-50/70 border-rose-200 text-rose-950" 
                      : "bg-amber-50/70 border-amber-200 text-amber-950"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isError ? (
                        <AlertOctagon size={16} className="text-rose-600 shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      )}
                      <span className="font-extrabold text-sm">{issue.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 bg-white border rounded-md font-bold text-[10px] text-slate-700">
                        {issue.groupName}
                      </span>
                      <span className="px-2 py-0.5 bg-[#0362D0]/10 text-[#0362D0] font-black rounded-md text-[10px]">
                        {issue.gradeName}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-700 font-medium leading-relaxed pl-6">
                    {issue.description}
                  </p>

                  <div className="pl-6 pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-200/60 mt-2">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <span className="text-[#0362D0]">💡 Solusi:</span> {issue.recommendation}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate('/live-session')}
                        className="px-2.5 py-1 bg-[#0362D0] hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Perbaiki di Sesi Mengajar</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
