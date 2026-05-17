import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Navbar as BSNavbar,
  Nav,
  Container,
  Badge,
  Button,
  Dropdown,
} from 'react-bootstrap';
import {
  FaPills,
  FaShoppingCart,
  FaUserCircle,
  FaSignOutAlt,
  FaTachometerAlt,
  FaClipboardList,
  FaCalendarAlt,
  FaFileUpload,
  FaChevronDown,
  FaBell,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

// ─── Role config: label, dashboard path, icon ─────────────────────────────────
const ROLE_META = {
  pharmacist: { label: 'Pharmacist', dashPath: '/pharmacist', icon: <FaPills /> },
  doctor: { label: 'Doctor', dashPath: '/doctor', icon: <FaUserCircle /> },
  admin: { label: 'Admin', dashPath: '/admin', icon: <FaTachometerAlt /> },
  patient: { label: 'Patient', dashPath: null, icon: <FaUserCircle /> },
};

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_BADGE_COLOR = {
  pharmacist: '#34d399',
  doctor: '#818cf8',
  admin: '#f59e0b',
  patient: '#38bdf8',
};

export default function AppNavbar() {
  const { totalItems } = useCart();
  const { isAuthenticated, logout, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const roleMeta = ROLE_META[userRole] || ROLE_META.patient;

  const handleLogout = () => {
    logout();
    setExpanded(false);
    navigate('/login');
  };

  const closeNav = () => setExpanded(false);

  return (
    <BSNavbar
      expand="lg"
      sticky="top"
      className="medeasy-navbar"
      expanded={expanded}
      onToggle={setExpanded}
    >
      <Container>
        {/* ── Brand ──────────────────────────────────────────────── */}
        <BSNavbar.Brand as={Link} to="/" className="brand" onClick={closeNav}>
          <FaPills className="brand-icon" />
          <span>Med<span className="brand-accent">Easy</span></span>
        </BSNavbar.Brand>

        {/* Cart visible on mobile too (before toggle) */}
        <div className="d-flex align-items-center gap-2 d-lg-none me-2">
          <Link to="/cart" className="mobile-cart" onClick={closeNav}>
            <FaShoppingCart size={20} />
            {totalItems > 0 && <Badge pill bg="danger" className="cart-badge">{totalItems}</Badge>}
          </Link>
        </div>

        <BSNavbar.Toggle aria-controls="main-nav" />

        <BSNavbar.Collapse id="main-nav">
          {/* ── Left nav links ──────────────────────────────────── */}
          <Nav className="me-auto nav-links">
            <Nav.Link as={NavLink} to="/" end onClick={closeNav}>Home</Nav.Link>
            <Nav.Link as={NavLink} to="/medicines" onClick={closeNav}>Medicines</Nav.Link>

            {/* Only show protected links when logged in */}
            {isAuthenticated && (
              <>
                <Nav.Link as={NavLink} to="/appointments/book" onClick={closeNav}>
                  <FaCalendarAlt className="nav-icon" /> Appointments
                </Nav.Link>
                <Nav.Link as={NavLink} to="/prescriptions/upload" onClick={closeNav}>
                  <FaFileUpload className="nav-icon" /> Prescriptions
                </Nav.Link>
                <Nav.Link as={NavLink} to="/orders" onClick={closeNav}>
                  <FaClipboardList className="nav-icon" /> My Orders
                </Nav.Link>
              </>
            )}

            {/* Role-specific dashboard shortcut */}
            {isAuthenticated && roleMeta.dashPath && (
              <Nav.Link
                as={NavLink}
                to={roleMeta.dashPath}
                onClick={closeNav}
                className="dashboard-link"
              >
                <FaTachometerAlt className="nav-icon" /> Dashboard
              </Nav.Link>
            )}
          </Nav>

          {/* ── Right section ────────────────────────────────────── */}
          <Nav className="align-items-center gap-2">
            {/* Cart – desktop */}
            <Nav.Link as={Link} to="/cart" className="cart-link d-none d-lg-flex" onClick={closeNav}>
              <FaShoppingCart size={20} />
              {totalItems > 0 && (
                <Badge pill bg="danger" className="cart-badge">{totalItems}</Badge>
              )}
            </Nav.Link>

            {isAuthenticated ? (
              /* ── User dropdown ─────────────────────────────────── */
              <div className="d-flex align-items-center ms-2 gap-3">
                <Dropdown align="end" className="user-dropdown">
                  <Dropdown.Toggle as="div" className="user-toggle" id="user-menu">
                    <div className="user-avatar">
                      {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="user-info d-none d-lg-block">
                      <span className="user-name">{user?.name || 'Account'}</span>
                      <span
                        className="user-role-badge"
                        style={{ background: ROLE_BADGE_COLOR[userRole] || '#38bdf8' }}
                      >
                        {roleMeta.label}
                      </span>
                    </div>
                    <FaChevronDown className="toggle-arrow d-none d-lg-block" />
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="user-menu">
                    {/* Mobile role info */}
                    <div className="user-menu-header d-lg-none">
                      <strong>{user?.name}</strong>
                      <span className="d-block text-muted small">{user?.email}</span>
                      <Badge
                        style={{ background: ROLE_BADGE_COLOR[userRole] }}
                        className="mt-1"
                      >
                        {roleMeta.label}
                      </Badge>
                    </div>
                    <Dropdown.Divider className="d-lg-none" />

                    <Dropdown.Item as={Link} to="/profile" onClick={closeNav}>
                      <FaUserCircle className="menu-icon" /> My Profile
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/orders" onClick={closeNav}>
                      <FaClipboardList className="menu-icon" /> Order History
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/prescriptions/upload" onClick={closeNav}>
                      <FaFileUpload className="menu-icon" /> Upload Prescription
                    </Dropdown.Item>

                    {/* Role dashboard shortcut in dropdown */}
                    {roleMeta.dashPath && (
                      <>
                        <Dropdown.Divider />
                        <Dropdown.Item as={Link} to={roleMeta.dashPath} onClick={closeNav}>
                          <FaTachometerAlt className="menu-icon" /> {roleMeta.label} Dashboard
                        </Dropdown.Item>
                      </>
                    )}

                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className="logout-item">
                      <FaSignOutAlt className="menu-icon" /> Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            ) : (
              /* ── Auth buttons ──────────────────────────────────── */
              <div className="d-flex gap-2">
                <Button
                  as={Link}
                  to="/login"
                  variant="outline-light"
                  size="sm"
                  className="auth-btn"
                  onClick={closeNav}
                >
                  Login
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  size="sm"
                  className="auth-btn register-btn"
                  onClick={closeNav}
                >
                  Register
                </Button>
              </div>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
}
