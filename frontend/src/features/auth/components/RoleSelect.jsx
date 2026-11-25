import { FiChevronRight } from 'react-icons/fi';
import { ROLES } from '../lib/roles';



/** Step 1 of registration: choose an account type. */
export default function RoleSelect({ onSelect }) {
  return (
    <ul className="auth-roles" aria-label="Account type">
      {ROLES.map((r) => (
        <li key={r.value}>
          <button type="button" className={`auth-role auth-role--${r.tone}`} onClick={() => onSelect(r.value)}>
            <span className="auth-role__icon" aria-hidden="true">{r.icon}</span>
            <span className="auth-role__text">
              <span className="auth-role__title">{r.title}</span>
              <span className="auth-role__desc">{r.desc}</span>
            </span>
            <FiChevronRight className="auth-role__arrow" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
