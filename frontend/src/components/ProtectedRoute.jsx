import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * ──────────────────────────────────────────────────────────────
 * Wraps a route that requires authentication (and optionally a
 * specific role). Unauthenticated users are redirected to /login
 * with the original location stored in state so they can be sent
 * back after successful login.
 *
 * Usage:
 *   <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
 *   <Route path="/dashboard/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
 *
 * @param {React.ReactNode} children - Component to render if authorised
 * @param {string[]}        [roles]  - Optional whitelist of allowed roles
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();

  // Not logged in → redirect to login, remembering the intended URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role → redirect to their dashboard or home
  if (roles && roles.length > 0 && !roles.includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'doctor') return <Navigate to="/doctor" replace />;
    if (userRole === 'pharmacist') return <Navigate to="/pharmacist" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
