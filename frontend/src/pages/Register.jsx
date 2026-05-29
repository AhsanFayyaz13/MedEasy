import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaEye, FaEyeSlash, FaUserPlus, FaKey, FaHospital, FaStethoscope, FaPills } from 'react-icons/fa';
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

  // Email is optional unless they select Email verification
  if (fields.verificationChannel === 'email' && !fields.email.trim()) {
    errors.email = 'Email address is required to receive verification code via email.';
  } else if (fields.email.trim() && !EMAIL_RE.test(fields.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  // Phone is mandatory
  if (!fields.phone.trim())
    errors.phone = 'Phone number is required.';
  else if (!PHONE_RE.test(fields.phone))
    errors.phone = 'Please enter a valid phone number.';

  if (!fields.role)
    errors.role = 'Please select your role.';

  if (fields.role === 'pharmacy') {
    if (!fields.pharmacyName || !fields.pharmacyName.trim())
      errors.pharmacyName = 'Pharmacy name is required.';
    if (!fields.pharmacyLocation || !fields.pharmacyLocation.trim())
      errors.pharmacyLocation = 'Pharmacy address is required.';
    if (!fields.pharmacyOutsidePicture)
      errors.pharmacyOutsidePicture = 'Pharmacy outside picture is required.';
  }

  // Simplified password: only require 8 characters minimum
  if (!fields.password)
    errors.password = 'Password is required.';
  else if (fields.password.length < 8)
    errors.password = 'Password must be at least 8 characters.';

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
const INITIAL = { name: '', email: '', phone: '', role: '', password: '', confirmPassword: '', verificationChannel: 'phone', pharmacyName: '', ownerName: '' };

export default function Register() {
  const navigate = useNavigate();
  const { 
    register, 
    verifyRegistration, 
    resendVerification, 
    isAuthenticated, 
    userRole, 
    loading, 
    authError, 
    clearAuthError 
  } = useAuth();

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
  const [uploadingImage, setUploadingImage] = useState(false);

  const handlePharmacyImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pharmacyImage', file);

    setUploadingImage(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/upload-pharmacy-image', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setFields(prev => ({ ...prev, pharmacyOutsidePicture: data.filePath }));
        setErrors(prev => ({ ...prev, pharmacyOutsidePicture: null }));
      } else {
        alert(data.message || 'Image upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error uploading image.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Flow control states
  const [roleStep,         setRoleStep]         = useState(true); // first ask "what you are?"
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingPhone,     setPendingPhone]     = useState('');
  const [resendTimer,      setResendTimer]      = useState(0);
  const [success,          setSuccess]          = useState(false);

  const strength = passwordStrength(fields.password);

  // Clear API error on typing
  useEffect(() => {
    if (authError) clearAuthError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, verificationCode]);

  // Live validate after touch
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      setErrors(validate(fields));
    }
  }, [fields, touched]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (verificationStep && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [verificationStep, resendTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => {
      const nextFields = { ...prev, [name]: value };
      // If email is cleared, force channel back to phone
      if (name === 'email' && !value.trim() && prev.verificationChannel === 'email') {
        nextFields.verificationChannel = 'phone';
      }
      return nextFields;
    });
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const selectRole = (role) => {
    setFields((prev) => ({ ...prev, role }));
    setRoleStep(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(INITIAL).map((k) => [k, true]));
    setTouched(allTouched);
    const validationErrors = validate(fields);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const payload = {
        name:     fields.name,
        email:    fields.email.trim() || undefined,
        phone:    fields.phone,
        role:     fields.role,
        password: fields.password,
        verificationChannel: fields.verificationChannel,
      };

      if (fields.role === 'pharmacy') {
        payload.pharmacyName = fields.name; // name field stores pharmacy name
        payload.ownerName = fields.ownerName;
        payload.pharmacyLocation = fields.pharmacyLocation;
        payload.pharmacyOutsidePicture = fields.pharmacyOutsidePicture;
      }

      const data = await register(payload);

      // On register success, set verification state
      setPendingPhone(data.phone);
      setVerificationStep(true);
      setResendTimer(60);
      setErrors({});
    } catch {
      // Handled by authError in useAuth
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: 'Please enter a valid 6-digit verification code.' });
      return;
    }

    try {
      const { role } = await verifyRegistration(pendingPhone, verificationCode);
      setSuccess(true);
      setTimeout(() => {
        navigate(ROLE_DASHBOARD[role] || '/', { replace: true });
      }, 1500);
    } catch {
      // Handled by authError in useAuth
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await resendVerification(pendingPhone);
      setResendTimer(60);
      setErrors({});
    } catch {
      // Handled by authError in useAuth
    }
  };

  const isValid   = (name) => touched[name] && !errors[name];
  const isInvalid = (name) => touched[name] && !!errors[name];

  // ─── Step 1: Render Role Selection ("what you are?") ───────────────────────
  if (roleStep) {
    return (
      <div className="auth-page">
        <Container>
          <Row className="justify-content-center align-items-center min-vh-auth">
            <Col xs={12} sm={10} md={8} lg={6}>
              <Card className="auth-card">
                <Card.Body className="p-4 p-md-5">
                  <div className="auth-header">
                    <div className="auth-icon-badge-wrap mb-3 mx-auto">
                      <FaUserPlus size={30} />
                    </div>
                    <h2 className="auth-title">Welcome to MedEasy</h2>
                    <p className="auth-subtitle">Let&apos;s get started. Please choose your role:</p>
                  </div>

                  <div className="role-select-container">
                    {[
                      {
                        value: 'patient',
                        icon: <FaPills size={24} />,
                        badgeClass: 'pat-badge',
                        title: 'Register as Patient',
                        desc: 'Search and order medicines, upload prescriptions, book doctor consultations, and track health schedules.',
                      },
                      {
                        value: 'doctor',
                        icon: <FaStethoscope size={24} />,
                        badgeClass: 'doc-badge',
                        title: 'Register as Doctor',
                        desc: 'Provide online consultations, manage patient appointments, view prescriptions, and guide medical plans.',
                      },
                      {
                        value: 'pharmacy',
                        icon: <FaHospital size={24} />,
                        badgeClass: 'pharm-badge',
                        title: 'Register as Pharmacy',
                        desc: 'Register your pharmacy store, list licensed pharmacist credentials, upload outside shop photos, and fulfill patient orders.',
                      },
                    ].map((role) => (
                      <div
                        key={role.value}
                        className="role-select-card"
                        onClick={() => selectRole(role.value)}
                      >
                        <div className={`role-select-badge-wrap ${role.badgeClass}`}>{role.icon}</div>
                        <div className="role-select-info">
                          <div className="role-select-title">{role.title}</div>
                          <div className="role-select-desc">{role.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="auth-switch mt-4 text-center">
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

  // ─── Step 3: Render Verification Step ──────────────────────────────────────
  if (verificationStep) {
    return (
      <div className="auth-page">
        <Container>
          <Row className="justify-content-center align-items-center min-vh-auth">
            <Col xs={12} sm={10} md={8} lg={6}>
              <Card className="auth-card">
                <Card.Body className="p-4 p-md-5">

                  {/* Header */}
                  <div className="auth-header">
                    <div className="auth-icon-badge-wrap mb-3 mx-auto">
                      <FaKey size={28} />
                    </div>
                    <h2 className="auth-title">Verify Your Account</h2>
                    <p className="auth-subtitle">
                      Enter the 6-digit code sent to your{' '}
                      <strong>{fields.verificationChannel === 'email' ? 'email' : 'phone number'}</strong>:
                      <br />
                      <span className="text-primary font-monospace fs-5">
                        {fields.verificationChannel === 'email' ? fields.email : pendingPhone}
                      </span>
                    </p>
                  </div>

                  {/* API error */}
                  {authError && (
                    <Alert variant="danger" className="auth-alert" dismissible onClose={clearAuthError}>
                      <strong>Verification failed:</strong> {authError}
                    </Alert>
                  )}

                  {/* Success */}
                  {success && (
                    <Alert variant="success" className="auth-alert">
                       Verification successful! Opening your dashboard…
                    </Alert>
                  )}

                  <Form noValidate onSubmit={handleVerifySubmit}>
                    <Form.Group className="mb-4" controlId="otpCode">
                      <Form.Label className="text-center w-100 font-semibold mb-2">Verification Code</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        className="text-center font-monospace fs-4"
                        style={{ letterSpacing: '0.3em' }}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        isInvalid={!!errors.code}
                      />
                      <Form.Control.Feedback type="invalid" className="text-center">{errors.code}</Form.Control.Feedback>
                    </Form.Group>

                    <Button
                      type="submit"
                      className="btn-auth w-100 mb-3"
                      disabled={loading || success}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Verifying…
                        </>
                      ) : (
                        'Verify Account'
                      )}
                    </Button>
                  </Form>

                  <div className="text-center mt-3">
                    <p className="mb-2 text-muted">Didn&apos;t receive the code?</p>
                    <Button
                      variant="link"
                      className="p-0 text-decoration-none font-semibold text-primary"
                      onClick={handleResend}
                      disabled={resendTimer > 0 || loading}
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Verification Code'}
                    </Button>
                  </div>

                  <hr className="my-4" />

                  <div className="text-center">
                    <Button
                      variant="link"
                      className="text-muted p-0 font-sm text-decoration-none"
                      onClick={() => {
                        setVerificationStep(false);
                        setVerificationCode('');
                        clearAuthError();
                      }}
                    >
                      ← Back to Registration (Edit details)
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // ─── Step 2: Render Details Registration Form ──────────────────────────────
  return (
    <div className="auth-page">
      <Container>
        <Row className="justify-content-center align-items-center min-vh-auth">
          <Col xs={12} sm={10} md={8} lg={6}>
            <Card className="auth-card">
              <Card.Body className="p-4 p-md-5">

                {/* Role Switcher Back Link */}
                <button
                  type="button"
                  className="change-role-btn"
                  onClick={() => {
                    setRoleStep(true);
                    clearAuthError();
                  }}
                >
                  ← Registering as <span className="text-capitalize font-bold">{fields.role}</span> (Change)
                </button>

                {/* Header */}
                <div className="auth-header">
                  <div className="auth-icon-badge-wrap mb-3 mx-auto">
                    {fields.role === 'patient' && <FaPills size={28} />}
                    {fields.role === 'doctor' && <FaStethoscope size={28} />}
                    {fields.role === 'pharmacy' && <FaHospital size={28} />}
                  </div>
                  <h2 className="auth-title">Complete Registration</h2>
                  <p className="auth-subtitle">Create your new account details</p>
                </div>

                {/* API error */}
                {authError && (
                  <Alert variant="danger" className="auth-alert" dismissible onClose={clearAuthError}>
                    <strong>Registration failed:</strong> {authError}
                  </Alert>
                )}

                <Form noValidate onSubmit={handleSubmit}>
                  {/* Full Name / Pharmacy Name */}
                  <Form.Group className="mb-3" controlId="regName">
                    <Form.Label>
                      {fields.role === 'pharmacy' ? 'Pharmacy Name' : 'Full Name'} <span className="required-star">*</span>
                    </Form.Label>
                    <div className="input-icon-wrap">
                      <FaUser className="input-icon" />
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder={fields.role === 'pharmacy' ? 'e.g. Nishtar Pharmacy' : 'Enter your name'}
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

                  {/* Phone (mandatory) */}
                  <Form.Group className="mb-3" controlId="regPhone">
                    <Form.Label>Phone Number <span className="required-star">*</span></Form.Label>
                    <div className="input-icon-wrap">
                      <FaPhone className="input-icon" />
                      <Form.Control
                        type="tel"
                        name="phone"
                        placeholder="03000000000"
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

                  {/* Email (optional) */}
                  <Form.Group className="mb-3" controlId="regEmail">
                    <Form.Label>Email Address <span className="optional-label">(optional)</span></Form.Label>
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

                  {/* Pharmacy Details */}
                  {fields.role === 'pharmacy' && (
                    <Card className="border-0 shadow-sm bg-light p-3 mb-4 rounded-3">
                      <h6 className="fw-bold text-primary mb-3"><FaHospital className="me-2 text-primary" />Pharmacy Details</h6>
                      
                      {/* Owner Full Name */}
                      <Form.Group className="mb-3" controlId="regOwnerName">
                        <Form.Label className="small fw-semibold">Owner Full Name <span className="required-star">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="ownerName"
                          placeholder="e.g. Fayyaz Ahmad"
                          value={fields.ownerName || ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.ownerName && !fields.ownerName?.trim()}
                        />
                        <Form.Control.Feedback type="invalid">Owner name is required.</Form.Control.Feedback>
                      </Form.Group>

                      {/* Pharmacy Location */}
                      <Form.Group className="mb-3" controlId="regPharmacyLocation">
                        <Form.Label className="small fw-semibold">Pharmacy Location (Address) <span className="required-star">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="pharmacyLocation"
                          placeholder="e.g. Shop 12, DHA Phase 5, Lahore"
                          value={fields.pharmacyLocation || ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.pharmacyLocation && !fields.pharmacyLocation?.trim()}
                        />
                        <Form.Control.Feedback type="invalid">Pharmacy location/address is required.</Form.Control.Feedback>
                      </Form.Group>

                      {/* Pharmacy Outside Picture Upload */}
                      <Form.Group className="mb-2" controlId="regPharmacyOutsidePicture">
                        <Form.Label className="small fw-semibold">Pharmacy Outside Picture <span className="required-star">*</span></Form.Label>
                        <div className="d-flex align-items-center gap-3">
                          <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={handlePharmacyImageUpload}
                            isInvalid={touched.pharmacyOutsidePicture && !fields.pharmacyOutsidePicture}
                          />
                          {uploadingImage && <Spinner animation="border" size="sm" className="text-primary" />}
                        </div>
                        {fields.pharmacyOutsidePicture && (
                          <div className="mt-2 text-success small d-flex align-items-center gap-1">
                            <span>✓ Image uploaded successfully!</span>
                            <a href={`http://localhost:5000${fields.pharmacyOutsidePicture}`} target="_blank" rel="noreferrer" className="text-decoration-underline text-primary">View Photo</a>
                          </div>
                        )}
                        <Form.Control.Feedback type="invalid">Pharmacy outside photo is required.</Form.Control.Feedback>
                      </Form.Group>
                    </Card>
                  )}

                  {/* Verification Channel selection */}
                  <Form.Group className="mb-3" controlId="verificationChannel">
                    <Form.Label>Verify Account Via <span className="required-star">*</span></Form.Label>
                    <div className="role-grid">
                      {[
                        { value: 'phone', label: ' Phone / SMS' },
                        { value: 'email', label: ' Email Address', disabled: !fields.email.trim() },
                      ].map(({ value, label, disabled }) => (
                        <label
                          key={value}
                          className={`role-option ${fields.verificationChannel === value ? 'selected' : ''} ${disabled ? 'disabled-label' : ''}`}
                          htmlFor={`channel-${value}`}
                          style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          <input
                            type="radio"
                            id={`channel-${value}`}
                            name="verificationChannel"
                            value={value}
                            checked={fields.verificationChannel === value}
                            onChange={(e) => {
                              if (!disabled) handleChange(e);
                            }}
                            className="d-none"
                            disabled={disabled}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {fields.verificationChannel === 'email' && !fields.email.trim() && (
                      <div className="invalid-feedback d-block mt-1">
                        You must enter an email address to verify via email.
                      </div>
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
                    disabled={loading}
                    id="register-submit-btn"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Creating account…
                      </>
                    ) : (
                      'Create Account'
                    )}
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
