import React, { useState, useEffect, useMemo } from 'react';
import { 
  Student, 
  Group, 
  Mentor, 
  StudentAttendance, 
  StudentProgress, 
  getAllStudentAttendance, 
  getAllStudentProgress 
} from '../../services/db';
import { OfficialReportSheet } from './OfficialReportSheet';
import { 
  X, 
  Printer, 
  Loader2, 
  Layers, 
  Filter, 
  CheckSquare, 
  Square, 
  Settings2, 
  Calendar, 
  Users, 
  FileText, 
  Check, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { getStoredSchoolConfig, getSchoolConfig } from '../../services/schoolConfig';
import { sortStudents, extractClassComponents } from '../../utils/studentUtils';
import { ModalPortal } from '../ui/ModalPortal';

interface BatchOfficialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  groups: Group[];
  mentors: Mentor[];
  defaultGroupId?: string;
  defaultClass?: string;
}

export function BatchOfficialReportModal({
  isOpen,
  onClose,
  students,
  groups,
  mentors,
  defaultGroupId = 'all',
  defaultClass = 'all',
}: BatchOfficialReportModalProps) {
  // Filter States
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>(defaultGroupId);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(defaultClass);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Report Customization from School Config
  const initialConfig = getStoredSchoolConfig();
  const [academicYear, setAcademicYear] = useState(initialConfig.academicYear);
  const [semester, setSemester] = useState(initialConfig.semester);
  const [headmasterName, setHeadmasterName] = useState(initialConfig.headmasterName);
  const [headmasterNip, setHeadmasterNip] = useState(initialConfig.headmasterNip);
  const [kkm, setKkm] = useState(initialConfig.kkm);
  const [printDate, setPrintDate] = useState(format(new Date(), 'd MMMM yyyy', { locale: localeId }));
  const [showConfig, setShowConfig] = useState(false);

  // Data State
  const [allAttendance, setAllAttendance] = useState<StudentAttendance[]>([]);
  const [allProgress, setAllProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Update initial filters and config when modal opens
  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSchoolConfig();
      if (cfg.academicYear) setAcademicYear(cfg.academicYear);
      if (cfg.semester) setSemester(cfg.semester);
      if (cfg.headmasterName) setHeadmasterName(cfg.headmasterName);
      if (cfg.headmasterNip) setHeadmasterNip(cfg.headmasterNip);
      if (cfg.kkm) setKkm(cfg.kkm);
      if (defaultGroupId) setSelectedGroupFilter(defaultGroupId);
      if (defaultClass) setSelectedClassFilter(defaultClass);
    }
  }, [isOpen, defaultGroupId, defaultClass]);

  // Load all attendance, progress & fresh school config from Firestore in batch once
  useEffect(() => {
    async function loadBatchData() {
      if (!isOpen) return;
      setLoading(true);
      try {
        const [att, prog, freshCfg] = await Promise.all([
          getAllStudentAttendance('all', 5000),
          getAllStudentProgress(5000),
          getSchoolConfig(),
        ]);
        setAllAttendance(att);
        setAllProgress(prog);
        if (freshCfg) {
          if (freshCfg.academicYear) setAcademicYear(freshCfg.academicYear);
          if (freshCfg.semester) setSemester(freshCfg.semester);
          if (freshCfg.headmasterName) setHeadmasterName(freshCfg.headmasterName);
          if (freshCfg.headmasterNip) setHeadmasterNip(freshCfg.headmasterNip);
          if (freshCfg.kkm) setKkm(freshCfg.kkm);
        }
      } catch (err) {
        console.error('Failed to load batch data for reports:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadBatchData();
    }
  }, [isOpen]);

  // Index attendance & progress by studentId for fast lookup
  const attendanceMap = useMemo(() => {
    const map = new Map<string, StudentAttendance[]>();
    allAttendance.forEach((item) => {
      const list = map.get(item.studentId) || [];
      list.push(item);
      map.set(item.studentId, list);
    });
    return map;
  }, [allAttendance]);

  const progressMap = useMemo(() => {
    const map = new Map<string, StudentProgress[]>();
    allProgress.forEach((item) => {
      const list = map.get(item.studentId) || [];
      list.push(item);
      map.set(item.studentId, list);
    });
    return map;
  }, [allProgress]);

  // Unique Classes and Groups list
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.class).filter(Boolean))).sort((a, b) => {
      const classA = extractClassComponents(a);
      const classB = extractClassComponents(b);
      if (classA.gradeNumber !== classB.gradeNumber) return classA.gradeNumber - classB.gradeNumber;
      return classA.section.localeCompare(classB.section, 'id');
    });
  }, [students]);

  // Filtered Students List
  const candidateStudents = useMemo(() => {
    const list = students.filter((s) => {
      const matchGroup = selectedGroupFilter === 'all' || s.groupId === selectedGroupFilter;
      const matchClass = selectedClassFilter === 'all' || s.class === selectedClassFilter;
      const matchSearch = searchQuery.trim() === '' || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s.nis && s.nis.includes(searchQuery.trim()));
      return matchGroup && matchClass && matchSearch;
    });
    return sortStudents(list);
  }, [students, selectedGroupFilter, selectedClassFilter, searchQuery]);

  // Sync selectedStudentIds when candidate list changes
  useEffect(() => {
    const initialIds = new Set(candidateStudents.map((s) => s.id));
    setSelectedStudentIds(initialIds);
  }, [selectedGroupFilter, selectedClassFilter, candidateStudents.length]);

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === candidateStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(candidateStudents.map((s) => s.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  // Final queue of students to print
  const printQueueStudents = useMemo(() => {
    return candidateStudents.filter((s) => selectedStudentIds.has(s.id));
  }, [candidateStudents, selectedStudentIds]);

  // Trigger Batch Print
  const handlePrintBatch = () => {
    if (printQueueStudents.length === 0) return;
    setIsPrinting(true);

    const queueContainer = document.getElementById('batch-raport-print-queue');
    if (!queueContainer) {
      window.print();
      setIsPrinting(false);
      return;
    }

    try {
      let iframe = document.getElementById('batch-print-iframe') as HTMLIFrameElement;
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe = document.createElement('iframe');
      iframe.id = 'batch-print-iframe';
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

        const groupName = selectedGroupFilter !== 'all' 
          ? groups.find((g) => g.id === selectedGroupFilter)?.name || 'Kelompok' 
          : 'Semua-Kelompok';
        const className = selectedClassFilter !== 'all' 
          ? `Kelas-${selectedClassFilter}` 
          : 'Semua-Kelas';

        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <base href="${window.location.origin}/" />
              <title>Rapor BTQ Massal - ${className} - ${groupName} (${printQueueStudents.length} Santri)</title>
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
                .batch-print-wrapper {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .batch-report-item {
                  page-break-after: always !important;
                  break-after: page !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  box-sizing: border-box !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 0 0 0 !important;
                  padding: 0 !important;
                }
                .batch-report-item:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
              </style>
            </head>
            <body>
              <div class="batch-print-wrapper">
                ${queueContainer.innerHTML}
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
            } finally {
              setIsPrinting(false);
            }
          }, 500);
        };

        if (iframe.contentWindow) {
          trigger();
        } else {
          iframe.onload = trigger;
        }
        return;
      }
    } catch (err) {
      console.warn('Batch iframe print error, falling back to window.print():', err);
      window.print();
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div 
        className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] flex flex-col overflow-hidden my-auto border border-slate-300 print:border-none print:shadow-none print:max-h-none print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center font-bold shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-[#172033]">
                  Cetak Rapor Massal BTQ (Batch Printing)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0362D0] text-[10px] font-black uppercase tracking-wider border border-blue-100">
                  {printQueueStudents.length} Santri Dalam Antrean
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cetak seluruh lembar raport 1 kelas atau 1 kelompok sekaligus dengan pembatas halaman A4 otomatis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showConfig 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-slate-50 text-[#172033] border-slate-100 hover:bg-slate-200'
              }`}
            >
              <Settings2 size={15} />
              <span>Pengaturan Kop & Titimangsa</span>
            </button>

            <button
              type="button"
              disabled={loading || printQueueStudents.length === 0 || isPrinting}
              onClick={handlePrintBatch}
              className="px-4 py-2 text-xs font-black text-white bg-[#0362D0] hover:bg-[#0252b3] disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isPrinting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              <span>Cetak Antrean ({printQueueStudents.length} Halaman A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-[#172033] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONFIGURATION DRAWER (Optional Collapsible) */}
        {showConfig && (
          <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs print:hidden animate-in fade-in duration-150">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                KKM Kelulusan
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={kkm}
                onChange={(e) => setKkm(parseInt(e.target.value, 10) || 75)}
                className="w-full h-9 px-3 bg-white border border-slate-100 rounded-xl font-black text-[#0362D0]"
                placeholder="75"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Tahun Pelajaran
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-100 rounded-xl font-bold text-[#172033]"
                placeholder="2026/2027"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
                className="w-full h-9 px-3 bg-white border border-slate-100 rounded-xl font-bold text-[#172033]"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Nama Kepala Sekolah
              </label>
              <input
                type="text"
                value={headmasterName}
                onChange={(e) => setHeadmasterName(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-100 rounded-xl font-bold text-[#172033]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={headmasterNip}
                onChange={(e) => setHeadmasterNip(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-100 rounded-xl font-bold text-[#172033]"
              />
            </div>
          </div>
        )}

        {/* FILTER & SELECTION BAR */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Kelas */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="text-slate-400">Kelas:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="h-8 px-2.5 bg-[#F8FAFC] border border-slate-100 rounded-lg text-xs font-bold text-[#172033] focus:ring-1 focus:ring-[#0362D0]"
              >
                <option value="all">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>

            {/* Filter Kelompok */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="text-slate-400">Kelompok BTQ:</span>
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="h-8 px-2.5 bg-[#F8FAFC] border border-slate-100 rounded-lg text-xs font-bold text-[#172033] focus:ring-1 focus:ring-[#0362D0]"
              >
                <option value="all">Semua Kelompok ({groups.length})</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama santri..."
              className="h-8 px-3 bg-[#F8FAFC] border border-slate-100 rounded-lg text-xs font-medium text-[#172033] w-36 sm:w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-200 text-[#172033] text-xs font-bold rounded-lg border border-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              {selectedStudentIds.size === candidateStudents.length ? (
                <>
                  <CheckSquare size={14} className="text-[#0362D0]" />
                  <span>Batal Pilih Semua</span>
                </>
              ) : (
                <>
                  <Square size={14} className="text-slate-400" />
                  <span>Pilih Semua ({candidateStudents.length})</span>
                </>
              )}
            </button>

            <span className="text-xs font-bold text-slate-500">
              Terpilih: <strong className="text-[#0362D0]">{selectedStudentIds.size}</strong> dari {candidateStudents.length}
            </span>
          </div>
        </div>

        {/* BODY: REPORT QUEUE PREVIEW */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center gap-8">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={36} className="animate-spin text-[#0362D0]" />
              <span className="text-sm font-bold">Mengumpulkan Data Absensi & Nilai Seluruh Santri...</span>
              <p className="text-xs text-slate-400">Menyiapkan antrean lembar rapor resmi berformat A4</p>
            </div>
          ) : printQueueStudents.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white p-8 rounded-3xl border border-slate-100 max-w-md text-center">
              <AlertCircle size={40} className="text-amber-500" />
              <h4 className="text-base font-bold text-[#172033]">Tidak Ada Santri Terpilih</h4>
              <p className="text-xs text-slate-400">
                Silakan sesuaikan filter Kelas atau Kelompok, atau centang santri yang ingin dicetak lembar rapornya.
              </p>
            </div>
          ) : (
            <div id="batch-raport-print-queue" className="w-full flex flex-col items-center gap-8">
              {printQueueStudents.map((student, idx) => {
                const group = groups.find((g) => g.id === student.groupId) || null;
                const mentor = group ? mentors.find((m) => m.id === group.mentorId) || null : null;
                const attendance = attendanceMap.get(student.id) || [];
                const progress = progressMap.get(student.id) || [];

                return (
                  <div key={student.id} className="w-full flex flex-col items-center batch-report-item">
                    {/* Header Item Indicator (Hidden during print) */}
                    <div className="w-full max-w-[210mm] mb-2 px-4 py-2 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 shadow-2xs print:hidden">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#0362D0] text-white rounded-md text-[10px] font-black">
                          Halaman {idx + 1} dari {printQueueStudents.length}
                        </span>
                        <span className="font-extrabold text-[#172033]">{student.name}</span>
                        <span className="text-slate-400">• Kelas {student.class} • {group?.name || 'Kelompok BTQ'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStudent(student.id)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-bold cursor-pointer"
                        title="Keluarkan dari antrean cetak ini"
                      >
                        Keluarkan
                      </button>
                    </div>

                    {/* Report Sheet Single Page */}
                    <OfficialReportSheet
                      student={student}
                      group={group}
                      mentor={mentor}
                      attendance={attendance}
                      progress={progress}
                      academicYear={academicYear}
                      semester={semester}
                      headmasterName={headmasterName}
                      headmasterNip={headmasterNip}
                      kkm={kkm}
                      printDate={printDate}
                      hideToolbar={true}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
