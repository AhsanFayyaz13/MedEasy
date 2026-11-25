import { FiCheck, FiPackage, FiTruck, FiXCircle, FiFileText } from 'react-icons/fi';
import { Badge } from '../../../components/ui';
import { ORDER_TONE } from '../lib/orderStatus';
import './OrderTimeline.css';

const ORDER_STEPS = [
  { key: 'pending', label: 'Placed', icon: <FiFileText /> },
  { key: 'confirmed', label: 'Confirmed', icon: <FiCheck /> },
  { key: 'dispatched', label: 'On the way', icon: <FiTruck /> },
  { key: 'delivered', label: 'Delivered', icon: <FiPackage /> },
];

export function OrderStatusBadge({ status }) {
  return <Badge tone={ORDER_TONE[status] || 'neutral'}>{status}</Badge>;
}

/** Horizontal progress tracker for an order (cancelled orders show a notice). */
export default function OrderTimeline({ status, cancellationReason }) {
  if (status === 'cancelled') {
    return (
      <div className="order-timeline order-timeline--cancelled" role="status">
        <FiXCircle aria-hidden="true" />
        <div>
          <strong>This order was cancelled</strong>
          {cancellationReason && <p>Reason: {cancellationReason}</p>}
        </div>
      </div>
    );
  }

  const current = Math.max(0, ORDER_STEPS.findIndex((s) => s.key === (status === 'processing' ? 'confirmed' : status)));

  return (
    <ol className="order-timeline" aria-label="Order progress">
      {ORDER_STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={step.key} className={`order-timeline__step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="order-timeline__dot" aria-hidden="true">{state === 'done' ? <FiCheck /> : step.icon}</span>
            <span className="order-timeline__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
