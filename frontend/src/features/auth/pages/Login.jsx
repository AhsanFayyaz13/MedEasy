import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FiLogIn, FiPackage, FiUser } from 'react-icons/fi';
import { useAuth, ROLE_DASHBOARD } from '../../../context/AuthContext';
import { Alert, Button, Input } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import AuthShell from '../components/AuthShell';
import PasswordField from '../components/PasswordField';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { validateLogin } from '../lib/validation';

/** Only same-site paths may be used as a post-login destination (no open redirects). */
const safePath = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/login') ? p : null);

const SESSION_NOTICE = {
  expired: { tone: 'info', title: 'Please sign in again', text: 'Your session ended, so we signed you out to keep your account safe.' },
  suspended: { tone: 'error', title: 'Account suspended', text: 'Your account has been suspended. Please contact support if you think this is a mistake.' },
};

/** Errors that mean "your account exists but can't sign in yet" read better as a notice than a failure. */
const isReviewMessage = (msg = '') => /being reviewed|waiting for approval|wasn’t approved/i.test(msg);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login, isAuthenticated, userRole, loading, authError, clearAuthError, forgotPassword, resetPassword } = useAuth();

  const fromState = location.state?.from;
  const from = safePath(fromState ? `${fromState.pathname}${fromState.search || ''}` : params.get('next'));
  const sessionNotice = SESSION_NOTICE[params.get('session')];

  const [fields, setFields] = useState({ identifier: '', password: '' });
  const [touched, setTouched] = useState({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const errors = validateLogin(fields);
  const shown = (name) => (touched[name] ? errors[name] : undefined);

  // Staff land on their dashboard; a patient-only page saved in `from` would bounce them anyway.
  const destination = (role) => (role === 'patient' || !role ? from || '/' : ROLE_DASHBOARD[role]);

  // Already signed in (e.g. opened /login in another tab): go straight on.
  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(userRole === 'patient' || !userRole ? from || '/' : ROLE_DASHBOARD[userRole], { replace: true });
  }, [isAuthenticated, userRole, from, navigate]);

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
      navigate(destination(role), { replace: true });
    } catch {
      /* shown via authError */
    }
  };

  const underReview = isReviewMessage(authError);

  return (
    <>
      <PageMeta title="Log in" description="Sign in to MedEasy to order medicines, upload prescriptions and manage appointments." />
      <AuthShell
        icon={<FiLogIn />}
        title="Welcome back"
        subtitle="Sign in to your MedEasy account"
        footer={
          <>
            <p className="mb-2">
              New to MedEasy? <Link to="/register">Create an account</Link>
            </p>
            <p className="auth__footer-alt mb-0">
              <FiPackage aria-hidden="true" /> Ordered without an account? <Link to="/track">Track your order</Link>
            </p>
          </>
        }
      >
        {authError &&
          (underReview ? (
            <Alert tone="warning" title="Not ready to sign in yet" onClose={clearAuthError}>
              {authError}
            </Alert>
          ) : (
            <Alert tone="error" title="Couldn’t sign you in" onClose={clearAuthError}>
              {authError}
              {/incorrect email\/phone or password/i.test(authError) && (
                <p className="mb-0 mt-1">
                  <Button variant="link" onClick={() => { clearAuthError(); setForgotOpen(true); }}>Reset your password</Button>
                  {' · '}
                  <Link to="/register" onClick={clearAuthError}>Create an account</Link>
                </p>
              )}
            </Alert>
          ))}
        {!authError && sessionNotice && (
          <Alert tone={sessionNotice.tone} title={sessionNotice.title}>{sessionNotice.text}</Alert>
        )}
        {!authError && !sessionNotice && from && <Alert tone="info">Please sign in to continue.</Alert>}

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
            autoFocus
            required
          />
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
          <div className="auth-password-row">
            <Button variant="link" size="sm" onClick={() => setForgotOpen(true)}>
              Forgot password?
            </Button>
          </div>
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
