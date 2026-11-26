import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { FiBarChart2, FiCalendar, FiDollarSign, FiPercent, FiShoppingBag, FiUserCheck, FiUsers } from 'react-icons/fi';
import { PARTNER_AGREEMENT } from '../../../lib/business';
import { tokenColor } from '../../../lib/theme';
import { useAuth } from '../../../context/AuthContext';
import { Button, EmptyState } from '../../../components/ui';
import { Panel, ShortcutGrid, StatGrid, WelcomeBanner } from '../../../components/layout/DashboardLayout/widgets';
import { fmtRs, chartOpts } from './adminShared';

const IN_PROGRESS = ['pending', 'confirmed', 'processing', 'dispatched'];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Revenue (left axis) and order count (right axis): the two differ by orders of magnitude. */
function dualAxisOpts() {
  const base = chartOpts();
  return {
    ...base,
    scales: {
      x: base.scales.x,
      y: { ...base.scales.y, position: 'left', ticks: { ...base.scales.y.ticks, callback: (v) => fmtRs(v) } },
      orders: { ...base.scales.y, position: 'right', grid: { display: false }, ticks: { ...base.scales.y.ticks, precision: 0 } },
    },
  };
}

/** Admin landing tab: what needs attention, KPIs and the 6-month sales trend. */
export default function OverviewTab({ setActive, stats, orders, pendingVerifications = 0 }) {
  const { user } = useAuth();
  const openOrders = (orders || []).filter((o) => IN_PROGRESS.includes(o.status)).length;

  const chart = useMemo(() => {
    const now = new Date();
    const labels = [];
    const revenue = [];
    const orderCounts = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
      const mo = (orders || []).filter((o) => {
        if (o.status === 'cancelled') return false;
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });
      revenue.push(mo.reduce((s, o) => s + (o.totalAmount || 0), 0));
      orderCounts.push(mo.length);
    }
    return {
      empty: orderCounts.every((n) => n === 0),
      data: {
        labels,
        datasets: [
          { label: 'Revenue', data: revenue, yAxisID: 'y', backgroundColor: tokenColor('--color-primary-500', 0.75), borderRadius: 8, borderSkipped: false },
          { label: 'Orders', data: orderCounts, yAxisID: 'orders', backgroundColor: tokenColor('--color-accent-400', 0.75), borderRadius: 8, borderSkipped: false },
        ],
      },
    };
  }, [orders]);

  const attention = [
    pendingVerifications > 0 && `${plural(pendingVerifications, 'verification')} waiting for review`,
    openOrders > 0 && `${plural(openOrders, 'order')} in progress`,
  ].filter(Boolean);

  const shortcuts = [
    { key: 'verifications', label: 'Verifications', desc: pendingVerifications ? `${pendingVerifications} waiting` : 'Nothing waiting', icon: <FiUserCheck />, tone: pendingVerifications ? 'warning' : 'primary' },
    { key: 'orders', label: 'Orders', desc: openOrders ? `${openOrders} in progress` : 'None in progress', icon: <FiShoppingBag />, tone: 'accent' },
    { key: 'users', label: 'Users', desc: plural(stats.usersCount || 0, 'account'), icon: <FiUsers />, tone: 'violet' },
    { key: 'reports', label: 'Reports', desc: 'Sales and activity trends', icon: <FiBarChart2 />, tone: 'rose' },
  ].map((s) => ({ ...s, onClick: () => setActive(s.key) }));

  return (
    <>
      <WelcomeBanner
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Admin'}`}
        text={attention.length ? `${attention.join(' · ')}.` : 'Nothing needs your attention right now.'}
      >
        {pendingVerifications > 0 && (
          <Button size="sm" onClick={() => setActive('verifications')}>Review verifications</Button>
        )}
      </WelcomeBanner>

      <StatGrid
        stats={[
          { label: 'Orders', value: stats.ordersCount, icon: <FiShoppingBag />, tone: 'primary', hint: 'Active and processed' },
          { label: 'Revenue (MTD)', value: fmtRs(stats.revenueMtd), icon: <FiDollarSign />, tone: 'success', hint: 'Orders this month' },
          { label: 'Commission (MTD)', value: fmtRs(stats.commissionMtd || 0), icon: <FiPercent />, tone: 'violet', hint: `${Math.round(PARTNER_AGREEMENT.commissionRate * 100)}% of orders and consultations` },
          { label: 'Appointments', value: stats.aptsCount, icon: <FiCalendar />, tone: 'warning', hint: 'Active bookings' },
        ]}
      />

      <ShortcutGrid title="Jump to" items={shortcuts} />

      <Panel title="Sales & orders — last 6 months" icon={<FiBarChart2 />}>
        {chart.empty ? (
          <EmptyState
            icon={<FiBarChart2 />}
            title="No sales yet"
            description="Monthly revenue and order counts will appear here once customers start ordering."
          />
        ) : (
          <div style={{ height: 280 }}>
            <Bar data={chart.data} options={dualAxisOpts()} aria-label="Bar chart of monthly revenue and order counts" role="img" />
          </div>
        )}
      </Panel>
    </>
  );
}
