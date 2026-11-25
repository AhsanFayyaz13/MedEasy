import { useState } from 'react';
import { FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { Alert, Button, Card } from '../../../components/ui';
import PasswordField from '../../auth/components/PasswordField';
import { MIN_PASSWORD } from '../../auth/lib/validation';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

function validate(f) {
  const e = {};
  if (!f.currentPassword) e.currentPassword = 'Enter your current password.';
  if (f.newPassword.length < MIN_PASSWORD) e.newPassword = `Use at least ${MIN_PASSWORD} characters.`;
  else if (f.newPassword === f.currentPassword) e.newPassword = 'Choose a password different from the current one.';
  if (f.confirmPassword !== f.newPassword) e.confirmPassword = 'The passwords don’t match.';
  return e;
}

/**
 * Sign-in & security: change password. The API ends every other session when it changes.
 * Pharmacist representatives sign in with credentials their pharmacy manages, so they get a note instead.
 */
export default function SecuritySection({ managed = false }) {
  const { changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState('');

  const onChange = (e) => {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((x) => ({ ...x, [e.target.name]: undefined }));
    setServerError('');
  };

  const close = () => {
    setOpen(false);
    setFields(EMPTY);
    setErrors({});
    setServerError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = validate(fields);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const { message } = await changePassword(fields.currentPassword, fields.newPassword);
      close();
      setDone(message);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="security-title">
      <h2 id="security-title" className="profile-section-title"><FiShield aria-hidden="true" /> Sign-in &amp; security</h2>

      {managed ? (
        <p className="profile-security__note">
          Your sign-in details are managed by your pharmacy. Ask the pharmacy owner if you need a new password.
        </p>
      ) : (
        <>
          {done && <Alert tone="success" onClose={() => setDone('')}>{done}</Alert>}
          {!open ? (
            <div className="profile-security__row">
              <div>
                <strong>Password</strong>
                <p>Changing it signs you out on every other device.</p>
              </div>
              <Button variant="secondary" leftIcon={<FiLock aria-hidden="true" />} onClick={() => { setDone(''); setOpen(true); }}>
                Change password
              </Button>
            </div>
          ) : (
            <form noValidate onSubmit={submit} className="profile-security__form">
              {serverError && <Alert tone="error" onClose={() => setServerError('')}>{serverError}</Alert>}
              <PasswordField
                name="currentPassword"
                label="Current password"
                required
                value={fields.currentPassword}
                onChange={onChange}
                error={errors.currentPassword}
                autoComplete="current-password"
                autoFocus
              />
              <div className="row g-3">
                <div className="col-sm-6">
                  <PasswordField
                    name="newPassword"
                    label="New password"
                    required
                    showStrength
                    value={fields.newPassword}
                    onChange={onChange}
                    error={errors.newPassword}
                    hint={`At least ${MIN_PASSWORD} characters.`}
                    autoComplete="new-password"
                  />
                </div>
                <div className="col-sm-6">
                  <PasswordField
                    name="confirmPassword"
                    label="Confirm new password"
                    required
                    value={fields.confirmPassword}
                    onChange={onChange}
                    error={errors.confirmPassword}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="profile-security__actions">
                <Button variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
                <Button type="submit" loading={saving}>Update password</Button>
              </div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}
