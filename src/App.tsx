/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { ReactNode, Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { initAutoMigration } from './services/db/autoMigration';

// Resilient dynamic import helper with automatic retry and cache recovery
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default?: T; [key: string]: any }>,
  componentName?: string
) {
  return lazy(async () => {
    const refreshKey = `page-refreshed-${componentName || 'chunk'}`;
    const pageHasAlreadyBeenForceRefreshed = sessionStorage.getItem(refreshKey) === 'true';

    try {
      const module = await componentImport();
      sessionStorage.removeItem(refreshKey);
      if (module.default) {
        return { default: module.default };
      }
      if (componentName && module[componentName]) {
        return { default: module[componentName] };
      }
      const exportedComponent = Object.values(module).find(
        val => typeof val === 'function' || (typeof val === 'object' && val !== null)
      );
      if (exportedComponent) {
        return { default: exportedComponent as T };
      }
      throw new Error(`Component not found in module ${componentName || 'unknown'}`);
    } catch (error) {
      console.warn(`Dynamic import error for ${componentName || 'module'}, attempting recovery...`, error);
      if (!pageHasAlreadyBeenForceRefreshed) {
        sessionStorage.setItem(refreshKey, 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem(refreshKey);
      throw error;
    }
  });
}

// Code Splitting via React.lazy for optimized bundle loading
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'), 'Dashboard');
const LiveSession = lazyWithRetry(() => import('./pages/LiveSession'), 'LiveSession');
const Students = lazyWithRetry(() => import('./pages/Students'), 'Students');
const Groups = lazyWithRetry(() => import('./pages/Groups'), 'Groups');
const StudentAttendance = lazyWithRetry(() => import('./pages/StudentAttendance'), 'StudentAttendance');
const MentorAttendance = lazyWithRetry(() => import('./pages/MentorAttendance'), 'MentorAttendance');
const Progress = lazyWithRetry(() => import('./pages/Progress'), 'Progress');
const Journals = lazyWithRetry(() => import('./pages/Journals'), 'Journals');
const Certifications = lazyWithRetry(() => import('./pages/Certifications'), 'Certifications');
const Curriculum = lazyWithRetry(() => import('./pages/Curriculum'), 'Curriculum');
const Reports = lazyWithRetry(() => import('./pages/Reports'), 'Reports');
const Settings = lazyWithRetry(() => import('./pages/Settings'), 'Settings');
const AuditLogs = lazyWithRetry(() => import('./pages/AuditLogs'), 'AuditLogs');
const Login = lazyWithRetry(() => import('./pages/Login'), 'Login');
const PublicStudentProfile = lazyWithRetry(() => import('./pages/PublicStudentProfile'), 'PublicStudentProfile');
const AcademicCalendar = lazyWithRetry(() => import('./pages/AcademicCalendar'), 'AcademicCalendar');

function PageLoadingFallback() {
  return (
    <div className="flex-1 w-full min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-xs">
        <div className="animate-spin w-4 h-4 border-2 border-[#0362D0] border-t-transparent rounded-full" />
        <span className="text-xs font-bold text-[#172033]">Memuat halaman...</span>
      </div>
    </div>
  );
}

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
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/student/card/:studentId" element={<PublicStudentProfile />} />
          <Route path="/student/card" element={<PublicStudentProfile />} />
          <Route path="/portal" element={<PublicStudentProfile />} />
          <Route path="/pantau" element={<PublicStudentProfile />} />
          <Route path="/scan" element={<PublicStudentProfile />} />
          
          {currentUser ? (
            <>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="students" element={<AdminRoute><Students /></AdminRoute>} />
                <Route path="groups" element={<AdminRoute><Groups /></AdminRoute>} />
                <Route path="calendar" element={<AcademicCalendar />} />
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
                <Route path="audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
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
      </Suspense>
    </Router>
  );
}

export default function App() {
  useEffect(() => {
    initAutoMigration().catch(err => {
      console.warn('Auto migration error:', err);
    });
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
        <OfflineIndicator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
