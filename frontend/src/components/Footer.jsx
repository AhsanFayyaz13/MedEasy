import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import {
  FaPills,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaHeart,
} from 'react-icons/fa';
import './Footer.css';

/**
 * AppFooter – multi-column footer with links, social icons, and contact info.
 */
export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="medeasy-footer">
      <Container>
        <Row className="footer-main gy-4">
          {/* Brand column */}
          <Col md={4}>
            <div className="footer-brand">
              <FaPills className="footer-brand-icon" />
              <span className="footer-brand-name">
                Med<span className="footer-accent">Easy</span>
              </span>
            </div>
            <p className="footer-tagline">
              Your trusted digital pharmacy — medicines, appointments,
              and prescriptions at your fingertips.
            </p>
            <div className="social-links">
              <a href="#" aria-label="Facebook"><FaFacebookF /></a>
              <a href="#" aria-label="Twitter"><FaTwitter /></a>
              <a href="#" aria-label="Instagram"><FaInstagram /></a>
              <a href="#" aria-label="LinkedIn"><FaLinkedinIn /></a>
            </div>
          </Col>

          {/* Quick links */}
          <Col md={2} sm={6}>
            <h6 className="footer-heading">Quick Links</h6>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/medicines">Medicines</Link></li>
              <li><Link to="/appointments">Appointments</Link></li>
              <li><Link to="/cart">Cart</Link></li>
              <li><Link to="/orders">Order Tracking</Link></li>
            </ul>
          </Col>

          {/* Account links */}
          <Col md={2} sm={6}>
            <h6 className="footer-heading">Account</h6>
            <ul className="footer-links">
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
              <li><Link to="/profile">My Profile</Link></li>
              <li><Link to="/prescription-upload">Upload Rx</Link></li>
              <li><Link to="/reviews">Reviews</Link></li>
            </ul>
          </Col>

          {/* Contact */}
          <Col md={4}>
            <h6 className="footer-heading">Contact Us</h6>
            <ul className="footer-contact">
              <li>
                <FaMapMarkerAlt className="contact-icon" />
                123 Health Street, Karachi, Pakistan
              </li>
              <li>
                <FaPhoneAlt className="contact-icon" />
                +92 300 1234567
              </li>
              <li>
                <FaEnvelope className="contact-icon" />
                support@medeasy.pk
              </li>
            </ul>
          </Col>
        </Row>

        <hr className="footer-divider" />

        <p className="footer-copy d-flex align-items-center justify-content-center gap-1">
          &copy; {year} MedEasy. All rights reserved. Built with <FaHeart className="text-danger animate-pulse" style={{ fontSize: '0.85rem' }} /> for better healthcare.
        </p>
      </Container>
    </footer>
  );
}
