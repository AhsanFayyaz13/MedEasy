import { FiAlertTriangle, FiCalendar, FiEye, FiStar, FiXCircle } from 'react-icons/fi';
import { Button, Card } from '../../../components/ui';
import { cx } from '../../../lib/cx';
import { formatDate, formatPrice } from '../../../lib/format';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { PAYMENT_LABELS } from '../lib/orderStatus';
import { shortOrderId } from '../lib/orderFeedback';
import OrderTimeline, { OrderStatusBadge } from './OrderTimeline';

const PREVIEW = 3;
const CANCELLABLE = ['pending', 'confirmed'];
const REPORTABLE = ['confirmed', 'processing', 'dispatched', 'delivered'];

/** One order in the patient's list, with the actions available at its status. */
export default function PatientOrderCard({ order, highlighted, onDetails, onCancel, onRate, onReport }) {
  const extra = order.items.length - PREVIEW;
  const titleId = `order-${order.id}-title`;

  return (
    <Card as="article" padded={false} className={cx('pord-card', highlighted && 'is-highlighted')} aria-labelledby={titleId} id={`order-${order.id}`}>
      <header className="pord-card__head">
        <div>
          <h2 id={titleId} className="pord-card__id">Order #{shortOrderId(order.id)}</h2>
          <p className="pord-card__date"><FiCalendar aria-hidden="true" /> {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <div className="pord-card__body">
        <OrderTimeline status={order.status} cancellationReason={order.cancellationReason} />

        <ul className="pord-lines pord-lines--compact">
          {order.items.slice(0, PREVIEW).map((item) => (
            <li key={item.medicineId}>
              <MedicalIcon emoji={item.image} size={16} />
              <div className="pord-lines__info">
                <strong>{item.name}</strong>
                <span>× {item.quantity}</span>
              </div>
              <span className="pord-lines__price">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        {extra > 0 && <p className="pord-card__more">+ {extra} more item{extra > 1 ? 's' : ''}</p>}
      </div>

      <footer className="pord-card__foot">
        <div className="pord-card__total">
          <span>Total · {PAYMENT_LABELS[order.paymentMethod] || 'Cash on Delivery'}</span>
          <strong>{formatPrice(order.totalAmount)}</strong>
        </div>
        <div className="pord-card__actions">
          {REPORTABLE.includes(order.status) && (
            <Button size="sm" variant="ghost" leftIcon={<FiAlertTriangle aria-hidden="true" />} onClick={() => onReport(order)}>
              Report a problem
            </Button>
          )}
          {CANCELLABLE.includes(order.status) && (
            <Button size="sm" variant="ghost" className="pord-card__cancel" leftIcon={<FiXCircle aria-hidden="true" />} onClick={() => onCancel(order)}>
              Cancel
            </Button>
          )}
          {order.status === 'delivered' && (
            <Button size="sm" variant="secondary" leftIcon={<FiStar aria-hidden="true" />} onClick={() => onRate(order)}>
              Rate
            </Button>
          )}
          <Button size="sm" variant="secondary" leftIcon={<FiEye aria-hidden="true" />} onClick={() => onDetails(order)}>
            Details
          </Button>
        </div>
      </footer>
    </Card>
  );
}
