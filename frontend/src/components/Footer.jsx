import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import {
  FaPills,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaGithub,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaHeart,
  FaUsers,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import './Footer.css';

const teamMembers = [
  {
    id: 1,
    name: "Ahsan Fayyaz",
    role: "Lead Full-Stack Developer & Architect",
    contribution: "Designed system architecture, configured MongoDB schemas, built Express REST APIs, and developed 100% of the React frontend codebase.",
    github: "https://github.com/AhsanFayyaz13",
    linkedin: "https://www.linkedin.com/in/ahsan-fayyaz-a0a3a429a",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80"
  },
  {
    id: 2,
    name: "Owaimer Khalid",
    role: "UI/UX & Quality Assurance Lead",
    contribution: "Assisted with initial UI layout ideation, prepared presentation mockups, and handled client-side QA user testing.",
    github: "#",
    linkedin: "https://www.linkedin.com",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80"
  },
  {
    id: 3,
    name: "Murad Ali Khan",
    role: "Product Manager & Technical Writer",
    contribution: "Managed project delivery timelines, coordinated team assets, and compiled external project documentation.",
    github: "#",
    linkedin: "https://www.linkedin.com",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80"
  }
];

/**
 * AppFooter – multi-column footer with links, social icons, and contact info.
 */
export default function AppFooter() {
  const year = new Date().getFullYear();
  const { isAuthenticated, userRole } = useAuth();

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
              <a href="#" aria-label="X (Twitter)"><FaXTwitter /></a>
              <a href="#" aria-label="Instagram"><FaInstagram /></a>
              <a href="https://www.linkedin.com/in/ahsan-fayyaz-a0a3a429a" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><FaLinkedinIn /></a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><FaGithub /></a>
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
          </Col>

          {/* Contact */}
          <Col md={4}>
            <h6 className="footer-heading">Contact Us</h6>
            <ul className="footer-contact">
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
              <li className="team-link-item mt-3 pt-2">
                <FaUsers className="contact-icon" />
                <a href="#our-team" className="team-anchor-link">Our Team</a>
              </li>
            </ul>
          </Col>
        </Row>

        <div id="our-team" className="footer-team-section mt-5 pt-4">
          <h5 className="footer-team-heading text-center mb-4">Meet Our Team</h5>
          <Row className="gy-4">
            {teamMembers.map((member) => (
              <Col key={member.id} md={4} sm={12}>
                <div className="team-card h-100 text-center p-4">
                  <div className="team-avatar-wrapper mb-3">
                    <img src={member.image} alt={member.name} className="team-avatar" />
                  </div>
                  <h6 className="team-name mb-1">{member.name}</h6>
                  <p className="team-role mb-2">{member.role}</p>
                  <p className="team-contribution small mb-4">{member.contribution}</p>
                  <div className="team-socials d-flex justify-content-center gap-3">
                    {member.github !== '#' ? (
                      <a href={member.github} target="_blank" rel="noopener noreferrer" className="team-social-icon github" aria-label={`${member.name} GitHub`}>
                        <FaGithub />
                      </a>
                    ) : (
                      <span className="team-social-icon github disabled" title="No GitHub Profile" aria-hidden="true">
                        <FaGithub />
                      </span>
                    )}
                    {member.linkedin !== '#' ? (
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="team-social-icon linkedin" aria-label={`${member.name} LinkedIn`}>
                        <FaLinkedinIn />
                      </a>
                    ) : (
                      <span className="team-social-icon linkedin disabled" title="No LinkedIn Profile" aria-hidden="true">
                        <FaLinkedinIn />
                      </span>
                    )}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        <hr className="footer-divider" />

        <p className="footer-copy d-flex align-items-center justify-content-center gap-1">
          &copy; {year} MedEasy. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
