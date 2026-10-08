import React, { useState, useEffect } from 'react';
import { Student, Group, Mentor, StudentAttendance, StudentProgress, getStudentAttendanceByStudent, getStudentProgressHistory, getGroups, getMentors } from '../../services/db';
import { OfficialReportSheet } from './OfficialReportSheet';
import { X, Printer, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { getStoredSchoolConfig } from '../../services/schoolConfig';

interface OfficialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  group?: Group | null;
  mentor?: Mentor | null;
}

export function OfficialReportModal({
  isOpen,
  onClose,
  student,
  group: initialGroup,
  mentor: initialMentor,
}: OfficialReportModalProps) {
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [group, setGroup] = useState<Group | null>(initialGroup || null);
  const [mentor, setMentor] = useState<Mentor | null>(initialMentor || null);
  const [loading, setLoading] = useState(true);

  // Dynamic parameters from schoolConfig
  const initialConfig = getStoredSchoolConfig();
  const [headmasterName, setHeadmasterName] = useState(initialConfig.headmasterName);
  const [headmasterNip, setHeadmasterNip] = useState(initialConfig.headmasterNip);
  const [kkm, setKkm] = useState(initialConfig.kkm);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSchoolConfig();
      setHeadmasterName(cfg.headmasterName);
      setHeadmasterNip(cfg.headmasterNip);
      setKkm(cfg.kkm);
    }
  }, [isOpen]);

  useEffect(() => {
    async function loadStudentData() {
      if (!student) return;
      setLoading(true);
      try {
        const [att, prog, groups, mentors] = await Promise.all([
          getStudentAttendanceByStudent(student.id),
          getStudentProgressHistory(student.id),
          getGroups(),
          getMentors(),
        ]);

        setAttendance(att);
        setProgress(prog);

        const foundGroup = groups.find((g) => g.id === student.groupId) || null;
        setGroup(foundGroup);

        if (foundGroup) {
          const foundMentor = mentors.find((m) => m.id === foundGroup.mentorId) || null;
          setMentor(foundMentor);
        }
      } catch (err) {
        console.error('Error loading report data for student:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && student) {
      loadStudentData();
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto border border-slate-300 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0362D0]/10 text-[#0362D0] flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-[#172033] flex items-center gap-2">
                Lembar Raport Resmi BTQ • {student.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kelas {student.class} • NIS {student.nis || '-'} • Siap Ditandatangani & Dibagikan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-[#172033] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Report Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center gap-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={32} className="animate-spin text-[#0362D0]" />
              <span className="text-xs font-bold">Menyiapkan Lembar Rapor & Menghitung Nilai...</span>
            </div>
          ) : (
            <OfficialReportSheet
              student={student}
              group={group}
              mentor={mentor}
              attendance={attendance}
              progress={progress}
              headmasterName={headmasterName}
              headmasterNip={headmasterNip}
              kkm={kkm}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
