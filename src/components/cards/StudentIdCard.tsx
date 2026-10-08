import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BookOpen, Users, User } from 'lucide-react';
import { StudentAvatar } from '../StudentAvatar';
import { Student, Group, Mentor } from '../../services/db';
import { APP_LOGO } from '../../assets/logo';
import { getPublicStudentUrl } from '../../utils/studentUtils';

interface StudentIdCardProps {
  student: Student;
  group?: Group;
  mentor?: Mentor;
}

export function StudentIdCard({ student, group, mentor }: StudentIdCardProps) {
  const qrUrl = getPublicStudentUrl(student.id);

  return (
    <div className="relative flex flex-col w-[54mm] h-[86mm] bg-white rounded-[8px] shadow-lg border border-slate-200 overflow-hidden shrink-0 print:shadow-none print:border-slate-300 font-sans" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      
      {/* Background Watermark */}
      <div className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none overflow-hidden flex items-end justify-center pb-[20mm]">
        <svg width="200%" viewBox="0 0 200 120" fill="none" stroke="#1a365d" strokeWidth="0.75" xmlns="http://www.w3.org/2000/svg">
          {/* Building 1 */}
          <rect x="20" y="80" width="30" height="40" />
          <rect x="25" y="90" width="8" height="15" />
          <rect x="37" y="90" width="8" height="15" />
          {/* Dome */}
          <path d="M60,90 C60,60 100,60 100,90 Z" fill="#1a365d" opacity="0.2" />
          <path d="M60,90 C60,60 100,60 100,90 Z" />
          <rect x="60" y="90" width="40" height="30" />
          <path d="M75,105 A 5,5 0 0 1 85,105 L 85,120 L 75,120 Z" />
          {/* Minaret */}
          <rect x="110" y="30" width="10" height="90" />
          <polygon points="110,30 115,10 120,30" fill="#1a365d" opacity="0.2" />
          <polygon points="110,30 115,10 120,30" />
          <rect x="108" y="50" width="14" height="4" />
          <rect x="108" y="80" width="14" height="4" />
          {/* Palm tree */}
          <path d="M150,120 Q155,90 150,70" strokeWidth="1.5" />
          <path d="M150,70 Q130,80 120,90" />
          <path d="M150,70 Q130,60 120,60" />
          <path d="M150,70 Q170,60 180,60" />
          <path d="M150,70 Q170,80 180,90" />
          <path d="M150,70 Q160,40 165,30" />
          <path d="M150,70 Q140,40 135,30" />
        </svg>
      </div>

      {/* Header */}
      <div className="relative z-10 h-[22mm] bg-[#1a417b] w-full flex items-center px-2 border-b-[2.5px] border-[#C99A2E]">
        {/* Logo */}
        <div className="shrink-0 ml-1">
          <img src={APP_LOGO} alt="Logo" className="w-[12mm] h-[12mm] object-contain rounded-full" />
        </div>
        {/* Title */}
        <div className="flex flex-col ml-1.5 justify-center mt-0.5">
          <span className="text-[8px] text-[#C99A2E] font-serif tracking-[0.5px] uppercase leading-tight font-medium">
            Bina Baca Tulis Al-Qur'an
          </span>
          <span className="text-[7px] text-[#e2c174] font-serif tracking-wide leading-tight opacity-90 mt-[1px]">
            SMP Negeri 102 Jakarta
          </span>
        </div>
      </div>

      {/* Avatar Container */}
      <div className="absolute top-[14mm] left-0 right-0 z-20 flex justify-center">
        <div 
          className="w-[23mm] h-[23mm] flex items-center justify-center bg-[#C99A2E] drop-shadow-md print:drop-shadow-none"
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        >
          <div 
            className="w-[calc(100%-2px)] h-[calc(100%-2px)] bg-white flex items-center justify-center overflow-hidden"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <StudentAvatar 
              gender={student.gender} 
              photoUrl={(student as any).photoUrl || (student as any).avatar} 
              size="100%"
              studentName={student.name}
            />
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="relative z-10 flex-1 mt-[16.5mm] flex flex-col items-center w-full px-2">
        <h3 className="text-[11px] font-serif font-bold text-[#1a417b] leading-[1.1] text-center uppercase tracking-wide line-clamp-2">
          {student.name}
        </h3>
        <p className="text-[9px] font-serif font-bold text-[#1a417b] mt-0.5 uppercase tracking-widest">
          NISN: {student.nis || '-'}
        </p>

        {/* Gold Divider */}
        <div className="w-[85%] h-[0.75px] bg-[#C99A2E] mt-1.5 mb-2 opacity-70"></div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-2 w-full px-2">
          {/* Left Column */}
          <div className="flex flex-col gap-y-3">
            {/* Kelas */}
            <div className="flex items-start gap-1.5">
              <BookOpen className="text-[#1a417b] w-4 h-4 shrink-0 mt-[1px]" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[6px] text-[#1a417b] leading-none mb-1 font-medium">Kelas</span>
                <span className="text-[9px] text-[#1a417b] font-bold leading-none font-serif">{student.class}</span>
              </div>
            </div>
            {/* Kelompok */}
            <div className="flex items-start gap-1.5">
              <Users className="text-[#1a417b] w-4 h-4 shrink-0 mt-[1px]" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[6px] text-[#1a417b] leading-none mb-1 font-medium">Kelompok</span>
                <span className="text-[9px] text-[#1a417b] font-bold leading-none font-serif">{group?.name || '-'}</span>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col gap-y-3 pl-1">
            {/* Mentor */}
            <div className="flex items-start gap-1.5">
              <User className="text-[#1a417b] w-4 h-4 shrink-0 mt-[1px]" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[6px] text-[#1a417b] leading-none mb-1 font-medium">Mentor Pembina</span>
                <span className="text-[9px] text-[#1a417b] font-bold leading-none leading-snug font-serif">{mentor?.name || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto bg-[#1a417b] h-[20mm] flex items-center px-2 py-1.5 gap-2.5">
        {/* QR Code */}
        <div className="bg-white p-0.5 rounded-[3px] shadow-sm shrink-0 flex items-center justify-center ml-1 overflow-hidden student-id-qr-container w-[15.5mm] h-[15.5mm]">
          <QRCodeSVG 
            value={qrUrl} 
            size={128} 
            level="H" 
            includeMargin={true} 
            className="student-id-qr-svg w-full h-full object-contain shrink-0"
          />
        </div>
        {/* Footer Text */}
        <div className="flex flex-col justify-center h-full pt-0.5">
          <span className="text-[7px] font-serif font-medium text-[#e2c174] leading-tight opacity-90">
            Scan QR Pantau Siswa
          </span>
          <span className="text-[8px] font-serif font-bold text-[#C99A2E] leading-tight mt-[1px]">
            Hafalan & Presensi
          </span>
          <span className="text-[5px] font-sans font-normal text-white/80 leading-tight mt-1.5 tracking-wide">
            SMPN 102 Jakarta • Sah & Terverifikasi
          </span>
        </div>
        
        {/* ID Label */}
        <div className="absolute bottom-1.5 right-2 text-[4.5px] font-sans text-white/60 tracking-widest uppercase">
          Kartu Pelajar | ID BTQ
        </div>
      </div>
    </div>
  );
}
