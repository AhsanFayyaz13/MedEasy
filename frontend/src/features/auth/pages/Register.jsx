import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiPhone, FiUser, FiUserPlus } from 'react-icons/fi';
import { useAuth, ROLE_DASHBOARD } from '../../../context/AuthContext';
import { Alert, Button, Checkbox, Input } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import AuthShell from '../components/AuthShell';
import RoleSelect from '../components/RoleSelect';
import { ROLES } from '../lib/roles';
import PasswordField from '../components/PasswordField';
import { DoctorFields, PharmacyFields } from '../components/ProfessionalFields';
import OtpVerification from '../components/OtpVerification';
import { MIN_PASSWORD, REGISTER_INITIAL, toRegisterPayload, validateRegister } from '../lib/validation';

/**
 * Registration wizard: 1) choose role → 2) details → 3) verify OTP.
 */
export default function Register() {
  const navigate = useNavigate();
  const { register, verifyRegistration, resendVerification, isAuthenticated, userRole, loading, authError, clearAuthError } = useAuth();

  const [step, setStep] = useState('role'); // 'role' | 'details' | 'verify'
  const [fields, setFields] = useState(REGISTER_INITIAL);
  const [touched, setTouched] = useState({});
  const [pendingPhone, setPendingPhone] = useState('');

  useEffect(() => {
    if (isAuthenticated && step !== 'verify') navigate(ROLE_DASHBOARD[userRole] || '/', { replace: true });
  }, [isAuthenticated, userRole, navigate, step]);

  const errors = validateRegister(fields);
  const shown = (name) => (touched[name] ? errors[name] : undefined);
  const touchedErrors = Object.fromEntries(Object.entries(errors).filter(([k]) => touched[k]));
  const isPharmacy = fields.role === 'pharmacy';
  const roleMeta = ROLES.find((r) => r.value === fields.role);

  const setField = (name, value) => {
    setFields((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'email' && !String(value).trim() && prev.verificationChannel === 'email') next.verificationChannel = 'phone';
      return next;
    });
    if (authError) clearAuthError();
  };
  const onChange = (e) => setField(e.target.name, e.target.value);
  const onBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const goTo = (next) => {
    clearAuthError();
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitDetails = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(REGISTER_INITIAL).map((k) => [k, true])));
    if (Object.keys(errors).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    try {
      const data = await register(toRegisterPayload(fields));
      setPendingPhone(data.phone);
      goTo('verify');
    } catch {
      /* shown via authError */
    }
  };

  const verify = async (code) => {
    const { role } = await verifyRegistration(pendingPhone, code);
    setTimeout(() => navigate(ROLE_DASHBOARD[role] || '/', { replace: true }), 1200);
  };

  if (step === 'role') {
    return (
      <>
        <PageMeta title="Create your account" />
        <AuthShell
          icon={<FiUserPlus />}
          title="Create your account"
          subtitle="First, tell us who you are."
          footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
        >
          <RoleSelect
            onSelect={(role) => {
              setField('role', role);
              goTo('details');
            }}
          />
        </AuthShell>
      </>
    );
  }

  if (step === 'verify') {
    return (
      <>
        <PageMeta title="Verify your account" />
        <OtpVerification
          channel={fields.verificationChannel}
          destination={fields.verificationChannel === 'email' ? fields.email : pendingPhone}
          loading={loading}
          authError={authError}
          onClearError={clearAuthError}
          onVerify={verify}
          onResend={() => resendVerification(pendingPhone)}
          onBack={() => goTo('details')}
        />
      </>
    );
  }

  return (
    <>
      <PageMeta title="Create your account" />
      <AuthShell
        wide
        icon={roleMeta?.icon}
        title="Your details"
        subtitle={`Registering as ${roleMeta?.title.replace(/^I(’m| run) an? /, '') || fields.role}.`}
        back={
          <button type="button" className="auth-back" onClick={() => goTo('role')}>
            <FiArrowLeft aria-hidden="true" /> Change account type
          </button>
        }
        footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
      >
        {authError && <Alert tone="error" title="Registration failed" onClose={clearAuthError}>{authError}</Alert>}

        <form noValidate onSubmit={submitDetails}>
          <Input
            name="name"
            label={isPharmacy ? 'Pharmacy name' : 'Full name'}
            required
            placeholder={isPharmacy ? 'e.g. Nishtar Pharmacy' : 'Your full name'}
            leftIcon={<FiUser />}
            value={fields.name}
            onChange={onChange}
            onBlur={onBlur}
            error={shown('name')}
            autoComplete={isPharmacy ? 'organization' : 'name'}
          />
          <div className="row g-3">
            <div className="col-sm-6">
              <Input name="phone" type="tel" label="Phone number" required placeholder="03001234567" leftIcon={<FiPhone />} value={fields.phone} onChange={onChange} onBlur={onBlur} error={shown('phone')} autoComplete="tel" />
            </div>
            <div className="col-sm-6">
              <Input name="email" type="email" label="Email" hint="Optional" placeholder="you@example.com" leftIcon={<FiMail />} value={fields.email} onChange={onChange} onBlur={onBlur} error={shown('email')} autoComplete="email" />
            </div>
          </div>

          {isPharmacy && <PharmacyFields fields={fields} errors={touchedErrors} onChange={onChange} onBlur={onBlur} onPicture={(url) => setField('pharmacyOutsidePicture', url)} />}
          {fields.role === 'doctor' && (
            <DoctorFields
              fields={fields}
              errors={touchedErrors}
              onChange={onChange}
              onBlur={onBlur}
              onDays={(days) => {
                setField('availableDays', days);
                setTouched((t) => ({ ...t, availableDays: true }));
              }}
            />
          )}

          <fieldset className="auth-channel">
            <legend className="ui-field__label">Send my verification code by</legend>
            <div className="auth-channel__options">
              {[
                { value: 'phone', label: 'SMS', icon: <FiPhone /> },
                { value: 'email', label: 'Email', icon: <FiMail />, disabled: !fields.email.trim() },
              ].map((opt) => (
                <label key={opt.value} className={`auth-channel__option${fields.verificationChannel === opt.value ? ' is-selected' : ''}${opt.disabled ? ' is-disabled' : ''}`}>
                  <input type="radio" name="verificationChannel" value={opt.value} checked={fields.verificationChannel === opt.value} disabled={opt.disabled} onChange={onChange} />
                  <span aria-hidden="true">{opt.icon}</span> {opt.label}
                </label>
              ))}
            </div>
            {!fields.email.trim() && <p className="ui-field__hint">Add an email above to receive the code by email.</p>}
          </fieldset>

          <div className="row g-3">
            <div className="col-sm-6">
              <PasswordField name="password" label="Password" required showStrength value={fields.password} onChange={onChange} onBlur={onBlur} error={shown('password')} hint={`At least ${MIN_PASSWORD} characters.`} autoComplete="new-password" />
            </div>
            <div className="col-sm-6">
              <PasswordField name="confirmPassword" label="Confirm password" required value={fields.confirmPassword} onChange={onChange} onBlur={onBlur} error={shown('confirmPassword')} autoComplete="new-password" />
            </div>
          </div>

          {fields.role === 'doctor' && (
            <Alert tone="info">Doctor accounts are reviewed by our team before you can sign in. We’ll verify your PMC registration.</Alert>
          )}

          <Checkbox
            name="acceptTerms"
            required
            checked={fields.acceptTerms}
            onChange={(e) => {
              setField('acceptTerms', e.target.checked);
              setTouched((t) => ({ ...t, acceptTerms: true }));
            }}
            error={shown('acceptTerms')}
            label={
              <>
                I agree to the{' '}
                <Link to="/terms" target="_blank" rel="noopener">Terms of Service</Link> and{' '}
                <Link to="/privacy" target="_blank" rel="noopener">Privacy Policy</Link>.
              </>
            }
          />

          <Button type="submit" block size="lg" loading={loading} id="register-submit-btn">
            Create account
          </Button>
        </form>
      </AuthShell>
    </>
  );
}
