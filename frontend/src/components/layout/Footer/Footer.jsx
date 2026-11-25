import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { FiAlertCircle, FiArrowUp, FiCheck, FiMail, FiPackage, FiPhone } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { BUSINESS, LEGAL_LINKS } from '../../../lib/business';
import { formatPrice } from '../../../lib/format';
import { FREE_THRESHOLD } from '../../../features/cart/components/checkoutShared';
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

const STAFF_ROLES = ['doctor', 'pharmacist', 'pharmacy', 'admin'];

// True statements only (they match checkout and the refund policy).
const PROMISES = ['Prescriptions checked by licensed pharmacists', 'Cash on delivery', `Free delivery over ${formatPrice(FREE_THRESHOLD)}`];

const SHOP = [
  { to: '/medicines', label: 'All medicines' },
  { to: '/medicines?category=Analgesics', label: 'Pain relief' },
  { to: '/medicines?category=Vitamins%20%26%20Supplements', label: 'Vitamins & supplements' },
  { to: '/medicines?category=Diabetes', label: 'Diabetes care' },
  { to: '/reviews', label: 'Customer reviews' },
];

const HELP = [
  { to: '/track', label: 'Track an order', guestOnly: true },
  { to: '/orders', label: 'My orders', userOnly: true },
  { to: '/refund-policy', label: 'Refunds & returns' },
  { to: '/medical-disclaimer', label: 'Medical disclaimer' },
  { to: '/contact', label: 'Contact support' },
];

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

function LegalRow() {
  return (
    <nav aria-label="Legal">
      <ul className="site-footer__legal">
        {LEGAL_LINKS.map((l) => (
          <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

function Copyright() {
  const year = new Date().getFullYear();
  return (
    <p className="site-footer__copy">
      © {year} {BUSINESS.legalName || BUSINESS.brand}. All rights reserved.
      {BUSINESS.drapLicence && <span> · Drug sale licence {BUSINESS.drapLicence}</span>}
      <span className="site-footer__credit">
        {' '}· Site by{' '}
        <a href="https://github.com/AhsanFayyaz13" target="_blank" rel="noopener noreferrer">Ahsan Fayyaz</a>
      </span>
    </p>
  );
}

/** Slim footer for doctors, pharmacy staff and admins: support contact + legal. */
function StaffFooter() {
  return (
    <footer className="site-footer site-footer--slim">
      <div className="container site-footer__slim">
        <Copyright />
        <p className="site-footer__slim-help">
          Need help? <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · <a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a>
        </p>
        <LegalRow />
      </div>
    </footer>
  );
}

export default function AppFooter() {
  const { isAuthenticated, userRole } = useAuth();
  if (isAuthenticated && STAFF_ROLES.includes(userRole)) return <StaffFooter />;

  const socials = SOCIAL_LINKS.filter((s) => s.href);
  const help = HELP.filter((l) => !(l.guestOnly && isAuthenticated) && !(l.userOnly && !isAuthenticated));

  return (
    <footer className="site-footer">
      <div className="container">
        {/* Help strip: the things people come to the footer for */}
        <div className="site-footer__help">
          <div>
            <h2 className="site-footer__help-title">Questions about an order or a medicine?</h2>
            <p>Our team and pharmacists are happy to help.</p>
          </div>
          <ul className="site-footer__help-actions">
            <li><a href={`tel:${BUSINESS.phoneHref}`}><FiPhone aria-hidden="true" /> {BUSINESS.phone}</a></li>
            <li><a href={`mailto:${BUSINESS.email}`}><FiMail aria-hidden="true" /> {BUSINESS.email}</a></li>
            <li>
              <Link to={isAuthenticated ? '/orders' : '/track'}><FiPackage aria-hidden="true" /> {isAuthenticated ? 'My orders' : 'Track an order'}</Link>
            </li>
          </ul>
        </div>

        <div className="site-footer__grid">
          <div className="site-footer__brand-col">
            <Link to="/" className="site-footer__brand">
              <img src="/logo-96.png" alt="" width="32" height="32" loading="lazy" />
              <span>
                Med<span className="site-footer__accent">Easy</span>
              </span>
            </Link>
            <p className="site-footer__tagline">Genuine medicines, pharmacist-checked prescriptions and verified doctors, delivered to your door.</p>
            <ul className="site-footer__promises">
              {PROMISES.map((p) => (
                <li key={p}><FiCheck aria-hidden="true" /> {p}</li>
              ))}
            </ul>
            {socials.length > 0 && (
              <ul className="site-footer__socials">
                {socials.map(({ label, icon: Icon, href }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${BUSINESS.brand} on ${label}`}>
                      <Icon aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className="site-footer__heading">Shop</h2>
            <ul className="site-footer__links">
              {SHOP.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
            </ul>
          </nav>

          <nav aria-labelledby="footer-help">
            <h2 id="footer-help" className="site-footer__heading">Help</h2>
            <ul className="site-footer__links">
              {help.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
            </ul>
          </nav>

          <nav aria-labelledby="footer-account">
            <h2 id="footer-account" className="site-footer__heading">{isAuthenticated ? 'Your account' : 'Account'}</h2>
            <ul className="site-footer__links">
              {isAuthenticated ? (
                <>
                  <li><Link to="/prescriptions/upload">Prescriptions</Link></li>
                  <li><Link to="/appointments/book">Book a doctor</Link></li>
                  <li><Link to="/cart">Cart</Link></li>
                  <li><Link to="/profile">Profile &amp; settings</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/register">Create an account</Link></li>
                  <li><Link to="/login">Sign in</Link></li>
                  <li><Link to="/cart">Cart</Link></li>
                </>
              )}
            </ul>
          </nav>
        </div>

        <p className="site-footer__note">
          <FiAlertCircle aria-hidden="true" />
          <span>
            Medicines are dispensed by licensed pharmacists. Always follow your doctor’s advice. In an emergency, call{' '}
            <a href="tel:1122">1122</a>.
          </span>
        </p>

        <div className="site-footer__bottom">
          <Copyright />
          <LegalRow />
          <button type="button" className="site-footer__top" onClick={scrollTop}>
            <FiArrowUp aria-hidden="true" /> Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
