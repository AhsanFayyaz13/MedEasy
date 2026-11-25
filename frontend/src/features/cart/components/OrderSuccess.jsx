import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { Button, Card } from '../../../components/ui';

/** Confirmation screen after an order is placed. */
export default function OrderSuccess({ orderId, needsRx }) {
  return (
    <Card className="chk-success" role="status">
      <span className="chk-success__icon" aria-hidden="true"><FiCheckCircle /></span>
      <h1 className="chk-success__title">Order placed!</h1>
      <p className="chk-muted">
        {needsRx
          ? 'Our pharmacist will verify your prescription, then confirm and dispatch your order.'
          : 'We’ll notify you as soon as your order is on its way.'}
      </p>
      <p className="chk-success__id">
        Order ID <code>#{String(orderId).slice(-8).toUpperCase()}</code>
      </p>
      <div className="chk-success__actions">
        <Button to={`/orders/${orderId}`} rightIcon={<FiArrowRight aria-hidden="true" />}>
          Track my order
        </Button>
        <Button to="/medicines" variant="secondary">
          Continue shopping
        </Button>
      </div>
    </Card>
  );
}
