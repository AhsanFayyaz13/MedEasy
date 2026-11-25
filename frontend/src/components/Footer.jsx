import { Link } from 'react-router-dom';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaGithub,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaUsers,
  FaPills,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import './Footer.css';

export default function AppFooter() {
  const year = new Date().getFullYear();
  const { isAuthenticated } = useAuth();

  return (
    <footer className="medeasy-footer">
      <div className="medeasy-footer-container">
        <div className="medeasy-footer-grid">
          {/* Brand/Tagline Column */}
          <div className="medeasy-footer-brand-col">
            <Link to="/" className="medeasy-footer-brand">
              <FaPills style={{ fontSize: '24px', color: '#003d9b' }} />
              <span>
                Med<span style={{ color: '#003d9b' }}>Easy</span>
              </span>
            </Link>
            <p className="medeasy-footer-tagline">
              Your trusted digital pharmacy — medicines, appointments, and prescriptions at your fingertips.
            </p>
            <div className="medeasy-footer-socials">
              <a href="#" className="medeasy-footer-social-btn" aria-label="Facebook"><FaFacebookF /></a>
              <a href="#" className="medeasy-footer-social-btn" aria-label="X (Twitter)"><FaXTwitter /></a>
              <a href="#" className="medeasy-footer-social-btn" aria-label="Instagram"><FaInstagram /></a>
              <a href="https://www.linkedin.com/in/ahsan-fayyaz-a0a3a429a" target="_blank" rel="noopener noreferrer" className="medeasy-footer-social-btn" aria-label="LinkedIn"><FaLinkedinIn /></a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="medeasy-footer-social-btn" aria-label="GitHub"><FaGithub /></a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="medeasy-footer-heading">Quick Links</h4>
            <ul className="medeasy-footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/medicines">Medicines</Link></li>
              <li><Link to="/appointments">Appointments</Link></li>
              <li><Link to="/cart">Cart</Link></li>
              <li><Link to="/orders">Order Tracking</Link></li>
            </ul>
          </div>

          {/* Account Column */}
          <div>
            <h4 className="medeasy-footer-heading">Account</h4>
            <ul className="medeasy-footer-links">
              {!isAuthenticated && (
                <>
                  <li><Link to="/login">Login</Link></li>
                  <li><Link to="/register">Register</Link></li>
                </>
              )}
              <li><Link to="/profile">My Profile</Link></li>
              <li><Link to="/prescription-upload">Upload Rx</Link></li>
              <li><Link to="/reviews">Reviews</Link></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="medeasy-footer-heading">Contact Us</h4>
            <ul className="medeasy-footer-contact">
              <li>
                <FaMapMarkerAlt className="contact-icon" />
                Sector H-10, Islamabad Capital Territory, Pakistan
              </li>
              <li>
                <FaPhoneAlt className="contact-icon" />
                <a href="tel:+923019476165">+923019476165</a>
              </li>
              <li>
                <FaEnvelope className="contact-icon" />
                <a href="mailto:support@medeasy.systems">support@medeasy.systems</a>
              </li>
              <li style={{ marginTop: '16px' }}>
                <Link to="/team" className="medeasy-footer-team-link">
                  <FaUsers style={{ marginRight: '8px' }} /> Our Team
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="medeasy-footer-bottom">
          <p className="medeasy-footer-copy">
            © {year} MedEasy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
