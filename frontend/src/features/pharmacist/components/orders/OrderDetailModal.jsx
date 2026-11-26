import { FiCreditCard, FiExternalLink, FiFileText, FiMapPin, FiPhone, FiShoppingBag } from 'react-icons/fi';
import { Badge, Button, Modal } from '../../../../components/ui';
import { formatPhone, formatPrice, phoneHref } from '../../../../lib/format';
import OrderTimeline from '../../../orders/components/OrderTimeline';
import { PAYMENT_LABELS, fmtDate } from '../pharmacistShared';
import DeliveryLocation from '../../../orders/components/DeliveryLocation';
import { orderRef } from '../../../orders/lib/orderFeedback';
import useRxFile from '../../../prescriptions/lib/useRxFile';

// Pharmacists need both: "Panadol (Paracetamol 500mg)".
const itemName = (i) => {
  const med = i.medicineId || {};
  if (med.brand && med.name) return `${med.brand} (${med.name})`;
  return i.name || med.brand || med.name || 'Medicine';
};

/** Invoice-style details of an order for pharmacy staff. */
export default function OrderDetailModal({ order, onClose }) {
  const rx = order?.prescriptionId && typeof order.prescriptionId === 'object' ? order.prescriptionId : null;
  const addr = order?.shippingAddress || {};
  const file = useRxFile(rx);

  return (
    <Modal show={!!order} onClose={onClose} size="lg" title={`Order ${orderRef(order)}`} description={order ? `Placed ${fmtDate(order.createdAt)}` : undefined}>
      {order && (
        <>
          <OrderTimeline status={order.status} cancellationReason={order.cancellationReason} />

          <div className="ph-invoice">
            <section className="ph-invoice__items" aria-labelledby="inv-items">
              <h3 id="inv-items"><FiShoppingBag aria-hidden="true" /> Items</h3>
              <ul>
                {(order.items || []).map((i, idx) => (
                  <li key={i._id || idx}>
                    <div>
                      <strong>{itemName(i)}</strong>
                      <span>{formatPrice(i.price)} × {i.quantity}</span>
                    </div>
                    <span className="ph-invoice__line">{formatPrice(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              {order.deliveryFee > 0 && (
                <div className="ph-invoice__fee">
                  <span>Delivery</span>
                  <span>{formatPrice(order.deliveryFee)}</span>
                </div>
              )}
              <div className="ph-invoice__total">
                <span>Total</span>
                <strong>{formatPrice(order.totalAmount)}</strong>
              </div>
            </section>

            <section className="ph-invoice__side" aria-label="Delivery and payment">
              <h3><FiMapPin aria-hidden="true" /> Delivery</h3>
              <address>
                <strong>{addr.firstName} {addr.lastName}</strong>
                <span>{addr.address}{addr.city ? `, ${addr.city}` : ''}</span>
                {addr.phone && <span><FiPhone aria-hidden="true" /> <a href={`tel:${phoneHref(addr.phone)}`}>{formatPhone(addr.phone)}</a></span>}
              </address>
              <DeliveryLocation address={addr} forStaff />

              <h3><FiCreditCard aria-hidden="true" /> Payment</h3>
              <p className="ph-invoice__payment">
                {PAYMENT_LABELS[order.paymentMethod] || 'Cash on Delivery'}
                <Badge tone={order.paymentStatus === 'paid' ? 'success' : 'warning'}>{order.paymentStatus || 'pending'}</Badge>
              </p>

              {order.prescriptionId && (
                <>
                  <h3><FiFileText aria-hidden="true" /> Prescription</h3>
                  <p className="ph-invoice__rx">
                    <Badge tone={rx?.status === 'verified' ? 'success' : 'warning'}>{rx?.status || 'attached'}</Badge>
                    {file.href && (
                      <Button size="sm" variant="secondary" href={file.href} target="_blank" rel="noreferrer" rightIcon={<FiExternalLink aria-hidden="true" />}>
                        View
                      </Button>
                    )}
                  </p>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </Modal>
  );
}
