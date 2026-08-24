/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
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

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
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
              <Route path="students" element={<Students />} />
              <Route path="groups" element={<Groups />} />
              <Route path="attendance/students" element={<StudentAttendance />} />
              <Route path="student-attendance" element={<Navigate to="/attendance/students" replace />} />
              <Route path="attendance/mentors" element={<MentorAttendance />} />
              <Route path="mentor-attendance" element={<Navigate to="/attendance/mentors" replace />} />
              <Route path="progress" element={<Progress />} />
              <Route path="journals" element={<Journals />} />
              <Route path="certifications" element={<Certifications />} />
              <Route path="curriculum" element={<Curriculum />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
