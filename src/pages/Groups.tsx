import React from 'react';
import { Layers, Users, Calendar, MapPin, Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { mockGroups, mockMentors, mockStudents } from '../data/mockData';

export function Groups() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelompok BTQ</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola daftar kelompok dan penugasan mentor</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="w-full sm:max-w-md">
          <Input 
            placeholder="Cari kelompok atau mentor..." 
            icon={<Search size={16} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockGroups.map(group => {
          const mentor = mockMentors.find(m => m.id === group.mentorId);
          const studentsCount = mockStudents.filter(s => s.groupId === group.id).length;
          
          return (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Mentor: {mentor?.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium uppercase tracking-wider">
                        <Users size={14} /> Siswa
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{studentsCount} <span className="text-sm font-normal text-gray-500">orang</span></span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium uppercase tracking-wider">
                        <Calendar size={14} /> Jadwal
                      </div>
                      <span className="text-sm font-medium text-gray-900 leading-tight">{group.schedule}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-emerald-600" />
                      {group.room}
                    </div>
                    <Badge variant="success">Aktif</Badge>
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                  <Button variant="outline" size="sm" className="w-full">Lihat Detail Kelompok</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
