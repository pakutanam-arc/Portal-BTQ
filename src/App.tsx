/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Groups } from './pages/Groups';
import { StudentAttendance } from './pages/StudentAttendance';
import { MentorAttendance } from './pages/MentorAttendance';
import { Progress } from './pages/Progress';
import { Curriculum } from './pages/Curriculum';
import { Reports } from './pages/Reports';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="groups" element={<Groups />} />
          <Route path="attendance/students" element={<StudentAttendance />} />
          <Route path="attendance/mentors" element={<MentorAttendance />} />
          <Route path="progress" element={<Progress />} />
          <Route path="curriculum" element={<Curriculum />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<div className="p-4 text-gray-500">Halaman Pengaturan (Coming Soon)</div>} />
        </Route>
      </Routes>
    </Router>
  );
}
