import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { MentorDashboard } from '../components/dashboard/MentorDashboard';

export function Dashboard() {
  const { userRole, currentUser } = useAuth();
  
  const isAdmin = userRole === 'admin' || currentUser?.email === 'admin@smpn102.sch.id';

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <MentorDashboard />;
}
