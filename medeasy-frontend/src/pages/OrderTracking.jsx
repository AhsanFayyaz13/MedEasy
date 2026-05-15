import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Badge, Button,
  Modal, ProgressBar, Spinner, Alert, Nav,
} from 'react-bootstrap';
import {
  FaCheckCircle, FaBox, FaTruck, FaHome, FaTimesCircle,
  FaShoppingBag, FaArrowRight, FaPhone, FaMapMarkerAlt,
  FaEye, FaBan, FaStar, FaCalendarAlt, FaCreditCard,
  FaReceipt, FaInfoCircle,
} from 'react-icons/fa';
import { fetchOrders, cancelOrder } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import './OrderTracking.css';

// ─── Status configuration ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pending',    color: 'warning',  text: 'dark', icon: <FaReceipt />,     step: 0 },
  confirmed: { label: 'Confirmed',  color: 'primary',  text: null,   icon: <FaCheckCircle />, step: 1 },
  dispatched:{ label: 'Dispatched', color: 'info',     text: null,   icon: <FaTruck />,       step: 2 },
  delivered: { label: 'Delivered',  color: 'success',  text: null,   icon: <FaHome />,        step: 3 },
  cancelled: { label: 'Cancelled',  color: 'danger',   text: null,   icon: <FaTimesCircle />, step: -1 },
};

const STEPS = [
  { key: 'pending',    label: 'Order Placed',     icon: <FaCheckCircle />,  desc: 'We received your order and are verifying payment.'    },
  { key: 'confirmed',  label: 'Confirmed',         icon: <FaBox />,          desc: 'Your order has been confirmed and is being packed.'   },
  { key: 'dispatched', label: 'Out for Delivery',  icon: <FaTruck />,        desc: 'Your package is on its way to your address.'          },
  { key: 'delivered',  label: 'Delivered',         icon: <FaHome />,         desc: 'Your order was delivered. Enjoy your medicines!'      },
];

const PAYMENT_LABELS = { cod: 'Cash on Delivery', jazz: 'JazzCash', easy: 'EasyPaisa', card: 'Credit/Debit Card' };

const STATUS_TABS = [
  { key: 'all',        label: 'All Orders' },
  { key: 'pending',    label: 'Pending'    },
  { key: 'confirmed',  label: 'Confirmed'  },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered',  label: 'Delivered'  },
  { key: 'cancelled',  label: 'Cancelled'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

// ─── Progress bar row ─────────────────────────────────────────────────────────
function StatusProgressBar({ status }) {
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const step = cfg.step; // -1 for cancelled

  if (status === 'cancelled') {
    return (
      <div className="status-pb-wrap cancelled">
        <div className="pb-steps">
          {STEPS.map((s) => (
            <div key={s.key} className="pb-step inactive">
              <div className="pb-bubble">{s.icon}</div>
              <span className="pb-label">{s.label}</span>
            </div>
          ))}
        </div>
        <ProgressBar now={0} className="track-bar" />
        <p className="cancelled-note"><FaBan className="me-1" />This order was cancelled.</p>
      </div>
    );
  }

  const pct = step < 0 ? 0 : Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="status-pb-wrap">
      <ProgressBar now={pct} className="track-bar" />
      <div className="pb-steps">
        {STEPS.map((s, i) => {
          const done    = i < step;
          const current = i === step;
          return (
            <div key={s.key} className={`pb-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
              <div className="pb-bubble">{s.icon}</div>
              <span className="pb-label">{s.label}</span>
              {current && <span className="pb-now-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Order Details Modal ──────────────────────────────────────────────────────
function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const sa  = order.shippingAddress;

  return (
    <Modal show onHide={onClose} size="lg" centered className="order-modal">
      <Modal.Header closeButton className="order-modal-header">
        <Modal.Title>
          Order Details
          <span className="modal-order-id ms-2">{order.id}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="order-modal-body">
        {/* Status */}
        <div className="modal-status-row">
          <Badge bg={cfg.color} text={cfg.text || undefined} className="modal-status-badge">
            {cfg.icon} {cfg.label}
          </Badge>
          <span className="modal-date">Placed: {fmtDate(order.createdAt)} at {fmtTime(order.createdAt)}</span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <StatusProgressBar status={order.status} />
        </div>

        <Row className="g-3">
          {/* Items */}
          <Col md={7}>
            <div className="modal-section">
              <h6 className="modal-section-title"><FaBox className="me-2" />Items Ordered</h6>
              {order.items.map((item) => (
                <div key={item.medicineId} className="modal-item-row">
                  <span className="modal-item-emoji">{item.image || '💊'}</span>
                  <div className="modal-item-info">
                    <span className="modal-item-name">{item.name}</span>
                    <span className="modal-item-brand">{item.brand}</span>
                    {item.requiresPrescription && (
                      <Badge bg="warning" text="dark" className="modal-rx-badge">Rx</Badge>
                    )}
                  </div>
                  <div className="modal-item-price">
                    <span className="modal-item-qty">×{item.quantity}</span>
                    <span className="modal-item-subtotal">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="modal-totals">
                <div className="modal-total-row"><span>Subtotal</span><span>Rs. {(order.totalAmount - order.deliveryFee).toLocaleString()}</span></div>
                <div className="modal-total-row"><span>Delivery</span><span>{order.deliveryFee === 0 ? <span className="text-success">Free</span> : `Rs. ${order.deliveryFee}`}</span></div>
                <div className="modal-total-row total"><span>Total</span><span>Rs. {order.totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
          </Col>

          {/* Shipping + Payment */}
          <Col md={5}>
            <div className="modal-section mb-3">
              <h6 className="modal-section-title"><FaMapMarkerAlt className="me-2" />Shipping Address</h6>
              <p className="modal-address">
                {sa.firstName} {sa.lastName}<br />
                {sa.address}<br />
                {sa.city}{sa.postalCode ? `, ${sa.postalCode}` : ''}<br />
                <a href={`tel:${sa.phone}`}>{sa.phone}</a>
              </p>
            </div>
            <div className="modal-section">
              <h6 className="modal-section-title"><FaCreditCard className="me-2" />Payment</h6>
              <p className="modal-payment-info">
                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                <br />
                <Badge
                  bg={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'refunded' ? 'info' : 'warning'}
                  text={order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' ? 'dark' : undefined}
                  className="mt-1"
                >
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </Badge>
              </p>
              {order.prescriptionId && (
                <p className="modal-rx-info">
                  <FaInfoCircle className="me-1 text-warning" />
                  Prescription: <code>{order.prescriptionId}</code>
                </p>
              )}
            </div>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="order-modal-footer">
        <Button variant="outline-secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onCancel, onViewDetails }) {
  const cfg       = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const isDelivered = order.status === 'delivered';
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(order.id);
    setCancelling(false);
  };

  return (
    <Card className={`order-card mb-4 status-${order.status}`}>
      {/* Card header */}
      <Card.Header className="order-card-header">
        <div className="order-card-meta">
          <span className="order-id-text">{order.id}</span>
          <span className="order-date"><FaCalendarAlt className="me-1" />{fmtDate(order.createdAt)}</span>
        </div>
        <Badge
          bg={cfg.color}
          text={cfg.text || undefined}
          className="order-status-badge"
        >
          {cfg.icon} <span className="ms-1">{cfg.label}</span>
        </Badge>
      </Card.Header>

      <Card.Body>
        {/* Progress bar */}
        <StatusProgressBar status={order.status} />

        {/* Items preview */}
        <div className="order-items-preview">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.medicineId} className="preview-item">
              <span className="preview-emoji">{item.image || '💊'}</span>
              <span className="preview-name">{item.name}</span>
              <span className="preview-qty">×{item.quantity}</span>
              <span className="preview-price">Rs. {(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="more-items-hint">+{order.items.length - 3} more item{order.items.length - 3 > 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Totals row */}
        <div className="order-footer-row">
          <div className="order-total-info">
            <span className="total-label">Total</span>
            <span className="total-amount">Rs. {order.totalAmount.toLocaleString()}</span>
            <span className="payment-method-label">
              <FaCreditCard className="me-1" />{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
            </span>
          </div>

          <div className="order-actions">
            <Button
              variant="outline-primary"
              size="sm"
              className="btn-details"
              onClick={() => onViewDetails(order)}
            >
              <FaEye className="me-1" /> Details
            </Button>

            {isDelivered && (
              <Button
                as={Link}
                to={`/reviews?orderId=${order.id}`}
                variant="outline-warning"
                size="sm"
                className="btn-review"
              >
                <FaStar className="me-1" /> Review
              </Button>
            )}

            {canCancel && (
              <Button
                variant="outline-danger"
                size="sm"
                className="btn-cancel"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling
                  ? <Spinner animation="border" size="sm" />
                  : <><FaBan className="me-1" />Cancel</>}
              </Button>
            )}
          </div>
        </div>

        {/* Delivery info */}
        {order.status !== 'cancelled' && (
          <p className="estimated-delivery">
            <FaTruck className="me-1" />
            {order.estimatedDelivery}
          </p>
        )}
      </Card.Body>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const { toast }   = useToast();

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('all');
  const [modalOrder,  setModalOrder]  = useState(null);
  const [highlightId, setHighlightId] = useState(orderId || null);

  // ── Load orders ────────────────────────────────────────────────
  const loadOrders = useCallback(async (status = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders({ status });
      setOrders(data);
      // Auto-open details modal if navigated from Checkout
      if (orderId && status === 'all') {
        const found = data.find((o) => o.id === orderId);
        // Don't auto-open – just highlight the card
      }
    } catch (e) {
      setError(e.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadOrders(activeTab); }, [activeTab, loadOrders]);

  // ── Cancel handler ─────────────────────────────────────────────
  const handleCancel = async (id) => {
    try {
      await cancelOrder(id);
      setOrders((prev) =>
        prev.map((o) => o.id === id ? { ...o, status: 'cancelled' } : o)
      );
      toast.success(`Order ${id} cancelled.`);
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
    </div>
  );
}
