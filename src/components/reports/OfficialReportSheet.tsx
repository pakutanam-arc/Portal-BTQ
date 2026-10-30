import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../services/db/types';
import { Student, Group, Mentor, StudentAttendance, StudentProgress } from '../../services/db';
import { APP_LOGO } from '../../assets/logo';
import { getPublicStudentUrl } from '../../utils/studentUtils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Printer, Download, Edit3, Check, X, ShieldCheck } from 'lucide-react';
import { getStoredSchoolConfig, subscribeToSchoolConfig, SchoolConfig } from '../../services/schoolConfig';

interface OfficialReportSheetProps {
  student: Student;
  group?: Group | null;
  mentor?: Mentor | null;
  attendance?: StudentAttendance[];
  progress?: StudentProgress[];
  academicYear?: string;
  semester?: string;
  headmasterName?: string;
  headmasterNip?: string;
  kkm?: number;
  printDate?: string;
  onClose?: () => void;
  hideToolbar?: boolean;
  className?: string;
}

export function OfficialReportSheet({
  student,
  group,
  mentor,
  attendance = [],
  progress = [],
  academicYear,
  semester,
  headmasterName,
  headmasterNip,
  kkm,
  printDate,
  onClose,
  hideToolbar = false,
  className = '',
}: OfficialReportSheetProps) {
  // Read dynamic school configuration
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(() => getStoredSchoolConfig());
  const [liveMentor, setLiveMentor] = useState<Mentor | null | undefined>(mentor);

  useEffect(() => {
    setLiveMentor(mentor);
  }, [mentor]);

  // Real-time listener untuk settings/school_config dan mentors/{mentorId}
  useEffect(() => {
    // 1. Subscribe to school config real-time updates in Firestore
    const unsubscribeConfig = subscribeToSchoolConfig((cfg) => {
      setSchoolConfig(cfg);
    });

    // Event listener sebagai fallback jika ada event lokal
    const handleConfigUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SchoolConfig>;
      if (customEvent.detail) {
        setSchoolConfig(customEvent.detail);
      }
    };
    window.addEventListener('school_config_updated', handleConfigUpdate);
    window.addEventListener('storage', handleConfigUpdate);

    // 2. Subscribe to live mentor data in Firestore if mentor ID exists
    let unsubscribeMentor: (() => void) | null = null;
    const targetMentorId = mentor?.id || group?.mentorId;
    if (targetMentorId) {
      try {
        const mentorDocRef = doc(db, 'mentors', targetMentorId);
        unsubscribeMentor = onSnapshot(
          mentorDocRef,
          (snap) => {
            if (snap.exists()) {
              const remoteData = snap.data() as Partial<Mentor>;
              setLiveMentor((prev) => ({
                id: targetMentorId,
                name: remoteData.name || prev?.name || 'Mentor',
                email: remoteData.email || prev?.email || '',
                role: 'mentor',
                signature: remoteData.signature !== undefined ? remoteData.signature : prev?.signature,
                groupId: remoteData.groupId || prev?.groupId,
                ...remoteData,
              }));
            }
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `mentors/${targetMentorId}`);
          }
        );
      } catch (e) {
        console.warn('Gagal memasang listener mentor real-time:', e);
      }
    }

    return () => {
      unsubscribeConfig();
      if (unsubscribeMentor) unsubscribeMentor();
      window.removeEventListener('school_config_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleConfigUpdate);
    };
  }, [mentor?.id, group?.mentorId]);

  const activeYear = academicYear || schoolConfig.academicYear || '2026/2027';
  const activeSemester = semester || schoolConfig.semester || 'Ganjil';
  const activeHeadmasterName = headmasterName || schoolConfig.headmasterName || 'Dra. Hj. Sri Rahayu, M.Pd.';
  const activeHeadmasterNip = headmasterNip || schoolConfig.headmasterNip || '19680512 199412 2 001';
  const activeHeadmasterSignature = schoolConfig.headmasterSignature || '';
  const activeCoordinatorName = schoolConfig.coordinatorName || 'Muhamad Sulkhi, S.Pd.I.';
  const activeCoordinatorNip = schoolConfig.coordinatorNip || '199403112023211010';
  const activeCoordinatorSignature = schoolConfig.coordinatorSignature || '';
  const activeKkm = kkm ?? schoolConfig.kkm ?? 75;
  const activeSchoolName = schoolConfig.schoolName || 'SMP Negeri 102 Jakarta';
  const activeSchoolAddress = schoolConfig.schoolAddress || 'Jl. Raya Cijantung No. 1, Kel. Gedong, Kec. Pasar Rebo, Kota Jakarta Timur 13770';
  const activePrintCity = schoolConfig.printCity || 'Jakarta';

  // Calculate Attendance Stats
  const totalMeetings = attendance.length;
  const hadirCount = attendance.filter((a) => a.status === 'Hadir').length;
  const izinCount = attendance.filter((a) => a.status === 'Izin').length;
  const sakitCount = attendance.filter((a) => a.status === 'Sakit').length;
  const alpaCount = attendance.filter((a) => a.status === 'Alpa').length;
  const attendancePercentage = totalMeetings > 0 ? Math.round((hadirCount / totalMeetings) * 100) : 0;

  // Calculate Progress & Score Stats (Murni data riil tersimpan di Firestore tanpa fabrikasi)
  const hasRealProgress = progress.length > 0 && progress.some((p) => 
    (typeof p.tajwid === 'number' && !isNaN(p.tajwid)) || 
    (typeof p.reading === 'number' && !isNaN(p.reading)) || 
    (typeof p.writing === 'number' && !isNaN(p.writing)) || 
    (typeof p.total === 'number' && !isNaN(p.total))
  );
  const latestProgress = hasRealProgress ? progress[progress.length - 1] : null;

  // Nilai murni dari Firestore tanpa angka asumsi/baseline bawaan
  const tajwidScore: number | null = (latestProgress && typeof latestProgress.tajwid === 'number' && !isNaN(latestProgress.tajwid)) 
    ? Number(latestProgress.tajwid) 
    : null;
  const writingScore: number | null = (latestProgress && typeof latestProgress.writing === 'number' && !isNaN(latestProgress.writing)) 
    ? Number(latestProgress.writing) 
    : null;
  const readingScore: number | null = (latestProgress && typeof latestProgress.reading === 'number' && !isNaN(latestProgress.reading)) 
    ? Number(latestProgress.reading) 
    : null;
  
  // Calculate average total score (null jika belum diinput mentor)
  const avgScore: number | null = (latestProgress && typeof latestProgress.total === 'number' && !isNaN(latestProgress.total))
    ? Number(latestProgress.total)
    : (tajwidScore !== null && writingScore !== null && readingScore !== null)
      ? Math.round((tajwidScore + writingScore + readingScore) / 3)
      : null;

  // Determine Predicate dynamically scaled to active KKM
  const getPredicate = (score: number | null) => {
    if (score === null || score === undefined) {
      return { grade: '-', label: 'Belum Diinput Mentor' };
    }
    const mumtazThreshold = Math.max(88, activeKkm + 10);
    const jayyidThreshold = activeKkm;
    const maqbulThreshold = Math.max(60, activeKkm - 8);

    if (score >= mumtazThreshold) return { grade: 'A', label: 'Sangat Baik (Mumtaz)' };
    if (score >= jayyidThreshold) return { grade: 'B', label: 'Baik (Jayyid)' };
    if (score >= maqbulThreshold) return { grade: 'C', label: 'Cukup (Maqbul)' };
    return { grade: 'D', label: 'Perlu Bimbingan' };
  };

  const overallPredicate = getPredicate(avgScore);

  // Memorized Surah
  const memorizedList = progress
    .filter((p) => p.memorizedSurah && p.memorizedSurah.trim() !== '')
    .map((p) => p.memorizedSurah!.trim());
  const uniqueSurahs = Array.from(new Set(memorizedList));
  const memorizedSummary = uniqueSurahs.length > 0 
    ? uniqueSurahs.join(', ') 
    : '- (Belum ada setoran hafalan)';

  // Automated descriptive note
  const generateDefaultNote = () => {
    if (avgScore === null) {
      return `Data capaian nilai dan perkembangan Al-Qur'an untuk Ananda ${student.name} belum diinput oleh mentor pembina. Evaluasi pembelajaran akan diperbarui setelah mentor merekam capaian berkala pada sesi halaqah BTQ.`;
    }
    if (avgScore >= 88) {
      return `Alhamdulillah, Ananda ${student.name} menunjukkan penguasaan membaca Al-Qur'an yang sangat baik (Mumtaz), tartil dengan makharijul huruf dan hukum tajwid yang tepat.${uniqueSurahs.length > 0 ? ` Hafalan surah (${memorizedSummary}) telah disetorkan dengan lancar.` : ''} Tingkat kehadiran: ${attendancePercentage}%. Pertahankan semangat tilawah harian di rumah bersama keluarga.`;
    }
    if (avgScore >= 78) {
      return `Alhamdulillah, Ananda ${student.name} telah menuntaskan target pembelajaran semester ini dengan predikat Baik (Jayyid). Mampu membaca ayat dengan lancar dan mengenali kaidah hukum tajwid dasar.${uniqueSurahs.length > 0 ? ` Telah menyetorkan hafalan surah (${memorizedSummary}).` : ''} Terus tingkatkan muraja'ah hafalan surah dan latihan menulis khat Al-Qur'an secara teratur.`;
    }
    if (avgScore >= 70) {
      return `Ananda ${student.name} cukup tekun dalam mengikuti pembelajaran BTQ. Pembacaan huruf hijaiyah dan tajwid dasar telah berkembang cukup baik. Diharapkan bimbingan dan pendampingan orang tua di rumah agar Ananda lebih percaya diri dan lancar saat menyetor hafalan surah.`;
    }
    return `Ananda ${student.name} memerlukan motivasi dan pendampingan lebih intensif dalam penguasaan tajwid dan kelancaran membaca Al-Qur'an. Mohon kerja sama orang tua/wali untuk mendampingi tadarus 15 menit setiap hari di rumah.`;
  };

  const [editableNote, setEditableNote] = useState<string>(generateDefaultNote());
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Format date
  const displayDate = printDate || format(new Date(), 'd MMMM yyyy', { locale: localeId });
  const qrUrl = getPublicStudentUrl(student.id);

  // Trigger Print Engine
  const handlePrint = () => {
    const printArea = document.getElementById(`official-raport-${student.id}`);
    if (!printArea) {
      window.print();
      return;
    }

    try {
      let iframe = document.getElementById('print-raport-iframe') as HTMLIFrameElement;
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe = document.createElement('iframe');
      iframe.id = 'print-raport-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((el) => el.outerHTML)
          .join('\n');

        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <base href="${window.location.origin}/" />
              <title>Rapor BTQ Resmi - ${student.name}</title>
              ${styles}
              <style>
                @page { 
                  size: A4 portrait; 
                  margin: 10mm 14mm 10mm 14mm; 
                }
                body { 
                  margin: 0; 
                  padding: 0; 
                  background: white !important; 
                  -webkit-print-color-adjust: exact !important; 
                  print-color-adjust: exact !important;
                  font-family: 'Times New Roman', Times, serif;
                }
                #raport-print-content {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              </style>
            </head>
            <body>
              <div id="raport-print-content">
                ${printArea.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        const trigger = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              window.print();
            }
          }, 300);
        };

        if (iframe.contentWindow) {
          trigger();
        } else {
          iframe.onload = trigger;
        }
        return;
      }
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print():', err);
    }
    window.print();
  };

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Action Toolbar (Hidden during actual print or when in batch mode) */}
      {!hideToolbar && (
        <div className="w-full max-w-[210mm] mb-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#0362D0]/10 text-[#0362D0] rounded-xl font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#172033]">Format Cetak Raport Resmi BTQ (A4)</h4>
              <span className="text-xs text-slate-500">Standar Dinas Pendidikan & SMPN 102 Jakarta</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNote(!isEditingNote)}
              className="px-3 py-2 text-xs font-bold text-[#172033] bg-slate-50 hover:bg-slate-200 border border-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 size={14} /> {isEditingNote ? 'Kunci Catatan' : 'Sesuaikan Catatan'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-black text-white bg-[#0362D0] hover:bg-[#0252b3] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={16} /> Cetak Lembar Rapor (PDF)
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-[#172033] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* A4 REPORT CONTAINER */}
      <div
        id={`official-raport-${student.id}`}
        className="w-full max-w-[210mm] bg-white text-[#172033] p-8 sm:p-10 shadow-lg border border-slate-200 rounded-xl print:shadow-none print:border-none print:p-0 font-serif leading-normal batch-report-item"
        style={{
          boxSizing: 'border-box',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* 1. KOP SURAT RESMI KEDINASAN */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black relative">
          {/* Logo Kiri (Logo Resmi SMP Negeri 102 Jakarta) */}
          <div className="w-[20mm] h-[20mm] shrink-0 flex items-center justify-center">
            <img
              src="/smp102-logo.jpg"
              alt="Logo SMP Negeri 102 Jakarta"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Teks Lembaga & Sekolah */}
          <div className="flex-1 text-center px-3">
            <h4 className="text-[11px] sm:text-xs tracking-wider uppercase font-bold text-slate-800 leading-tight">
              Pemerintah Provinsi Daerah Khusus Ibukota Jakarta
            </h4>
            <h4 className="text-[12px] sm:text-[13px] tracking-wider uppercase font-bold text-slate-900 leading-tight mt-0.5">
              Dinas Pendidikan
            </h4>
            <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-black leading-tight mt-1">
              {activeSchoolName}
            </h2>
            <p className="text-[9.5px] sm:text-[10px] text-slate-700 leading-snug font-sans mt-1">
              {activeSchoolAddress}
            </p>
            <p className="text-[9px] sm:text-[9.5px] text-slate-600 leading-tight font-sans">
              Telepon: (021) 8711463 • Pos-el: smpn102jakarta@gmail.com • Laman: www.smpn102jakarta.sch.id
            </p>
          </div>

          {/* Logo Kanan (Logo SMPN 102 / Avicenna BTQ) */}
          <div className="w-[20mm] h-[20mm] shrink-0 flex items-center justify-center">
            <img
              src={APP_LOGO}
              alt="Logo SMPN 102"
              className="w-full h-full object-contain rounded-full border border-slate-300"
            />
          </div>
        </div>

        {/* Double Line Divider (Standard Dinas Kedinasan) */}
        <div className="w-full border-t border-black mt-[1.5px] mb-4"></div>

        {/* 2. JUDUL DOKUMEN */}
        <div className="text-center mb-4">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-black underline underline-offset-4">
            Laporan Hasil Belajar Bina Baca Tulis Al-Qur'an (BTQ)
          </h3>
          <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 uppercase font-sans">
            Tahun Pelajaran {activeYear} • Semester {activeSemester}
          </p>
        </div>

        {/* 3. IDENTITAS SANTRI */}
        <div className="mb-4 bg-slate-50/70 p-3 rounded-lg border border-slate-300 font-sans text-xs">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Nama Peserta Didik</span>
              <span className="font-black text-black">: {student.name}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Kelas Formal</span>
              <span className="font-bold text-black">: {student.class}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Nomor Induk (NIS/NISN)</span>
              <span className="font-medium text-black">: {student.nis || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Kelompok BTQ</span>
              <span className="font-medium text-black">: {group?.name || 'Kelompok BTQ'}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Jenis Kelamin</span>
              <span className="font-medium text-black">: {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Pembimbing / Mentor</span>
              <span className="font-medium text-black">: {liveMentor?.name || 'Ustadz Pembina BTQ'}</span>
            </div>
          </div>
        </div>

        {/* 4. TABEL CAPAIAN KOMPETENSI */}
        <div className="mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5 font-sans">
            <span>A. Capaian Aspek Kompetensi Pembelajaran</span>
          </h4>
          <table className="w-full border-collapse border border-black text-xs font-sans">
            <thead>
              <tr className="bg-slate-100 text-black text-center font-bold">
                <th className="border border-black px-2 py-1.5 w-8">No</th>
                <th className="border border-black px-3 py-1.5 text-left">Aspek / Materi Penilaian</th>
                <th className="border border-black px-2 py-1.5 w-14">KKM</th>
                <th className="border border-black px-2 py-1.5 w-16">Nilai</th>
                <th className="border border-black px-2 py-1.5 w-16">Predikat</th>
                <th className="border border-black px-3 py-1.5 text-left">Kriteria & Keterangan Kompetensi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black text-center py-1.5">1</td>
                <td className="border border-black px-3 py-1.5 font-bold">
                  Tilawah Al-Qur'an (Membaca)
                  <div className="text-[10px] font-normal text-slate-600">
                    Kelancaran, makharijul huruf, dan fashohah bacaan.
                  </div>
                </td>
                <td className="border border-black text-center py-1.5 font-bold">{activeKkm}</td>
                <td className="border border-black text-center font-black py-1.5">{readingScore ?? '-'}</td>
                <td className="border border-black text-center font-bold py-1.5">{getPredicate(readingScore).grade}</td>
                <td className="border border-black px-3 py-1.5 text-[11px] leading-snug">
                  {readingScore !== null 
                    ? (readingScore >= activeKkm ? 'Sangat tartil dan fasih dalam melafalkan ayat Al-Qur\'an.' : 'Cukup lancar dan memahami ketukan harakat.') 
                    : 'Belum diinput oleh mentor pembina.'}
                </td>
              </tr>
              <tr>
                <td className="border border-black text-center py-1.5">2</td>
                <td className="border border-black px-3 py-1.5 font-bold">
                  Kaidah Ilmu Tajwid
                  <div className="text-[10px] font-normal text-slate-600">
                    Penerapan hukum Nun/Mim mati, Mad, Qalqalah, dsb.
                  </div>
                </td>
                <td className="border border-black text-center py-1.5 font-bold">{activeKkm}</td>
                <td className="border border-black text-center font-black py-1.5">{tajwidScore ?? '-'}</td>
                <td className="border border-black text-center font-bold py-1.5">{getPredicate(tajwidScore).grade}</td>
                <td className="border border-black px-3 py-1.5 text-[11px] leading-snug">
                  {tajwidScore !== null 
                    ? (tajwidScore >= activeKkm ? 'Mampu menerapkan hukum bacaan tajwid secara konsisten.' : 'Memahami hukum tajwid dasar, perlu pembiasaan.') 
                    : 'Belum diinput oleh mentor pembina.'}
                </td>
              </tr>
              <tr>
                <td className="border border-black text-center py-1.5">3</td>
                <td className="border border-black px-3 py-1.5 font-bold">
                  Kitabah / Menulis Arab (Khat)
                  <div className="text-[10px] font-normal text-slate-600">
                    Kaidah menyambung huruf hijaiyah dan kerapian tulisan.
                  </div>
                </td>
                <td className="border border-black text-center py-1.5 font-bold">{activeKkm}</td>
                <td className="border border-black text-center font-black py-1.5">{writingScore ?? '-'}</td>
                <td className="border border-black text-center font-bold py-1.5">{getPredicate(writingScore).grade}</td>
                <td className="border border-black px-3 py-1.5 text-[11px] leading-snug">
                  {writingScore !== null 
                    ? (writingScore >= activeKkm ? 'Khat rapi, proporsional, dan sesuai kaidah penulisan Al-Qur\'an.' : 'Mampu menyambung huruf hijaiyah dengan cukup baik.') 
                    : 'Belum diinput oleh mentor pembina.'}
                </td>
              </tr>
              <tr>
                <td className="border border-black text-center py-1.5">4</td>
                <td className="border border-black px-3 py-1.5 font-bold">
                  Tahsin & Setoran Hafalan Surah
                  <div className="text-[10px] font-normal text-slate-600">
                    Target capaian surah-surah pilihan Juz 30.
                  </div>
                </td>
                <td className="border border-black text-center py-1.5 font-bold">{activeKkm}</td>
                <td className="border border-black text-center font-black py-1.5">{avgScore ?? '-'}</td>
                <td className="border border-black text-center font-bold py-1.5">{overallPredicate.grade}</td>
                <td className="border border-black px-3 py-1.5 text-[11px] leading-snug">
                  <span className="font-semibold">Capaian: </span>{memorizedSummary}
                </td>
              </tr>
              {/* RATA-RATA AKHIR */}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-black text-center py-1.5 uppercase tracking-wider">
                  Rata-rata Nilai Mutu Akhir (KKM: {activeKkm})
                </td>
                <td className="border border-black text-center font-black py-1.5 text-sm">{avgScore ?? '-'}</td>
                <td className="border border-black text-center font-black py-1.5 text-sm">{overallPredicate.grade}</td>
                <td className="border border-black px-3 py-1.5 font-bold text-[#172033]">
                  Predikat: {overallPredicate.label}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. REKAPITULASI KEHADIRAN & CATATAN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 font-sans text-xs">
          {/* Kehadiran Table */}
          <div className="col-span-1 border border-black p-2.5 rounded bg-white">
            <h5 className="font-black text-black uppercase mb-1.5 border-b border-slate-300 pb-1 text-[11px]">
              B. Rekap Kehadiran
            </h5>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Hadir (H)</span>
                <span className="font-bold">{hadirCount} Pertemuan</span>
              </div>
              <div className="flex justify-between">
                <span>Izin (I)</span>
                <span className="font-bold">{izinCount} Kali</span>
              </div>
              <div className="flex justify-between">
                <span>Sakit (S)</span>
                <span className="font-bold">{sakitCount} Kali</span>
              </div>
              <div className="flex justify-between">
                <span>Tanpa Keterangan (A)</span>
                <span className="font-bold">{alpaCount} Kali</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-black font-black">
                <span>Persentase Kehadiran</span>
                <span className="text-[#0362D0]">{totalMeetings > 0 ? `${attendancePercentage}%` : '- (Belum ada presensi)'}</span>
              </div>
            </div>
          </div>

          {/* Catatan Deskriptif Otomatis */}
          <div className="col-span-2 border border-black p-2.5 rounded bg-white flex flex-col justify-between">
            <div>
              <h5 className="font-black text-black uppercase mb-1.5 border-b border-slate-300 pb-1 text-[11px] flex items-center justify-between">
                <span>C. Catatan Perkembangan Karakter Al-Qur'an</span>
                <span className="text-[10px] text-slate-400 font-normal italic print:hidden">
                  (Dapat disesuaikan)
                </span>
              </h5>
              {isEditingNote ? (
                <textarea
                  value={editableNote}
                  onChange={(e) => setEditableNote(e.target.value)}
                  className="w-full h-20 text-xs p-2 border border-slate-300 rounded font-serif focus:ring-1 focus:ring-blue-500"
                  placeholder="Ketikkan catatan perkembangan santri..."
                />
              ) : (
                <p className="text-[11.5px] leading-relaxed italic text-slate-800 font-serif">
                  "{editableNote}"
                </p>
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-sans mt-2 italic text-right">
              — Pembimbing BTQ Rohis Avicenna {activeSchoolName}
            </div>
          </div>
        </div>

        {/* 6. KOLOM TANDA TANGAN RESMI (3 PIHAK: MENTOR, PEMBINA ROHIS, KEPALA SEKOLAH) */}
        <div className="mt-6 pt-2 font-serif text-xs">
          <div className="text-right mb-2 font-sans text-xs">
            {activePrintCity}, {displayDate}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {/* 1. Kolom Kiri: Mentor BTQ (Tanpa NIP) */}
            <div className="flex flex-col justify-between h-32">
              <div>
                <p className="font-bold text-black">Mentor BTQ Kelompok,</p>
                <p className="text-slate-700 text-[11px]">Pembimbing Pembelajaran</p>
              </div>

              <div className="my-auto flex items-center justify-center min-h-[48px]">
                {liveMentor?.signature ? (
                  <img 
                    src={liveMentor.signature} 
                    alt="Tanda Tangan Mentor" 
                    className="max-h-14 max-w-[130px] object-contain mx-auto" 
                  />
                ) : (
                  <div className="h-10" />
                )}
              </div>

              <div>
                <div className="border-b border-black w-40 mx-auto mb-1"></div>
                <p className="font-bold text-black underline">{liveMentor?.name || 'Ustadz Pembimbing'}</p>
                <p className="text-[10px] text-slate-500 font-sans italic">Mentor Halaqah</p>
              </div>
            </div>

            {/* 2. Kolom Tengah: Pembina Rohis (Admin - Dengan NIP) */}
            <div className="flex flex-col justify-between h-32">
              <div>
                <p className="font-bold text-black">Pembina Rohis BTQ,</p>
                <p className="text-slate-700 text-[11px]">Koordinator Pembelajaran</p>
              </div>

              <div className="my-auto flex items-center justify-center min-h-[48px]">
                {activeCoordinatorSignature ? (
                  <img 
                    src={activeCoordinatorSignature} 
                    alt="Tanda Tangan Pembina Rohis" 
                    className="max-h-14 max-w-[130px] object-contain mx-auto" 
                  />
                ) : (
                  <div className="h-10" />
                )}
              </div>

              <div>
                <div className="border-b border-black w-44 mx-auto mb-1"></div>
                <p className="font-bold text-black underline">{activeCoordinatorName}</p>
                <p className="text-[10px] text-slate-600 font-sans">NIP. {activeCoordinatorNip || '-'}</p>
              </div>
            </div>

            {/* 3. Kolom Kanan: Kepala Sekolah */}
            <div className="flex flex-col justify-between h-32">
              <div>
                <p className="font-bold text-black">Mengetahui,</p>
                <p className="text-slate-800 font-bold text-[11px]">Kepala {activeSchoolName}</p>
              </div>

              <div className="my-auto flex items-center justify-center min-h-[48px]">
                {activeHeadmasterSignature ? (
                  <img 
                    src={activeHeadmasterSignature} 
                    alt="Tanda Tangan Kepala Sekolah" 
                    className="max-h-14 max-w-[130px] object-contain mx-auto" 
                  />
                ) : (
                  <div className="h-10" />
                )}
              </div>

              <div>
                <div className="border-b border-black w-44 mx-auto mb-1"></div>
                <p className="font-bold text-black underline">{activeHeadmasterName}</p>
                <p className="text-[10px] text-slate-600 font-sans">NIP. {activeHeadmasterNip || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 7. FOOTER QR CODE VALIDASI RESMI */}
        <div className="mt-8 pt-3 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-sans">
          <div className="flex items-center gap-2.5">
            <div className="bg-white p-1 border border-slate-300 rounded shadow-xs w-11 h-11 shrink-0 flex items-center justify-center">
              <QRCodeSVG value={qrUrl} size={38} level="M" />
            </div>
            <div>
              <p className="font-bold text-black text-[9.5px]">Dokumen Rapor Hasil Belajar Digital Sah</p>
              <p className="text-[8.5px]">Scan QR Code untuk verifikasi keaslian dan membuka riwayat hafalan siswa tanpa login.</p>
              <p className="text-[8px] text-slate-400">ID Santri: {student.id} • Tanggal Terbit: {displayDate}</p>
            </div>
          </div>

          <div className="text-right text-[8.5px] text-slate-400 italic">
            Sistem Informasi Bina Baca Tulis Al-Qur'an (SI-BTQ)<br />
            Halaman 1 dari 1 (Format A4 Baku)
          </div>
        </div>
      </div>
    </div>
  );
}
