import { useState } from 'react';
import { FaPills, FaClipboardList, FaFileMedical, FaChartBar, FaHistory, FaUserShield } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import './PharmacistDashboard.css';
import MedicinesPage from '../components/MedicinesPage';
import OrdersPage from '../components/OrdersPage';
import PrescriptionsPage from '../components/PrescriptionsPage';
import OverviewPage from '../components/OverviewPage';
import PharmacistRepPage from '../components/PharmacistRepPage';


/* ═══════════════════ HELPERS ═══════════════════════════════════ */


/* ═══════════════════ SIDEBAR LAYOUT ════════════════════════════ */
const SECTIONS = [
  { key:'overview',      label:'Dashboard Overview',   icon:<FaChartBar /> },
  { key:'orders',        label:'Manage Orders',        icon:<FaClipboardList /> },
  { key:'prescriptions', label:'Verify Rx',            icon:<FaFileMedical /> },
  { key:'medicines',     label:'Inventory',            icon:<FaPills /> },
  { key:'pharmacist-rep',label:'Pharmacist Representative', icon:<FaUserShield /> },
  { key:'history',       label:'Order History',        icon:<FaHistory /> },
];


export default function PharmacistDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPharmacyOwner = user?.role === 'pharmacy';

  const visibleSections = SECTIONS.filter(s => {
    if (s.key === 'pharmacist-rep') {
      return isPharmacyOwner;
    }
    return true;
  });

  const section = visibleSections.find(s => s.key === active) || visibleSections[0];

  return (
    <div className="ph-page">
      {/* Mobile sidebar toggle */}
      <button className="ph-mobile-toggle d-lg-none" onClick={() => setMobileOpen(o => !o)}>
        ☰ Dashboard Menu
      </button>

      <div className="ph-layout">
        {/* ── Sidebar ── */}
        <aside className={`ph-sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="ph-sidebar-header">
            <div className="ph-avatar">{user?.name?.[0] || 'P'}</div>
            <div>
              <div className="ph-sidebar-name">{user?.name || 'Pharmacy'}</div>
              <div className="ph-sidebar-role">
                {user?.role === 'pharmacy' 
                  ? `🏪 ${user?.pharmacyName || 'Pharmacy Store'}`
                  : 'Licensed Pharmacist'}
              </div>
            </div>
          </div>
          <nav className="ph-nav">
            {visibleSections.map(s => (
              <button
                 key={s.key}
                 className={`ph-nav-item ${active === s.key ? 'active' : ''}`}
                 onClick={() => { setActive(s.key); setMobileOpen(false); }}
              >
                <span className="ph-nav-icon">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="ph-main">
          <div className="ph-main-header">
            <h1 className="ph-main-title">{section?.icon} {section?.label}</h1>
          </div>

          <div className="ph-content">
            {active === 'overview'      && <OverviewPage setActiveSection={setActive} />}
            {active === 'medicines'     && <MedicinesPage />}
            {active === 'orders'        && <OrdersPage mode="active" />}
            {active === 'prescriptions' && <PrescriptionsPage />}
            {active === 'pharmacist-rep'&& isPharmacyOwner && <PharmacistRepPage />}
            {active === 'history'       && <OrdersPage mode="history" />}
          </div>
        </main>
      </div>
    </div>
  );
}
