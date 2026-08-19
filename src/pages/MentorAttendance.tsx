import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { mockMentorAttendance, mockMentors, mockGroups } from '../data/mockData';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Input } from '../components/ui/Input';
import { Search } from 'lucide-react';

export function MentorAttendance() {
  const recentAttendance = mockMentorAttendance.slice(0, 20); // Just show recent for demo

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kehadiran Mentor</h1>
          <p className="text-gray-500 mt-1 text-sm">Pantau riwayat kehadiran mentor BTQ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Hadir Bulan Ini</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">45</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Izin/Sakit Bulan Ini</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">3</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Alpa Bulan Ini</p>
            <p className="text-2xl font-bold text-red-600 mt-1">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">Riwayat Kehadiran</h3>
          <div className="w-full sm:max-w-xs">
            <Input 
              placeholder="Cari mentor..." 
              icon={<Search size={16} />}
            />
          </div>
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAttendance.map((record) => {
                const mentor = mockMentors.find(m => m.id === record.mentorId);
                const group = mockGroups.find(g => g.id === record.groupId);
                
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-slate-600">
                      {format(parseISO(record.date), 'dd MMMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{group?.name}</TableCell>
                    <TableCell>{mentor?.name}</TableCell>
                    <TableCell className="text-slate-600">{record.time}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        record.status === 'Hadir' ? 'success' : 
                        record.status === 'Izin' ? 'warning' : 'danger'
                      }>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 italic">
                      {record.notes || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {recentAttendance.map((record) => {
            const mentor = mockMentors.find(m => m.id === record.mentorId);
            const group = mockGroups.find(g => g.id === record.groupId);
            
            return (
              <div key={record.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{mentor?.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{group?.name}</p>
                  </div>
                  <Badge variant={
                    record.status === 'Hadir' ? 'success' : 
                    record.status === 'Izin' ? 'warning' : 'danger'
                  }>
                    {record.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                  <span>{format(parseISO(record.date), 'dd MMM yyyy', { locale: id })}</span>
                  <span>{record.time}</span>
                </div>
                {record.notes && (
                  <p className="text-xs text-slate-500 italic mt-1">Catatan: {record.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
