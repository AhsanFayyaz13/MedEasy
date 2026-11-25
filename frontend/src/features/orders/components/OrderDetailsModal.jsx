import { Row, Col, Badge, Button, Modal } from 'react-bootstrap';
import { FaBox, FaMapMarkerAlt, FaCreditCard, FaInfoCircle } from 'react-icons/fa';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { STATUS_CONFIG, PAYMENT_LABELS, fmtDate, fmtTime } from './orderShared';
import StatusProgressBar from './StatusProgressBar';


// ─── Order Details Modal ──────────────────────────────────────────────────────
export default function OrderDetailsModal({ order, onClose }) {
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
                <div key={item.medicineId} className="modal-item-row" style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="modal-item-icon-wrap me-2">
                    <MedicalIcon emoji={item.image} size={20} />
                  </div>
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
