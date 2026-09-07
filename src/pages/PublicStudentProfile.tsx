import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getStudents, 
  getGroups, 
  getMentors, 
  getAllStudentAttendance, 
  getStudentProgressHistory,
  Student, 
  Group, 
  Mentor,
  StudentAttendance,
  StudentProgress
} from '../services/db';
import { StudentIdCard } from '../components/cards/StudentIdCard';
import { Loader2, ArrowLeft, Activity, Calendar, BookOpen, AlertCircle, ArrowUpRight, TrendingUp, MessageCircle, Printer, X, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { theme } from '../theme';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { getPublicStudentUrl } from '../utils/studentUtils';

export function PublicStudentProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isShowBarcodeOpen, setIsShowBarcodeOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!studentId) return;
      try {
        const students = await getStudents();
        const foundStudent = students.find(s => s.id === studentId);
        
        if (!foundStudent) {
          setError('Data santri tidak ditemukan.');
          setLoading(false);
          return;
        }

        const groups = await getGroups();
        const foundGroup = groups.find(g => g.id === foundStudent.groupId);
        
        let foundMentor = null;
        if (foundGroup) {
          const mentors = await getMentors();
          foundMentor = mentors.find(m => m.id === foundGroup.mentorId);
        }

        const allAtt = await getAllStudentAttendance();
        const attHistory = allAtt.filter(a => a.studentId === studentId);
        const progHistory = await getStudentProgressHistory(studentId);

        setStudent(foundStudent);
        setGroup(foundGroup || null);
        setMentor(foundMentor || null);
        setAttendance(attHistory);
        setProgress(progHistory);
      } catch (err) {
        console.error(err);
        setError('Terjadi kesalahan saat memuat data rapor.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  const handleTriggerPrint = () => {
    const printContainer = document.getElementById('a4-print-layout');
    
    try {
      let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc && printContainer) {
        doc.open();
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(style => style.outerHTML)
          .join('\n');

        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <base href="${window.location.origin}/" />
              <title>Cetak Kartu Santri - ${student?.name}</title>
              ${styles}
              <style>
                @page { size: A4 portrait; margin: 8mm; }
                body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                #a4-print-layout { display: block !important; position: static !important; }
              </style>
            </head>
            <body>
              <div id="a4-print-layout">
                ${printContainer.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        const triggerPrint = () => {
          const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
          const images = Array.from(iframeDoc?.querySelectorAll('img') || []);
          
          const imagePromises = images.map(img => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(resolve, 600);
            });
          });

          Promise.all(imagePromises).then(() => {
            setTimeout(() => {
              try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
              } catch (e) {
                console.warn("Iframe print fallback to window.print():", e);
                window.print();
              }
            }, 250);
          });
        };

        if (iframe.contentWindow) {
          triggerPrint();
        } else {
          iframe.onload = triggerPrint;
        }
        return;
      }
    } catch (err) {
      console.warn("Print iframe creation error:", err);
    }

    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <Loader2 size={32} className="animate-spin text-[#0362D0] mb-4" />
        <p className="text-[#172033] font-semibold">Memuat Profil Santri...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-xl font-bold text-[#172033] mb-2">Santri Tidak Ditemukan</h1>
        <p className="text-slate-500 mb-6">{error || 'ID Santri tidak valid atau telah dihapus.'}</p>
        <Link to="/" className="px-6 py-2.5 bg-[#0362D0] text-white font-bold rounded-xl shadow-md hover:bg-[#024a9e] transition-all">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // Calculate Metrics
  const totalMeetings = attendance.length;
  const presentMeetings = attendance.filter(a => a.status === 'Hadir').length;
  const attendancePercentage = totalMeetings > 0 ? Math.round((presentMeetings / totalMeetings) * 100) : 0;
  
  const latestProgress = progress.length > 0 ? progress[progress.length - 1] : null;
  const averageScore = latestProgress ? latestProgress.total : 0;
  
  const isTahfizh = group?.gradeId === 'grade3';

  // Prepare Chart Data
  const chartData = progress.map((p, index) => ({
    name: `Pekan ${p.meetingNumber || index + 1}`,
    nilai: p.total,
    kkm: 75
  })).slice(-8); // Show last 8 meetings for better mobile display

  // Find latest mentor notes
  const recordWithNotes = [...attendance].reverse().find(a => a.notes && a.notes.trim() !== '');
  const mentorNotes = recordWithNotes?.notes || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-12">
      {/* Public Header */}
      <div className="bg-[#172033] text-white pt-8 pb-32 px-6 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <svg width="400" height="400" viewBox="0 0 100 100">
            <circle cx="80" cy="20" r="40" fill="currentColor" />
            <circle cx="90" cy="80" r="30" fill="currentColor" />
          </svg>
        </div>
        
        <div className="max-w-md mx-auto relative z-10 flex flex-col items-center text-center">
          <h1 className="text-lg font-black tracking-tight text-white mb-1">
            Rapor Digital BTQ
          </h1>
          <p className="text-sm font-medium text-slate-300">
            SMP Negeri 102 Jakarta
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-24 relative z-20 flex flex-col gap-6 print:hidden">
        
        {/* ID Card Display */}
        <div className="flex flex-col items-center gap-4">
          <StudentIdCard student={student} group={group || undefined} mentor={mentor || undefined} />
          
          <button 
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm text-[#172033] rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            <Printer size={16} className="text-[#0362D0]" />
            Pratinjau Cetak Kartu
          </button>
        </div>

        {/* Action Button (if they want to login) */}
        <div className="flex justify-center">
          <Link to="/login" className="text-xs font-bold text-[#0362D0] hover:underline flex items-center gap-1">
            Masuk sebagai Admin / Mentor <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E6E8EC] shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <Calendar size={16} className="text-[#0362D0]" />
              <span className="text-xs font-bold uppercase tracking-wider">Kehadiran</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-[#172033] leading-none">{attendancePercentage}%</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-1">
              {presentMeetings} dari {totalMeetings} pertemuan
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E6E8EC] shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <Activity size={16} className="text-[#C99A2E]" />
              <span className="text-xs font-bold uppercase tracking-wider">Rata-rata</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-[#172033] leading-none">{averageScore}</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-1">
              Nilai Mutu Terakhir
            </p>
          </div>
        </div>

        {/* Detail Progress */}
        <div className="bg-white rounded-2xl border border-[#E6E8EC] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E6E8EC] flex items-center gap-2">
            <TrendingUp size={18} className="text-[#172033]" />
            <h2 className="text-sm font-black text-[#172033]">Capaian Terakhir</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {latestProgress ? (
              <>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Tajwid</span>
                  <span className="text-sm font-black text-[#172033]">{latestProgress.tajwid}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Menulis (Khat)</span>
                  <span className="text-sm font-black text-[#172033]">{latestProgress.writing}</span>
                </div>
                {isTahfizh && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Membaca (Kelancaran)</span>
                      <span className="text-sm font-black text-[#172033]">{latestProgress.reading}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Hafalan Surah</span>
                      <span className="text-xs font-bold text-[#0362D0] max-w-[150px] text-right">{latestProgress.memorizedSurah || '-'}</span>
                    </div>
                  </>
                )}
                {!isTahfizh && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Target Semester</span>
                    <span className="text-xs font-bold text-[#0362D0]">Lulus Jilid</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                Belum ada data nilai tercatat.
              </div>
            )}
          </div>
        </div>

        {/* Learning Trend Graph */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E6E8EC] shadow-sm overflow-hidden p-5">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={18} className="text-[#0362D0]" />
              <h2 className="text-sm font-black text-[#172033]">Grafik Tren Belajar</h2>
            </div>
            <div className="h-48 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E8EC" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#172033', marginBottom: '4px' }}
                  />
                  <ReferenceLine y={75} stroke="#C99A2E" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'KKM (75)', fill: '#C99A2E', fontSize: 10, fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="nilai" stroke="#0362D0" strokeWidth={3} dot={{ r: 4, fill: '#0362D0', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} name="Nilai Mutu" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Mentor Notes */}
        {mentorNotes && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
              <MessageCircle size={64} />
            </div>
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <MessageCircle size={18} className="text-emerald-600" />
              <h2 className="text-sm font-black text-emerald-900">Catatan Pembina</h2>
            </div>
            <p className="text-sm text-emerald-800 font-medium leading-relaxed relative z-10">
              "{mentorNotes}"
            </p>
            {mentor && (
              <p className="text-xs font-bold text-emerald-600 mt-3 relative z-10">
                — {mentor.name}
              </p>
            )}
          </div>
        )}

      </div>

      {/* Print Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#E6E8EC] flex justify-between items-center bg-[#F5F6F8]">
              <h2 className="font-black text-lg text-[#172033] flex items-center gap-2">
                <Printer size={20} className="text-[#0362D0]" /> Pratinjau Cetak Kartu ({student.name})
              </h2>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-500 hover:bg-slate-200 p-2 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-100 flex-1 flex flex-col items-center gap-6">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-xl max-w-[210mm] w-full flex gap-3 shadow-sm">
                <AlertCircle size={24} className="shrink-0 text-amber-600" />
                <p>
                  Pastikan tampilan kartu sudah sesuai. Jika tombol cetak di bawah ini tidak berfungsi dengan baik, silakan buka aplikasi di tab baru, lalu ulangi proses ini.
                </p>
              </div>
              
              <div className="flex justify-center bg-white p-6 shadow-md border border-slate-200 rounded-xl">
                <StudentIdCard student={student} group={group || undefined} mentor={mentor || undefined} />
              </div>
            </div>
            <div className="p-5 border-t border-[#E6E8EC] bg-white flex flex-wrap justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => setIsShowBarcodeOpen(true)}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2"
              >
                <QrCode size={18} /> Tampilkan Barcode
              </button>
              <button
                onClick={handleTriggerPrint}
                className="px-6 py-2.5 rounded-xl font-bold bg-[#0362D0] hover:bg-[#024a9e] text-white shadow-md flex items-center gap-2 transition-colors"
              >
                <Printer size={18} /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Barcode Modal */}
      {isShowBarcodeOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#E6E8EC] flex justify-between items-center bg-[#F5F6F8]">
              <h2 className="font-black text-lg text-[#172033] flex items-center gap-2">
                <QrCode size={20} className="text-[#0362D0]" /> Barcode Siswa
              </h2>
              <button onClick={() => setIsShowBarcodeOpen(false)} className="text-slate-500 hover:bg-slate-200 p-2 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 bg-slate-100 flex flex-col items-center justify-center">
              <div className="bg-white p-6 rounded-3xl shadow-md flex flex-col items-center gap-4 border border-slate-200 w-full">
                <div className="text-center">
                  <p className="font-bold text-base text-[#172033] leading-tight">{student.name}</p>
                  <p className="text-sm font-semibold text-slate-500 mt-1">NISN: {student.nis || '-'}</p>
                </div>
                <div className="bg-white p-3 border-2 border-slate-100 rounded-2xl w-full flex justify-center">
                  <QRCodeSVG 
                    value={getPublicStudentUrl(student.id)} 
                    size={200} 
                    level="H" 
                    includeMargin={true} 
                    className="w-full h-auto max-w-[200px] object-contain"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-[#E6E8EC] bg-white flex justify-end gap-3">
              <button
                onClick={() => setIsShowBarcodeOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors w-full"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Layout (Only visible during print / PDF export) */}
      <div id="a4-print-layout" className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] m-0 p-0">
        <div className="print-a4-container print-page" style={{ minHeight: '275mm', boxSizing: 'border-box' }}>
          <div className="print-a4-grid">
            <div className="print-card-wrapper border border-dashed border-slate-300 relative">
              {/* Precise Corner Crop Marks */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-black" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-black" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-black" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-black" />
              
              <StudentIdCard student={student} group={group || undefined} mentor={mentor || undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

