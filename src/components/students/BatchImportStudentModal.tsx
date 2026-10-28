import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Users, 
  Check, 
  AlertTriangle,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Student, Group, batchAddStudents, updateStudent } from '../../services/db';
import { ModalPortal } from '../ui/ModalPortal';

interface BatchImportStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingStudents: Student[];
  groups: Group[];
  onSuccess: () => void;
}

interface ParsedRow {
  id: string;
  rawNis: string;
  name: string;
  class: string;
  gender: 'L' | 'P';
  groupName: string;
  matchedGroupId: string;
  status: 'Aktif' | 'Nonaktif';
  validation: 'valid' | 'duplicate_db' | 'duplicate_csv' | 'invalid';
  validationMessage?: string;
  existingStudentMatch?: Student;
}

export function BatchImportStudentModal({
  isOpen,
  onClose,
  existingStudents,
  groups,
  onSuccess
}: BatchImportStudentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');
  
  // Options
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultGroupId, setDefaultGroupId] = useState<string>(groups[0]?.id || 'g1');
  const [autoUppercase, setAutoUppercase] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map of existing students by NIS for quick duplicate check
  const existingNisMap = useMemo(() => {
    const map = new Map<string, Student>();
    existingStudents.forEach((s) => {
      if (s.nis && s.nis.trim() !== '') {
        map.set(s.nis.trim(), s);
      }
    });
    return map;
  }, [existingStudents]);

  // Map of group names to IDs
  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => {
      map.set(g.name.toLowerCase().trim(), g.id);
      // common partial match
      const clean = g.name.toLowerCase().replace(/kelompok\s+/i, '').trim();
      if (clean) map.set(clean, g.id);
    });
    return map;
  }, [groups]);

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headers = ['NISN/NIS', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin (L/P)', 'Kelompok BTQ', 'Status'];
    const sampleRows = [
      ['1022026001', 'AHMAD FATHONI', '7A', 'L', 'Kelompok Abu Bakar', 'Aktif'],
      ['1022026002', 'AISYAH AZ-ZAHRA', '7A', 'P', 'Kelompok Khadijah', 'Aktif'],
      ['1022026003', 'BILAL RAMADHAN', '7B', 'L', 'Kelompok Umar bin Khattab', 'Aktif'],
      ['1022026004', 'FATIMAH AZ-ZAHRA', '7B', 'P', 'Kelompok Aisyah', 'Aktif'],
      ['1022026005', 'MUHAMMAD FAIZ', '7C', 'L', 'Kelompok Ali bin Abi Thalib', 'Aktif'],
      ['1022026006', 'NURUL HIDAYAH', '7C', 'P', 'Kelompok Fatimah', 'Aktif'],
    ];

    // Prepend UTF-8 BOM so Excel on Windows recognizes Indonesian characters and separators smoothly
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...sampleRows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Santri_BTQ_SMPN102.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse CSV Line Helper handling quotes and delimiters (, or ;)
  const parseCSVLine = (text: string, delimiter: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  // Parse File
  const parseFileContent = (content: string) => {
    const rawLines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Determine delimiter (comma or semicolon)
    const firstLine = rawLines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const headerParts = parseCSVLine(firstLine, delimiter).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Map column indices
    let nisIdx = headerParts.findIndex((h) => h.includes('nis') || h.includes('induk'));
    let nameIdx = headerParts.findIndex((h) => h.includes('nama') || h.includes('santri') || h.includes('siswa'));
    let classIdx = headerParts.findIndex((h) => h.includes('kelas') || h.includes('rombel'));
    let genderIdx = headerParts.findIndex((h) => h.includes('kelamin') || h.includes('gender') || h === 'jk');
    let groupIdx = headerParts.findIndex((h) => h.includes('kelompok') || h.includes('halaqah') || h.includes('group'));
    let statusIdx = headerParts.findIndex((h) => h.includes('status'));

    // Fallback if headers are generic or position-based
    if (nameIdx === -1 && headerParts.length >= 2) {
      nisIdx = 0;
      nameIdx = 1;
      classIdx = 2;
      genderIdx = 3;
      groupIdx = 4;
    }

    const dataLines = rawLines.slice(1);
    const seenNisInCsv = new Set<string>();
    const rows: ParsedRow[] = [];

    dataLines.forEach((line, index) => {
      const parts = parseCSVLine(line, delimiter);
      if (parts.length === 0 || parts.every((p) => p === '')) return;

      const rawNis = (nisIdx >= 0 ? parts[nisIdx] : '') || '';
      let name = (nameIdx >= 0 ? parts[nameIdx] : '') || '';
      if (autoUppercase) {
        name = name.toUpperCase();
      }
      const rawClass = (classIdx >= 0 ? parts[classIdx] : '') || '7A';
      const cleanClass = rawClass.toUpperCase().replace(/\s+/g, '');

      let rawGender = (genderIdx >= 0 ? parts[genderIdx] : '') || 'L';
      rawGender = rawGender.trim().toUpperCase();
      const gender: 'L' | 'P' = rawGender.startsWith('P') || rawGender.startsWith('W') ? 'P' : 'L';

      const rawGroup = (groupIdx >= 0 ? parts[groupIdx] : '') || '';
      const rawStatus = (statusIdx >= 0 ? parts[statusIdx] : '') || 'Aktif';
      const status: 'Aktif' | 'Nonaktif' = rawStatus.toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';

      // Resolve group
      let matchedGroupId = defaultGroupId;
      if (rawGroup) {
        const cleanG = rawGroup.toLowerCase().trim();
        const cleanGNoPrefix = cleanG.replace(/kelompok\s+/i, '').trim();
        if (groupNameMap.has(cleanG)) {
          matchedGroupId = groupNameMap.get(cleanG)!;
        } else if (groupNameMap.has(cleanGNoPrefix)) {
          matchedGroupId = groupNameMap.get(cleanGNoPrefix)!;
        } else {
          // Check if it's already an ID
          const existingById = groups.find((g) => g.id.toLowerCase() === cleanG);
          if (existingById) matchedGroupId = existingById.id;
        }
      }

      // Validation logic
      let validation: ParsedRow['validation'] = 'valid';
      let validationMessage = 'Siap diimpor';
      let existingStudentMatch: Student | undefined = undefined;

      const cleanNis = rawNis.trim();

      if (!name || name.trim() === '') {
        validation = 'invalid';
        validationMessage = 'Nama santri tidak boleh kosong';
      } else if (cleanNis) {
        if (existingNisMap.has(cleanNis)) {
          validation = 'duplicate_db';
          existingStudentMatch = existingNisMap.get(cleanNis);
          validationMessage = `NIS sudah terdaftar di database (${existingStudentMatch?.name} - Kelas ${existingStudentMatch?.class})`;
        } else if (seenNisInCsv.has(cleanNis)) {
          validation = 'duplicate_csv';
          validationMessage = `Duplikat NIS ditemukan lebih dari satu kali dalam berkas CSV`;
        } else {
          seenNisInCsv.add(cleanNis);
        }
      }

      rows.push({
        id: `import_${index}_${Date.now()}`,
        rawNis: cleanNis || `102${String(Math.floor(1000 + Math.random() * 9000))}`,
        name,
        class: cleanClass,
        gender,
        groupName: rawGroup || (groups.find((g) => g.id === matchedGroupId)?.name || 'Kelompok BTQ'),
        matchedGroupId,
        status,
        validation,
        validationMessage,
        existingStudentMatch
      });
    });

    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseFileContent(text);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseFileContent(text);
      };
      reader.readAsText(droppedFile, 'UTF-8');
    }
  };

  const handleRemoveRow = (rowId: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Calculations for stats
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter((r) => r.validation === 'valid').length;
    const duplicates = parsedRows.filter((r) => r.validation === 'duplicate_db' || r.validation === 'duplicate_csv').length;
    const invalid = parsedRows.filter((r) => r.validation === 'invalid').length;
    return { total, valid, duplicates, invalid };
  }, [parsedRows]);

  // Filtered rows for viewing
  const displayedRows = useMemo(() => {
    if (statusFilter === 'valid') return parsedRows.filter((r) => r.validation === 'valid');
    if (statusFilter === 'duplicate') return parsedRows.filter((r) => r.validation === 'duplicate_db' || r.validation === 'duplicate_csv');
    if (statusFilter === 'invalid') return parsedRows.filter((r) => r.validation === 'invalid');
    return parsedRows;
  }, [parsedRows, statusFilter]);

  // Process Import to Firestore
  const handleExecuteImport = async () => {
    // Determine which rows to import
    const rowsToImport = parsedRows.filter((r) => {
      if (r.validation === 'invalid') return false;
      if (skipDuplicates && (r.validation === 'duplicate_db' || r.validation === 'duplicate_csv')) return false;
      return true;
    });

    if (rowsToImport.length === 0) return;

    setIsProcessing(true);
    setProgress({ processed: 0, total: rowsToImport.length });

    try {
      // Prepare payload list
      const studentsPayload = rowsToImport.map((r) => ({
        name: r.name.trim(),
        nis: r.rawNis.trim(),
        class: r.class.trim() || '7A',
        gender: r.gender,
        groupId: r.matchedGroupId || defaultGroupId,
        status: r.status,
      }));

      await batchAddStudents(studentsPayload, (processed, total) => {
        setProgress({ processed, total });
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-4rem)] flex flex-col overflow-hidden border border-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-[#172033]">
                  Impor Santri Massal (Excel / CSV)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                  PPDB & Rombel Baru
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Unggah data ratusan santri sekaligus dengan validasi duplikasi NISN/NIS otomatis sebelum disimpan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 text-xs font-bold text-[#0362D0] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Unduh format file CSV template"
            >
              <Download size={15} /> Unduh Format Template CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 text-slate-400 hover:text-[#172033] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 flex flex-col gap-5">
          {/* UPLOAD / DROP AREA */}
          {!file && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging 
                  ? 'border-[#0362D0] bg-blue-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-[#0362D0] bg-white hover:bg-blue-50/20 shadow-2xs'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,text/csv,text/plain"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0362D0] flex items-center justify-center">
                <Upload size={28} />
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-black text-[#172033]">
                  Pilih atau Tarik Berkas CSV ke Sini
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Format berkas yang didukung: <strong>.CSV</strong> (dipisahkan koma atau titik-koma) diekspor dari Microsoft Excel atau Google Sheets.
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <span className="px-4 py-2 bg-[#0362D0] text-white text-xs font-bold rounded-xl shadow-xs">
                  Jelajahi Berkas Komputer
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate();
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download size={13} /> Gunakan Template Kami
                </button>
              </div>
            </div>
          )}

          {/* PARSED FILE PREVIEW & CONTROLS */}
          {file && (
            <div className="flex flex-col gap-4">
              {/* File Info Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-[#172033]">{file.name}</h5>
                    <span className="text-xs text-slate-500 font-medium">
                      {(file.size / 1024).toFixed(1)} KB • Total <strong>{stats.total} baris</strong> santri terbaca
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setFile(null);
                      setParsedRows([]);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Ganti Berkas
                  </button>
                </div>
              </div>

              {/* STATS & FILTER BADGES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-70">Total Baris</div>
                  <div className="text-xl font-black mt-0.5">{stats.total}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('valid')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    statusFilter === 'valid'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Siap Diimpor
                  </div>
                  <div className="text-xl font-black mt-0.5">{stats.valid}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('duplicate')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    statusFilter === 'duplicate'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50/50'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1">
                    <AlertTriangle size={12} /> Duplikat NIS
                  </div>
                  <div className="text-xl font-black mt-0.5">{stats.duplicates}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('invalid')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    statusFilter === 'invalid'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50/50'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1">
                    <AlertCircle size={12} /> Tidak Lengkap
                  </div>
                  <div className="text-xl font-black mt-0.5">{stats.invalid}</div>
                </button>
              </div>

              {/* IMPORT RULES & MAPPING */}
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-medium">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0362D0] focus:ring-[#0362D0]"
                    />
                    <span>Lewati data yang duplikat ({stats.duplicates} santri akan diabaikan secara aman)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={autoUppercase}
                      onChange={(e) => setAutoUppercase(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0362D0] focus:ring-[#0362D0]"
                    />
                    <span>Otomatis ubah nama santri menjadi HURUF KAPITAL standar dinas</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-slate-500 shrink-0 font-bold">Kelompok Default:</span>
                  <select
                    value={defaultGroupId}
                    onChange={(e) => setDefaultGroupId(e.target.value)}
                    className="h-8 px-2.5 bg-[#F8FAFC] border border-slate-100 rounded-lg text-xs font-bold text-[#172033]"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] border-b border-slate-100 text-slate-600 uppercase font-black tracking-wider text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 text-center w-12">No</th>
                        <th className="px-3.5 py-2.5">Status Validasi</th>
                        <th className="px-3.5 py-2.5">NISN / NIS</th>
                        <th className="px-3.5 py-2.5">Nama Santri</th>
                        <th className="px-3.5 py-2.5 text-center">Kelas</th>
                        <th className="px-3.5 py-2.5 text-center">L/P</th>
                        <th className="px-3.5 py-2.5">Kelompok Terpetakan</th>
                        <th className="px-3.5 py-2.5 text-right w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                            Tidak ada data santri dalam kategori filter ini.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row, idx) => {
                          const isDup = row.validation === 'duplicate_db' || row.validation === 'duplicate_csv';
                          const isInvalid = row.validation === 'invalid';

                          return (
                            <tr
                              key={row.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isDup ? 'bg-amber-50/30' : isInvalid ? 'bg-rose-50/30' : ''
                              }`}
                            >
                              <td className="px-3.5 py-2.5 text-center text-slate-400 font-bold">
                                {idx + 1}
                              </td>
                              <td className="px-3.5 py-2.5">
                                {row.validation === 'valid' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                                    <Check size={11} /> Siap Impor
                                  </span>
                                ) : isDup ? (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200 cursor-help"
                                    title={row.validationMessage}
                                  >
                                    <AlertTriangle size={11} /> {row.validation === 'duplicate_db' ? 'Duplikat Database' : 'Duplikat File'}
                                  </span>
                                ) : (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200 cursor-help"
                                    title={row.validationMessage}
                                  >
                                    <AlertCircle size={11} /> Tidak Lengkap
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono font-bold text-slate-700">
                                {row.rawNis}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="font-extrabold text-[#172033]">{row.name || '(Nama Kosong)'}</div>
                                {row.validationMessage && row.validation !== 'valid' && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 italic">
                                    {row.validationMessage}
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-center font-bold text-slate-700">
                                {row.class}
                              </td>
                              <td className="px-3.5 py-2.5 text-center font-bold text-slate-700">
                                {row.gender}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                                  {row.groupName}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Hapus baris ini dari antrean impor"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {file && (
              <span>
                Akan mengimpor <strong>{skipDuplicates ? stats.valid : stats.valid + stats.duplicates} santri</strong> ke dalam database SMPN 102.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!file || isProcessing || (skipDuplicates ? stats.valid === 0 : (stats.valid + stats.duplicates) === 0)}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 text-xs font-black text-white bg-[#0362D0] hover:bg-[#0252b3] disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan ke Database ({progress.processed}/{progress.total})...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Konfirmasi & Simpan Santri Massal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
