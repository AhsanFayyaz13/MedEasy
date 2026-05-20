import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD } from '../context/AuthContext';
import './Auth.css';

// ─── Validation helpers ───────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields) {
  const errors = {};
  if (!fields.email.trim())            errors.email    = 'Email address is required.';
  else if (!EMAIL_RE.test(fields.email)) errors.email  = 'Please enter a valid email address.';
  if (!fields.password)                errors.password = 'Password is required.';
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, isAuthenticated, userRole, loading, authError, clearAuthError } = useAuth();

  // Where to send the user after successful login
  const from = location.state?.from?.pathname;

  // If already logged in, send to the appropriate dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from || ROLE_DASHBOARD[userRole] || '/', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate, from]);

  // Form state
  const [fields,     setFields]     = useState({ email: '', password: '' });
  const [errors,     setErrors]     = useState({});
  const [showPass,   setShowPass]   = useState(false);
  const [touched,    setTouched]    = useState({});

  // Clear API-level error when user starts typing
  useEffect(() => {
    if (authError) clearAuthError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  // Live-validate a field after it's been touched
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      setErrors(validate(fields));
    }
  }, [fields, touched]);

  const handleChange = (e) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Mark all fields touched to reveal any remaining errors
    setTouched({ email: true, password: true });
    const validationErrors = validate(fields);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const { role } = await login(fields.email, fields.password);
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
                  <div className="auth-icon-badge">🔐</div>
                  <h2 className="auth-title">Welcome Back</h2>
                  <p className="auth-subtitle">Sign in to your MedEasy account</p>
                </div>

                {/* API-level error */}
                {authError && (
                  <Alert variant="danger" className="auth-alert" dismissible onClose={clearAuthError}>
                    <strong>Login failed:</strong> {authError}
                  </Alert>
                )}

                {/* Success redirect hint when coming from a protected page */}
                {location.state?.from && !authError && (
                  <Alert variant="info" className="auth-alert">
                    Please sign in to access that page.
                  </Alert>
                )}

                

                <Form noValidate onSubmit={handleSubmit}>
                  {/* Email */}
                  <Form.Group className="mb-3" controlId="loginEmail">
                    <Form.Label>Email Address</Form.Label>
                    <div className="input-icon-wrap">
                      <FaEnvelope className="input-icon" />
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        className="ps-icon"
                        value={fields.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isValid={isValid('email')}
                        isInvalid={isInvalid('email')}
                        autoComplete="email"
                      />
                      <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className="mb-4" controlId="loginPassword">
                    <div className="d-flex justify-content-between align-items-center">
                      <Form.Label className="mb-0">Password</Form.Label>
                      <button
                        type="button"
                        className="forgot-link"
                        onClick={() => {/* TODO: forgot-password flow */}}
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
    </div>
  );
}
