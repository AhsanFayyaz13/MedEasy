import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowRight, FiHelpCircle, FiMail, FiPhone, FiShoppingBag } from 'react-icons/fi';
import { fetchOrders, cancelOrder } from '../../../services/api/orderService';
import { useToast } from '../../../context/ToastContext';
import { Button, Card, EmptyState, ErrorState, PageHeader, SkeletonCard, Tabs } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { BUSINESS } from '../../../lib/business';
import PatientOrderCard from '../components/PatientOrderCard';
import PatientOrderDetail from '../components/PatientOrderDetail';
import { CancelOrderDialog, RateOrderDialog, ReportOrderDialog } from '../components/OrderDialogs';
import { saveOrderReport, saveOrderReview, orderRef } from '../lib/orderFeedback';
import { feedbackError } from '../../../services/api/feedbackService';
import './OrderTracking.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'In progress', statuses: ['pending', 'confirmed', 'processing', 'dispatched'] },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

const matches = (filter, order) => !filter.statuses || filter.statuses.includes(order.status);

/** Patient order history: filter, track, cancel, rate and report orders. */
export default function OrderTracking() {
  const { orderId } = useParams();
  const { toast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  // dialogs: { type: 'details' | 'cancel' | 'rate' | 'report', order }
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchOrders());
    } catch (e) {
      setError(e.message || 'We couldn’t load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Arriving from checkout (/orders/:orderId): bring the new order into view.
  useEffect(() => {
    if (loading || !orderId) return;
    document.getElementById(`order-${orderId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading, orderId]);

  const tabs = useMemo(
    () => FILTERS.map((f) => ({ id: f.id, label: f.label, badge: orders.filter((o) => matches(f, o)).length || null })),
    [orders]
  );
  const visible = orders.filter((o) => matches(FILTERS.find((f) => f.id === filter), o));

  const open = (type) => (order) => setDialog({ type, order });
  const close = () => setDialog(null);
  const dialogOrder = (type) => (dialog?.type === type ? dialog.order : null);

  const confirmCancel = async (reason) => {
    const order = dialog.order;
    try {
      await cancelOrder(order.id, reason || undefined);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled', cancellationReason: reason || o.cancellationReason } : o)));
      toast.success(`Order ${orderRef(order)} cancelled.`);
      close();
    } catch (e) {
      toast.error(e.message || 'Could not cancel the order. Please try again.');
    }
  };

  const submitFeedback = (save, message) => async (values) => {
    try {
      await save(dialog.order, values);
      toast.success(message);
      close();
    } catch (e) {
      toast.error(feedbackError(e));
    }
  };

  const renderList = () => {
    if (loading) {
      return (
        <div className="pord-list" aria-busy="true">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} media={false} />)}
        </div>
      );
    }
    if (error) return <ErrorState title="Couldn’t load your orders" message={error} onRetry={load} />;
    if (!orders.length) {
      return (
        <EmptyState
          icon={<FiShoppingBag />}
          title="No orders yet"
          description="Medicines you order will show up here so you can track them."
          action={<Button to="/medicines" rightIcon={<FiArrowRight aria-hidden="true" />}>Shop medicines</Button>}
        />
      );
    }
    if (!visible.length) {
      return <EmptyState icon={<FiShoppingBag />} title={`No ${FILTERS.find((f) => f.id === filter).label.toLowerCase()} orders`} />;
    }
    return (
      <div className="pord-list">
        {visible.map((order) => (
          <PatientOrderCard
            key={order.id}
            order={order}
            highlighted={order.id === orderId}
            onDetails={open('details')}
            onCancel={open('cancel')}
            onRate={open('rate')}
            onReport={open('report')}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="pord-page">
      <PageMeta title="My orders" noindex />
      <div className="container">
        <PageHeader eyebrow="Orders" title="My orders" subtitle="Track deliveries, cancel an order or tell us how it went." />

        <div className="pord-layout">
          <div>
            <Tabs tabs={tabs} active={filter} onChange={setFilter} label="Filter orders" className="pord-tabs" />
            <div role="tabpanel" aria-label={`${FILTERS.find((f) => f.id === filter).label} orders`}>
              {renderList()}
            </div>
          </div>

          <aside className="pord-aside">
            <Card>
              <h2 className="pord-aside__title"><FiHelpCircle aria-hidden="true" /> Need help with an order?</h2>
              <p className="pord-aside__text">
                You can cancel free of charge until your order is dispatched. See our{' '}
                <Link to="/refund-policy">refund &amp; returns policy</Link>.
              </p>
              <ul className="pord-aside__contact">
                <li><FiPhone aria-hidden="true" /> <a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a></li>
                <li><FiMail aria-hidden="true" /> <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></li>
              </ul>
            </Card>
          </aside>
        </div>
      </div>

      <PatientOrderDetail order={dialogOrder('details')} onClose={close} />
      {dialog?.type === 'cancel' && <CancelOrderDialog key={dialog.order.id} order={dialog.order} onClose={close} onConfirm={confirmCancel} />}
      {dialog?.type === 'rate' && (
        <RateOrderDialog key={dialog.order.id} order={dialog.order} onClose={close} onSubmit={submitFeedback(saveOrderReview, 'Thanks! Your review has been sent.')} />
      )}
      {dialog?.type === 'report' && (
        <ReportOrderDialog key={dialog.order.id} order={dialog.order} onClose={close} onSubmit={submitFeedback(saveOrderReport, 'Your report has been sent to our support team.')} />
      )}
    </div>
  );
}
