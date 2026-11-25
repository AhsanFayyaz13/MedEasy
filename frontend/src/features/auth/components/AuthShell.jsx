import { FiCheckCircle } from 'react-icons/fi';
import '../auth.css';

const PERKS = ['Authentic medicines from licensed pharmacies', 'Prescriptions verified by pharmacists', 'Book verified doctors in minutes'];

/**
 * Split-screen auth layout: brand panel (desktop) + form card.
 */
export default function AuthShell({ icon, title, subtitle, children, footer, wide = false, back }) {
  return (
    <div className="auth">
      <aside className="auth__brand" aria-hidden="true">
        <div className="auth__brand-inner">
          <img src="/logo-96.png" alt="" width="56" height="56" />
          <p className="auth__brand-title">Healthcare that fits your life.</p>
          <ul>
            {PERKS.map((p) => (
              <li key={p}>
                <FiCheckCircle /> {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="auth__panel">
        <div className={`auth__card${wide ? ' auth__card--wide' : ''}`}>
          {back}
          <header className="auth__header">
            {icon && <span className="auth__icon" aria-hidden="true">{icon}</span>}
            <h1 className="auth__title">{title}</h1>
            {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          </header>
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
