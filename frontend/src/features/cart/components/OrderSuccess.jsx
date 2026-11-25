import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { FaCheckCircle, FaArrowRight } from 'react-icons/fa';


// ─── Success screen ───────────────────────────────────────────────────────────
export default function OrderSuccess({ orderId, onViewOrders }) {
  return (
    <div className="order-success">
      <div className="success-icon-wrap">
        <FaCheckCircle className="success-icon" />
      </div>
      <h2 className="success-title">Order Confirmed!</h2>
      <p className="success-subtitle">
        Your order has been placed successfully. We'll notify you once it's dispatched.
      </p>
      <div className="order-id-badge">
        Order ID: <strong>{orderId}</strong>
      </div>
      <div className="success-actions">
        <Button className="btn-view-order" onClick={onViewOrders}>
          Track My Order <FaArrowRight className="ms-2" />
        </Button>
        <Button as={Link} to="/medicines" variant="outline-secondary" className="btn-shop-more">
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}
