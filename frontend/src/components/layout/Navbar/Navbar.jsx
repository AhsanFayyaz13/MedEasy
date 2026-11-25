import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import {
  FiCalendar,
  FiChevronDown,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiPackage,
  FiShoppingCart,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { assetUrl } from '../../../lib/media';
import { Avatar, Button, ThemeToggle } from '../../ui';
import NotificationsMenu from './NotificationsMenu';
import FeedbackModal from './FeedbackModal';
import useNotifications from './useNotifications';
import './Navbar.css';

const ROLE_META = {
  pharmacist: { label: 'Pharmacist', dashPath: '/pharmacist' },
  pharmacy: { label: 'Pharmacy', dashPath: '/pharmacist' },
  doctor: { label: 'Doctor', dashPath: '/doctor' },
  admin: { label: 'Admin', dashPath: '/admin' },
  patient: { label: 'Patient', dashPath: null },
};

/** Links shown in both the desktop bar and the mobile drawer. */
function useNavItems({ isAuthenticated, isPatientOrGuest, userRole, roleMeta }) {
  const items = [];
  if (isPatientOrGuest) {
    items.push({ to: '/', label: 'Home', end: true }, { to: '/medicines', label: 'Medicines' });
    if (isAuthenticated) {
      items.push(
        { to: '/appointments/book', label: 'Appointments' },
        { to: '/prescriptions/upload', label: 'Prescriptions' },
        { to: '/orders', label: 'My orders' }
      );
    }
  } else if (roleMeta.dashPath) {
    items.push({ to: roleMeta.dashPath, label: 'Dashboard' });
  }
  if (userRole !== 'admin') items.push({ to: '/contact', label: isPatientOrGuest ? 'Contact' : 'Support' });
  return items;
}

/** Account links for the user menu and the mobile drawer (main nav links aren't repeated). */
function accountLinks(isPatient, dashPath) {
  if (isPatient) {
    return [
      { to: '/profile', label: 'My profile', icon: FiUser },
      { to: '/orders', label: 'My orders', icon: FiPackage },
      { to: '/appointments/book', label: 'My appointments', icon: FiCalendar },
      { to: '/prescriptions/upload', label: 'My prescriptions', icon: FiFileText },
    ];
  }
  return [
    ...(dashPath ? [{ to: dashPath, label: 'Dashboard', icon: FiGrid }] : []),
    { to: '/profile', label: 'My profile', icon: FiUser },
  ];
}

export default function AppNavbar() {
  const { totalItems, clearCart } = useCart();
  const { isAuthenticated, logout, user, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const roleMeta = ROLE_META[userRole] || ROLE_META.patient;
  const isPatientOrGuest = !isAuthenticated || userRole === 'patient';
  const navItems = useNavItems({ isAuthenticated, isPatientOrGuest, userRole, roleMeta });
  const notif = useNotifications(user, isAuthenticated);
  const homePath = isPatientOrGuest ? '/' : roleMeta.dashPath;
  const account = accountLinks(isPatientOrGuest, roleMeta.dashPath);
  const drawerAccount = account.filter((a) => !navItems.some((n) => n.to === a.to));
  const onLogin = location.pathname === '/login';
  const onRegister = location.pathname === '/register';

  // Close the drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock page scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const handleLogout = () => {
    const wasPatient = userRole === 'patient';
    logout();
    clearCart();
    setDrawerOpen(false);
    toast.success('You’ve been signed out.');
    // Shoppers carry on browsing; staff can only use the sign-in page.
    navigate(wasPatient ? '/' : '/login');
  };

  const linkClass = ({ isActive }) => `nav-link-item${isActive ? ' is-active' : ''}`;

  return (
    <header className={`site-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="site-nav__inner">
        <Link to={homePath} className="site-nav__brand" aria-label="MedEasy home">
          <img src="/logo-96.png" alt="" width="34" height="34" />
          <span>
            Med<span className="site-nav__brand-accent">Easy</span>
          </span>
        </Link>

        <nav className="site-nav__links" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-nav__actions">
          <ThemeToggle className="d-none d-sm-inline-flex" />

          {isPatientOrGuest && (
            <Link
              to="/cart"
              className="nav-icon-btn"
              aria-label={totalItems ? `Cart, ${totalItems} items` : 'Cart'}
            >
              <FiShoppingCart aria-hidden="true" />
              {totalItems > 0 && <span className="nav-badge">{totalItems > 99 ? '99+' : totalItems}</span>}
            </Link>
          )}

          {isAuthenticated && <NotificationsMenu {...notif} onNavigate={() => setDrawerOpen(false)} />}

          {isAuthenticated ? (
            <Dropdown align="end">
              <Dropdown.Toggle as="button" type="button" className="nav-user" aria-label="Account menu">
                <Avatar src={assetUrl(user?.profileImage)} name={user?.name} size={34} />
                <span className="nav-user__meta">
                  <span className="nav-user__name">{user?.name || 'Account'}</span>
                  <span className="nav-user__role">{roleMeta.label}</span>
                </span>
                <FiChevronDown className="nav-user__chevron" aria-hidden="true" />
              </Dropdown.Toggle>

              <Dropdown.Menu className="nav-menu">
                <div className="nav-menu__head">
                  <strong>{user?.name}</strong>
                  {user?.email && <span>{user.email}</span>}
                </div>
                <Dropdown.Divider />
                {account.map(({ to, label, icon: Icon }) => (
                  <Dropdown.Item key={to} as={Link} to={to}>
                    <Icon aria-hidden="true" /> {label}
                  </Dropdown.Item>
                ))}
                {isPatientOrGuest && (
                  <Dropdown.Item as="button" onClick={() => setFeedbackOpen(true)}>
                    <FiMessageSquare aria-hidden="true" /> Send feedback
                  </Dropdown.Item>
                )}
                <Dropdown.Divider />
                <Dropdown.Item as="button" onClick={handleLogout} className="nav-menu__danger">
                  <FiLogOut aria-hidden="true" /> Log out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <div className="site-nav__auth">
              {!onLogin && (
                <Button to="/login" variant={onRegister ? 'secondary' : 'ghost'} size="sm">
                  Log in
                </Button>
              )}
              {!onRegister && (
                <Button to="/register" size="sm">
                  {onLogin ? 'Create account' : 'Get started'}
                </Button>
              )}
            </div>
          )}

          <button
            type="button"
            className="nav-icon-btn site-nav__burger"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          >
            {drawerOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`site-nav__backdrop${drawerOpen ? ' is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <nav
        id="mobile-drawer"
        className={`site-nav__drawer${drawerOpen ? ' is-open' : ''}`}
        aria-label="Mobile"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
        {isAuthenticated && (
          <div className="site-nav__drawer-account">
            <div className="site-nav__drawer-who">
              <Avatar src={assetUrl(user?.profileImage)} name={user?.name} size={36} />
              <div>
                <strong>{user?.name || 'Account'}</strong>
                <span className="site-nav__drawer-role">{roleMeta.label}</span>
              </div>
            </div>
            {drawerAccount.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon aria-hidden="true" /> {label}
              </NavLink>
            ))}
            <button type="button" className="site-nav__drawer-logout" onClick={handleLogout}>
              <FiLogOut aria-hidden="true" /> Log out
            </button>
          </div>
        )}
        <div className="site-nav__drawer-foot">
          <div className="d-flex align-items-center justify-content-between">
            <span className="text-muted small">Appearance</span>
            <ThemeToggle />
          </div>
          {!isAuthenticated && (
            <div className="d-grid gap-2 mt-3">
              <Button to="/register" block>
                Create an account
              </Button>
              <Button to="/login" variant="secondary" block>
                Log in
              </Button>
            </div>
          )}
        </div>
      </nav>

      <FeedbackModal show={feedbackOpen} onClose={() => setFeedbackOpen(false)} user={user} />
    </header>
  );
}
