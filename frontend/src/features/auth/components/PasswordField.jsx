import { useState } from 'react';
import { FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import { Input } from '../../../components/ui';
import { passwordStrength } from '../lib/validation';

/** Password input with show/hide toggle and optional strength meter. */
export default function PasswordField({ showStrength = false, value, ...props }) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;

  return (
    <div className="auth-password">
      <Input
        {...props}
        value={value}
        type={visible ? 'text' : 'password'}
        leftIcon={<FiLock />}
        rightSlot={
          <button
            type="button"
            className="ui-icon-btn ui-icon-btn--sm"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
          </button>
        }
      />
      {showStrength && value && (
        <div className={`auth-strength auth-strength--${strength.tone}`} aria-live="polite">
          <div className="auth-strength__bar" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={i <= strength.score ? 'is-on' : ''} />
            ))}
          </div>
          <span className="auth-strength__label">Password strength: {strength.label}</span>
        </div>
      )}
    </div>
  );
}
