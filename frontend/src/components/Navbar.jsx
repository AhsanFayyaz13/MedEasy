import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Navbar as BSNavbar,
  Nav,
  Container,
  Badge,
  Button,
  Dropdown,
  Modal,
  Form,
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
  FaStar,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCommentDots,
  FaTimesCircle,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Navbar.css';

// ─── Notification Icon Mapping component ─────────────────────────────────────
function NotificationIcon({ type }) {
  const styles = { fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center' };
  switch (type) {
    case 'welcome': return <FaUserCheck className="text-primary" style={styles} />;
    case 'system': return <FaInfoCircle className="text-info" style={styles} />;
    case 'star':
    case 'review': return <FaStar className="text-warning" style={styles} />;
    case 'complaint': return <FaExclamationTriangle className="text-danger" style={styles} />;
    case 'cancel': return <FaTimesCircle className="text-danger" style={styles} />;
    case 'chat': return <FaCommentDots className="text-primary" style={styles} />;
    case 'booking': return <FaCalendarAlt className="text-info" style={styles} />;
    case 'prescription': return <FaClipboardList className="text-warning" style={styles} />;
    default: return <FaBell className="text-secondary" style={styles} />;
  }
}

// ─── Role config: label, dashboard path, icon ─────────────────────────────────
const ROLE_META = {
  pharmacist: { label: 'Pharmacist', dashPath: '/pharmacist', icon: <FaPills /> },
  pharmacy: { label: 'Pharmacy', dashPath: '/pharmacist', icon: <FaPills /> },
  doctor: { label: 'Doctor', dashPath: '/doctor', icon: <FaUserCircle /> },
  admin: { label: 'Admin', dashPath: '/admin', icon: <FaTachometerAlt /> },
  patient: { label: 'Patient', dashPath: null, icon: <FaUserCircle /> },
};

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_BADGE_COLOR = {
  pharmacist: '#34d399',
  pharmacy: '#34d399',
  doctor: '#818cf8',
  admin: '#f59e0b',
  patient: '#38bdf8',
};

export default function AppNavbar() {
  const { totalItems, clearCart } = useCart();
  const { isAuthenticated, logout, user, userRole } = useAuth();
  const location = useLocation();

  const serverUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://medeasy-backend-a5yi.onrender.com';
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [viewingNotification, setViewingNotification] = useState(null);
  
  // Platform suggestions / feedback state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);

  const loadNotifications = useCallback(() => {
    if (!isAuthenticated) return;
    try {
      const primaryKey = 'medeasy_notifications_' + (user?._id || user?.id || user?.role || 'guest');
      let items = JSON.parse(localStorage.getItem(primaryKey) || 'null');

      // For patients, also merge in the broadcast fallback key
      if (user?.role === 'patient' || (!user?.role && user?._id)) {
        const broadcastKey = 'medeasy_notifications_patient';
        const broadcastRaw = localStorage.getItem(broadcastKey);
        if (broadcastRaw) {
          const broadcastItems = JSON.parse(broadcastRaw);
          if (items) {
            // Merge: add broadcast items not already in primary (by id)
            const existingIds = new Set(items.map(n => n.id));
            const newOnes = broadcastItems.filter(n => !existingIds.has(n.id));
            if (newOnes.length > 0) {
              items = [...newOnes, ...items].sort((a, b) => b.time - a.time);
              // Persist merged back to primary key
              localStorage.setItem(primaryKey, JSON.stringify(items));
              // Clear broadcast key to avoid re-merging stale items
              localStorage.removeItem(broadcastKey);
            }
          } else {
            items = broadcastItems;
            localStorage.setItem(primaryKey, JSON.stringify(items));
            localStorage.removeItem(broadcastKey);
          }
        }
      }

      if (items) {
        setNotifications(items);
      } else {
        const defaults = [
          { id: 'n1', text: 'Welcome to MedEasy! Your premium clinic portal is active.', time: Date.now() - 3600000, emoji: 'welcome', unread: true },
          { id: 'n2', text: 'Your clinical appointments and orders can be managed in real-time.', time: Date.now() - 7200000, emoji: 'system', unread: false }
        ];
        localStorage.setItem(primaryKey, JSON.stringify(defaults));
        setNotifications(defaults);
      }
    } catch (e) {
      console.error(e);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 2000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadNotifications]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    const key = 'medeasy_notifications_' + (user?._id || user?.id || user?.role || 'guest');
    const updated = notifications.map(n => ({ ...n, unread: false }));
    localStorage.setItem(key, JSON.stringify(updated));
    setNotifications(updated);
  };

  const handleNotificationClick = (n) => {
    const key = 'medeasy_notifications_' + (user?._id || user?.id || user?.role || 'guest');
    const updated = notifications.map(item => item.id === n.id ? { ...item, unread: false } : item);
    localStorage.setItem(key, JSON.stringify(updated));
    setNotifications(updated);
    
    if (n.link) {
      navigate(n.link);
      closeNav();
    } else {
      setViewingNotification(n);
    }
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) return;

    try {
      const rawFeedbacks = localStorage.getItem('medeasy_feedbacks') || '[]';
      const all = JSON.parse(rawFeedbacks);
      
      const newFeedback = {
        id: 'fb-' + Date.now(),
        patientName: user?.name || 'Patient',
        patientEmail: user?.email || '',
        feedbackType,
        subject: feedbackSubject,
        message: feedbackMessage,
        rating: Number(feedbackRating),
        time: Date.now()
      };

      all.push(newFeedback);
      localStorage.setItem('medeasy_feedbacks', JSON.stringify(all));
      alert('Thank you! Your feedback and suggestions have been submitted successfully.');

      // Send alert notification to Admin
      const rawAlerts = localStorage.getItem('medeasy_notifications_admin') || '[]';
      const alerts = JSON.parse(rawAlerts);
      alerts.unshift({
        id: 'alert-' + Date.now() + '-admin',
        text: `New Suggestion: User ${user?.name || 'Patient'} submitted a platform suggestion: "${feedbackSubject}".`,
        time: Date.now(),
        emoji: 'system',
        unread: true,
        link: '/admin?tab=audits'
      });
      localStorage.setItem('medeasy_notifications_admin', JSON.stringify(alerts));

      setFeedbackOpen(false);
      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackRating(5);
    } catch (err) {
      console.error(err);
    }
  };

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
              /* Non-patient roles see their dashboard links */
              <>
                {userRole === 'admin' ? (
                  <>
                    <Nav.Link
                      as={Link}
                      to="/admin"
                      onClick={closeNav}
                      className={`dashboard-link ${(location.pathname === '/admin' && activeTab === 'overview') ? 'active' : ''}`}
                    >
                      <FaTachometerAlt className="nav-icon" /> Admin Dashboard
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/admin?tab=users"
                      onClick={closeNav}
                      className={`dashboard-link ${(location.pathname === '/admin' && activeTab === 'users') ? 'active' : ''}`}
                    >
                      <FaUsers className="nav-icon" /> User Management
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/admin?tab=verifications"
                      onClick={closeNav}
                      className={`dashboard-link ${(location.pathname === '/admin' && activeTab === 'verifications') ? 'active' : ''}`}
                    >
                      <FaUserCheck className="nav-icon" /> Verification Requests
                    </Nav.Link>
                  </>
                ) : (
                  roleMeta.dashPath && (
                    <Nav.Link
                      as={Link}
                      to={roleMeta.dashPath}
                      onClick={closeNav}
                      className={`dashboard-link ${location.pathname === roleMeta.dashPath ? 'active' : ''}`}
                    >
                      <FaTachometerAlt className="nav-icon" /> {roleMeta.label} Dashboard
                    </Nav.Link>
                  )
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
                    <div className="user-avatar position-relative">
                      {user?.profileImage ? (
                        <img
                          src={`${serverUrl}${user.profileImage}`}
                          alt="Avatar"
                          className="user-avatar-img"
                        />
                      ) : (
                        user?.name?.[0]?.toUpperCase() || '?'
                      )}
                      {unreadCount > 0 && (
                        <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle animate-pulse" style={{ width: 12, height: 12, transform: 'translate(-30%, -30%)' }} />
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

                  <Dropdown.Menu className="user-menu shadow-lg border-0 rounded-4" style={{ minWidth: '320px', padding: '0.75rem 0' }}>
                    {/* Mobile role info */}
                    <div className="user-menu-header d-lg-none px-3 py-2">
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

                    <Dropdown.Item as={Link} to="/profile" onClick={closeNav} style={{ padding: '0.5rem 1.25rem' }}>
                      <FaUserCircle className="menu-icon" /> My Profile
                    </Dropdown.Item>

                    {isPatientOrGuest && (
                      <>
                        <Dropdown.Item as={Link} to="/orders" onClick={closeNav} style={{ padding: '0.5rem 1.25rem' }}>
                          <FaClipboardList className="menu-icon" /> Order History
                        </Dropdown.Item>
                        <Dropdown.Item as={Link} to="/prescriptions/upload" onClick={closeNav} style={{ padding: '0.5rem 1.25rem' }}>
                          <FaFileUpload className="menu-icon" /> Upload Prescription
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => { setFeedbackOpen(true); closeNav(); }} style={{ padding: '0.5rem 1.25rem' }}>
                          <FaUserCheck className="menu-icon text-warning" /> Submit Suggestions
                        </Dropdown.Item>
                      </>
                    )}

                    <Dropdown.Divider />

                    {/* Collapsible Notifications Dropdown Item */}
                    <div className="notifications-collapsible-wrapper" onClick={(e) => e.stopPropagation()}>
                      <div 
                        className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-light animate-fade-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotificationsExpanded(!notificationsExpanded);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="fw-bold text-dark small d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
                          <FaBell className="text-secondary" size={13} />
                          Notifications
                          {unreadCount > 0 && (
                            <Badge bg="danger" pill style={{ fontSize: '0.68rem', padding: '0.2rem 0.4rem' }}>
                              {unreadCount}
                            </Badge>
                          )}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          {unreadCount > 0 && (
                            <Button 
                              variant="link" 
                              className="p-0 text-decoration-none extra-small text-primary fw-600" 
                              onClick={(e) => {
                                e.stopPropagation();
                                markAllRead();
                              }} 
                              style={{ fontSize: '0.7rem' }}
                            >
                              Mark all read
                            </Button>
                          )}
                          <span className="text-muted small" style={{ transition: 'transform 0.2s', display: 'inline-block', transform: notificationsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {notificationsExpanded && (
                        <div className="px-2 py-1 bg-white animate-fade-in" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {notifications.length === 0 ? (
                            <div className="text-center py-4 text-muted small">
                              <FaBell size={20} className="mb-1 opacity-50 text-secondary" />
                              <p className="mb-0">No new notifications.</p>
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div
                                key={n.id}
                                className={`notification-item p-2 mb-1.5 rounded-3 clickable d-flex gap-2 align-items-start ${n.unread ? 'bg-light' : ''}`}
                                style={n.unread ? { borderLeft: '3px solid #34d399', cursor: 'pointer', background: '#f8fafc' } : { cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(n);
                                }}
                              >
                                <div className="d-flex align-items-center justify-content-center p-1 bg-light rounded-circle" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                                  <NotificationIcon type={n.emoji} />
                                </div>
                                <div className="flex-grow-1" style={{ textAlign: 'left' }}>
                                  <p className="mb-0 text-dark small fw-600 leading-normal" style={{ fontSize: '0.78rem', lineHeight: '1.3' }}>{n.text}</p>
                                  <span className="text-muted extra-small d-block mt-0.5" style={{ fontSize: '0.62rem' }}>
                                    {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className="logout-item" style={{ padding: '0.5rem 1.25rem' }}>
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
        {/* ── Platform Feedback & Suggestions Modal ── */}
        <Modal show={feedbackOpen} onHide={() => setFeedbackOpen(false)} centered>
          <Modal.Header closeButton className="bg-primary text-white border-0 py-3 rounded-top-4">
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2"><FaUserCheck /> Platform Suggestions & Feedback</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light rounded-bottom-4">
            <Form onSubmit={handleFeedbackSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Feedback Type</Form.Label>
                <Form.Select value={feedbackType} onChange={e => setFeedbackType(e.target.value)}>
                  <option value="suggestion">Platform Suggestion / Idea</option>
                  <option value="bug">Report a Bug / Issue</option>
                  <option value="compliment">Praise / Compliment</option>
                  <option value="other">Other Suggestions</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Rating (1 to 5 Stars)</Form.Label>
                <Form.Select value={feedbackRating} onChange={e => setFeedbackRating(e.target.value)}>
                  <option value="5">5 Stars — Excellent</option>
                  <option value="4">4 Stars — Very Good</option>
                  <option value="3">3 Stars — Good</option>
                  <option value="2">2 Stars — Fair</option>
                  <option value="1">1 Star — Poor</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Subject *</Form.Label>
                <Form.Control 
                  required 
                  type="text" 
                  placeholder="e.g. Add online payment support..." 
                  value={feedbackSubject} 
                  onChange={e => setFeedbackSubject(e.target.value)} 
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold">Suggestions / Details *</Form.Label>
                <Form.Control 
                  required 
                  as="textarea" 
                  rows={4} 
                  placeholder="Describe your idea or report details here..." 
                  value={feedbackMessage} 
                  onChange={e => setFeedbackMessage(e.target.value)} 
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="outline-secondary" className="rounded-10 px-3" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="rounded-10 px-4 text-white">
                  Submit Feedback
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* ── Viewing Notification Detail Modal ── */}
        <Modal show={!!viewingNotification} onHide={() => setViewingNotification(null)} centered size="sm">
          <Modal.Header closeButton className="bg-light border-0 py-2.5">
            <Modal.Title className="fs-6 fw-bold">Notification Details</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4 px-3 bg-light rounded-bottom-4">
            <div className="fs-1 mb-3 animate-bounce d-flex justify-content-center">
              <div className="p-3 bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                <NotificationIcon type={viewingNotification?.emoji} />
              </div>
            </div>
            <p className="fw-semibold text-dark mb-1" style={{ fontSize: '0.9rem', lineHeight: '1.45' }}>{viewingNotification?.text}</p>
            <small className="text-muted d-block mt-2" style={{ fontSize: '0.7rem' }}>
              {viewingNotification && new Date(viewingNotification.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </small>
            {viewingNotification?.link && (
              <Button 
                variant="primary" 
                className="w-100 mt-4 rounded-pill py-2 text-white font-medium border-0 shadow-sm" 
                onClick={() => {
                  navigate(viewingNotification.link);
                  setViewingNotification(null);
                  closeNav();
                }}
              >
                Go to Details
              </Button>
            )}
          </Modal.Body>
        </Modal>

      </Container>
    </BSNavbar>
  );
}
