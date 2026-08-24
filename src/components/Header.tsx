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
  Send
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

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/students': 'Data Siswa',
  '/groups': 'Kelompok',
  '/attendance/students': 'Absensi Siswa',
  '/attendance/mentors': 'Kehadiran Mentor',
  '/progress': 'Progress BTQ',
  '/journals': 'Jurnal Mengajar',
  '/certifications': 'Ujian & Sertifikasi',
  '/curriculum': 'Kurikulum & Timeline',
  '/reports': 'Laporan',
  '/settings': 'Pengaturan',
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
        return <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />;
      case 'alert':
        return <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info size={15} className="text-sky-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="flex-1 bg-white flex items-center justify-between pr-4 lg:pr-8 w-full shrink-0">
      <div>
        <h2 className="text-lg font-bold text-slate-800 hidden sm:block lg:block">{currentPathName}</h2>
        <p className="text-xs text-slate-500 hidden sm:block lg:block">TA 2026/2027 • Semester Ganjil</p>
      </div>
      <div className="flex items-center gap-4 lg:gap-6 ml-auto">
        <div className="relative hidden md:block">
          <input 
            type="text" 
            placeholder="Cari menu atau data..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 placeholder:text-slate-400"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-60" size={16} />
        </div>
        
        {/* Real-time Notification Bell */}
        <div className="relative">
          <button 
            id="notification-bell-btn"
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
            className="relative p-2 bg-slate-100 rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors active:scale-95"
            aria-label="Lihat Notifikasi"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
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
                <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800">Notifikasi Real-time</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[11px] font-bold rounded-full">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => { setIsNotifOpen(false); setIsBroadcastOpen(true); }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        title="Buat Pengumuman / Notifikasi Baru"
                      >
                        <PlusCircle size={13} /> Buat
                      </button>
                    )}
                    <button 
                      onClick={() => setIsNotifOpen(false)} 
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/60 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-3 pt-2">
                  <button
                    onClick={() => setNotifTab('all')}
                    className={cn(
                      "pb-2 px-3 text-xs font-semibold border-b-2 transition-colors",
                      notifTab === 'all' 
                        ? "border-emerald-600 text-emerald-700" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Semua ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifTab('unread')}
                    className={cn(
                      "pb-2 px-3 text-xs font-semibold border-b-2 transition-colors",
                      notifTab === 'unread' 
                        ? "border-emerald-600 text-emerald-700" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
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
                            !isRead ? "bg-emerald-50/40" : "bg-white"
                          )}
                        >
                          <div className="shrink-0 pt-0.5">
                            {getTypeIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className={cn(
                                "text-xs leading-snug line-clamp-1",
                                !isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"
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
                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-medium rounded">
                                    {notif.createdBy}
                                  </span>
                                )}
                                {notif.link && (
                                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 group-hover:underline">
                                    Buka tautan <ExternalLink size={10} />
                                  </span>
                                )}
                              </div>

                              {userRole === 'admin' && (
                                <button
                                  onClick={(e) => handleDeleteNotif(e, notif.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-all rounded"
                                  title="Hapus Notifikasi"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
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
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck size={14} /> Tandai semua dibaca
                    </button>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => { setIsNotifOpen(false); setIsBroadcastOpen(true); }}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
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

        {/* User Profile Dropdown */}
        <div className="h-8 w-px bg-slate-200"></div>

        <div className="relative">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500 flex items-center justify-center text-white text-xs font-medium shadow-sm group-hover:bg-emerald-600 transition-colors">
              <User size={16} />
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-slate-800 leading-tight capitalize">{username}</p>
              <p className="text-[10px] text-slate-500">{roleDisplay}</p>
            </div>
          </div>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-slate-100 bg-slate-50 md:hidden">
                  <p className="text-xs font-bold text-slate-800 capitalize">{username}</p>
                  <p className="text-[10px] text-slate-500">{roleDisplay}</p>
                </div>
                <div className="p-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Broadcast Announcement Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Kirim Notifikasi Real-time</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kirim pengumuman instan ke seluruh mentor atau admin</p>
              </div>
              <button 
                onClick={() => setIsBroadcastOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Notifikasi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Pengingat Absensi Sesi 4"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Isi Pesan</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Tuliskan detail pengumuman atau instruksi di sini..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori / Tipe</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="info">Informasi (Biru)</option>
                    <option value="warning">Peringatan (Kuning)</option>
                    <option value="success">Sukses / Capaian (Hijau)</option>
                    <option value="alert">Penting / Darurat (Merah)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Penerima</label>
                  <select 
                    value={newTargetRole}
                    onChange={(e) => setNewTargetRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="all">Semua (Mentor & Admin)</option>
                    <option value="mentor">Khusus Mentor BTQ</option>
                    <option value="admin">Khusus Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tautan Navigasi (Opsional)</label>
                <select 
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="/attendance/students">Halaman Absensi Siswa</option>
                  <option value="/attendance/mentors">Halaman Kehadiran Mentor</option>
                  <option value="/progress">Halaman Penilaian Progress BTQ</option>
                  <option value="/curriculum">Halaman Kurikulum & Target</option>
                  <option value="/reports">Halaman Laporan Rekapitulasi</option>
                  <option value="/">Dashboard Utama</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
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

