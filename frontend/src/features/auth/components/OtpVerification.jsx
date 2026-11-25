import { useEffect, useState } from 'react';
import { FiArrowLeft, FiMail } from 'react-icons/fi';
import { Alert, Button, Input } from '../../../components/ui';
import AuthShell from './AuthShell';

const RESEND_SECONDS = 60;

/** Step 3 of registration: enter the 6-digit code. */
export default function OtpVerification({ destination, loading, authError, onClearError, onVerify, onResend, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setError('');
    try {
      await onVerify(code);
      setVerified(true);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    }
  };

  const resend = async () => {
    try {
      await onResend();
      setSecondsLeft(RESEND_SECONDS);
      setNotice('A new code is on its way.');
    } catch {
      /* surfaced via authError */
    }
  };

  return (
    <AuthShell
      icon={<FiMail />}
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <strong className="auth-destination">{destination}</strong>. It expires in 15 minutes.
        </>
      }
      back={
        <button type="button" className="auth-back" onClick={onBack}>
          <FiArrowLeft aria-hidden="true" /> Edit details
        </button>
      }
    >
      {authError && <Alert tone="error" title="Verification failed" onClose={onClearError}>{authError}</Alert>}
      {verified && <Alert tone="success" title="You’re verified!">Signing you in…</Alert>}
      {notice && !verified && <Alert tone="info" onClose={() => setNotice('')}>{notice}</Alert>}

      <form onSubmit={submit} noValidate>
        <Input
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          inputClassName="auth-otp"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''));
            setError('');
          }}
          error={error}
          autoFocus
        />
        <Button type="submit" block size="lg" loading={loading} disabled={verified}>
          Verify and continue
        </Button>
      </form>

      <p className="auth-resend">
        Didn’t get it?{' '}
        <Button variant="link" onClick={resend} disabled={secondsLeft > 0 || loading}>
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
        </Button>
      </p>
    </AuthShell>
  );
}
