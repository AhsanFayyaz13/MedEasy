import { Card, Table, Badge, Button } from 'react-bootstrap';
import { FaShoppingCart } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';


/* ═══════════════ TAB 4 – ORDER MANAGEMENT ════════════════════ */
export default function OrdersTab({ orders, setOrders }) {
  const { toast } = useToast();

  const handleRefund = (id) => {
    if (!window.confirm(`Issue complete refund for Order #${id} and flag dispute resolved?`)) return;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled', paymentStatus: 'refunded' } : o));
    toast.success(`Dispute resolved. Refund of Rs. ${orders.find(o => o.id === id)?.totalAmount.toLocaleString()} credited successfully!`);
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaShoppingCart className="me-2 text-primary" /> Active Logistics Tracking & Dispute Resolution</h5>
      </div>

      <Card className="adm-table-card border-0 shadow-sm">
        <div className="adm-table-wrap">
          <Table hover className="adm-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total Items</th><th>Total Amount</th><th>Logistics Status</th><th>Payment</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={8} className="text-center py-4">No platform orders logged.</td></tr>}
              {orders.map(o => (
                <tr key={o.id}>
                  <td><code>{o.id}</code></td>
                  <td className="fw-bold">{o.shippingAddress?.firstName} {o.shippingAddress?.lastName}</td>
                  <td className="text-muted small">{new Date(o.createdAt).toLocaleDateString('en-PK')}</td>
                  <td>{o.items.length} items</td>
                  <td className="fw-bold">Rs. {o.totalAmount.toLocaleString()}</td>
                  <td>
                    <Badge bg={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'}>
                      {o.status}
                    </Badge>
                  </td>
                  <td>
                    <Badge bg={o.paymentStatus === 'paid' ? 'success' : o.paymentStatus === 'refunded' ? 'info' : 'warning'} text={o.paymentStatus !== 'paid' ? 'dark' : undefined}>
                      {o.paymentStatus || 'pending'}
                    </Badge>
                  </td>
                  <td>
                    {o.status !== 'cancelled' ? (
                      <Button size="sm" variant="danger" className="rounded-8 py-1" onClick={() => handleRefund(o.id)}>
                        Refund / Cancel
                      </Button>
                    ) : (
                      <span className="text-muted extra-small">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}
