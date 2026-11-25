import { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { FaPills, FaClipboardList, FaFileMedical, FaHistory } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { fetchAllMedicines, fetchAllOrders, fetchPendingPrescriptions } from '../../../services/api/pharmacistService';


/* ═══════════════════ OVERVIEW PAGE ═════════════════════════════ */
export default function OverviewPage({ setActiveSection }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, verification: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [meds, ordersList, prescriptions] = await Promise.all([
          fetchAllMedicines(),
          fetchAllOrders(),
          fetchPendingPrescriptions(),
        ]);
        const lowStockCount = meds.filter(m => m.stock < 10).length;
        const pendingOrdersCount = ordersList.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'dispatched').length;
        const pendingRxCount = prescriptions.length;
        setStats({
          pending: pendingOrdersCount,
          verification: pendingRxCount,
          lowStock: lowStockCount
        });
      } catch (e) {
        console.error("Failed to load overview stats:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const notifications = [
    { time: '10 mins ago', text: 'Low stock alert: Amoxicillin 250mg is down to 8 units.', type: 'danger' },
    { time: '45 mins ago', text: 'Order #ORD-9982 was verified and marked as Dispatched.', type: 'success' },
    { time: '2 hours ago', text: 'Prescription #RX-4091 uploaded by Ahmed Khan was Approved.', type: 'info' },
    { time: '4 hours ago', text: 'System: Database sync completed successfully.', type: 'primary' },
  ];

  return (
    <div className="ph-overview">
      {/* Welcome Banner */}
      <div className="ph-welcome-banner mb-4">
        {user?.role === 'pharmacy' ? (
          <>
            <h2>Welcome back, {user?.name || 'Pharmacy'}!</h2>
            <p className="mb-0 text-light opacity-75 small">{user?.pharmacyName || 'Pharmacy Store'} | Here is an overview of today's active apothecary operations.</p>
          </>
        ) : (
          <>
            <h2>Welcome back, {user?.name || 'Pharmacist'}!</h2>
            <p className="mb-0 text-light opacity-75 small">Here is an overview of today's active apothecary operations.</p>
          </>
        )}
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="ph-glass-card shadow-sm clickable" onClick={() => setActiveSection('orders')}>
            <Card.Body className="d-flex align-items-center gap-3">
              <div className="ph-glass-icon bg-warning-light text-warning">
                <FaClipboardList size={24} />
              </div>
              <div>
                <h4 className="fw-900 mb-0">{loading ? '...' : stats.pending}</h4>
                <div className="text-muted small">Pending Orders</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="ph-glass-card shadow-sm clickable" onClick={() => setActiveSection('prescriptions')}>
            <Card.Body className="d-flex align-items-center gap-3">
              <div className="ph-glass-icon bg-info-light text-info">
                <FaFileMedical size={24} />
              </div>
              <div>
                <h4 className="fw-900 mb-0">{loading ? '...' : stats.verification}</h4>
                <div className="text-muted small">Awaiting Verification</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="ph-glass-card shadow-sm clickable" onClick={() => setActiveSection('medicines')}>
            <Card.Body className="d-flex align-items-center gap-3">
              <div className="ph-glass-icon bg-danger-light text-danger">
                <FaPills size={24} />
              </div>
              <div>
                <h4 className="fw-900 mb-0">{loading ? '...' : stats.lowStock}</h4>
                <div className="text-muted small">Low Stock Items</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Notifications timeline */}
      <Card className="ph-glass-card shadow-sm mt-4">
        <Card.Header className="bg-transparent border-0 pt-3">
          <h5 className="fw-bold mb-0"><FaHistory className="me-2 text-primary" />Recent Apothecary Activity</h5>
        </Card.Header>
        <Card.Body>
          <div className="ph-timeline">
            {notifications.map((n, idx) => (
              <div key={idx} className="ph-timeline-item d-flex gap-3 mb-3 pb-3 border-bottom-dashed">
                <div className={`ph-timeline-badge bg-${n.type}`}></div>
                <div className="flex-grow-1">
                  <p className="mb-0 fw-600 text-dark small">{n.text}</p>
                  <span className="text-muted extra-small">{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
