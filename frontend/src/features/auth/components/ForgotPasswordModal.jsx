import { useState } from 'react';
import { FiKey } from 'react-icons/fi';
import { Alert, Button, Input, Modal } from '../../../components/ui';
import { MIN_PASSWORD } from '../lib/validation';
import PasswordField from './PasswordField';

/**
 * Two-step password recovery: request a code, then set a new password.
 * Remount (key) to reset. `initialIdentifier` pre-fills from the login form.
 */
export default function ForgotPasswordModal({ show, onClose, initialIdentifier = '', forgotPassword, resetPassword }) {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const requestCode = async (e) => {
    e?.preventDefault();
    setError('');
    setMessage('');
    if (!identifier.trim()) {
      setError('Please enter your email address or phone number.');
      return;
    }
    setBusy(true);
    try {
      const data = await forgotPassword(identifier.trim());
      setMessage(data?.message || 'Verification code sent.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send a recovery code.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (code.length !== 6) return setError('Please enter the 6-digit recovery code.');
    if (password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const data = await resetPassword(identifier.trim(), code, password);
      setMessage(data?.message || 'Password reset. You can now log in.');
      setDone(true);
      setTimeout(onClose, 2500);
    } catch (err) {
      setError(err.message || 'Failed to reset your password.');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={<><FiKey aria-hidden="true" /> Recover your account</>}
      description={step === 1 ? 'We’ll send a 6-digit code to verify it’s you.' : `Enter the code sent to ${identifier}.`}
    >
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {step === 1 ? (
        <form onSubmit={requestCode} noValidate>
          <Input
            label="Email or phone number"
            placeholder="Your registered email or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={busy}
            autoComplete="username"
          />
          <Button type="submit" block loading={busy}>
            Send verification code
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} noValidate>
          <Input
            label="Recovery code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            inputClassName="auth-otp"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={busy || done}
          />
          <PasswordField label="New password" value={password} onChange={(e) => setPassword(e.target.value)} showStrength disabled={busy || done} autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters.`} />
          <PasswordField label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy || done} autoComplete="new-password" />
          <Button type="submit" block loading={busy} disabled={done}>
            Reset password
          </Button>
          <p className="auth-resend">
            Didn’t get a code?{' '}
            <Button variant="link" onClick={requestCode} disabled={busy}>
              Resend
            </Button>
          </p>
        </form>
      )}
    </Modal>
  );
}
