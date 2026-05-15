import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD } from '../context/AuthContext';
import './Auth.css';

// ─── Validation ───────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,15}$/;

function validate(fields) {
  const errors = {};

  if (!fields.name.trim())
    errors.name = 'Full name is required.';
  else if (fields.name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.';

  if (!fields.email.trim())
    errors.email = 'Email address is required.';
  else if (!EMAIL_RE.test(fields.email))
    errors.email = 'Please enter a valid email address.';

  if (fields.phone && !PHONE_RE.test(fields.phone))
    errors.phone = 'Please enter a valid phone number.';

  if (!fields.role)
    errors.role = 'Please select your role.';

  if (!fields.password)
    errors.password = 'Password is required.';
  else if (fields.password.length < 8)
    errors.password = 'Password must be at least 8 characters.';
  else if (!/[A-Z]/.test(fields.password))
    errors.password = 'Password must contain at least one uppercase letter.';
  else if (!/\d/.test(fields.password))
    errors.password = 'Password must contain at least one number.';

  if (!fields.confirmPassword)
    errors.confirmPassword = 'Please confirm your password.';
  else if (fields.password !== fields.confirmPassword)
    errors.confirmPassword = 'Passwords do not match.';

  return errors;
}

// ─── Password strength meter ──────────────────────────────────────────────────
function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', variant: 'secondary' };
  let score = 0;
  if (pwd.length >= 8)          score++;
  if (pwd.length >= 12)         score++;
  if (/[A-Z]/.test(pwd))        score++;
  if (/\d/.test(pwd))           score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const levels = [
    { label: 'Very Weak', variant: 'danger'  },
    { label: 'Weak',      variant: 'warning' },
    { label: 'Fair',      variant: 'info'    },
    { label: 'Strong',    variant: 'primary' },
    { label: 'Very Strong', variant: 'success' },
  ];
  return { score: (score / 5) * 100, ...levels[score - 1] ?? levels[0] };
}

// ─── Component ────────────────────────────────────────────────────────────────
const INITIAL = { name: '', email: '', phone: '', role: 'patient', password: '', confirmPassword: '' };

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated, userRole, loading, authError, clearAuthError } = useAuth();

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROLE_DASHBOARD[userRole] || '/', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  const [fields,   setFields]   = useState(INITIAL);
  const [errors,   setErrors]   = useState({});
  const [touched,  setTouched]  = useState({});
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [success,  setSuccess]  = useState(false);

  const strength = passwordStrength(fields.password);

  // Clear API error on typing
  useEffect(() => {
    if (authError) clearAuthError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  // Live validate after touch
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
    const allTouched = Object.fromEntries(Object.keys(INITIAL).map((k) => [k, true]));
    setTouched(allTouched);
    const validationErrors = validate(fields);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const { token, role } = await register({
        name:     fields.name,
        email:    fields.email,
        phone:    fields.phone || undefined,
        role:     fields.role,
        password: fields.password,
      });

      if (token) {
        // Backend auto-logged us in
        navigate(ROLE_DASHBOARD[role] || '/', { replace: true });
      } else {
        // Backend registered but didn't issue a token → show success and send to login
        setSuccess(true);
        setTimeout(() => navigate('/login', { state: { registered: true } }), 2500);
      }
    } catch {
      // Displayed via authError
    }
  };

  const isValid   = (name) => touched[name] && !errors[name];
  const isInvalid = (name) => touched[name] && !!errors[name];

  return (
    <div className="auth-page">
      <Container>
        <Row className="justify-content-center align-items-center min-vh-auth">
          <Col xs={12} sm={10} md={8} lg={6}>
            <Card className="auth-card">
              <Card.Body className="p-4 p-md-5">

                {/* Header */}
                <div className="auth-header">
                  <div className="auth-icon-badge">✨</div>
                  <h2 className="auth-title">Create Account</h2>
                  <p className="auth-subtitle">Join MedEasy for a healthier life</p>
                </div>

                {/* API error */}
                {authError && (
                  <Alert variant="danger" className="auth-alert" dismissible onClose={clearAuthError}>
                    <strong>Registration failed:</strong> {authError}
                  </Alert>
                )}

                {/* Success */}
                {success && (
                  <Alert variant="success" className="auth-alert">
                    🎉 Account created! Redirecting to login…
                  </Alert>
                )}

                <Form noValidate onSubmit={handleSubmit}>
                  {/* Full Name */}
                  <Form.Group className="mb-3" controlId="regName">
                    <Form.Label>Full Name <span className="required-star">*</span></Form.Label>
                    <div className="input-icon-wrap">
                      <FaUser className="input-icon" />
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="John Doe"
                        className="ps-icon"
                        value={fields.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isValid={isValid('name')}
                        isInvalid={isInvalid('name')}
                        autoComplete="name"
                      />
                      <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  {/* Email */}
                  <Form.Group className="mb-3" controlId="regEmail">
                    <Form.Label>Email Address <span className="required-star">*</span></Form.Label>
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

                  {/* Phone (optional) */}
                  <Form.Group className="mb-3" controlId="regPhone">
                    <Form.Label>Phone Number <span className="optional-label">(optional)</span></Form.Label>
                    <div className="input-icon-wrap">
                      <FaPhone className="input-icon" />
                      <Form.Control
                        type="tel"
                        name="phone"
                        placeholder="+92 300 0000000"
                        className="ps-icon"
                        value={fields.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isValid={isValid('phone')}
                        isInvalid={isInvalid('phone')}
                        autoComplete="tel"
                      />
                      <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  {/* Role */}
                  <Form.Group className="mb-3" controlId="regRole">
                    <Form.Label>I am a <span className="required-star">*</span></Form.Label>
                    <div className="role-grid">
                      {[
                        { value: 'patient',    label: '🤒 Patient'    },
                        { value: 'doctor',     label: '👨‍⚕️ Doctor'     },
                        { value: 'pharmacist', label: '💊 Pharmacist'  },
                      ].map(({ value, label }) => (
                        <label
                          key={value}
                          className={`role-option ${fields.role === value ? 'selected' : ''}`}
                          htmlFor={`role-${value}`}
                        >
                          <input
                            type="radio"
                            id={`role-${value}`}
                            name="role"
                            value={value}
                            checked={fields.role === value}
                            onChange={handleChange}
                            className="d-none"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {isInvalid('role') && (
                      <div className="invalid-feedback d-block">{errors.role}</div>
                    )}
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className="mb-2" controlId="regPassword">
                    <Form.Label>Password <span className="required-star">*</span></Form.Label>
                    <div className="input-icon-wrap">
                      <FaLock className="input-icon" />
                      <Form.Control
                        type={showPass ? 'text' : 'password'}
                        name="password"
                        placeholder="Min. 8 characters"
                        className="ps-icon pe-eye"
                        value={fields.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isValid={isValid('password')}
                        isInvalid={isInvalid('password')}
                        autoComplete="new-password"
                      />
                      <button type="button" className="eye-toggle" onClick={() => setShowPass((v) => !v)}>
                        {showPass ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  {/* Password strength bar */}
                  {fields.password && (
                    <div className="strength-wrap mb-3">
                      <ProgressBar
                        now={strength.score}
                        variant={strength.variant}
                        className="strength-bar"
                      />
                      <span className={`strength-label text-${strength.variant}`}>{strength.label}</span>
                    </div>
                  )}

                  {/* Confirm password */}
                  <Form.Group className="mb-4" controlId="regConfirmPassword">
                    <Form.Label>Confirm Password <span className="required-star">*</span></Form.Label>
                    <div className="input-icon-wrap">
                      <FaLock className="input-icon" />
                      <Form.Control
                        type={showConf ? 'text' : 'password'}
                        name="confirmPassword"
                        placeholder="Re-enter your password"
                        className="ps-icon pe-eye"
                        value={fields.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isValid={isValid('confirmPassword')}
                        isInvalid={isInvalid('confirmPassword')}
                        autoComplete="new-password"
                      />
                      <button type="button" className="eye-toggle" onClick={() => setShowConf((v) => !v)}>
                        {showConf ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="btn-auth w-100"
                    disabled={loading || success}
                    id="register-submit-btn"
                  >
                    {loading
                      ? <><Spinner animation="border" size="sm" className="me-2" />Creating account…</>
                      : 'Create Account'
                    }
                  </Button>
                </Form>

                <p className="auth-switch mt-3 text-center">
                  Already have an account? <Link to="/login">Sign In</Link>
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
