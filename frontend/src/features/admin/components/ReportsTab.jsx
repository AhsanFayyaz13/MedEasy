import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { FiAward, FiBarChart2, FiDownload, FiPackage, FiUserCheck } from 'react-icons/fi';
import { tokenColor } from '../../../lib/theme';
import { Button, EmptyState, Table } from '../../../components/ui';
import { Panel, StatGrid } from '../../../components/layout/DashboardLayout/widgets';
import { downloadCsv } from '../../../lib/csv';
import { formatPrice } from '../../../lib/format';
import { chartOpts } from './adminShared';

const MONTHS = 6;
// Order lines keep only a reference, so a medicine deleted from the catalogue has no name left.
const itemName = (i) => i.medicineId?.name || i.name || 'Removed from catalogue';

/** Sales trend, best sellers and busiest doctors, computed from live orders and appointments. */
export default function ReportsTab({ orders, apts }) {
  const sold = useMemo(() => (orders || []).filter((o) => o.status !== 'cancelled'), [orders]);

  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: MONTHS }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - k), 1);
      const inMonth = sold.filter((o) => {
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });
      return {
        label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        revenue: inMonth.reduce((s, o) => s + (o.totalAmount || 0), 0),
        orders: inMonth.length,
      };
    });
  }, [sold]);

  const topMedicines = useMemo(() => {
    const map = new Map();
    sold.forEach((o) =>
      (o.items || []).forEach((i) => {
        const name = itemName(i);
        const row = map.get(name) || { name, units: 0, revenue: 0 };
        row.units += i.quantity || 0;
        row.revenue += (i.price || 0) * (i.quantity || 0);
        map.set(name, row);
      })
    );
    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  }, [sold]);

  const topDoctors = useMemo(() => {
    const map = new Map();
    (apts || [])
      .filter((a) => a.status === 'completed')
      .forEach((a) => {
        const name = a.doctorName || a.doctorId?.name || 'Doctor';
        const row = map.get(name) || { name, specialty: a.doctorId?.specialty || '—', cases: 0 };
        row.cases += 1;
        map.set(name, row);
      });
    return [...map.values()].sort((a, b) => b.cases - a.cases).slice(0, 5);
  }, [apts]);

  const revenue = sold.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const avg = sold.length ? Math.round(revenue / sold.length) : 0;

  const chart = {
    labels: monthly.map((m) => m.label),
    datasets: [
      { label: 'Revenue (Rs.)', data: monthly.map((m) => m.revenue), backgroundColor: tokenColor('--color-primary-400', 0.75), borderRadius: 6, yAxisID: 'y' },
      { label: 'Orders', data: monthly.map((m) => m.orders), backgroundColor: tokenColor('--color-violet-400', 0.75), borderRadius: 6, yAxisID: 'y1' },
    ],
  };
  const base = chartOpts();
  const options = { ...base, scales: { ...base.scales, y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { precision: 0, color: base.scales.y.ticks.color } } } };

  const exportCsv = () =>
    downloadCsv(`medeasy-monthly-sales-${new Date().toISOString().slice(0, 10)}`, [
      { header: 'Month', value: (m) => m.label },
      { header: 'Orders', value: (m) => m.orders },
      { header: 'Revenue (Rs)', value: (m) => m.revenue },
    ], monthly);

  return (
    <div className="adm-section">
      <StatGrid
        stats={[
          { label: 'Revenue (all time)', value: formatPrice(revenue), icon: <FiBarChart2 />, tone: 'success', hint: 'Excludes cancelled orders' },
          { label: 'Orders', value: sold.length, icon: <FiPackage />, tone: 'primary' },
          { label: 'Average order', value: formatPrice(avg), icon: <FiAward />, tone: 'violet' },
        ]}
      />

      <Panel title={`Revenue and orders — last ${MONTHS} months`} icon={<FiBarChart2 />} actions={<Button size="sm" variant="secondary" leftIcon={<FiDownload aria-hidden="true" />} onClick={exportCsv}>Export CSV</Button>}>
        {sold.length ? (
          <div style={{ height: 300 }}>
            <Bar data={chart} options={options} role="img" aria-label="Bar chart of monthly revenue and order counts" />
          </div>
        ) : (
          <EmptyState icon={<FiBarChart2 />} title="No sales yet" description="The chart fills in as orders come in." />
        )}
      </Panel>

      <div className="adm-two-col">
        <Panel title="Best-selling medicines" icon={<FiPackage />} flush>
          <Table
            columns={[
              { key: 'name', header: 'Medicine', render: (m) => <strong>{m.name}</strong> },
              { key: 'units', header: 'Units', render: (m) => m.units.toLocaleString() },
              { key: 'revenue', header: 'Revenue', align: 'end', render: (m) => formatPrice(m.revenue) },
            ]}
            data={topMedicines}
            rowKey="name"
            caption="Best-selling medicines"
            empty={<EmptyState icon={<FiPackage />} title="No sales yet" />}
          />
        </Panel>
        <Panel title="Most consultations" icon={<FiUserCheck />} flush>
          <Table
            columns={[
              { key: 'name', header: 'Doctor', render: (d) => <strong>{d.name}</strong> },
              { key: 'specialty', header: 'Specialty', render: (d) => <span className="adm-muted">{d.specialty}</span> },
              { key: 'cases', header: 'Completed', align: 'end', render: (d) => d.cases },
            ]}
            data={topDoctors}
            rowKey="name"
            caption="Doctors by completed consultations"
            empty={<EmptyState icon={<FiUserCheck />} title="No completed consultations yet" />}
          />
        </Panel>
      </div>
    </div>
  );
}
