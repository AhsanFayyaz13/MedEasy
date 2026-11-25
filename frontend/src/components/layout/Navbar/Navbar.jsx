import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Dropdown,
  Modal,
  Form } from 'react-bootstrap';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import ThemeToggle from '../../ui/ThemeToggle';
import './Navbar.css';
import { API_ORIGIN } from '../../../lib/env';

// ─── Notification Icon Mapping component ─────────────────────────────────────
function NotificationIcon({ type }) {
  const styles = { fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center' };
  switch (type) {
    case 'welcome': return <span className="material-symbols-outlined text-primary" style={styles}>verified</span>;
    case 'system': return <span className="material-symbols-outlined text-info" style={styles}>info</span>;
    case 'star':
    case 'review': return <span className="material-symbols-outlined text-yellow-500" style={styles}>star</span>;
    case 'cancel': return <span className="material-symbols-outlined text-error-red" style={styles}>cancel</span>;
    case 'chat': return <span className="material-symbols-outlined text-primary" style={styles}>chat</span>;
    case 'booking': return <span className="material-symbols-outlined text-info" style={styles}>calendar_today</span>;
    case 'prescription': return <span className="material-symbols-outlined text-yellow-500" style={styles}>description</span>;
    default: return <span className="material-symbols-outlined text-on-surface-variant" style={styles}>notifications</span>;
  }
}

// ─── Role config: label, dashboard path, icon ─────────────────────────────────
const ROLE_META = {
  pharmacist: { label: 'Pharmacist', dashPath: '/pharmacist' },
  pharmacy: { label: 'Pharmacy', dashPath: '/pharmacist' },
  doctor: { label: 'Doctor', dashPath: '/doctor' },
  admin: { label: 'Admin', dashPath: '/admin' },
  patient: { label: 'Patient', dashPath: null },
};


export default function AppNavbar() {
  const { totalItems, clearCart } = useCart();
  const { isAuthenticated, logout, user, userRole } = useAuth();
  const location = useLocation();

  const serverUrl = API_ORIGIN;
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [notifications, setNotifications] = useState([]);
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

  const markAsRead = (id) => {
    const key = 'medeasy_notifications_' + (user?._id || user?.id || user?.role || 'guest');
    const updated = notifications.map(item => item.id === id ? { ...item, unread: false } : item);
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
      navigate(roleMeta.dashPath);
    }
  };

  return (
    <header className="medeasy-header">
      <div className="medeasy-header-container">
        {/* Logo / Brand */}
        <Link
          to={isPatientOrGuest ? "/" : roleMeta.dashPath}
          className="medeasy-brand"
          onClick={handleBrandClick}
        >
          <img
            alt="MedEasy Logo"
            src="/MedEasy_withoutBG.png"
          />
          <span>
            Med<span style={{ color: 'var(--fg-primary)' }}>Easy</span>
          </span>
        </Link>

        {/* Navigation Links - Desktop */}
        <nav className="medeasy-nav">
          {isPatientOrGuest ? (
            <>
              <NavLink to="/" end onClick={closeNav} className={({ isActive }) => `medeasy-nav-link${isActive ? ' active' : ''}`}>
                Home
              </NavLink>
              <NavLink to="/medicines" onClick={closeNav} className={({ isActive }) => `medeasy-nav-link${isActive ? ' active' : ''}`}>
                Medicines
              </NavLink>
              {isAuthenticated && (
                <>
                  <NavLink to="/appointments/book" onClick={closeNav} className={({ isActive }) => `medeasy-nav-link${isActive ? ' active' : ''}`}>
                    Appointments
                  </NavLink>
                  <NavLink to="/prescriptions/upload" onClick={closeNav} className={({ isActive }) => `medeasy-nav-link${isActive ? ' active' : ''}`}>
                    Prescriptions
                  </NavLink>
                  <NavLink to="/orders" onClick={closeNav} className={({ isActive }) => `medeasy-nav-link${isActive ? ' active' : ''}`}>
                    My Orders
                  </NavLink>
                </>
              )}
            </>
          ) : (
            <>
              {userRole === 'admin' ? (
                <Link
                  to="/admin"
                  onClick={closeNav}
                  className={`medeasy-nav-link dashboard-link${(location.pathname === '/admin' && activeTab === 'overview') ? ' active' : ''}`}
                >
                  Admin Dashboard
                </Link>
              ) : (
                roleMeta.dashPath && (
                  <Link
                    to={roleMeta.dashPath}
                    onClick={closeNav}
                    className={`medeasy-nav-link dashboard-link${location.pathname === roleMeta.dashPath ? ' active' : ''}`}
                  >
                    {roleMeta.label} Dashboard
                  </Link>
                )
              )}
            </>
          )}
          {userRole !== 'admin' && (
            <NavLink to="/contact" onClick={closeNav} className={({ isActive }) => `medeasy-nav-link${isActive ? ' active' : ''}`}>
              Contact Us
            </NavLink>
          )}
        </nav>

        {/* Actions & Dropdown trigger */}
        <div className="medeasy-actions">
          <ThemeToggle />
          {/* Cart Icon */}
          {isPatientOrGuest && (
            <Link to="/cart" className="medeasy-icon-btn" onClick={closeNav}>
              <span className="material-symbols-outlined">shopping_cart</span>
              {totalItems > 0 && <span className="medeasy-cart-badge">{totalItems}</span>}
            </Link>
          )}

          {/* Notifications Dropdown */}
          {isAuthenticated && (
            <Dropdown align="end" className="d-flex align-items-center">
              <Dropdown.Toggle as="button" className="medeasy-icon-btn border-0 bg-transparent p-1 position-relative">
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && <span className="medeasy-notification-badge">{unreadCount}</span>}
              </Dropdown.Toggle>
              
              <Dropdown.Menu className="shadow-lg border-0 rounded-4 p-0" style={{ minWidth: '380px' }}>
                <div className="d-flex align-items-center justify-content-between px-3.5 py-3 border-bottom bg-white rounded-top-4">
                  <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <Button 
                      variant="link" 
                      className="p-0 text-decoration-none extra-small text-primary fw-600" 
                      onClick={markAllRead} 
                      style={{ fontSize: '0.75rem' }}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="py-1 bg-white rounded-bottom-4" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div className="text-center py-5 text-muted small">
                      <span className="material-symbols-outlined mb-2 opacity-50" style={{ fontSize: '28px' }}>notifications_off</span>
                      <p className="mb-0">No new notifications.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notification-item ${n.unread ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(n)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center justify-content-center bg-light rounded-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                          <NotificationIcon type={n.emoji} />
                        </div>
                        <div className="flex-grow-1" style={{ textAlign: 'left' }}>
                          <p className="mb-0 text-dark fw-500" style={{ fontSize: '0.8rem', lineHeight: '1.4', color: 'var(--color-neutral-800)' }}>{n.text}</p>
                          <span className="text-muted d-block mt-1" style={{ fontSize: '0.68rem', color: 'var(--fg-primary)' }}>
                            {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="d-flex align-items-center justify-content-center" style={{ width: '24px', flexShrink: 0 }}>
                          {n.unread && <span className="notification-dot"></span>}
                          {n.unread && (
                            <button
                              className="btn-mark-read bg-transparent border-0 p-1 text-primary hover:text-primary-container"
                              title="Mark as read"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>done</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Dropdown.Menu>
            </Dropdown>
          )}

          {/* User profile / Auth buttons */}
          {isAuthenticated ? (
            <Dropdown align="end">
              <Dropdown.Toggle as="div" className="medeasy-user-dropdown-toggle" id="user-menu">
                <div className="medeasy-user-avatar">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage.startsWith('data:') || user.profileImage.startsWith('http') ? user.profileImage : `${serverUrl}${user.profileImage}`}
                      alt="Avatar"
                    />
                  ) : (
                    user?.name?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="medeasy-user-info hidden md:flex">
                  <span className="medeasy-username">{user?.name || 'Account'}</span>
                  <span className="medeasy-userrole">{roleMeta.label}</span>
                </div>
                <span className="material-symbols-outlined medeasy-chevron">keyboard_arrow_down</span>
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow-lg border-0 rounded-4" style={{ minWidth: '320px', padding: '0.75rem 0' }}>
                <div className="px-3 py-2">
                  <strong>{user?.name}</strong>
                  <span className="d-block text-muted small">{user?.email}</span>
                </div>
                <Dropdown.Divider />
                
                <Dropdown.Item as={Link} to="/profile" onClick={closeNav}>
                  <span className="material-symbols-outlined text-primary me-2" style={{ fontSize: '18px' }}>account_circle</span> My Profile
                </Dropdown.Item>

                {isPatientOrGuest && (
                  <>
                    <Dropdown.Item as={Link} to="/orders" onClick={closeNav}>
                      <span className="material-symbols-outlined text-primary me-2" style={{ fontSize: '18px' }}>list_alt</span> Order History
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/prescriptions/upload" onClick={closeNav}>
                      <span className="material-symbols-outlined text-primary me-2" style={{ fontSize: '18px' }}>upload_file</span> Upload Prescription
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => { setFeedbackOpen(true); closeNav(); }}>
                      <span className="material-symbols-outlined text-yellow-500 me-2" style={{ fontSize: '18px' }}>rate_review</span> Submit Suggestions
                    </Dropdown.Item>
                  </>
                )}

                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <span className="material-symbols-outlined text-danger me-2" style={{ fontSize: '18px' }}>logout</span> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <div className="d-none d-md-flex gap-2">
              <Link to="/login" className="medeasy-btn-outline" onClick={closeNav}>
                Login
              </Link>
              <Link to="/register" className="medeasy-btn-primary" onClick={closeNav}>
                Register
              </Link>
            </div>
          )}

          {/* Burger menu button on mobile */}
          <button className="medeasy-burger" onClick={() => setExpanded(!expanded)} aria-label="Toggle navigation">
            <span className="medeasy-burger-line" style={{ transform: expanded ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
            <span className="medeasy-burger-line" style={{ opacity: expanded ? '0' : '1' }}></span>
            <span className="medeasy-burger-line" style={{ transform: expanded ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }}></span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {expanded && (
        <div className="medeasy-mobile-drawer">
          {isPatientOrGuest ? (
            <>
              <NavLink to="/" end onClick={closeNav} className="medeasy-nav-link">
                Home
              </NavLink>
              <NavLink to="/medicines" onClick={closeNav} className="medeasy-nav-link">
                Medicines
              </NavLink>
              {isAuthenticated && (
                <>
                  <NavLink to="/appointments/book" onClick={closeNav} className="medeasy-nav-link">
                    Appointments
                  </NavLink>
                  <NavLink to="/prescriptions/upload" onClick={closeNav} className="medeasy-nav-link">
                    Prescriptions
                  </NavLink>
                  <NavLink to="/orders" onClick={closeNav} className="medeasy-nav-link">
                    My Orders
                  </NavLink>
                </>
              )}
            </>
          ) : (
            <>
              {userRole === 'admin' ? (
                <Link to="/admin" onClick={closeNav} className="medeasy-nav-link dashboard-link">
                  Admin Dashboard
                </Link>
              ) : (
                roleMeta.dashPath && (
                  <Link to={roleMeta.dashPath} onClick={closeNav} className="medeasy-nav-link dashboard-link">
                    {roleMeta.label} Dashboard
                  </Link>
                )
              )}
            </>
          )}
          {userRole !== 'admin' && (
            <NavLink to="/contact" onClick={closeNav} className="medeasy-nav-link">
              Contact Us
            </NavLink>
          )}
          {!isAuthenticated && (
            <div className="d-flex flex-column gap-2 mt-2 pt-3 border-top">
              <Link to="/login" className="medeasy-btn-outline text-center justify-content-center" onClick={closeNav}>
                Login
              </Link>
              <Link to="/register" className="medeasy-btn-primary text-center justify-content-center" onClick={closeNav}>
                Register
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Suggestions Modal ── */}
      <Modal show={feedbackOpen} onHide={() => setFeedbackOpen(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white border-0 py-3 rounded-top-4">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>rate_review</span>
            Platform Suggestions & Feedback
          </Modal.Title>
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
              <Button type="submit" className="medeasy-btn-primary rounded-10 px-4 text-white">
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
          <div className="fs-1 mb-3 d-flex justify-content-center">
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
    </header>
  );
}
