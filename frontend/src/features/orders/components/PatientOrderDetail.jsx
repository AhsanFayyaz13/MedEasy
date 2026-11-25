import { FiCreditCard, FiMapPin, FiPhone, FiShoppingBag } from 'react-icons/fi';
import { Badge, Modal } from '../../../components/ui';
import { formatDate, formatPhone, formatPrice } from '../../../lib/format';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { PAYMENT_LABELS } from '../lib/orderStatus';
import { orderRef } from '../lib/orderFeedback';
import OrderTimeline from './OrderTimeline';
import DeliveryLocation from './DeliveryLocation';

const PAYMENT_TONE = { paid: 'success', refunded: 'info' };

/** Full order details for the patient (items, delivery address, payment). */
export default function PatientOrderDetail({ order, onClose }) {
  const addr = order?.shippingAddress || {};
  const placed = order && `Placed ${formatDate(order.createdAt, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

  return (
    <Modal show={!!order} onClose={onClose} size="lg" title={`Order ${orderRef(order)}`} description={placed}>
      {order && (
        <>
          <OrderTimeline status={order.status} cancellationReason={order.cancellationReason} />

          <div className="pord-detail">
            <section aria-labelledby="pord-items">
              <h3 id="pord-items" className="pord-detail__title"><FiShoppingBag aria-hidden="true" /> Items</h3>
              <ul className="pord-lines">
                {order.items.map((item) => (
                  <li key={item.medicineId}>
                    <MedicalIcon emoji={item.image} size={18} />
                    <div className="pord-lines__info">
                      <strong>{item.name}</strong>
                      <span>
                        {formatPrice(item.price)} × {item.quantity}
                        {item.requiresPrescription && <Badge tone="warning">Rx</Badge>}
                      </span>
                    </div>
                    <span className="pord-lines__price">{formatPrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="pord-detail__sums">
                <div><dt>Subtotal</dt><dd>{formatPrice(order.totalAmount - (order.deliveryFee || 0))}</dd></div>
                <div><dt>Delivery</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Free'}</dd></div>
              </dl>
              <div className="pord-detail__total">
                <span>Total</span>
                <strong>{formatPrice(order.totalAmount)}</strong>
              </div>
            </section>

            <section aria-label="Delivery and payment" className="pord-detail__side">
              <h3 className="pord-detail__title"><FiMapPin aria-hidden="true" /> Delivery address</h3>
              <address>
                <strong>{addr.firstName} {addr.lastName}</strong>
                <span>{addr.address}</span>
                <span>{addr.city}{addr.postalCode ? `, ${addr.postalCode}` : ''}</span>
                {addr.phone && <span><FiPhone aria-hidden="true" /> {formatPhone(addr.phone)}</span>}
              </address>
              <DeliveryLocation address={addr} />

              <h3 className="pord-detail__title"><FiCreditCard aria-hidden="true" /> Payment</h3>
              <p className="pord-detail__payment">
                {PAYMENT_LABELS[order.paymentMethod] || 'Cash on Delivery'}
                <Badge tone={PAYMENT_TONE[order.paymentStatus] || 'warning'}>{order.paymentStatus || 'pending'}</Badge>
              </p>
            </section>
          </div>
        </>
      )}
    </Modal>
  );
}
