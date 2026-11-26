import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiClipboard,
  FiPackage,
  FiRefreshCw,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title, Tooltip, Legend } from 'chart.js';
import { useData } from '../../../context/DataContext';
import DashboardLayout from '../../../components/layout/DashboardLayout/DashboardLayout';
import useDashboardTab from '../../../components/layout/DashboardLayout/useDashboardTab';
import { Alert, Button, SkeletonGrid } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { reviewItems } from '../components/adminShared';
import OverviewTab from '../components/OverviewTab';
import UsersTab from '../components/UsersTab';
import VerificationsTab from '../components/VerificationsTab';
import MedicinesTab from '../components/MedicinesTab';
import AppointmentsTab from '../components/AppointmentsTab';
import OrdersTab from '../components/OrdersTab';
import ReportsTab from '../components/ReportsTab';
import SettingsTab from '../components/SettingsTab';
import AuditsTab from '../components/AuditsTab';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title, Tooltip, Legend);

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <FiActivity /> },
  { key: 'users', label: 'Users', icon: <FiUsers /> },
  { key: 'verifications', label: 'Verifications', icon: <FiUserCheck /> },
  { key: 'medicines', label: 'Medicines', icon: <FiPackage /> },
  { key: 'appointments', label: 'Appointments', icon: <FiCalendar /> },
  { key: 'orders', label: 'Orders', icon: <FiShoppingBag /> },
  { key: 'reports', label: 'Reports & analytics', icon: <FiBarChart2 /> },
  { key: 'audits', label: 'Resolution & audits', icon: <FiClipboard /> },
  { key: 'settings', label: 'Settings', icon: <FiSettings /> },
];

const SUBTITLES = {
  overview: undefined, // the overview banner says what needs attention
  users: 'Manage accounts, roles and access.',
  verifications: 'Doctors, pharmacies and pharmacists can only work after you approve them.',
  medicines: 'Catalogue, pricing and stock.',
  appointments: 'Doctor schedules across the network.',
  orders: 'Track and update customer orders.',
  reports: 'Sales and activity trends.',
  audits: 'Complaints, reports and platform feedback.',
  settings: 'Platform configuration.',
};

export default function AdminDashboard() {
  const [active, setActive] = useDashboardTab(SECTIONS);
  const {
    users, setUsers,
    orders, setOrders,
    apts, setApts,
    loading, error: loadError,
    refresh: loadAllData,
    stats,
  } = useData();

  // Doctors, new pharmacies and pharmacy pharmacists waiting for review (same rule as the queue).
  const pendingVerifications = reviewItems(users).pending.length;
  const sections = SECTIONS.map((s) => (s.key === 'verifications' && pendingVerifications ? { ...s, badge: pendingVerifications } : s));

  const globalStats = {
    usersCount: stats.usersCount,
    ordersCount: stats.ordersCount,
    aptsCount: stats.aptsCount,
    revenueMtd: stats.revenueMtd,
    commissionMtd: stats.commissionMtd,
  };

  const refreshButton = (
    <Button
      variant="secondary"
      size="sm"
      block
      onClick={loadAllData}
      loading={loading}
      leftIcon={<FiRefreshCw aria-hidden="true" />}
    >
      {loading ? 'Refreshing…' : 'Refresh data'}
    </Button>
  );

  return (
    <>
      <PageMeta title="Admin dashboard" noindex />
      <DashboardLayout
        sections={sections}
        active={active}
        onSelect={setActive}
        identity={{ avatar: <FiShield />, name: 'Admin portal', role: 'Platform control center' }}
        sidebarFooter={refreshButton}
        subtitle={SUBTITLES[active]}
        actions={<div className="d-lg-none">{refreshButton}</div>}
      >
        {loadError && (
          <Alert tone="error" title="Some data couldn’t be loaded">
            {loadError}{' '}
            <Button variant="link" size="sm" onClick={loadAllData}>
              Retry
            </Button>
          </Alert>
        )}

        {loading ? (
          <SkeletonGrid count={4} media={false} />
        ) : (
          <>
            {active === 'overview' && <OverviewTab setActive={setActive} stats={globalStats} orders={orders} pendingVerifications={pendingVerifications} />}
            {active === 'verifications' && <VerificationsTab users={users} setUsers={setUsers} />}
            {active === 'users' && <UsersTab users={users} setUsers={setUsers} />}
            {active === 'medicines' && <MedicinesTab />}
            {active === 'appointments' && <AppointmentsTab apts={apts} setApts={setApts} />}
            {active === 'orders' && <OrdersTab orders={orders} setOrders={setOrders} />}
            {active === 'reports' && <ReportsTab orders={orders} apts={apts} />}
            {active === 'audits' && <AuditsTab users={users} setUsers={setUsers} />}
            {active === 'settings' && <SettingsTab />}
          </>
        )}
      </DashboardLayout>
    </>
  );
}
