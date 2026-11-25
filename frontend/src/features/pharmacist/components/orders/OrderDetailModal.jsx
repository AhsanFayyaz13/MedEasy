import { FiCreditCard, FiExternalLink, FiFileText, FiMapPin, FiPhone, FiShoppingBag } from 'react-icons/fi';
import { Badge, Button, Modal } from '../../../../components/ui';
import { formatPrice } from '../../../../lib/format';
import OrderTimeline from '../../../orders/components/OrderTimeline';
import { PAYMENT_LABELS, fmtDate, serverUrl } from '../pharmacistShared';

const shortId = (id) => String(id || '').slice(-8).toUpperCase();
const itemName = (i) => i.name || i.medicineId?.name || 'Medicine';
const fileHref = (url) => (url.startsWith('http') || url.startsWith('data:') ? url : `${serverUrl}${url}`);

/** Invoice-style details of an order for pharmacy staff. */
export default function OrderDetailModal({ order, onClose }) {
  const rx = order?.prescriptionId && typeof order.prescriptionId === 'object' ? order.prescriptionId : null;
  const addr = order?.shippingAddress || {};

  return (
    <Modal show={!!order} onClose={onClose} size="lg" title={`Order #${shortId(order?.id)}`} description={order ? `Placed ${fmtDate(order.createdAt)}` : undefined}>
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
                {addr.phone && <span><FiPhone aria-hidden="true" /> {addr.phone}</span>}
              </address>

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
                    {rx?.fileUrl && (
                      <Button size="sm" variant="secondary" href={fileHref(rx.fileUrl)} target="_blank" rel="noreferrer" rightIcon={<FiExternalLink aria-hidden="true" />}>
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
