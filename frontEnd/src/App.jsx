import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import ProtectedRoute        from './components/ProtectedRoute';
import Layout                from './components/Layout';
import Spinner               from './components/Spinner';

import Login                 from './pages/Login';
import AdminSetup            from './pages/AdminSetup';
import MarkAttendance        from './pages/MarkAttendance';
import Chat                  from './pages/Chat';

import AdminDashboard        from './pages/admin/AdminDashboard';
import ManageUsers           from './pages/admin/ManageUsers';
import AttendanceReports     from './pages/admin/AttendanceReports';
import Register              from './pages/Register';
import ShiftSettings         from './pages/admin/ShiftSettings';
import AdminEmployeeProfile  from './pages/admin/AdminEmployeeProfile';
import LeaveManagement       from './pages/admin/LeaveManagement';
import HolidayCalendar       from './pages/admin/HolidayCalendar';

import UserDashboard         from './pages/user/UserDashboard';
import UserProfile           from './pages/user/UserProfile';
import LeaveRequest          from './pages/user/LeaveRequest';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullScreen />;

  const home = user ? (user.role === 'admin' ? '/admin' : '/me') : '/login';

  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/login"   element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/setup"   element={user ? <Navigate to={home} replace /> : <AdminSetup />} />
      <Route path="/kiosk"   element={<MarkAttendance />} />

      {/* ── Admin ── */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<Layout />}>
          <Route path="/admin"                        element={<AdminDashboard />} />
          <Route path="/admin/users"                  element={<ManageUsers />} />
          <Route path="/admin/reports"                element={<AttendanceReports />} />
          <Route path="/admin/register"               element={<Register />} />
          <Route path="/admin/settings"               element={<ShiftSettings />} />
          <Route path="/admin/employees/:id/profile"  element={<AdminEmployeeProfile />} />
          <Route path="/admin/chat"                   element={<Chat />} />
          <Route path="/admin/leave"                  element={<LeaveManagement />} />
          <Route path="/admin/holidays"               element={<HolidayCalendar />} />
        </Route>
      </Route>

      {/* ── Employee ── */}
      <Route element={<ProtectedRoute role="employee" />}>
        <Route element={<Layout />}>
          <Route path="/me"          element={<UserDashboard />} />
          <Route path="/me/profile"  element={<UserProfile />} />
          <Route path="/me/chat"     element={<Chat />} />
          <Route path="/me/leave"    element={<LeaveRequest />} />
          <Route path="/me/holidays" element={<HolidayCalendar />} />
        </Route>
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
