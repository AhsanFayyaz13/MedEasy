import { Link } from 'react-router-dom';
import { FaFacebookF, FaGithub, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { FiMail, FiMapPin, FiPhone, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import './Footer.css';

/**
 * Social profiles. Leave `href` empty to hide an icon until the profile exists
 * (empty "#" links are an accessibility anti-pattern).
 */
const SOCIAL_LINKS = [
  { label: 'Facebook', icon: FaFacebookF, href: '' },
  { label: 'X (Twitter)', icon: FaXTwitter, href: '' },
  { label: 'Instagram', icon: FaInstagram, href: '' },
  { label: 'LinkedIn', icon: FaLinkedinIn, href: 'https://www.linkedin.com/in/ahsan-fayyaz-a0a3a429a' },
  { label: 'GitHub', icon: FaGithub, href: 'https://github.com' },
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
              <img src="/MedEasy_withoutBG.png" alt="" width="32" height="32" loading="lazy" />
              <span>
                Med<span className="site-footer__accent">Easy</span>
              </span>
            </Link>
            <p className="site-footer__tagline">
              Your trusted digital pharmacy — medicines, appointments and prescriptions at your fingertips.
            </p>
            <ul className="site-footer__socials">
              {SOCIAL_LINKS.filter((s) => s.href).map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`MedEasy on ${label}`}>
                    <Icon aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
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
                <FiMapPin aria-hidden="true" />
                <span>Sector H-10, Islamabad Capital Territory, Pakistan</span>
              </p>
              <p>
                <FiPhone aria-hidden="true" />
                <a href="tel:+923019476165">+92 301 9476165</a>
              </p>
              <p>
                <FiMail aria-hidden="true" />
                <a href="mailto:support@medeasy.systems">support@medeasy.systems</a>
              </p>
            </address>
            <Link to="/team" className="site-footer__team">
              <FiUsers aria-hidden="true" /> Meet our team
            </Link>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>© {year} MedEasy. All rights reserved.</p>
          <p className="site-footer__note">Medicines dispensed by licensed pharmacists. Always follow your doctor’s advice.</p>
        </div>
      </div>
    </footer>
  );
}
