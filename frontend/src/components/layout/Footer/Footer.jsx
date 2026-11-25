import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { FiMail, FiPhone } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { BUSINESS, LEGAL_LINKS } from '../../../lib/business';
import './Footer.css';

/**
 * MedEasy's own social profiles. Fill in `href` once a page exists; empty ones are hidden
 * (and the whole row is hidden while none are set).
 */
const SOCIAL_LINKS = [
  { label: 'Facebook', icon: FaFacebookF, href: '' },
  { label: 'X (Twitter)', icon: FaXTwitter, href: '' },
  { label: 'Instagram', icon: FaInstagram, href: '' },
];

export default function AppFooter() {
  const year = new Date().getFullYear();
  const { isAuthenticated } = useAuth();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand-col">
            <Link to="/" className="site-footer__brand">
              <img src="/logo-96.png" alt="" width="32" height="32" loading="lazy" />
              <span>
                Med<span className="site-footer__accent">Easy</span>
              </span>
            </Link>
            <p className="site-footer__tagline">
              Your trusted digital pharmacy — medicines, appointments and prescriptions at your fingertips.
            </p>
            {SOCIAL_LINKS.some((s) => s.href) && (
              <ul className="site-footer__socials">
                {SOCIAL_LINKS.filter((s) => s.href).map(({ label, icon: Icon, href }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${BUSINESS.brand} on ${label}`}>
                      <Icon aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-label="Quick links">
            <h2 className="site-footer__heading">Quick links</h2>
            <ul className="site-footer__links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/medicines">Medicines</Link></li>
              <li><Link to="/appointments/book">Appointments</Link></li>
              <li><Link to="/cart">Cart</Link></li>
              <li><Link to="/orders">Order tracking</Link></li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="site-footer__heading">Account</h2>
            <ul className="site-footer__links">
              {!isAuthenticated && (
                <>
                  <li><Link to="/login">Log in</Link></li>
                  <li><Link to="/register">Create account</Link></li>
                </>
              )}
              <li><Link to="/profile">My profile</Link></li>
              <li><Link to="/prescriptions/upload">Upload prescription</Link></li>
              <li><Link to="/reviews">Reviews</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className="site-footer__heading">Contact us</h2>
            <address className="site-footer__contact">
              <p>
                <FiPhone aria-hidden="true" />
                <a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a>
              </p>
              <p>
                <FiMail aria-hidden="true" />
                <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
              </p>
            </address>
          </div>
        </div>

        <p className="site-footer__note">
          Medicines are dispensed by licensed pharmacists. Always follow your doctor’s advice.
        </p>

        <div className="site-footer__bottom">
          <p>
            Copyright © {year} {BUSINESS.brand}. All rights reserved.
            <span className="site-footer__credit">
              {' '}· Site by{' '}
              <a href="https://github.com/AhsanFayyaz13" target="_blank" rel="noopener noreferrer">Ahsan Fayyaz</a>
            </span>
          </p>
          <nav aria-label="Legal">
            <ul className="site-footer__legal">
              {LEGAL_LINKS.map((l) => (
                <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
