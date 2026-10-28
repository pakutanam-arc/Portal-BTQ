import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Clock, 
  User, 
  Cpu, 
  Lock, 
  Eye, 
  ChevronRight, 
  X, 
  Terminal, 
  Server, 
  Check, 
  Database,
  ArrowUpDown,
  History,
  FileCode
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAuditLogs, addAuditLog, AuditLogEntry } from '../services/db';
import { validateCurriculumConsistency } from '../utils/curriculumValidator';
import { forceSyncGroupProgress } from '../services/dataHealthCheck';
import { cn } from '../utils/cn';
import { ModalPortal } from '../components/ui/ModalPortal';

export function AuditLogs() {
  const { currentUser, userRole } = useAuth();
  const isAdmin = userRole === 'admin' || currentUser?.email === 'admin@smpn102.sch.id';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');

  // Modal / Inspection state
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Trigger automated system synchronization audit check
  const runSystemAuditCheck = async () => {
    setRefreshing(true);
    try {
      const report = await validateCurriculumConsistency(undefined, true);
      
      const newAuditLog = await addAuditLog({
        actor: 'Curriculum Sync Engine',
        actorRole: 'system',
        action: 'DIAGNOSTIC_AUDIT_RUN',
        category: 'sync',
        severity: report.hasIssues ? (report.errorCount > 0 ? 'error' : 'warning') : 'success',
        details: report.hasIssues 
          ? `Pemeriksaan otomatis mendeteksi ${report.errorCount} error dan ${report.warningCount} peringatan pada sinkronisasi kurikulum.`
          : `Pemeriksaan otomatis selesai. Seluruh 10 Kelompok terverifikasi 100% konsisten.`,
        metadata: {
          totalGroupsChecked: report.totalGroupsChecked,
          totalJournalsChecked: report.totalJournalsChecked,
          errorCount: report.errorCount,
          warningCount: report.warningCount,
          timestamp: report.timestamp
        },
        ipAddress: '127.0.0.1 (Cloud Run Internal)'
      });

      setLogs(prev => [newAuditLog, ...prev]);
      showToast('Pemeriksaan diagnostik & sinkronisasi berhasil dicatat.');
    } catch (err) {
      console.error('Audit run error:', err);
      showToast('Gagal menjalankan diagnostik sistem.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleForceSync = async (groupId: string) => {
    if (!groupId) return;
    setSyncing(true);
    try {
      await forceSyncGroupProgress(groupId);
      showToast('Sinkronisasi data (Force Sync) berhasil dilakukan!');
      setSelectedLog(null);
      fetchLogs();
    } catch (err) {
      console.error(err);
      showToast('Gagal melakukan sinkronisasi data.');
    } finally {
      setSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered Logs Calculation
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(q));

      // Category filter
      const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;

      // Severity filter
      const matchSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;

      // Time range filter
      let matchTime = true;
      if (timeRange !== 'all') {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        if (timeRange === '24h') {
          matchTime = now - logDate <= 24 * 60 * 60 * 1000;
        } else if (timeRange === '7d') {
          matchTime = now - logDate <= 7 * 24 * 60 * 60 * 1000;
        } else if (timeRange === '30d') {
          matchTime = now - logDate <= 30 * 24 * 60 * 60 * 1000;
        }
      }

      return matchQuery && matchCategory && matchSeverity && matchTime;
    });
  }, [logs, searchQuery, selectedCategory, selectedSeverity, timeRange]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter(l => l.severity === 'error' || l.severity === 'warning').length;
    const syncLogs = logs.filter(l => l.category === 'sync' || l.category === 'correction').length;
    const securityLogs = logs.filter(l => l.category === 'security' || l.actorRole === 'admin').length;
    return { total, errors, syncLogs, securityLogs };
  }, [logs]);

  // Export CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('Tidak ada data log untuk diekspor.');
      return;
    }

    const headers = ['ID', 'Waktu', 'Aktor', 'Peran', 'Kategori', 'Tindakan', 'Tingkat', 'Detail', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString('id-ID'),
      `"${l.actor.replace(/"/g, '""')}"`,
      l.actorRole,
      l.category,
      l.action,
      l.severity,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress || '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_BTQ_SMPN102_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berhasil mengunduh Laporan Audit Log (CSV).');
  };

  // Export JSON
  const exportToJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Audit_Log_BTQ_SMPN102_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Berhasil mengunduh Laporan Audit Log (JSON).');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format Helper
  const getSeverityBadge = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={12} className="text-rose-600" /> Error
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertTriangle size={12} className="text-amber-700" /> Peringatan
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" /> Berhasil
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Info size={12} className="text-sky-600" /> Informasi
          </span>
        );
    }
  };

  const getCategoryBadge = (category: AuditLogEntry['category']) => {
    switch (category) {
      case 'sync':
        return <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">Sinkronisasi</span>;
      case 'correction':
        return <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">Koreksi Otomatis</span>;
      case 'security':
        return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">Keamanan & Akses</span>;
      case 'journal':
        return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">Jurnal Mengajar</span>;
      case 'attendance':
        return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">Presensi</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">Sistem</span>;
    }
  };

  const getActorIcon = (role: AuditLogEntry['actorRole']) => {
    if (role === 'system') return <Cpu size={14} className="text-indigo-600 shrink-0" />;
    if (role === 'admin') return <ShieldCheck size={14} className="text-[#950415] shrink-0" />;
    return <User size={14} className="text-[#0362D0] shrink-0" />;
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 my-12 bg-white rounded-3xl border border-rose-200 shadow-sm">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-900">Akses Dibatasi</h2>
        <p className="text-sm text-slate-600">
          Halaman Log Audit Sistem terproteksi secara ketat dan hanya dapat diakses oleh Administrator Portal BTQ SMPN 102 Jakarta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#172033] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#C99A2E]/50 animate-bounce">
          <CheckCircle2 size={18} className="text-[#C99A2E]" />
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#950415] via-[#C99A2E] to-[#0362D0]" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#950415]/10 text-[#950415] border border-[#950415]/20">
                <ShieldCheck size={14} /> Terproteksi & Lihat-Saja (Read-Only)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <Lock size={12} /> Audit Trail
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
              Log Audit & Rekam Aktivitas Sistem
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Memantau riwayat aktivitas penting, pemeriksaan sinkronisasi kurikulum otomatis, koreksi data terstruktur, serta rekam akses administrator untuk kebutuhan *troubleshooting* dan transparansi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={runSystemAuditCheck}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0362D0] hover:bg-[#024ca3] text-white rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={cn(refreshing && "animate-spin")} />
              <span>{refreshing ? 'Memeriksa...' : 'Diagnostik System Sync'}</span>
            </button>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>CSV</span>
            </button>

            <button
              onClick={exportToJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              <FileCode size={15} />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Total Log Audit</span>
            <Database size={18} className="text-[#0362D0]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#172033]">{stats.total}</p>
          <p className="text-[11px] text-slate-600 font-medium">Rekam aktivitas tersimpan</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Peringatan / Warning</span>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700">{stats.errors}</p>
          <p className="text-[11px] text-slate-600 font-medium">Isu terdeteksi sistem</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Event Sync & Koreksi</span>
            <RefreshCw size={18} className="text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-900">{stats.syncLogs}</p>
          <p className="text-[11px] text-slate-600 font-medium">Otomatisasi & Kurikulum</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Aktivitas Keamanan</span>
            <ShieldCheck size={18} className="text-[#950415]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#950415]">{stats.securityLogs}</p>
          <p className="text-[11px] text-slate-600 font-medium">Akses Admin & Otentikasi</p>
        </div>
      </div>

      {/* Search & Multi-Filters Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aktor, kata kunci tindakan, detail masalah, atau IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0362D0]/30 focus:border-[#0362D0] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Filter size={16} className="text-slate-400 shrink-0 hidden sm:inline" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0362D0]"
            >
              <option value="all">Semua Kategori</option>
              <option value="sync">Sinkronisasi Kurikulum</option>
              <option value="correction">Koreksi Otomatis</option>
              <option value="security">Keamanan & Akses</option>
              <option value="journal">Jurnal Mengajar</option>
              <option value="attendance">Presensi</option>
              <option value="system">Sistem Umum</option>
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0362D0]"
            >
              <option value="all">Tingkat: Semua</option>
              <option value="error">Error</option>
              <option value="warning">Peringatan</option>
              <option value="info">Informasi</option>
              <option value="success">Berhasil</option>
            </select>

            {/* Time Range Filter */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0362D0]"
            >
              <option value="all">Waktu: Semua</option>
              <option value="24h">24 Jam Terakhir</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
            </select>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(searchQuery || selectedCategory !== 'all' || selectedSeverity !== 'all' || timeRange !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-semibold">Filter Aktif:</span>
            {searchQuery && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                Kata Kunci: "{searchQuery}"
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                Kategori: {selectedCategory}
              </span>
            )}
            {selectedSeverity !== 'all' && (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                Tingkat: {selectedSeverity}
              </span>
            )}
            {timeRange !== 'all' && (
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold">
                Waktu: {timeRange}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedSeverity('all');
                setTimeRange('all');
              }}
              className="text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer ml-auto"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-[#0362D0] border-t-transparent rounded-full mx-auto" />
            <p className="text-xs font-bold text-slate-500">Memuat Rekam Audit Sistem...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <History size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak Ada Log Audit Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cobalah untuk mengubah parameter pencarian atau filter kategori di atas.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const formattedTime = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                return (
                  <div key={log.id} className="p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition-colors">
                    {/* Top: Actor info + Severity */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getActorIcon(log.actorRole)}
                        <div>
                          <div className="font-extrabold text-[#172033] text-xs leading-tight line-clamp-1">{log.actor}</div>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {log.actorRole === 'admin' ? 'Administrator' : log.actorRole === 'system' ? 'Sistem Otomatis' : 'Mentor'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getSeverityBadge(log.severity)}
                      </div>
                    </div>

                    {/* Middle: Category & Action */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryBadge(log.category)}
                      <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                    </div>

                    {/* Detail text */}
                    <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                      {log.details}
                    </p>

                    {/* Bottom: Timestamp & Inspeksi CTA */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                      <div className="flex items-center gap-1 font-mono">
                        <Clock size={11} />
                        <span>{formattedDate}, {formattedTime}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0362D0] hover:text-white text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Inspeksi</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#172033] text-white text-[11px] uppercase tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Waktu Audit</th>
                    <th className="py-3.5 px-4">Aktor & Peran</th>
                    <th className="py-3.5 px-4">Kategori & Tindakan</th>
                    <th className="py-3.5 px-4">Tingkat</th>
                    <th className="py-3.5 px-4">Detail Peristiwa / Log</th>
                    <th className="py-3.5 px-4 text-center">Inspeksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLogs.map((log) => {
                    const dateObj = new Date(log.timestamp);
                    const formattedTime = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800 font-bold">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <span>{formattedTime}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 pl-4">{formattedDate}</div>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getActorIcon(log.actorRole)}
                            <div>
                              <div className="font-bold text-slate-900 truncate max-w-[160px]">{log.actor}</div>
                              <span className="text-[10px] font-semibold text-slate-600 capitalize">
                                {log.actorRole === 'admin' ? 'Administrator' : log.actorRole === 'system' ? 'Sistem Otomatis' : 'Mentor'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category & Action */}
                        <td className="py-3.5 px-4 whitespace-nowrap space-y-1">
                          <div>{getCategoryBadge(log.category)}</div>
                          <div className="font-mono text-[11px] font-bold text-slate-800 tracking-tight">{log.action}</div>
                        </td>

                        {/* Severity */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </td>

                        {/* Details */}
                        <td className="py-3.5 px-4 max-w-md">
                          <p className="line-clamp-2 text-slate-700 font-medium leading-relaxed">
                            {log.details}
                          </p>
                          {log.ipAddress && (
                            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                              IP: {log.ipAddress}
                            </div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0362D0] hover:text-white text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Inspeksi</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{filteredLogs.length}</span> dari total <span className="font-bold text-slate-800">{logs.length}</span> entri log audit.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Sistem Terkunci & Integritas Terjamin</span>
          </div>
        </div>
      </div>

      {/* Log Inspection Drawer / Modal */}
      {selectedLog && (
        <ModalPortal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)}>
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] my-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="p-5 bg-[#172033] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-[#C99A2E]">
                  <Terminal size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">Inspeksi Detail Log Audit</h3>
                  <p className="text-[11px] font-mono text-slate-300">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Badge Summary Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tingkat Resiko</span>
                  <div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Kategori</span>
                  <div className="mt-1">{getCategoryBadge(selectedLog.category)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Waktu Eksekusi</span>
                  <div className="mt-1 font-mono font-bold text-slate-800">
                    {new Date(selectedLog.timestamp).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Actor & Action info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Aktor Pemicu</span>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    {getActorIcon(selectedLog.actorRole)}
                    <span>{selectedLog.actor}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Jenis Tindakan</span>
                  <div className="font-mono font-bold text-slate-900">
                    {selectedLog.action}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Deskripsi Lengkap Event:</span>
                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed">
                  {selectedLog.details}
                </div>
              </div>

              {/* JSON Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Metadata Payload (JSON):</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedLog.metadata || {}, null, 2), 'modal_json')}
                    className="text-[11px] text-[#0362D0] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'modal_json' ? <Check size={12} className="text-emerald-600" /> : null}
                    <span>{copiedId === 'modal_json' ? 'Tersalin' : 'Salin JSON'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-amber-300 rounded-2xl font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-48 leading-normal">
                  {JSON.stringify(selectedLog.metadata || { note: "No additional metadata recorded" }, null, 2)}
                </pre>
              </div>

              {/* Troubleshooting Recommendation if error */}
              {(selectedLog.severity === 'error' || selectedLog.severity === 'warning') && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle size={15} />
                    <span>Panduan Troubleshooting Administrator:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Event ini menandakan adanya ketidaksesuaian atau peringatan sistem. Anda dapat memicu re-sync otomatis melalui tombol <strong>Diagnostik System Sync</strong> atau memeriksa menu <strong>Sesi Mengajar</strong> / <strong>Kurikulum</strong> untuk penyesuaian.
                  </p>
                  
                  {selectedLog.metadata?.requiresSync && selectedLog.metadata?.groupId && (
                    <button
                      onClick={() => handleForceSync(selectedLog.metadata!.groupId)}
                      disabled={syncing}
                      className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                      {syncing ? 'Menyinkronkan...' : 'Force Sync Data Capaian (Progress)'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Sistem Log Audit BTQ SMPN 102 Jakarta
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-[#172033] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
