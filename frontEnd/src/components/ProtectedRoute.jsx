import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/me'} replace />;
  }
  return <Outlet />;
}
