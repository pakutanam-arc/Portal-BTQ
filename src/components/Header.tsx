import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  User, 
  X, 
  LogOut, 
  CheckCheck, 
  PlusCircle, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink,
  Send,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import { 
  AppNotification, 
  subscribeNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  createNotification, 
  deleteNotification 
} from '../services/db';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { NetworkStatusIndicator } from './network/NetworkStatusIndicator';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/session': 'Sesi Mengajar',
  '/students': 'Data Siswa',
  '/groups': 'Kelompok BTQ',
  '/attendance/students': 'Presensi Siswa',
  '/attendance/mentors': 'Kehadiran Mentor',
  '/progress': 'Progress BTQ',
  '/journals': 'Jurnal Mengajar',
  '/certifications': 'Ujian & Sertifikasi',
  '/curriculum': 'Kurikulum & Timeline',
  '/reports': 'Laporan',
  '/settings': 'Pengaturan',
  '/audit-logs': 'Log Audit Sistem',
};

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Baru saja';
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return 'Kemarin';
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return 'Baru saja';
  }
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPathName = routeNames[location.pathname] || 'Dashboard';
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Broadcast form state
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<'info' | 'warning' | 'success' | 'alert'>('info');
  const [newTargetRole, setNewTargetRole] = useState<'all' | 'mentor' | 'admin'>('all');
  const [newLink, setNewLink] = useState('/attendance/students');

  const { userData, userRole, currentUser } = useAuth();
  const userIdentifier = currentUser?.uid || userData?.id || currentUser?.email || 'guest_user';
  const username = userData?.name || currentUser?.email?.split('@')[0] || 'User';
  const roleDisplay = userRole === 'admin' ? 'Administrator' : 'Mentor BTQ';

  // Dynamic Academic Year Config
  const [academicConfig, setAcademicConfig] = useState<{ academicYear: string; semester: string }>({
    academicYear: '2026/2027',
    semester: 'Ganjil',
  });

  useEffect(() => {
    const readConfig = () => {
      try {
        const raw = localStorage.getItem('sibtq_academic_config');
        if (raw) {
          const parsed = JSON.parse(raw);
          setAcademicConfig({
            academicYear: parsed.academicYear || '2026/2027',
            semester: parsed.semester || 'Ganjil',
          });
        }
      } catch {}
    };
    readConfig();
    window.addEventListener('sibtq_academic_updated', readConfig);
    return () => window.removeEventListener('sibtq_academic_updated', readConfig);
  }, []);

  // Real-time subscription to notifications
  useEffect(() => {
    const unsub = subscribeNotifications(
      userIdentifier,
      userRole || 'mentor',
      (updatedList) => {
        setNotifications(updatedList);
      }
    );

    return () => {
      unsub();
    };
  }, [userIdentifier, userRole]);

  // Unread filter
  const unreadNotifs = notifications.filter(n => !n.readBy || !n.readBy.includes(userIdentifier));
  const unreadCount = unreadNotifs.length;
  const displayedNotifs = notifTab === 'unread' ? unreadNotifs : notifications;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    await markNotificationAsRead(notif.id, userIdentifier);
    setIsNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    const ids = notifications.map(n => n.id);
    await markAllNotificationsAsRead(ids, userIdentifier);
  };

  const handleDeleteNotif = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    await deleteNotification(notifId);
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    setIsSending(true);
    try {
      await createNotification({
        title: newTitle.trim(),
        message: newMessage.trim(),
        type: newType,
        targetRole: newTargetRole,
        link: newLink.trim() || undefined,
        readBy: [],
        createdAt: new Date().toISOString(),
        createdBy: userData?.name || 'Admin BTQ'
      });

      setNewTitle('');
      setNewMessage('');
      setIsBroadcastOpen(false);
    } catch (err) {
      console.error("Failed to broadcast notification", err);
    } finally {
      setIsSending(false);
    }
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="icon-sm text-[#C99A2E] mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="icon-sm text-emerald-600 mt-0.5" />;
      case 'alert':
        return <AlertCircle className="icon-sm text-[#950415] mt-0.5" />;
      case 'info':
      default:
        return <Info className="icon-sm text-[#0362D0] mt-0.5" />;
    }
  };

  return (
    <header className="flex-1 bg-white flex items-center justify-between px-4 lg:px-8 w-full shrink-0 h-full relative">
      {/* Left Section: Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="text-[#0362D0] font-bold hidden sm:inline">Portal BTQ</span>
        <ChevronRight className="icon-sm text-slate-400 hidden sm:inline" />
        <h2 className="text-sm sm:text-base font-extrabold text-[#172033] tracking-tight">{currentPathName}</h2>
      </div>

      {/* Middle Section: Search Bar */}
      <div className="flex-1 max-w-xs mx-4 hidden md:block">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Cari siswa, kelompok, atau menu..." 
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-xs text-[#172033] focus:bg-white focus:border-[#0362D0] focus:ring-2 focus:ring-[#0362D0]/20 outline-none transition-all placeholder:text-slate-400"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 icon-md" />
        </div>
      </div>

      {/* Right Section: Notification, Academic Year, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 ml-auto">
        {/* Network Connectivity Status Indicator (Online/Offline) */}
        <NetworkStatusIndicator />

        {/* PWA Install Button */}
        <PWAInstallButton compact={true} />

        {/* Academic Year Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[11px] font-bold text-[#172033]">
          <span className="w-2 h-2 rounded-full bg-[#C99A2E]" />
          <span>Tahun Pelajaran {academicConfig.academicYear} • {academicConfig.semester}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            id="notification-bell-btn"
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
            className="relative p-2 bg-slate-50 border border-slate-100 rounded-full text-[#172033] hover:text-[#0362D0] hover:border-[#0362D0]/40 hover:bg-white transition-all active:scale-95"
            aria-label="Lihat Notifikasi"
          >
            <Bell className="icon-nav" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#950415] text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification Dropdown Panel */}
          {isNotifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                
                {/* Header */}
                <div className="p-3.5 border-b border-slate-100 bg-[#172033] text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-white">Notifikasi Portal</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-[#950415] text-white text-[10px] font-extrabold rounded-full">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => { setIsNotifOpen(false); setIsBroadcastOpen(true); }}
                        className="btn btn-primary btn-sm !px-2.5 !py-1 text-[11px]"
                        title="Buat Pengumuman Baru"
                      >
                        <PlusCircle size={13} /> Buat
                      </button>
                    )}
                    <button 
                      onClick={() => setIsNotifOpen(false)} 
                      className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50 px-3 pt-2">
                  <button
                    onClick={() => setNotifTab('all')}
                    className={cn(
                      "pb-2 px-3 text-xs font-bold border-b-2 transition-colors",
                      notifTab === 'all' 
                        ? "border-[#0362D0] text-[#0362D0]" 
                        : "border-transparent text-slate-500 hover:text-[#172033]"
                    )}
                  >
                    Semua ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifTab('unread')}
                    className={cn(
                      "pb-2 px-3 text-xs font-bold border-b-2 transition-colors",
                      notifTab === 'unread' 
                        ? "border-[#0362D0] text-[#0362D0]" 
                        : "border-transparent text-slate-500 hover:text-[#172033]"
                    )}
                  >
                    Belum Dibaca ({unreadCount})
                  </button>
                </div>

                {/* Notification List */}
                <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                  {displayedNotifs.length > 0 ? (
                    displayedNotifs.map(notif => {
                      const isRead = notif.readBy && notif.readBy.includes(userIdentifier);
                      return (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            "p-3.5 hover:bg-slate-50 cursor-pointer transition-colors group relative flex gap-3 items-start",
                            !isRead ? "bg-blue-50/40" : "bg-white"
                          )}
                        >
                          <div className="shrink-0 pt-0.5">
                            {getTypeIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className={cn(
                                "text-xs leading-snug line-clamp-1",
                                !isRead ? "font-bold text-[#172033]" : "font-semibold text-slate-700"
                              )}>
                                {notif.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                {formatRelativeTime(notif.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                              {notif.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2 pt-1">
                              <div className="flex items-center gap-1.5">
                                {notif.createdBy && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-600 font-bold rounded border border-slate-100">
                                    {notif.createdBy}
                                  </span>
                                )}
                                {notif.link && (
                                  <span className="text-[10px] text-[#0362D0] font-bold flex items-center gap-0.5 group-hover:underline">
                                    Buka tautan <ExternalLink size={10} />
                                  </span>
                                )}
                              </div>

                              {userRole === 'admin' && (
                                <button
                                  onClick={(e) => handleDeleteNotif(e, notif.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#950415] p-1 transition-all rounded"
                                  title="Hapus Notifikasi"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#0362D0] shrink-0 mt-1.5" />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada notifikasi {notifTab === 'unread' ? 'baru yang belum dibaca' : ''}.
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="p-2.5 px-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs font-bold text-[#0362D0] hover:underline flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck size={14} /> Tandai semua dibaca
                    </button>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => { setIsNotifOpen(false); setIsBroadcastOpen(true); }}
                        className="text-xs text-slate-700 hover:text-[#0362D0] font-bold flex items-center gap-1"
                      >
                        <PlusCircle size={13} /> Buat Baru
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="h-6 w-px bg-[#f1f5f9]" />

        <div className="relative">
          <div 
            className="flex items-center gap-2.5 cursor-pointer group p-1 rounded-xl hover:bg-slate-50 transition-colors"
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
          >
            <div className="w-8 h-8 rounded-xl bg-[#0362D0] text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-[#0362D0]/20 group-hover:bg-[#0252b3] transition-colors">
              <User className="icon-md" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-extrabold text-[#172033] leading-tight capitalize">{username}</p>
              <p className="text-[10px] text-[#950415] font-bold">{roleDisplay}</p>
            </div>
          </div>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-extrabold text-[#172033] capitalize">{username}</p>
                  <p className="text-[10px] text-[#950415] font-bold">{roleDisplay}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{currentUser?.email || ''}</p>
                </div>
                <div className="p-1.5">
                  <button 
                    onClick={handleLogout}
                    className="btn btn-ghost !text-[#950415] hover:!bg-red-50 w-full justify-start action-icon-layout"
                  >
                    <LogOut className="icon-sm" />
                    Keluar Sistem
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Broadcast Announcement Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#172033]">Kirim Notifikasi Real-time</h3>
                <p className="text-xs text-slate-500 mt-0.5">Portal BTQ SMP Negeri 102 Jakarta</p>
              </div>
              <button 
                onClick={() => setIsBroadcastOpen(false)} 
                className="text-slate-400 hover:text-[#172033] p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="icon-nav" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#172033] mb-1">Judul Notifikasi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Pengingat Absensi Sesi Sabtu"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0]/20 focus:border-[#0362D0] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172033] mb-1">Isi Pesan</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Tuliskan instruksi atau pengumuman..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0]/20 focus:border-[#0362D0] focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172033] mb-1">Kategori / Tipe</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] outline-none font-medium"
                  >
                    <option value="info">Informasi (Biru)</option>
                    <option value="warning">Peringatan (Emas)</option>
                    <option value="success">Sukses (Hijau)</option>
                    <option value="alert">Penting / Darurat (Maroon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172033] mb-1">Target Penerima</label>
                  <select 
                    value={newTargetRole}
                    onChange={(e) => setNewTargetRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] outline-none font-medium"
                  >
                    <option value="all">Semua (Mentor & Admin)</option>
                    <option value="mentor">Khusus Mentor BTQ</option>
                    <option value="admin">Khusus Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172033] mb-1">Tautan Navigasi (Opsional)</label>
                <select 
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-[#0362D0] outline-none font-medium"
                >
                  <option value="/attendance/students">Halaman Absensi Siswa</option>
                  <option value="/attendance/mentors">Halaman Kehadiran Mentor</option>
                  <option value="/progress">Halaman Penilaian Progress BTQ</option>
                  <option value="/curriculum">Halaman Kurikulum & Target</option>
                  <option value="/reports">Halaman Laporan Rekapitulasi</option>
                  <option value="/">Dashboard Utama</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={13} /> {isSending ? 'Mengirim...' : 'Kirim Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}


