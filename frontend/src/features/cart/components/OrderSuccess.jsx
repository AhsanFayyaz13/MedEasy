import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { Button, Card } from '../../../components/ui';

/** Confirmation screen after an order is placed (signed-in or guest). */
export default function OrderSuccess({ orderId, orderNumber, phone, needsRx, guest }) {
  const ref = orderNumber || `#${String(orderId).slice(-8).toUpperCase()}`;
  const trackHref = guest ? `/track?order=${encodeURIComponent(orderNumber || '')}&phone=${encodeURIComponent(phone || '')}` : `/orders/${orderId}`;
  return (
    <Card className="chk-success" role="status">
      <span className="chk-success__icon" aria-hidden="true"><FiCheckCircle /></span>
      <h1 className="chk-success__title">Order placed!</h1>
      <p className="chk-muted">
        {needsRx
          ? 'Our pharmacist will verify your prescription, then confirm and dispatch your order.'
          : guest
            ? 'We’ll call the number you gave to confirm your order. Pay in cash when it arrives.'
            : 'We’ll notify you as soon as your order is on its way.'}
      </p>
      <p className="chk-success__id">
        Order number <code>{ref}</code>
      </p>
      {guest && <p className="chk-muted">Keep this number. You’ll need it and your phone number to track the order.</p>}
      <div className="chk-success__actions">
        <Button to={trackHref} rightIcon={<FiArrowRight aria-hidden="true" />}>Track my order</Button>
        {guest ? (
          <Button to="/register" variant="secondary">Create an account</Button>
        ) : (
          <Button to="/medicines" variant="secondary">Continue shopping</Button>
        )}
      </div>
    </Card>
  );
}
