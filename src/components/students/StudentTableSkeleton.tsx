import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Database } from 'lucide-react';

interface StudentTableSkeletonProps {
  rowCount?: number;
  mobileCount?: number;
  showFooter?: boolean;
  variant?: 'master' | 'attendance';
}

export function StudentTableSkeleton({
  rowCount = 8,
  mobileCount = 4,
  showFooter = true,
  variant = 'master'
}: StudentTableSkeletonProps) {
  const nameWidths = ['w-44', 'w-36', 'w-52', 'w-40', 'w-48', 'w-32', 'w-46', 'w-38'];
  const subWidths = ['w-28', 'w-32', 'w-24', 'w-30', 'w-28', 'w-26', 'w-32', 'w-24'];
  const groupWidths = ['w-28', 'w-36', 'w-24', 'w-32', 'w-40', 'w-28', 'w-30', 'w-34'];

  return (
    <div id="student-table-skeleton-container" className="w-full">
      {/* Top Subtle Sync Status Indicator */}
      <div className="px-4 py-2 bg-gradient-to-r from-[#0362D0]/5 via-[#F5F6F8] to-[#0362D0]/5 border-b border-[#E6E8EC] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0362D0] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0362D0]"></span>
          </span>
          <span className="font-semibold text-slate-700">Mengambil data santri dari Firebase Firestore...</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <Database size={12} className="text-[#0362D0]" />
          <span>Realtime Sync</span>
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-[#F5F6F8]">
            <TableRow className="border-b border-[#E6E8EC]">
              <TableHead className="w-16 text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                No
              </TableHead>
              <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                Nama Santri
              </TableHead>
              <TableHead className="text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                Kelas
              </TableHead>
              {variant === 'master' ? (
                <>
                  <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                    Kelompok BTQ
                  </TableHead>
                  <TableHead className="text-center font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                    Aksi
                  </TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-center w-72 font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                    Status Presensi
                  </TableHead>
                  <TableHead className="font-black text-[#172033] text-xs whitespace-nowrap px-4 py-3.5">
                    Catatan Mentor
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, idx) => {
              const nameW = nameWidths[idx % nameWidths.length];
              const subW = subWidths[idx % subWidths.length];
              const groupW = groupWidths[idx % groupWidths.length];

              return (
                <TableRow
                  key={`skeleton-row-${idx}`}
                  className="border-b border-[#E6E8EC]/80 animate-pulse"
                >
                  {/* No */}
                  <TableCell className="text-center px-4 py-3.5">
                    <div className="h-4 w-6 bg-slate-200 rounded mx-auto" />
                  </TableCell>

                  {/* Nama Santri & Sub details */}
                  <TableCell className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {/* Avatar placeholder */}
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                      <div>
                        {/* Name bar */}
                        <div className={`h-4 ${nameW} bg-slate-200 rounded mb-1.5`} />
                        {/* NIS / Gender bar */}
                        <div className={`h-3 ${subW} bg-slate-100 rounded`} />
                      </div>
                    </div>
                  </TableCell>

                  {/* Kelas */}
                  <TableCell className="text-center px-4 py-3.5 whitespace-nowrap">
                    <div className="h-6 w-16 bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-md mx-auto" />
                  </TableCell>

                  {variant === 'master' ? (
                    <>
                      {/* Kelompok BTQ */}
                      <TableCell className="px-4 py-3.5 whitespace-nowrap">
                        <div className={`h-6 ${groupW} bg-slate-100 border border-[#E6E8EC] rounded-md`} />
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center px-4 py-3.5 whitespace-nowrap">
                        <div className="h-5 w-14 bg-emerald-100/70 border border-emerald-200/60 rounded-md mx-auto" />
                      </TableCell>

                      {/* Aksi Buttons */}
                      <TableCell className="text-right px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-7 w-14 bg-slate-200/80 rounded-md" />
                          <div className="h-7 w-14 bg-[#0362D0]/15 rounded-md" />
                          <div className="h-7 w-14 bg-rose-100/70 rounded-md" />
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      {/* Status Presensi Pills (Hadir, Izin, Sakit, Alpa) */}
                      <TableCell className="text-center px-4 py-3.5 whitespace-nowrap">
                        <div className="inline-grid grid-cols-4 gap-1 p-1 bg-[#F5F6F8] rounded-xl border border-[#E6E8EC] w-64">
                          <div className="h-7 bg-emerald-100/70 rounded-lg" />
                          <div className="h-7 bg-slate-200 rounded-lg" />
                          <div className="h-7 bg-slate-200 rounded-lg" />
                          <div className="h-7 bg-slate-200 rounded-lg" />
                        </div>
                      </TableCell>

                      {/* Catatan Mentor Input */}
                      <TableCell className="px-4 py-3.5 whitespace-nowrap">
                        <div className="h-8 w-48 bg-slate-100 border border-[#E6E8EC] rounded-lg" />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Skeleton View */}
      <div className="md:hidden flex flex-col gap-3 p-3">
        {Array.from({ length: mobileCount }).map((_, idx) => {
          const nameW = nameWidths[idx % nameWidths.length];
          const subW = subWidths[idx % subWidths.length];

          return (
            <div
              key={`skeleton-mobile-${idx}`}
              className="bg-white border border-[#E6E8EC] rounded-xl p-4 shadow-xs animate-pulse"
            >
              {/* Top Row: Avatar, Name/NIS, and Status Pill */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div>
                    <div className={`h-4 ${nameW} bg-slate-200 rounded mb-1.5`} />
                    <div className={`h-3 ${subW} bg-slate-100 rounded`} />
                  </div>
                </div>
                <div className="h-5 w-14 bg-emerald-100/70 border border-emerald-200/60 rounded-md shrink-0" />
              </div>

              {variant === 'master' ? (
                <>
                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="h-6 w-16 bg-[#0362D0]/10 border border-[#0362D0]/15 rounded-md" />
                    <div className="h-6 w-32 bg-slate-100 border border-[#E6E8EC] rounded-md" />
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E8EC]">
                    <div className="h-8 flex-1 bg-slate-200/80 rounded-md" />
                    <div className="h-8 flex-1 bg-[#0362D0]/15 rounded-md" />
                    <div className="h-8 flex-1 bg-rose-100/70 rounded-md" />
                  </div>
                </>
              ) : (
                <>
                  {/* 4 Status Buttons in Mobile */}
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F5F6F8] rounded-xl border border-[#E6E8EC] my-3">
                    <div className="h-7 bg-emerald-100/70 rounded-lg" />
                    <div className="h-7 bg-slate-200 rounded-lg" />
                    <div className="h-7 bg-slate-200 rounded-lg" />
                    <div className="h-7 bg-slate-200 rounded-lg" />
                  </div>
                  {/* Catatan input in Mobile */}
                  <div className="h-8 w-full bg-slate-100 border border-[#E6E8EC] rounded-lg" />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Skeleton Pagination Footer */}
      {showFooter && (
        <div className="p-4 border-t border-[#E6E8EC] bg-[#F5F6F8]/50 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="flex gap-1.5">
            <div className="h-8 w-20 bg-slate-200 rounded-md" />
            <div className="h-8 w-8 bg-slate-200 rounded-md" />
            <div className="h-8 w-20 bg-slate-200 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
}
