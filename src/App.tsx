/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

import { Dashboard } from './pages/Dashboard';
import { LiveSession } from './pages/LiveSession';
import { Students } from './pages/Students';
import { Groups } from './pages/Groups';
import { StudentAttendance } from './pages/StudentAttendance';
import { MentorAttendance } from './pages/MentorAttendance';
import { Progress } from './pages/Progress';
import { Journals } from './pages/Journals';
import { Certifications } from './pages/Certifications';
import { Curriculum } from './pages/Curriculum';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

function AdminRoute({ children }: { children: ReactNode }) {
  const { userRole, currentUser } = useAuth();
  const isAdmin = userRole === 'admin' || currentUser?.email === 'admin@smpn102.sch.id';
  if (!isAdmin) {
    return <Navigate to="/session" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#172033] gap-3 select-none">
        <div className="animate-spin w-8 h-8 border-4 border-[#0362D0] border-t-transparent rounded-full shadow-md"></div>
        <span className="text-xs font-bold text-slate-300">Memverifikasi Sesi...</span>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {currentUser ? (
          <>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<AdminRoute><Students /></AdminRoute>} />
              <Route path="groups" element={<AdminRoute><Groups /></AdminRoute>} />
              <Route path="session" element={<LiveSession />} />
              <Route path="attendance/students" element={<AdminRoute><StudentAttendance /></AdminRoute>} />
              <Route path="student-attendance" element={<Navigate to="/attendance/students" replace />} />
              <Route path="attendance/mentors" element={<AdminRoute><MentorAttendance /></AdminRoute>} />
              <Route path="mentor-attendance" element={<Navigate to="/attendance/mentors" replace />} />
              <Route path="progress" element={<AdminRoute><Progress /></AdminRoute>} />
              <Route path="journals" element={<AdminRoute><Journals /></AdminRoute>} />
              <Route path="certifications" element={<Certifications />} />
              <Route path="curriculum" element={<Curriculum />} />
              <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
              <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
            </Route>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
