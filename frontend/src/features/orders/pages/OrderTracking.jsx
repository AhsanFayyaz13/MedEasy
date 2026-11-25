import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Modal, Spinner, Alert, Nav, Form } from 'react-bootstrap';
import { FaShoppingBag, FaArrowRight, FaPhone } from 'react-icons/fa';
import { fetchOrders, cancelOrder } from '../../../services/api/orderService';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import './OrderTracking.css';
import { STATUS_CONFIG, STATUS_TABS } from '../components/orderShared';
import OrderDetailsModal from '../components/OrderDetailsModal';
import OrderCard from '../components/OrderCard';


// ─── Status configuration ─────────────────────────────────────────────────────


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const { user }    = useAuth();

  /* ── Rate Pharmacy/Pharmacist E2E ── */
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewOrder || !reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const raw = localStorage.getItem('medeasy_pharmacy_reviews') || '[]';
      const all = JSON.parse(raw);

      const newReview = {
        id: 'rev-' + Date.now(),
        orderId: reviewOrder.id,
        pharmacyName: reviewOrder.pharmacyName || 'MedEasy Pharmacy Partner',
        patientName: user?.name || 'Patient',
        patientEmail: user?.email || '',
        rating: Number(reviewRating),
        comment: reviewComment,
        time: Date.now()
      };

      all.push(newReview);
      localStorage.setItem('medeasy_pharmacy_reviews', JSON.stringify(all));

      // Send Alert notification to Admin
      const rawAlerts = localStorage.getItem('medeasy_notifications_admin') || '[]';
      const alerts = JSON.parse(rawAlerts);
      alerts.unshift({
        id: 'alert-' + Date.now() + '-admin',
        text: `Pharmacy Review: User ${user?.name || 'Patient'} reviewed their pharmacy experience for Order #${reviewOrder.id} (${reviewRating} Stars): "${reviewComment.slice(0, 40)}..."`,
        time: Date.now(),
        emoji: 'star',
        unread: true,
        link: '/admin?tab=audits'
      });
      localStorage.setItem('medeasy_notifications_admin', JSON.stringify(alerts));

      toast.success('Thank you! Your pharmacy review has been submitted.');
      setReviewOrder(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ── Report Pharmacy / Logistics Issue E2E ── */
  const [reportOrder, setReportOrder] = useState(null);
  const [reportIssueType, setReportIssueType] = useState('delay');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportOrder || !reportDetails.trim()) return;

    setSubmittingReport(true);
    try {
      const raw = localStorage.getItem('medeasy_pharmacy_reports') || '[]';
      const all = JSON.parse(raw);

      const newReport = {
        id: 'rep-' + Date.now(),
        orderId: reportOrder.id,
        pharmacyName: reportOrder.pharmacyName || 'MedEasy Pharmacy Partner',
        patientName: user?.name || 'Patient',
        patientEmail: user?.email || '',
        issueType: reportIssueType,
        details: reportDetails,
        status: 'pending',
        time: Date.now()
      };

      all.push(newReport);
      localStorage.setItem('medeasy_pharmacy_reports', JSON.stringify(all));

      // Send Alert notification to Admin
      const rawAlerts = localStorage.getItem('medeasy_notifications_admin') || '[]';
      const alerts = JSON.parse(rawAlerts);
      alerts.unshift({
        id: 'alert-' + Date.now() + '-admin',
        text: `Pharmacy Complaint: Patient ${user?.name || 'Patient'} submitted a complaint against the pharmacy for Order #${reportOrder.id}: "${reportDetails.slice(0, 40)}..."`,
        time: Date.now(),
        emoji: 'complaint',
        unread: true,
        link: '/admin?tab=audits'
      });
      localStorage.setItem('medeasy_notifications_admin', JSON.stringify(alerts));

      toast.success('Your report has been successfully submitted to customer resolution.');
      setReportOrder(null);
      setReportDetails('');
      setReportIssueType('delay');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('all');
  const [modalOrder,  setModalOrder]  = useState(null);
  const [highlightId] = useState(orderId || null);

  // ── Load orders ────────────────────────────────────────────────
  const loadOrders = useCallback(async (status = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders({ status });
      setOrders(data);
      // Arriving from Checkout: the new order card is highlighted via highlightId.
    } catch (e) {
      setError(e.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(activeTab); }, [activeTab, loadOrders]);

  // ── Cancel handler ─────────────────────────────────────────────
  const handleCancel = async (id) => {
    const reason = window.prompt("Please provide a reason for cancelling this order:", "Changed mind / ordered incorrectly.");
    if (reason === null) return; // cancelled prompt

    try {
      await cancelOrder(id);
      setOrders((prev) =>
        prev.map((o) => o.id === id ? { ...o, status: 'cancelled', cancellationReason: reason } : o)
      );
      toast.success(`Order ${id} cancelled.`);

      // Create notification for Admin / Pharmacy
      try {
        // Alert Admin
        const rawAdmin = localStorage.getItem('medeasy_notifications_admin') || '[]';
        const alertsAdmin = JSON.parse(rawAdmin);
        alertsAdmin.unshift({
          id: 'alert-' + Date.now(),
          text: `Order Cancelled: Patient cancelled Order #${id}. Reason: ${reason}.`,
          time: Date.now(),
          emoji: 'cancel',
          unread: true,
          link: '/admin'
        });
        localStorage.setItem('medeasy_notifications_admin', JSON.stringify(alertsAdmin));

        // Alert Pharmacy Representative
        const rawPharm = localStorage.getItem('medeasy_notifications_pharmacist') || '[]';
        const alertsPharm = JSON.parse(rawPharm);
        alertsPharm.unshift({
          id: 'alert-' + Date.now() + '-pharm',
          text: `Order Cancelled: Patient cancelled Order #${id}. Reason: ${reason}.`,
          time: Date.now(),
          emoji: 'cancel',
          unread: true,
          link: '/pharmacist'
        });
        localStorage.setItem('medeasy_notifications_pharmacist', JSON.stringify(alertsPharm));
      } catch (err) {
        console.error(err);
      }
    } catch (e) {
      toast.error(e.message || 'Could not cancel the order. Try again.');
    }
  };

  // ── Tab counts ─────────────────────────────────────────────────
  // We derive counts from the full loaded list regardless of current tab filter
  const [allOrders, setAllOrders] = useState([]);
  useEffect(() => {
    fetchOrders({}).then(setAllOrders).catch(() => {});
  }, [orders]); // refresh counts when orders change

  const countFor = (key) => key === 'all'
    ? allOrders.length
    : allOrders.filter((o) => o.status === key).length;

  // ── Empty state ────────────────────────────────────────────────
  const renderEmpty = () => (
    <div className="orders-empty">
      <FaShoppingBag className="orders-empty-icon" />
      <h5>No {activeTab !== 'all' ? activeTab : ''} orders found</h5>
      <p>{activeTab === 'all' ? 'Place your first order to see it here.' : `You have no ${activeTab} orders.`}</p>
      {activeTab === 'all' && (
        <Button as={Link} to="/medicines" className="btn-shop-now">
          Browse Medicines <FaArrowRight className="ms-2" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="tracking-page">
      <Container className="py-4 py-md-5">

        {/* ── Page header ───────────────────────────────────── */}
        <div className="orders-page-header">
          <div>
            <h1 className="orders-title">My Orders</h1>
            <p className="orders-subtitle">Track, manage and review your orders</p>
          </div>
          {orderId && (
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
              ← Back
            </Button>
          )}
        </div>

        {/* ── Status filter tabs ────────────────────────────── */}
        <div className="order-tabs-wrap mb-4">
          <Nav variant="pills" className="order-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            {STATUS_TABS.map((t) => {
              const count = countFor(t.key);
              return (
                <Nav.Item key={t.key}>
                  <Nav.Link eventKey={t.key} className="order-tab">
                    {t.label}
                    {count > 0 && <span className="tab-count">{count}</span>}
                  </Nav.Link>
                </Nav.Item>
              );
            })}
          </Nav>
        </div>

        {/* ── Loading ───────────────────────────────────────── */}
        {loading && (
          <div className="orders-loading">
            <Spinner animation="border" variant="primary" />
            <p>Loading your orders…</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {error && !loading && (
          <Alert variant="danger" className="rounded-3">
            <strong>Error:</strong> {error}
            <Button variant="link" className="p-0 ms-2" onClick={() => loadOrders(activeTab)}>Retry</Button>
          </Alert>
        )}

        {/* ── Orders list ───────────────────────────────────── */}
        {!loading && !error && (
          orders.length === 0
            ? renderEmpty()
            : (
              <Row>
                <Col lg={9} xl={8}>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={highlightId === order.id ? 'order-highlight' : ''}
                    >
                      <OrderCard
                        order={order}
                        onCancel={handleCancel}
                        onViewDetails={setModalOrder}
                        onReport={setReportOrder}
                        onRate={setReviewOrder}
                      />
                    </div>
                  ))}
                </Col>

                {/* ── Sidebar stats ──────────────────────── */}
                <Col lg={3} xl={4} className="d-none d-lg-block">
                  <Card className="stats-card">
                    <Card.Body>
                      <h6 className="stats-title">Order Summary</h6>
                      {STATUS_TABS.slice(1).map((t) => {
                        const n = countFor(t.key);
                        const cfg = STATUS_CONFIG[t.key];
                        return (
                          <div key={t.key} className="stat-row" onClick={() => setActiveTab(t.key)} role="button">
                            <Badge bg={cfg?.color} text={cfg?.text || undefined} className="stat-badge">{cfg?.icon}</Badge>
                            <span className="stat-label">{t.label}</span>
                            <span className="stat-count">{n}</span>
                          </div>
                        );
                      })}
                      <hr />
                      <div className="stat-row total-stat">
                        <span className="stat-label">All Orders</span>
                        <span className="stat-count">{countFor('all')}</span>
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Help card */}
                  <Card className="help-card mt-3">
                    <Card.Body>
                      <h6 className="stats-title"><FaPhone className="me-2" />Need Help?</h6>
                      <p className="help-text">
                        Call us at <a href="tel:+923001234567">+92 300 1234567</a><br />
                        or email <a href="mailto:support@medeasy.pk">support@medeasy.pk</a>
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )
        )}

      </Container>

      {/* ── Order Details Modal ──────────────────────────────── */}
      <OrderDetailsModal order={modalOrder} onClose={() => setModalOrder(null)} />

      {/* ── Pharmacy Rating & Review Modal ── */}
      <Modal show={!!reviewOrder} onHide={() => setReviewOrder(null)} centered>
        <Modal.Header closeButton className="bg-warning text-white border-0 py-3 rounded-top-4">
          <Modal.Title className="fs-5 fw-bold text-dark">⭐ Rate Pharmacy & Pharmacist Conduct</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light rounded-bottom-4">
          <p className="small text-muted mb-3">
            Your review helps us audit and reward outstanding pharmacy partners and delivery riders.
          </p>
          <Form onSubmit={handleReviewSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Select Delivery & Fulfillment Rating</Form.Label>
              <Form.Select value={reviewRating} onChange={e => setReviewRating(e.target.value)}>
                <option value="5">5 Stars — Excellent service</option>
                <option value="4">4 Stars — Very Good service</option>
                <option value="3">3 Stars — Good service</option>
                <option value="2">2 Stars — Fair / Average service</option>
                <option value="1">1 Star — Poor service / Pharmacist issue</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Your Review Comments *</Form.Label>
              <Form.Control 
                required 
                as="textarea" 
                rows={4} 
                placeholder="Share your experience regarding medicine packaging, pharmacist behavior, or delivery rider conduct..." 
                value={reviewComment} 
                onChange={e => setReviewComment(e.target.value)} 
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" className="rounded-10 px-3" onClick={() => setReviewOrder(null)}>Cancel</Button>
              <Button type="submit" variant="warning" className="rounded-10 px-4 text-dark fw-bold" disabled={submittingReview}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ── Report Pharmacy / Logistics Modal ── */}
      <Modal show={!!reportOrder} onHide={() => setReportOrder(null)} centered>
        <Modal.Header closeButton className="bg-danger text-white border-0 py-3 rounded-top-4">
          <Modal.Title className="fs-5 fw-bold">⚠️ Report Pharmacy Issue</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light rounded-bottom-4">
          <p className="small text-muted mb-3">
            Filing this complaint triggers an immediate investigation into the fulfillment pharmacy and delivery courier.
          </p>
          <Form onSubmit={handleReportSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Select Logistics Issue Category</Form.Label>
              <Form.Select value={reportIssueType} onChange={e => setReportIssueType(e.target.value)}>
                <option value="wrong-medicine">Wrong Medicine Delivered</option>
                <option value="expired-medicine">Expired or Damaged Medicine Received</option>
                <option value="delay">Massive Delivery Delay / No-Show</option>
                <option value="rider-conduct">Rider or Pharmacist Conduct / Misbehavior</option>
                <option value="overcharging">Overcharging / Incorrect Billing Price</option>
                <option value="other">Other Logistics Issue</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Description of the Issue *</Form.Label>
              <Form.Control 
                required 
                as="textarea" 
                rows={4} 
                placeholder="Explain the issue in detail. Please specify medicine names, damages, rider behavior, or exact amounts..." 
                value={reportDetails} 
                onChange={e => setReportDetails(e.target.value)} 
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" className="rounded-10 px-3" onClick={() => setReportOrder(null)}>Cancel</Button>
              <Button type="submit" variant="danger" className="rounded-10 px-4 text-white" disabled={submittingReport}>
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
}
