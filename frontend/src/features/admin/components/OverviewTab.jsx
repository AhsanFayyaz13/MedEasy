import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { FiBarChart2, FiCalendar, FiDollarSign, FiPackage, FiSettings, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { tokenColor } from '../../../lib/theme';
import { useAuth } from '../../../context/AuthContext';
import { Panel, ShortcutGrid, StatGrid, WelcomeBanner } from '../../../components/layout/DashboardLayout/widgets';
import { fmtRs, chartOpts } from './adminShared';

/** Admin landing tab: KPIs, quick actions and the 6-month sales trend. */
export default function OverviewTab({ setActive, stats, orders }) {
  const { user } = useAuth();

  const barData = useMemo(() => {
    const now = new Date();
    const labels = [];
    const revenue = [];
    const orderCounts = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      const mo = (orders || []).filter((o) => {
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
        { label: 'Revenue (Rs.)', data: revenue, backgroundColor: tokenColor('--color-primary-500', 0.75), borderRadius: 8, borderSkipped: false },
        { label: 'Orders', data: orderCounts, backgroundColor: tokenColor('--color-accent-400', 0.75), borderRadius: 8, borderSkipped: false },
      ],
    };
  }, [orders]);

  const shortcuts = [
    { key: 'users', label: 'User management', desc: 'Patients, doctors and roles', icon: <FiUsers />, tone: 'primary' },
    { key: 'medicines', label: 'Medicine catalogue', desc: 'Pricing and inventory', icon: <FiPackage />, tone: 'accent' },
    { key: 'appointments', label: 'Appointments', desc: 'Doctor schedules', icon: <FiCalendar />, tone: 'violet' },
    { key: 'orders', label: 'Order tracking', desc: 'Logistics and refunds', icon: <FiShoppingBag />, tone: 'warning' },
    { key: 'reports', label: 'Sales reports', desc: 'Trends and leaderboards', icon: <FiBarChart2 />, tone: 'rose' },
    { key: 'settings', label: 'Settings', desc: 'Commission and couriers', icon: <FiSettings />, tone: 'primary' },
  ].map((s) => ({ ...s, onClick: () => setActive(s.key) }));

  return (
    <>
      <WelcomeBanner
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Administrator'}`}
        text="Live analytics and operations across the MedEasy network."
      />

      <StatGrid
        stats={[
          { label: 'Platform users', value: stats.usersCount, icon: <FiUsers />, tone: 'violet', hint: 'Registered accounts' },
          { label: 'Orders', value: stats.ordersCount, icon: <FiShoppingBag />, tone: 'primary', hint: 'Active and processed' },
          { label: 'Revenue (MTD)', value: fmtRs(stats.revenueMtd), icon: <FiDollarSign />, tone: 'success', hint: 'Month to date' },
          { label: 'Appointments', value: stats.aptsCount, icon: <FiCalendar />, tone: 'warning', hint: 'Active bookings' },
        ]}
      />

      <ShortcutGrid items={shortcuts} />

      <Panel title="Sales & orders — last 6 months" icon={<FiBarChart2 />}>
        <div style={{ height: 260 }}>
          <Bar data={barData} options={chartOpts()} aria-label="Bar chart of monthly revenue and order counts" role="img" />
        </div>
      </Panel>
    </>
  );
}
