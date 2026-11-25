import { useState } from 'react';
import { Card, Badge, Button, Spinner } from 'react-bootstrap';
import { FaTruck, FaEye, FaBan, FaStar, FaCalendarAlt, FaCreditCard } from 'react-icons/fa';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { STATUS_CONFIG, PAYMENT_LABELS, fmtDate } from './orderShared';
import StatusProgressBar from './StatusProgressBar';


// ─── Order Card ───────────────────────────────────────────────────────────────
export default function OrderCard({ order, onCancel, onViewDetails, onReport, onRate }) {
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
            <div key={item.medicineId} className="preview-item" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="preview-item-icon-wrap me-2">
                <MedicalIcon emoji={item.image} size={16} />
              </div>
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

          <div className="order-actions d-flex flex-wrap gap-1">
            <Button
              variant="outline-primary"
              size="sm"
              className="btn-details"
              onClick={() => onViewDetails(order)}
            >
              <FaEye className="me-1" /> Details
            </Button>

            {isDelivered && onRate && (
              <Button
                variant="outline-warning"
                size="sm"
                className="btn-review"
                onClick={() => onRate(order)}
              >
                <FaStar className="me-1" /> Rate Pharmacy
              </Button>
            )}

            {(order.status === 'confirmed' || order.status === 'dispatched' || order.status === 'delivered') && onReport && (
              <Button
                variant="outline-danger"
                size="sm"
                className="btn-report"
                onClick={() => onReport(order)}
              >
                ⚠️ Report Issue
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
