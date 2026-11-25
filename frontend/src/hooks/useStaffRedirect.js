import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DASHBOARD = {
  admin: '/admin',
  doctor: '/doctor',
  pharmacist: '/pharmacist',
  pharmacy: '/pharmacist',
};

/** Staff accounts don't shop — send them to their dashboard from patient-facing pages. */
export default function useStaffRedirect() {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();

  useEffect(() => {
    const target = isAuthenticated && DASHBOARD[userRole];
    if (target) navigate(target, { replace: true });
  }, [isAuthenticated, userRole, navigate]);
}
