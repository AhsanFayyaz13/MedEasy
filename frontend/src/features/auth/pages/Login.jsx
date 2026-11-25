import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiLogIn, FiUser } from 'react-icons/fi';
import { useAuth, ROLE_DASHBOARD } from '../../../context/AuthContext';
import { Alert, Button, Input } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import AuthShell from '../components/AuthShell';
import PasswordField from '../components/PasswordField';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { validateLogin } from '../lib/validation';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, userRole, loading, authError, clearAuthError, forgotPassword, resetPassword } = useAuth();
  const from = location.state?.from?.pathname;

  const [fields, setFields] = useState({ identifier: '', password: '' });
  const [touched, setTouched] = useState({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const errors = validateLogin(fields);
  const shown = (name) => (touched[name] ? errors[name] : undefined);

  useEffect(() => {
    if (isAuthenticated) navigate(from || ROLE_DASHBOARD[userRole] || '/', { replace: true });
  }, [isAuthenticated, userRole, navigate, from]);

  const onChange = (e) => {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (authError) clearAuthError();
  };
  const onBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    if (Object.keys(errors).length) return;
    try {
      const { role } = await login(fields.identifier.trim(), fields.password);
      navigate(from || ROLE_DASHBOARD[role] || '/', { replace: true });
    } catch {
      /* shown via authError */
    }
  };

  const lowerError = authError?.toLowerCase() || '';

  return (
    <>
      <PageMeta title="Log in" />
      <AuthShell
        icon={<FiLogIn />}
        title="Welcome back"
        subtitle="Sign in to your MedEasy account"
        footer={
          <>
            New to MedEasy? <Link to="/register">Create an account</Link>
          </>
        }
      >
        {authError && (
          <Alert tone="error" title="Couldn’t sign you in" onClose={clearAuthError}>
            {authError}
            {lowerError.includes('not registered') && (
              <p className="mb-0 mt-1">
                <Link to="/register" onClick={clearAuthError}>Create a new account</Link>
              </p>
            )}
            {lowerError.includes('incorrect password') && (
              <p className="mb-0 mt-1">
                <Button variant="link" onClick={() => { clearAuthError(); setForgotOpen(true); }}>
                  Reset your password
                </Button>
              </p>
            )}
          </Alert>
        )}
        {from && !authError && <Alert tone="info">Please sign in to continue.</Alert>}

        <form noValidate onSubmit={submit}>
          <Input
            name="identifier"
            label="Email or phone number"
            placeholder="you@example.com or 03001234567"
            leftIcon={<FiUser />}
            value={fields.identifier}
            onChange={onChange}
            onBlur={onBlur}
            error={shown('identifier')}
            autoComplete="username"
            required
          />
          <div className="auth-password-row">
            <Button variant="link" size="sm" onClick={() => setForgotOpen(true)}>
              Forgot password?
            </Button>
          </div>
          <PasswordField
            name="password"
            label="Password"
            value={fields.password}
            onChange={onChange}
            onBlur={onBlur}
            error={shown('password')}
            autoComplete="current-password"
            required
          />
          <Button type="submit" block size="lg" loading={loading} id="login-submit-btn">
            Sign in
          </Button>
        </form>
      </AuthShell>

      {forgotOpen && (
        <ForgotPasswordModal
          show
          onClose={() => setForgotOpen(false)}
          initialIdentifier={fields.identifier}
          forgotPassword={forgotPassword}
          resetPassword={resetPassword}
        />
      )}
    </>
  );
}
