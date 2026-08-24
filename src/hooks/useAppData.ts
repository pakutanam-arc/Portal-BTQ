import { useState, useEffect } from 'react';
import { Student, Group, Mentor, StudentAttendance, MentorAttendance, Progress, Curriculum } from '../types';
import { 
  mockStudents, 
  mockGroups, 
  mockMentors, 
  mockStudentAttendance, 
  mockMentorAttendance, 
  mockProgress, 
  mockCurriculum 
} from '../services/mockData';

/**
 * Service to simulate API calls and abstract data fetching
 */
export const apiService = {
  getStudents: async (): Promise<Student[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockStudents]), 300);
    });
  },
  
  getGroups: async (): Promise<Group[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockGroups]), 300);
    });
  },
  
  getMentors: async (): Promise<Mentor[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockMentors]), 300);
    });
  },
  
  getStudentAttendance: async (): Promise<StudentAttendance[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockStudentAttendance]), 300);
    });
  },
  
  getMentorAttendance: async (): Promise<MentorAttendance[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockMentorAttendance]), 300);
    });
  },
  
  getProgress: async (): Promise<Progress[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockProgress]), 300);
    });
  },
  
  getCurriculum: async (): Promise<Curriculum[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockCurriculum]), 300);
    });
  }
};

/**
 * Hook to provide app data throughout the application
 * This makes it easier to migrate to real API calls later
 */
export function useAppData() {
  const [data, setData] = useState({
    students: [] as Student[],
    groups: [] as Group[],
    mentors: [] as Mentor[],
    studentAttendance: [] as StudentAttendance[],
    mentorAttendance: [] as MentorAttendance[],
    progress: [] as Progress[],
    curriculum: [] as Curriculum[],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [
          students, 
          groups, 
          mentors, 
          studentAttendance, 
          mentorAttendance, 
          progress, 
          curriculum
        ] = await Promise.all([
          apiService.getStudents(),
          apiService.getGroups(),
          apiService.getMentors(),
          apiService.getStudentAttendance(),
          apiService.getMentorAttendance(),
          apiService.getProgress(),
          apiService.getCurriculum()
        ]);
        
        setData({
          students,
          groups,
          mentors,
          studentAttendance,
          mentorAttendance,
          progress,
          curriculum
        });
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  return { ...data, isLoading, error };
}
