import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArchive, FiCheckCircle, FiClipboard, FiClock, FiEye, FiTruck, FiXCircle } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { fetchAllOrders, updateOrderStatus } from '../../../services/api/pharmacistService';
import { Button, EmptyState, ErrorState, SearchInput, Skeleton, Table, Tabs } from '../../../components/ui';
import { StatGrid } from '../../../components/layout/DashboardLayout/widgets';
import { sendNotification } from '../../../lib/notifications';
import { formatPhone, formatPrice } from '../../../lib/format';
import { OrderStatusBadge } from '../../orders/components/OrderTimeline';
import OrderActions, { CancelOrderModal } from './orders/OrderActions';
import OrderDetailModal from './orders/OrderDetailModal';
import { fmtDate } from './pharmacistShared';
import { orderRef } from '../../orders/lib/orderFeedback';

const ACTIVE = ['pending', 'confirmed', 'dispatched'];
const HISTORY = ['delivered', 'cancelled'];

const PATIENT_MESSAGE = {
  confirmed: (id) => ({ text: `Order confirmed: your order ${id} is being prepared.`, emoji: 'booking' }),
  dispatched: (id) => ({ text: `Order dispatched: your order ${id} is on the way!`, emoji: 'booking' }),
  delivered: (id) => ({ text: `Order delivered: your order ${id} has arrived.`, emoji: 'welcome' }),
  cancelled: (id, reason) => ({ text: `Order cancelled: your order ${id} was cancelled by the pharmacy.${reason ? ` Reason: ${reason}` : ''}`, emoji: 'cancel' }),
};

/** Pharmacy order management. mode="active" (to process) or "history" (delivered/cancelled). */
export default function OrdersPage({ mode = 'active' }) {
  const { toast } = useToast();
  const isHistory = mode === 'history';
  const scope = isHistory ? HISTORY : ACTIVE;

  const [orders, setOrders] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      setOrders(await fetchAllOrders());
      setState({ loading: false, error: null });
    } catch (e) {
      setState({ loading: false, error: e.message || 'Could not load orders.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (order, status, reason) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, status, reason);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status, cancellationReason: reason || o.cancellationReason } : o)));
      toast.success(`Order ${orderRef(order)} → ${status}`);
      const msg = PATIENT_MESSAGE[status]?.(orderRef(order), reason);
      // Guest orders have no account to notify; the pharmacy calls them instead.
      if (msg && order.userId) sendNotification('patient', order.userId, { ...msg, link: '/orders' });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const count = (s) => orders.filter((o) => o.status === s).length;
  const inScope = orders.filter((o) => scope.includes(o.status));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inScope.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      const a = o.shippingAddress || {};
      return [o.id, o.orderNumber, a.firstName, a.lastName, a.city, a.phone, o.patientName].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [inScope, filter, search]);

  const tabs = [
    { id: 'all', label: isHistory ? 'All history' : 'All active', badge: inScope.length },
    ...scope.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1), badge: count(s) })),
  ];

  const stats = isHistory
    ? [
        { label: 'Delivered', value: count('delivered'), icon: <FiCheckCircle />, tone: 'success' },
        { label: 'Cancelled', value: count('cancelled'), icon: <FiXCircle />, tone: 'error' },
        { label: 'Total handled', value: inScope.length, icon: <FiArchive />, tone: 'primary' },
      ]
    : [
        { label: 'Active orders', value: inScope.length, icon: <FiClipboard />, tone: 'primary' },
        { label: 'Awaiting confirmation', value: count('pending'), icon: <FiClock />, tone: 'warning' },
        { label: 'Confirmed', value: count('confirmed'), icon: <FiCheckCircle />, tone: 'success' },
        { label: 'In transit', value: count('dispatched'), icon: <FiTruck />, tone: 'violet' },
      ];

  const columns = [
    {
      key: 'id',
      header: 'Order',
      render: (o) => (
        <div className="ph-cell-stack">
          <code className="ph-order-id">{orderRef(o)}</code>
          {!o.userId && <span>Guest · call to confirm</span>}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div className="ph-cell-stack">
          <strong>{o.shippingAddress?.firstName} {o.shippingAddress?.lastName}</strong>
          <span>{o.shippingAddress?.city} · {formatPhone(o.shippingAddress?.phone)}</span>
        </div>
      ),
    },
    { key: 'date', header: 'Placed', render: (o) => fmtDate(o.createdAt) },
    { key: 'rx', header: 'Rx', render: (o) => (o.prescriptionId ? 'Required' : '—') },
    { key: 'total', header: 'Total', render: (o) => <strong>{formatPrice(o.totalAmount)}</strong> },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge status={o.status} /> },
    ...(isHistory
      ? []
      : [{ key: 'actions', header: 'Actions', render: (o) => <OrderActions order={o} busy={busyId === o.id} onAdvance={changeStatus} onCancel={setCancelling} /> }]),
    {
      key: 'view',
      header: 'Details',
      align: 'end',
      render: (o) => (
        <Button size="sm" variant="ghost" leftIcon={<FiEye aria-hidden="true" />} onClick={() => setDetail(o)} aria-label={`View order ${orderRef(o)}`}>
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <StatGrid stats={stats} loading={state.loading} />

      <div className="dw-toolbar">
        <SearchInput label="Search orders" placeholder="Search order ID, customer, city or phone" value={search} onChange={setSearch} />
        <Tabs tabs={tabs} active={filter} onChange={setFilter} label="Filter orders by status" />
      </div>

      {state.loading ? (
        <div className="ui-card ui-card--padded"><Skeleton lines={8} /></div>
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : (
        <Table
          caption={isHistory ? 'Order history' : 'Active orders'}
          columns={columns}
          data={visible}
          rowKey="id"
          empty={
            <EmptyState
              icon={<FiClipboard />}
              title={search || filter !== 'all' ? 'No orders match' : isHistory ? 'No completed orders yet' : 'No orders to process'}
              description={search || filter !== 'all' ? 'Try a different search or filter.' : 'New orders will appear here automatically.'}
            />
          }
        />
      )}

      <OrderDetailModal order={detail} onClose={() => setDetail(null)} />
      <CancelOrderModal
        key={cancelling?.id || 'none'}
        order={cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={async (reason) => {
          await changeStatus(cancelling, 'cancelled', reason);
          setCancelling(null);
        }}
      />
    </>
  );
}
