import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Alert } from 'react-bootstrap';
import { FaUsers, FaChartBar, FaBoxes, FaUserShield, FaExclamationTriangle, FaClock, FaTrophy, FaShoppingCart, FaSyncAlt, FaSlidersH, FaUserCheck, FaClipboardList } from 'react-icons/fa';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title, Tooltip, Legend } from 'chart.js';
import { useData } from '../../../context/DataContext';
import './AdminDashboard.css';
import { fmtRs } from '../components/adminShared';
import OverviewTab from '../components/OverviewTab';
import UsersTab from '../components/UsersTab';
import VerificationsTab from '../components/VerificationsTab';
import MedicinesTab from '../components/MedicinesTab';
import AppointmentsTab from '../components/AppointmentsTab';
import OrdersTab from '../components/OrdersTab';
import ReportsTab from '../components/ReportsTab';
import SettingsTab from '../components/SettingsTab';
import AuditsTab from '../components/AuditsTab';
import PageMeta from '../../../components/seo/PageMeta';


ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title, Tooltip, Legend);

/* ─── Shared helpers ─────────────────────────────────────────── */


/* ═══════════════ MAIN ADMIN DASHBOARD ═════════════════════════ */
const TABS = [
  { key: 'overview',      label: 'Dashboard Overview',   icon: <FaChartBar /> },
  { key: 'users',         label: 'User Management',       icon: <FaUsers /> },
  { key: 'verifications', label: 'Verification Requests', icon: <FaUserCheck /> },
  { key: 'medicines',     label: 'Medicine Management',   icon: <FaBoxes /> },
  { key: 'appointments',  label: 'Appointment Oversight', icon: <FaClock /> },
  { key: 'orders',        label: 'Order Management',      icon: <FaShoppingCart /> },
  { key: 'reports',       label: 'Reports & Analytics',   icon: <FaTrophy /> },
  { key: 'audits',        label: 'Resolution & Audits',   icon: <FaClipboardList /> },
  { key: 'settings',      label: 'System Settings',       icon: <FaSlidersH /> },
];


export default function AdminDashboard() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab') || 'overview';

  const [active, setActive] = useState(tabParam);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);

  useEffect(() => {
    setActive(tabParam);
  }, [tabParam]);

  // ── Pull everything from the global DataContext (single source of truth) ──
  const {
    users, setUsers,
    medicines, setMedicines,
    orders, setOrders,
    apts, setApts,
    loading, error: loadError,
    refresh: loadAllData,
    stats,
  } = useData();

  const globalStats = {
    usersCount:  stats.usersCount,   // already excludes admin accounts
    ordersCount: stats.ordersCount,
    aptsCount:   stats.aptsCount,
    revenueMtd:  stats.revenueMtd,
  };

  const activeTabDetails = TABS.find(t => t.key === active);

  return (
    <div className="adm-page">
      <PageMeta title="Admin dashboard" noindex />
      <button className="adm-mobile-toggle d-lg-none" onClick={() => setMobileOpen(o => !o)}>
        ☰ Administrator Panel Menu
      </button>

      <div className="adm-layout">
        {/* ── Sidebar ── */}
        <aside className={`adm-sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="adm-sidebar-brand">
            <FaUserShield className="adm-brand-icon" />
            <div>
              <div className="adm-brand-name">Admin Portal</div>
              <div className="adm-brand-sub">Platform Control Center</div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="adm-sidebar-kpis">
            <div className="adm-sidebar-kpi">
              {loading ? (
                <span className="adm-sidebar-kpi-val text-muted" style={{fontSize:'1rem'}}>…</span>
              ) : (
                <span className="adm-sidebar-kpi-val text-primary">{globalStats.usersCount}</span>
              )}
              <span className="adm-sidebar-kpi-label">Total Accounts</span>
            </div>
            <div className="adm-sidebar-kpi">
              {loading ? (
                <span className="adm-sidebar-kpi-val text-muted" style={{fontSize:'1rem'}}>…</span>
              ) : (
                <span className="adm-sidebar-kpi-val text-success">{fmtRs(globalStats.revenueMtd)}</span>
              )}
              <span className="adm-sidebar-kpi-label">Sales MTD</span>
            </div>
          </div>

          <nav className="adm-nav">
            {TABS.filter(t => !t.hiddenFromSidebar).map(t => (
              <button key={t.key}
                className={`adm-nav-item ${active === t.key ? 'active' : ''}`}
                onClick={() => { setActive(t.key); setMobileOpen(false); }}>
                <span className="adm-nav-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Refresh Button */}
          <button
            className="adm-refresh-btn"
            onClick={loadAllData}
            disabled={loading}
            title="Reload all live data from the database"
          >
            <FaSyncAlt className={loading ? 'spin' : ''} style={{marginRight: 6}} />
            {loading ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </aside>

        {/* ── Main ── */}
        <main className="adm-main">
          <div className="adm-main-header">
            <h1 className="adm-main-title">
              {activeTabDetails?.icon}
              <span className="ms-2">{activeTabDetails?.label}</span>
            </h1>
            <p className="doc-subtitle text-muted mt-1">MedEasy network monitoring board.</p>
          </div>
          <div className="adm-content">
            {loadError && !errorDismissed && (
              <Alert variant="danger" dismissible onClose={() => setErrorDismissed(true)} className="mb-3">
                <FaExclamationTriangle className="me-2" />
                {loadError}
                <Button size="sm" variant="outline-danger" className="ms-3" onClick={() => { setErrorDismissed(false); loadAllData(); }}>Retry</Button>
              </Alert>
            )}
            {loading ? (
              <div className="adm-loading-state">
                <div className="adm-loading-spinner" />
                <p className="adm-loading-text">Loading live data from database…</p>
              </div>
            ) : (
              <>
                {active === 'overview'      && <OverviewTab setActive={setActive} stats={globalStats} orders={orders} />}
                {active === 'verifications' && <VerificationsTab users={users} setUsers={setUsers} />}
                {active === 'users'         && <UsersTab users={users} setUsers={setUsers} />}
                {active === 'medicines'    && <MedicinesTab medicines={medicines} setMedicines={setMedicines} />}
                {active === 'appointments' && <AppointmentsTab apts={apts} setApts={setApts} />}
                {active === 'orders'       && <OrdersTab orders={orders} setOrders={setOrders} />}
                {active === 'reports'      && <ReportsTab orders={orders} medicines={medicines} apts={apts} />}
                {active === 'audits'       && <AuditsTab />}
                {active === 'settings'     && <SettingsTab />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
