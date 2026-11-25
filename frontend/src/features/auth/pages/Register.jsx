import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiClock, FiMail, FiPhone, FiUser, FiUserPlus } from 'react-icons/fi';
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

  const [step, setStep] = useState('role'); // 'role' | 'details' | 'verify' | 'review'
  const [fields, setFields] = useState(REGISTER_INITIAL);
  const [touched, setTouched] = useState({});
  const [pendingPhone, setPendingPhone] = useState('');

  useEffect(() => {
    if (isAuthenticated && step !== 'verify' && step !== 'review') navigate(ROLE_DASHBOARD[userRole] || '/', { replace: true });
  }, [isAuthenticated, userRole, navigate, step]);

  const errors = validateRegister(fields);
  const shown = (name) => (touched[name] ? errors[name] : undefined);
  const touchedErrors = Object.fromEntries(Object.entries(errors).filter(([k]) => touched[k]));
  const isPharmacy = fields.role === 'pharmacy';
  const roleMeta = ROLES.find((r) => r.value === fields.role);

  const setField = (name, value) => {
    setFields((prev) => ({ ...prev, [name]: value }));
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
    const result = await verifyRegistration(pendingPhone, code);
    if (result.pendingReview) {
      goTo('review');
      return;
    }
    setTimeout(() => navigate(ROLE_DASHBOARD[result.role] || '/', { replace: true }), 1200);
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

  if (step === 'review') {
    return (
      <>
        <PageMeta title="Application received" noindex />
        <AuthShell
          icon={<FiClock />}
          title="Application received"
          subtitle={<>Thanks, {fields.name.trim().split(' ')[0] || 'Doctor'}. Your email is verified.</>}
          footer={<>Questions? <Link to="/contact">Contact our team</Link></>}
        >
          <ol className="auth-next">
            <li><FiCheckCircle aria-hidden="true" /> <span><strong>We check your PMC registration.</strong> This usually takes 1–2 working days.</span></li>
            <li><FiMail aria-hidden="true" /> <span><strong>We email you the decision</strong> at <strong className="auth-destination">{fields.email.trim()}</strong>.</span></li>
            <li><FiUser aria-hidden="true" /> <span><strong>Once approved, sign in</strong> to set up your schedule and start taking bookings.</span></li>
          </ol>
          <Button to="/" block size="lg" variant="secondary">Back to home</Button>
        </AuthShell>
      </>
    );
  }

  if (step === 'verify') {
    return (
      <>
        <PageMeta title="Verify your account" />
        <OtpVerification
          destination={fields.email.trim()}
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
              <Input name="phone" type="tel" label="Phone number" required hint="For delivery and appointment updates." placeholder="03001234567" leftIcon={<FiPhone />} value={fields.phone} onChange={onChange} onBlur={onBlur} error={shown('phone')} autoComplete="tel" />
            </div>
            <div className="col-sm-6">
              <Input name="email" type="email" label="Email" required hint="We’ll send your verification code here." placeholder="you@example.com" leftIcon={<FiMail />} value={fields.email} onChange={onChange} onBlur={onBlur} error={shown('email')} autoComplete="email" />
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
