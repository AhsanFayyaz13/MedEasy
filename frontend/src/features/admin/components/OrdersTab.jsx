import { useState } from 'react';
import { FiDownload, FiEye, FiShoppingBag } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { updateOrderStatus } from '../../../services/api/pharmacistService';
import { Button, EmptyState, SearchInput, Table, Tabs } from '../../../components/ui';
import { downloadCsv } from '../../../lib/csv';
import { formatDate, formatPrice } from '../../../lib/format';
import { sendNotification } from '../../../lib/notifications';
import { OrderStatusBadge } from '../../orders/components/OrderTimeline';
import OrderActions, { CancelOrderModal } from '../../pharmacist/components/orders/OrderActions';
import OrderDetailModal from '../../pharmacist/components/orders/OrderDetailModal';
import { shortId } from './adminShared';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open', statuses: ['pending', 'confirmed', 'processing', 'dispatched'] },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];
const customer = (o) => (o.userId?.name || o.guest?.name || `${o.shippingAddress?.firstName || ''} ${o.shippingAddress?.lastName || ''}`).trim() || 'Customer';

/** Every order on the platform: filter, inspect, move along or cancel (with restock). */
export default function OrdersTab({ orders, setOrders }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const q = search.trim().toLowerCase();
  const matches = (f, o) => !f.statuses || f.statuses.includes(o.status);
  const active = FILTERS.find((f) => f.id === filter);
  const visible = orders.filter((o) => matches(active, o) && (!q || `${o.id} ${customer(o)} ${o.shippingAddress?.city || ''} ${o.shippingAddress?.phone || ''}`.toLowerCase().includes(q)));

  const change = async (order, status, reason) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, status, reason);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status, cancellationReason: reason || o.cancellationReason } : o)));
      toast.success(`Order #${shortId(order.id)} is now ${status}.`);
      const patientId = order.userId?._id || order.userId;
      if (patientId) sendNotification('patient', patientId, {
        text: status === 'cancelled' ? `Order cancelled: #${shortId(order.id)} was cancelled by MedEasy support. Reason: ${reason}` : `Order update: #${shortId(order.id)} is now ${status}.`,
        emoji: status === 'cancelled' ? 'cancel' : 'booking',
        link: `/orders/${order.id}`,
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update the order.');
      throw e;
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(`medeasy-orders-${new Date().toISOString().slice(0, 10)}`, [
      { header: 'Order', value: (o) => shortId(o.id) },
      { header: 'Date', value: (o) => formatDate(o.createdAt) },
      { header: 'Customer', value: customer },
      { header: 'Phone', value: (o) => o.shippingAddress?.phone },
      { header: 'City', value: (o) => o.shippingAddress?.city },
      { header: 'Items', value: (o) => o.items?.length },
      { header: 'Total (Rs)', value: (o) => o.totalAmount },
      { header: 'Status', value: (o) => o.status },
      { header: 'Payment', value: (o) => o.paymentStatus },
    ], visible);

  const columns = [
    { key: 'id', header: 'Order', render: (o) => <div className="adm-stack"><span className="adm-mono">{o.orderNumber || `#${shortId(o.id)}`}</span>{!o.userId && <span>Guest</span>}</div> },
    { key: 'customer', header: 'Customer', render: (o) => <div className="adm-stack"><strong>{customer(o)}</strong><span>{o.shippingAddress?.city}</span></div> },
    { key: 'date', header: 'Placed', render: (o) => <span className="adm-muted">{formatDate(o.createdAt)}</span> },
    { key: 'total', header: 'Total', render: (o) => <strong>{formatPrice(o.totalAmount)}</strong> },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge status={o.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (o) => (
        <div className="adm-actions">
          <OrderActions order={o} busy={busyId === o.id} onAdvance={(ord, s) => change(ord, s).catch(() => {})} onCancel={setCancelling} />
          <Button size="sm" variant="ghost" leftIcon={<FiEye aria-hidden="true" />} onClick={() => setViewing(o)} aria-label={`View order ${shortId(o.id)}`}>View</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="adm-section">
      <div className="adm-toolbar">
        <Tabs tabs={FILTERS.map((f) => ({ id: f.id, label: f.label, badge: orders.filter((o) => matches(f, o)).length || null }))} active={filter} onChange={setFilter} label="Filter orders" />
        <div className="adm-toolbar__end">
          <SearchInput label="Search orders" placeholder="Order, customer, city or phone" value={search} onChange={setSearch} />
          <Button variant="secondary" leftIcon={<FiDownload aria-hidden="true" />} onClick={exportCsv} disabled={!visible.length}>Export CSV</Button>
        </div>
      </div>

      <Table columns={columns} data={visible} rowKey="id" caption="Orders" empty={<EmptyState icon={<FiShoppingBag />} title="No orders here" />} />

      <OrderDetailModal order={viewing} onClose={() => setViewing(null)} />
      {cancelling && (
        <CancelOrderModal
          key={cancelling.id}
          order={cancelling}
          onClose={() => setCancelling(null)}
          onConfirm={async (reason) => {
            await change(cancelling, 'cancelled', reason);
            setCancelling(null);
          }}
        />
      )}
    </div>
  );
}
