import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUserLock, FaKey } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD } from '../context/AuthContext';
import './Auth.css';

// ─── Validation helpers ───────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,15}$/;

function validate(fields) {
  const errors = {};
  if (!fields.identifier.trim()) {
    errors.identifier = 'Email address or Phone number is required.';
  } else if (!EMAIL_RE.test(fields.identifier) && !PHONE_RE.test(fields.identifier)) {
    errors.identifier = 'Please enter a valid email address or phone number.';
  }
  if (!fields.password) {
    errors.password = 'Password is required.';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, isAuthenticated, userRole, loading, authError, clearAuthError, forgotPassword, resetPassword } = useAuth();

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = request code, 2 = reset password
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfPass, setForgotConfPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');

  const handleOpenForgotModal = () => {
    setForgotIdentifier(fields.identifier); // Pre-fill with entered login identifier!
    setForgotCode('');
    setForgotNewPass('');
    setForgotConfPass('');
    setForgotStep(1);
    setForgotMsg('');
    setForgotErr('');
    setShowForgot(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotErr('');
    setForgotMsg('');

    if (!forgotIdentifier.trim()) {
      setForgotErr('Please enter your email address or phone number.');
      return;
    }

    setForgotLoading(true);
    try {
      const data = await forgotPassword(forgotIdentifier);
      setForgotMsg(data.message || 'Verification code sent successfully!');
      setForgotStep(2);
    } catch (err) {
      setForgotErr(err.message || 'Failed to send recovery code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setForgotErr('');
    setForgotMsg('');

    if (!forgotCode.trim() || forgotCode.length !== 6) {
      setForgotErr('Please enter the 6-digit recovery code.');
      return;
    }

    if (!forgotNewPass) {
      setForgotErr('Please enter your new password.');
      return;
    }

    if (forgotNewPass.length < 8) {
      setForgotErr('Password must be at least 8 characters long.');
      return;
    }

    if (forgotNewPass !== forgotConfPass) {
      setForgotErr('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const data = await resetPassword(forgotIdentifier, forgotCode, forgotNewPass);
      setForgotMsg(data.message || 'Password reset successful! You can now log in.');
      setTimeout(() => {
        setShowForgot(false);
      }, 3000);
    } catch (err) {
      setForgotErr(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Where to send the user after successful login
  const from = location.state?.from?.pathname;

  // If already logged in, send to the appropriate dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from || ROLE_DASHBOARD[userRole] || '/', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate, from]);

  // Form state
  const [fields,     setFields]     = useState({ identifier: '', password: '' });
  const [errors,     setErrors]     = useState({});
  const [showPass,   setShowPass]   = useState(false);
  const [touched,    setTouched]    = useState({});

  // Live-validate a field after it's been touched
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      setErrors(validate(fields));
    }
  }, [fields, touched]);

  const handleChange = (e) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (authError) clearAuthError();
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Mark all fields touched to reveal any remaining errors
    setTouched({ identifier: true, password: true });
    const validationErrors = validate(fields);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const { role } = await login(fields.identifier, fields.password);
      navigate(from || ROLE_DASHBOARD[role] || '/', { replace: true });
    } catch {
      // Error is displayed from authError state – no extra handling needed
    }
  };

  const isValid = (name) => touched[name] && !errors[name];
  const isInvalid = (name) => touched[name] && !!errors[name];

  return (
    <div className="auth-page">
      <Container>
        <Row className="justify-content-center align-items-center min-vh-auth">
          <Col xs={12} sm={10} md={7} lg={5}>
            <Card className="auth-card">
              <Card.Body className="p-4 p-md-5">

                {/* Header */}
                <div className="auth-header">
                  <div className="auth-icon-badge-wrap mb-3 mx-auto">
                    <FaUserLock size={30} />
                  </div>
                  <h2 className="auth-title">Welcome Back</h2>
                  <p className="auth-subtitle">Sign in to your MedEasy account</p>
                </div>

                {/* API-level error */}
                {authError && (
                  <Alert variant="danger" className="auth-alert animate-fade" dismissible onClose={clearAuthError}>
                    <div className="d-flex flex-column gap-2 text-start">
                      <div>
                        <strong>Login failed:</strong> {authError}
                      </div>
                      {authError.toLowerCase().includes('not registered') && (
                        <div className="mt-1 pt-2 border-top small" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                          New to MedEasy? <Link to="/register" className="alert-link text-decoration-underline" style={{ fontWeight: '700' }} onClick={clearAuthError}>Create a new account here</Link>
                        </div>
                      )}
                      {authError.toLowerCase().includes('incorrect password') && (
                        <div className="mt-1 pt-2 border-top small" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                          Forgot your credentials? <button type="button" className="alert-link bg-transparent border-0 p-0 text-decoration-underline text-start" style={{ color: 'inherit', fontWeight: '700' }} onClick={() => { clearAuthError(); const forgotBtn = document.querySelector('.forgot-link'); if (forgotBtn) forgotBtn.click(); }}>Reset your password here</button>
                        </div>
                      )}
                    </div>
                  </Alert>
                )}

                {/* Success redirect hint when coming from a protected page */}
                {location.state?.from && !authError && (
                  <Alert variant="info" className="auth-alert">
                    Please sign in to access that page.
                  </Alert>
                )}

                

                <Form noValidate onSubmit={handleSubmit}>
                  {/* Identifier */}
                  <Form.Group className="mb-3" controlId="loginIdentifier">
                    <Form.Label>Email or Phone Number</Form.Label>
                    <div className="input-icon-wrap">
                      <FaEnvelope className="input-icon" />
                      <Form.Control
                        type="text"
                        name="identifier"
                        placeholder="you@example.com or 03001234567"
                        className="ps-icon"
                        value={fields.identifier}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isValid={isValid('identifier')}
                        isInvalid={isInvalid('identifier')}
                        autoComplete="username"
                      />
                      <Form.Control.Feedback type="invalid">{errors.identifier}</Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className="mb-4" controlId="loginPassword">
                    <div className="d-flex justify-content-between align-items-center">
                      <Form.Label className="mb-0">Password</Form.Label>
                      <button
                        type="button"
                        className="forgot-link"
                        onClick={handleOpenForgotModal}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="input-icon-wrap mt-1">
                      <FaLock className="input-icon" />
                      <Form.Control
                        type={showPass ? 'text' : 'password'}
                        name="password"
                        placeholder="••••••••"
                        className="ps-icon pe-eye"
                        value={fields.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isValid={isValid('password')}
                        isInvalid={isInvalid('password')}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="eye-toggle"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="btn-auth w-100"
                    disabled={loading}
                    id="login-submit-btn"
                  >
                    {loading
                      ? <><Spinner animation="border" size="sm" className="me-2" />Signing in…</>
                      : 'Sign In'
                    }
                  </Button>
                </Form>

                <p className="auth-switch mt-3 text-center">
                  Don&apos;t have an account? <Link to="/register">Register</Link>
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      {/* ── Forgot Password Modal ── */}
      <Modal show={showForgot} onHide={() => setShowForgot(false)} centered className="forgot-password-modal">
        <Modal.Header closeButton className="border-0 pb-0">
        </Modal.Header>
        <Modal.Body className="px-4 pb-4 pt-2 text-center">
          <div className="auth-icon-badge-wrap mb-3 mx-auto" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', color: '#7c3aed', boxShadow: '0 8px 20px rgba(124, 58, 237, 0.15)' }}>
            <FaKey size={26} />
          </div>
          
          <h3 className="auth-title mb-1">Recover Account</h3>
          <p className="auth-subtitle mb-4">Reset your password to regain access</p>

          {forgotErr && <Alert variant="danger" className="py-2 small text-start">{forgotErr}</Alert>}
          {forgotMsg && <Alert variant="success" className="py-2 small text-start">{forgotMsg}</Alert>}

          {forgotStep === 1 ? (
            // STEP 1: Enter email or phone
            <Form onSubmit={handleForgotSubmit} className="text-start">
              <Form.Group className="mb-3" controlId="forgotId">
                <Form.Label className="small fw-semibold">Email or Phone Number</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter your registered email or phone"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  disabled={forgotLoading}
                />
                <Form.Text className="text-muted">We will send a 6-digit OTP code to verify your identity.</Form.Text>
              </Form.Group>
              
              <Button type="submit" className="btn-auth w-100 mt-2" disabled={forgotLoading}>
                {forgotLoading ? <><Spinner animation="border" size="sm" className="me-2" />Requesting Code…</> : 'Send Verification Code'}
              </Button>
            </Form>
          ) : (
            // STEP 2: Enter code & new password
            <Form onSubmit={handleResetSubmit} className="text-start">
              <Form.Group className="mb-3" controlId="forgotOtp">
                <Form.Label className="small fw-semibold">6-Digit Recovery Code</Form.Label>
                <Form.Control
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="text-center font-monospace fs-5"
                  style={{ letterSpacing: '0.2em' }}
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                  disabled={forgotLoading}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="forgotPass">
                <Form.Label className="small fw-semibold">New Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  disabled={forgotLoading}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="forgotConf">
                <Form.Label className="small fw-semibold">Confirm New Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Confirm your password"
                  value={forgotConfPass}
                  onChange={(e) => setForgotConfPass(e.target.value)}
                  disabled={forgotLoading}
                />
              </Form.Group>

              <Button type="submit" className="btn-auth w-100 mt-2" disabled={forgotLoading}>
                {forgotLoading ? <><Spinner animation="border" size="sm" className="me-2" />Resetting Password…</> : 'Reset Password'}
              </Button>
              
              <div className="text-center mt-3 small">
                Didn't receive code?{' '}
                <button type="button" className="alert-link bg-transparent border-0 p-0 text-decoration-underline" style={{ color: '#0284c7' }} onClick={handleForgotSubmit}>Resend code</button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
