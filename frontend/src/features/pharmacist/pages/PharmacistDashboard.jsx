import { FiActivity, FiArchive, FiClipboard, FiFileText, FiPackage, FiUserCheck } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import DashboardLayout from '../../../components/layout/DashboardLayout/DashboardLayout';
import useDashboardTab from '../../../components/layout/DashboardLayout/useDashboardTab';
import PageMeta from '../../../components/seo/PageMeta';
import MedicinesPage from '../components/MedicinesPage';
import OrdersPage from '../components/OrdersPage';
import PrescriptionsPage from '../components/PrescriptionsPage';
import OverviewPage from '../components/OverviewPage';
import PharmacistRepPage from '../components/PharmacistRepPage';
import './PharmacistDashboard.css';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <FiActivity /> }, // the banner says what's waiting
  { key: 'orders', label: 'Active orders', icon: <FiClipboard />, subtitle: 'Confirm, pack and dispatch customer orders.' },
  { key: 'prescriptions', label: 'Verify prescriptions', icon: <FiFileText />, subtitle: 'Approve or decline uploaded prescriptions.' },
  { key: 'medicines', label: 'Inventory', icon: <FiPackage />, subtitle: 'Manage catalogue, prices and stock levels.' },
  { key: 'pharmacist-rep', label: 'Pharmacist representative', icon: <FiUserCheck />, subtitle: 'The licensed pharmacist who signs in for your store.', ownerOnly: true },
  { key: 'history', label: 'Order history', icon: <FiArchive />, subtitle: 'Delivered and cancelled orders.' },
];

export default function PharmacistDashboard() {
  const { user } = useAuth();
  const isPharmacyOwner = user?.role === 'pharmacy';
  const sections = SECTIONS.filter((s) => !s.ownerOnly || isPharmacyOwner);
  const [active, setActive] = useDashboardTab(sections);
  const current = sections.find((s) => s.key === active);

  return (
    <>
      <PageMeta title="Pharmacy dashboard" noindex />
      <DashboardLayout
        sections={sections}
        active={active}
        onSelect={setActive}
        identity={{
          avatar: (user?.name || 'P')[0].toUpperCase(),
          name: user?.name || 'Pharmacy',
          role: isPharmacyOwner ? 'Pharmacy account' : `Pharmacist${user?.pharmacyName ? ` · ${user.pharmacyName}` : ''}`,
        }}
        subtitle={current?.subtitle}
      >
        {active === 'overview' && <OverviewPage setActiveSection={setActive} />}
        {active === 'orders' && <OrdersPage mode="active" />}
        {active === 'prescriptions' && <PrescriptionsPage />}
        {active === 'medicines' && <MedicinesPage />}
        {active === 'pharmacist-rep' && isPharmacyOwner && <PharmacistRepPage />}
        {active === 'history' && <OrdersPage mode="history" />}
      </DashboardLayout>
    </>
  );
}
