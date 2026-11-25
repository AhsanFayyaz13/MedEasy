import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPackage, FiSearch, FiXCircle } from 'react-icons/fi';
import { trackGuestOrder, cancelGuestOrder } from '../../../services/api/orderService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Alert, Button, Card, Input, Modal, PageHeader } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { formatDate, formatPrice } from '../../../lib/format';
import OrderTimeline, { OrderStatusBadge } from '../components/OrderTimeline';
import './OrderTracking.css';

const ORDER_RE = /^ME-[A-Z0-9]{8}$/;

/** Order look-up for guests: order number + the phone used at checkout. */
export default function TrackOrder() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ order: params.get('order') || '', phone: params.get('phone') || '' });
  const [errors, setErrors] = useState({});
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const autoRan = useRef(false);

  const lookUp = async (e) => {
    e?.preventDefault();
    const orderNumber = form.order.trim().toUpperCase();
    const errs = {};
    if (!ORDER_RE.test(orderNumber)) errs.order = 'Enter the order number from your confirmation, e.g. ME-7K2Q9XAB.';
    if (form.phone.trim().length < 7) errs.phone = 'Enter the phone number you used at checkout.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await trackGuestOrder(orderNumber, form.phone));
    } catch (err) {
      setOrder(null);
      setError(err.response?.data?.message || 'Could not look up the order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Arriving from the confirmation screen with both values filled in.
  useEffect(() => {
    if (!autoRan.current && params.get('order') && params.get('phone')) {
      autoRan.current = true;
      lookUp();
    }
  });

  const confirmCancel = async () => {
    setBusy(true);
    try {
      setOrder(await cancelGuestOrder(order.orderNumber, form.phone));
      toast.success('Your order has been cancelled.');
      setCancelling(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel the order.');
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const subtotal = order ? order.totalAmount - (order.deliveryFee || 0) : 0;

  return (
    <div className="pord-page">
      <PageMeta title="Track your order" noindex />
      <div className="container track-layout">
        <PageHeader eyebrow="Orders" title="Track your order" subtitle="Use the order number from your confirmation and the phone number you checked out with." />

        {isAuthenticated && (
          <Alert tone="info">Orders you placed while signed in are under <Button variant="link" to="/orders">My orders</Button>.</Alert>
        )}

        <Card as="form" onSubmit={lookUp} noValidate className="track-form">
          <Input label="Order number" required placeholder="ME-7K2Q9XAB" autoComplete="off" value={form.order} onChange={set('order')} error={errors.order} />
          <Input label="Phone number" required type="tel" placeholder="03001234567" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
          <Button type="submit" loading={loading} leftIcon={<FiSearch aria-hidden="true" />}>Find order</Button>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        {order && (
          <Card as="section" aria-label={`Order ${order.orderNumber}`} className="track-result">
            <header className="pord-card__head">
              <div>
                <h2 className="pord-card__id">Order {order.orderNumber}</h2>
                <p className="pord-card__date">Placed {formatDate(order.createdAt)} · for {order.shippingAddress?.firstName} in {order.shippingAddress?.city}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </header>
            <div className="pord-card__body">
              <OrderTimeline status={order.status} cancellationReason={order.cancellationReason} />
              <ul className="pord-lines">
                {order.items.map((i, idx) => (
                  <li key={idx}>
                    <FiPackage aria-hidden="true" />
                    <div className="pord-lines__info"><strong>{i.name}</strong><span>{formatPrice(i.price)} × {i.quantity}</span></div>
                    <span className="pord-lines__price">{formatPrice(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="pord-detail__sums">
                <div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
                <div><dt>Delivery</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Free'}</dd></div>
              </dl>
              <div className="pord-detail__total"><span>Total · cash on delivery</span><strong>{formatPrice(order.totalAmount)}</strong></div>
            </div>
            {order.status === 'pending' && (
              <footer className="pord-card__foot">
                <span className="pord-card__date">You can cancel until the pharmacy confirms it.</span>
                <Button size="sm" variant="ghost" className="pord-card__cancel" leftIcon={<FiXCircle aria-hidden="true" />} onClick={() => setCancelling(true)}>Cancel order</Button>
              </footer>
            )}
          </Card>
        )}
      </div>

      <Modal
        show={cancelling}
        onClose={() => setCancelling(false)}
        title={`Cancel order ${order?.orderNumber || ''}?`}
        description="Nothing will be charged."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(false)}>Keep order</Button>
            <Button variant="danger" loading={busy} onClick={confirmCancel}>Cancel order</Button>
          </>
        }
      />
    </div>
  );
}
