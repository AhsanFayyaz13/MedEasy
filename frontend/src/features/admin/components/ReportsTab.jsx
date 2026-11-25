import { useMemo } from 'react';
import { tokenColor } from '../../../lib/theme';
import { Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { FaChartBar, FaBoxes, FaDownload, FaTrophy, FaCalendarCheck } from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import { fmtRs, pdfPlaceholder, chartOpts } from './adminShared';


/* ═══════════════ TAB 5 – REPORTS & ANALYTICS ════════════════ */
export default function ReportsTab({ orders, apts }) {

  // ── Build last-6-months revenue & order count from real orders ──
  const monthlyData = useMemo(() => {
    const now = new Date();
    const labels = [];
    const revenue = [];
    const orderCounts = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      labels.push(label);

      const monthOrders = (orders || []).filter(o => {
        if (o.status === 'cancelled') return false;
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });

      revenue.push(monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0));
      orderCounts.push(monthOrders.length);
    }
    return { labels, revenue, orderCounts };
  }, [orders]);

  // ── Top medicines: aggregate units sold from order items ──
  const topMedicines = useMemo(() => {
    const map = {};
    (orders || []).forEach(o => {
      if (o.status === 'cancelled') return;
      (o.items || []).forEach(item => {
        const name = item.medicineName || item.name || 'Unknown';
        const category = item.category || '—';
        if (!map[name]) map[name] = { name, category, units: 0, revenue: 0 };
        map[name].units += item.quantity || 0;
        map[name].revenue += (item.price || 0) * (item.quantity || 0);
      });
    });
    return Object.values(map)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [orders]);

  // ── Doctor leaderboard: count completed appointments per doctor ──
  const doctorLeaderboard = useMemo(() => {
    const map = {};
    (apts || []).filter(a => a.status === 'completed').forEach(a => {
      const name = a.doctorName || a.doctorId?.name || 'Unknown Doctor';
      const dept = a.doctorId?.specialization || a.specialization || '—';
      if (!map[name]) map[name] = { name, dept, cases: 0 };
      map[name].cases += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 5);
  }, [apts]);

  const barData = {
    labels: monthlyData.labels,
    datasets: [
      { label: 'Revenue (Rs.)', data: monthlyData.revenue,     backgroundColor: tokenColor('--color-primary-400', 0.7), borderRadius: 8, borderSkipped: false },
      { label: 'Orders',        data: monthlyData.orderCounts, backgroundColor: tokenColor('--color-violet-400', 0.7), borderRadius: 8, borderSkipped: false },
    ],
  };

  const hasOrders = (orders || []).length > 0;
  const hasApts   = (apts || []).filter(a => a.status === 'completed').length > 0;

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title">MedEasy Health Platform Analytics</h5>
        <Button variant="outline-secondary" size="sm" onClick={() => pdfPlaceholder('Sales Report')}>
          <FaDownload className="me-1" />Export PDF
        </Button>
      </div>

      {/* Monthly revenue & orders bar chart */}
      <Card className="adm-chart-card mb-4 border-0 shadow-sm">
        <Card.Body>
          <h6 className="adm-chart-title">Monthly Revenue &amp; Orders</h6>
          {hasOrders ? (
            <div style={{height: 285}}>
              <Bar data={barData} options={chartOpts()} />
            </div>
          ) : (
            <div className="text-center text-muted py-5">
              <FaChartBar size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No order data yet. Chart will populate once orders are placed.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      <Row className="g-4">
        {/* Top doctors leaderboard */}
        <Col lg={6}>
          <Card className="adm-table-card border-0 shadow-sm">
            <Card.Header className="adm-card-header bg-transparent pt-3 border-0">
              <h6 className="adm-chart-title mb-0"><FaTrophy className="me-2 text-warning" /> Top Doctor Leaderboard</h6>
            </Card.Header>
            <div className="adm-table-wrap">
              {hasApts ? (
                <Table hover className="adm-table">
                  <thead><tr><th>Doctor Name</th><th>Speciality</th><th>Completed Consults</th></tr></thead>
                  <tbody>
                    {doctorLeaderboard.map((doc, idx) => (
                      <tr key={doc.name}>
                        <td><span className="top-rank me-2">#{idx + 1}</span><strong>{doc.name}</strong></td>
                        <td><Badge bg="info" className="cat-badge">{doc.dept}</Badge></td>
                        <td className="fw-bold">{doc.cases} consultations</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-4">
                  <FaCalendarCheck size={28} className="mb-2 opacity-25" />
                  <p className="mb-0 small">No completed appointments yet.</p>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Top selling medicines */}
        <Col lg={6}>
          <Card className="adm-table-card border-0 shadow-sm">
            <Card.Header className="adm-card-header bg-transparent pt-3 border-0">
              <h6 className="adm-chart-title mb-0"><FaTrophy className="me-2 text-warning" /> Top Selling Pharmaceutics</h6>
            </Card.Header>
            <div className="adm-table-wrap">
              {topMedicines.length > 0 ? (
                <Table hover className="adm-table">
                  <thead><tr><th>Medicine</th><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topMedicines.map((m, i) => (
                      <tr key={m.name}>
                        <td><span className="top-rank me-2">#{i + 1}</span>{m.name}</td>
                        <td><Badge bg="secondary" className="cat-badge">{m.category}</Badge></td>
                        <td>{m.units.toLocaleString()} units</td>
                        <td className="fw-bold">{fmtRs(m.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-4">
                  <FaBoxes size={28} className="mb-2 opacity-25" />
                  <p className="mb-0 small">No sales data yet. Data will appear once orders are fulfilled.</p>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
