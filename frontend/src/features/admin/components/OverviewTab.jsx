import { useMemo } from 'react';
import { tokenColor } from '../../../lib/theme';
import { Row, Col, Card } from 'react-bootstrap';
import { FaUsers, FaChartBar, FaBoxes, FaMoneyBillWave, FaShoppingCart, FaCalendarCheck, FaSlidersH } from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import { useAuth } from '../../../context/AuthContext';
import { fmtRs, chartOpts } from './adminShared';
import KpiCard from './KpiCard';


/* ═══════════════ TAB 0 – OVERVIEW (LANDING) ═══════════════════ */
export default function OverviewTab({ setActive, stats, orders }) {
  const { user } = useAuth();

  // Compute last-6-months chart from real orders
  const barData = useMemo(() => {
    const now = new Date();
    const labels = [], revenue = [], orderCounts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      const mo = (orders || []).filter(o => {
        if (o.status === 'cancelled') return false;
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });
      revenue.push(mo.reduce((s, o) => s + (o.totalAmount || 0), 0));
      orderCounts.push(mo.length);
    }
    return {
      labels,
      datasets: [
        { label: 'Revenue (Rs.)', data: revenue,      backgroundColor: tokenColor('--color-violet-400', 0.7), borderRadius: 8, borderSkipped: false },
        { label: 'Orders',        data: orderCounts,  backgroundColor: tokenColor('--color-primary-400', 0.7),  borderRadius: 8, borderSkipped: false },
      ],
    };
  }, [orders]);

  const shortcuts = [
    { label: 'User Management', tab: 'users', icon: <FaUsers size={24} />, bg: 'var(--color-neutral-100)', color: 'var(--fg-primary)', desc: 'Manage patients, doctors & roles' },
    { label: 'Medicine Catalog', tab: 'medicines', icon: <FaBoxes size={24} />, bg: 'var(--color-neutral-50)', color: 'var(--fg-accent)', desc: 'Pricing controls & inventory stock' },
    { label: 'Appointments', tab: 'appointments', icon: <FaCalendarCheck size={24} />, bg: 'var(--color-neutral-50)', color: 'var(--fg-primary)', desc: 'Hospital-wide doctor schedules' },
    { label: 'Order Tracking', tab: 'orders', icon: <FaShoppingCart size={24} />, bg: 'var(--color-neutral-0)', color: 'var(--fg-warning)', desc: 'Logistics tracking & refunds' },
    { label: 'Sales Reports', tab: 'reports', icon: <FaChartBar size={24} />, bg: 'var(--tint-violet-50)', color: 'var(--fg-violet)', desc: 'Sales trend graphs & leaderboards' },
    { label: 'System Settings', tab: 'settings', icon: <FaSlidersH size={24} />, bg: 'var(--color-neutral-50)', color: 'var(--color-secondary-500)', desc: 'Commission, courier selection' },
  ];

  return (
    <div className="adm-overview">
      {/* Landing Welcome */}
      <div className="adm-welcome-banner mb-4">
        <h2>Welcome back, {user?.name || 'Administrator'}!</h2>
        <p>Real-time analytics monitor and cross-platform medical logistics panel.</p>
      </div>

      {/* KPI Cards Grid */}
      <Row className="g-3 mb-4">
        <Col sm={6} xl={3}><KpiCard label="Total Platform Users" value={stats.usersCount} icon={<FaUsers />} color="var(--color-violet-400)" sub="Registered Accounts" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Orders Today" value={stats.ordersCount} icon={<FaShoppingCart />} color="var(--color-primary-400)" sub="Total active/processed" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Revenue MTD" value={fmtRs(stats.revenueMtd)} icon={<FaMoneyBillWave />} color="var(--color-accent-500)" sub="Month to Date" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Platform Appointments" value={stats.aptsCount} icon={<FaCalendarCheck />} color="var(--color-warning-500)" sub="Active hospital bookings" /></Col>
      </Row>

      {/* Tactile Shortcut Grid */}
      <h5 className="fw-bold mb-3 text-dark">Tactile Command Center</h5>
      <Row className="g-3 mb-4">
        {shortcuts.map(s => (
          <Col md={4} sm={6} key={s.label}>
            <Card className="adm-shortcut-card shadow-sm clickable h-100" onClick={() => setActive(s.tab)}>
              <Card.Body className="d-flex align-items-center gap-3">
                <div className="adm-shortcut-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">{s.label}</h6>
                  <p className="text-muted extra-small mb-0">{s.desc}</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Mini sales trend chart */}
      <Card className="adm-chart-card mb-4 border-0 shadow-sm">
        <Card.Body>
          <h6 className="adm-chart-title"><FaChartBar className="me-2 text-primary" />MedEasy Sales & Logistics Trend</h6>
          <div style={{ height: 250 }}>
            <Bar data={barData} options={chartOpts()} />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
