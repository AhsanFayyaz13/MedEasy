import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  FaUsers,
  FaUserCheck,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
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
  const { totalItems, clearCart } = useCart();
  const { isAuthenticated, logout, user, userRole } = useAuth();
  const location = useLocation();

  const serverUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'overview';

  const roleMeta = ROLE_META[userRole] || ROLE_META.patient;
  const isPatientOrGuest = !isAuthenticated || userRole === 'patient';

  const handleLogout = () => {
    logout();
    clearCart();
    setExpanded(false);
    navigate('/login');
  };

  const closeNav = () => setExpanded(false);

  const handleBrandClick = (e) => {
    closeNav();
    if (!isPatientOrGuest) {
      e.preventDefault();
      window.location.href = roleMeta.dashPath;
    }
  };

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
        <BSNavbar.Brand 
          as={Link} 
          to={isPatientOrGuest ? "/" : roleMeta.dashPath} 
          className="brand" 
          onClick={handleBrandClick}
        >
          <FaPills className="brand-icon" />
          <span>Med<span className="brand-accent">Easy</span></span>
        </BSNavbar.Brand>

        {/* Cart visible on mobile too (before toggle) */}
        {isPatientOrGuest && (
          <div className="d-flex align-items-center gap-2 d-lg-none me-2">
            <Link to="/cart" className="mobile-cart" onClick={closeNav}>
              <FaShoppingCart size={20} />
              {totalItems > 0 && <Badge pill bg="danger" className="cart-badge">{totalItems}</Badge>}
            </Link>
          </div>
        )}

        <BSNavbar.Toggle aria-controls="main-nav" />

        <BSNavbar.Collapse id="main-nav">
          {/* ── Left nav links ──────────────────────────────────── */}
          <Nav className="me-auto nav-links">
            {isPatientOrGuest ? (
              <>
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
              </>
            ) : (
              /* Non-patient roles see only their role-specific dashboard link */
              <>
                {roleMeta.dashPath && (
                  <Nav.Link
                    as={Link}
                    to={roleMeta.dashPath}
                    onClick={closeNav}
                    className={`dashboard-link ${
                      (location.pathname === roleMeta.dashPath && (userRole !== 'admin' || activeTab === 'overview')) 
                        ? 'active' 
                        : ''
                    }`}
                  >
                    <FaTachometerAlt className="nav-icon" /> {roleMeta.label} Dashboard
                  </Nav.Link>
                )}
                {userRole === 'admin' && (
                  <>
                    <Nav.Link
                      as={Link}
                      to="/admin?tab=users"
                      onClick={closeNav}
                      className={`dashboard-link ms-lg-2 ${
                        location.pathname === '/admin' && activeTab === 'users' ? 'active' : ''
                      }`}
                    >
                      <FaUsers className="nav-icon" /> User Management
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/admin?tab=verifications"
                      onClick={closeNav}
                      className={`dashboard-link ms-lg-2 ${
                        location.pathname === '/admin' && activeTab === 'verifications' ? 'active' : ''
                      }`}
                    >
                      <FaUserCheck className="nav-icon" /> Verification Requests
                    </Nav.Link>
                  </>
                )}
              </>
            )}
          </Nav>

          {/* ── Right section ────────────────────────────────────── */}
          <Nav className="align-items-center gap-2">
            {/* Cart – desktop */}
            {isPatientOrGuest && (
              <Nav.Link as={Link} to="/cart" className="cart-link d-none d-lg-flex" onClick={closeNav}>
                <FaShoppingCart size={20} />
                {totalItems > 0 && (
                  <Badge pill bg="danger" className="cart-badge">{totalItems}</Badge>
                )}
              </Nav.Link>
            )}

            {isAuthenticated ? (
              /* ── User dropdown ─────────────────────────────────── */
              <div className="d-flex align-items-center ms-2 gap-3">
                <Dropdown align="end" className="user-dropdown">
                  <Dropdown.Toggle as="div" className="user-toggle" id="user-menu">
                    <div className="user-avatar">
                      {user?.profileImage ? (
                        <img 
                          src={`${serverUrl}${user.profileImage}`} 
                          alt="Avatar" 
                          className="user-avatar-img" 
                        />
                      ) : (
                        user?.name?.[0]?.toUpperCase() || '?'
                      )}
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

                    {isPatientOrGuest && (
                      <>
                        <Dropdown.Item as={Link} to="/orders" onClick={closeNav}>
                          <FaClipboardList className="menu-icon" /> Order History
                        </Dropdown.Item>
                        <Dropdown.Item as={Link} to="/prescriptions/upload" onClick={closeNav}>
                          <FaFileUpload className="menu-icon" /> Upload Prescription
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
