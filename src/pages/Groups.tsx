import React, { useState, useEffect } from 'react';
import { Layers, Users, Calendar, MapPin, Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { getGroups, getMentors, getStudents, Group, Mentor, Student } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { masterGrades } from '../services/curriculumData';

export function Groups() {
  const { currentUser, userData, userRole } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isMentor = userRole === 'mentor' && currentUser?.email !== 'admin@smpn102.sch.id';

  useEffect(() => {
    async function loadData() {
      try {
        const [groupsData, mentorsData, studentsData] = await Promise.all([
          getGroups(),
          getMentors(),
          getStudents()
        ]);
        
        let filteredGroups = groupsData;
        if (isMentor) {
          const userEmailLower = currentUser?.email?.toLowerCase();
          const matchedMentor = mentorsData.find(
            m => (userData?.id && m.id === userData.id) ||
                 (currentUser?.uid && m.id === currentUser.uid) ||
                 (userEmailLower && m.email?.toLowerCase() === userEmailLower) ||
                 (userData?.email && m.email?.toLowerCase() === userData.email.toLowerCase()) ||
                 (userData?.groupId && m.groupId === userData.groupId)
          );
          const mentorId = matchedMentor?.id || userData?.id || currentUser?.uid;
          const assignedGroupId = matchedMentor?.groupId || userData?.groupId;
          
          const mentorAssigned = groupsData.filter(g => 
            g.mentorId === mentorId || 
            (assignedGroupId && g.id === assignedGroupId)
          );

          if (mentorAssigned.length > 0) {
            filteredGroups = mentorAssigned;
          }
        }

        setGroups(filteredGroups);
        setMentors(mentorsData);
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching groups data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userRole, userData, currentUser, isMentor]);

  const filteredGroups = groups.filter(group => {
    const mentor = mentors.find(m => m.id === group.mentorId);
    return group.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           mentor?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4 text-emerald-600">
            <Layers size={32} />
            <p>Memuat data kelompok...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map(group => {
            const mentor = mentors.find(m => m.id === group.mentorId);
            const studentsCount = students.filter(s => s.groupId === group.id).length;
            
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
                          <div className="flex flex-col mt-0.5">
                            <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block w-fit mb-1">{masterGrades.find(g => g.id === group.gradeId)?.name || 'Grade 1'} • {masterGrades.find(g => g.id === group.gradeId)?.programName || 'Utsmani Jilid 1'}</p>
                            <p className="text-sm text-gray-500">Mentor: {mentor?.name || 'Belum ada'}</p>
                          </div>
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
                        {group.room || 'Belum diatur'}
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
          
          {filteredGroups.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Tidak ada kelompok yang ditemukan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
