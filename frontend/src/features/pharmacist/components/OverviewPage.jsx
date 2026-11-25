import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiClipboard, FiFileText, FiPackage, FiShoppingBag } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { fetchAllMedicines, fetchAllOrders, fetchPendingPrescriptions } from '../../../services/api/pharmacistService';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../../../components/ui';
import { Panel, StatGrid, WelcomeBanner } from '../../../components/layout/DashboardLayout/widgets';
import { formatPrice } from '../../../lib/format';
import { fmtDate } from './pharmacistShared';
import { orderRef } from '../../orders/lib/orderFeedback';

const LOW_STOCK = 10;
const ACTIVE = ['pending', 'confirmed', 'processing', 'dispatched'];
const STATUS_TONE = { pending: 'warning', confirmed: 'primary', processing: 'primary', dispatched: 'info', delivered: 'success', cancelled: 'error' };

/** Pharmacy landing tab: live KPIs, latest orders and stock alerts. */
export default function OverviewPage({ setActiveSection }) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, meds: [], orders: [], rx: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchAllMedicines(), fetchAllOrders(), fetchPendingPrescriptions()])
      .then(([meds, orders, rx]) => alive && setState({ loading: false, error: null, meds, orders, rx }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message || 'Could not load dashboard data.' })));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setAttempt((a) => a + 1);
  };

  const { loading, error, meds, orders, rx } = state;
  const activeOrders = orders.filter((o) => ACTIVE.includes(o.status));
  const lowStock = meds.filter((m) => Number(m.stock) < LOW_STOCK).sort((a, b) => a.stock - b.stock);
  const recent = [...orders].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)).slice(0, 5);
  const isOwner = user?.role === 'pharmacy';
  // Owners are greeted by their own name (the account name is the store's); reps by theirs.
  const firstName = ((isOwner ? user?.ownerName : user?.name) || '').trim().split(' ')[0];
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const waiting = [
    activeOrders.length > 0 && `${plural(activeOrders.length, 'order')} to process`,
    rx.length > 0 && `${plural(rx.length, 'prescription')} to verify`,
    lowStock.length > 0 && `${plural(lowStock.length, 'item')} running low`,
  ].filter(Boolean);
  const summary = loading
    ? 'Loading today’s work…'
    : waiting.length
      ? `${waiting.join(' · ')}.`
      : 'You’re all caught up — nothing is waiting.';

  return (
    <>
      <WelcomeBanner title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'} text={summary}>
        {activeOrders.length > 0 ? (
          <Button size="sm" onClick={() => setActiveSection('orders')}>Process orders</Button>
        ) : rx.length > 0 ? (
          <Button size="sm" onClick={() => setActiveSection('prescriptions')}>Verify prescriptions</Button>
        ) : null}
      </WelcomeBanner>

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <StatGrid
            loading={loading}
            stats={[
              { label: 'Orders to process', value: activeOrders.length, icon: <FiClipboard />, tone: 'warning', hint: 'Not yet delivered' },
              { label: 'Prescriptions to verify', value: rx.length, icon: <FiFileText />, tone: 'primary', hint: 'Awaiting review' },
              { label: 'Low-stock items', value: lowStock.length, icon: <FiAlertTriangle />, tone: lowStock.length ? 'error' : 'success', hint: `Below ${LOW_STOCK} units` },
              { label: 'Catalogue size', value: meds.length, icon: <FiPackage />, tone: 'violet', hint: 'Listed medicines' },
            ]}
          />

          <div className="row g-4">
            <div className="col-xl-7">
              <Panel
                title="Latest orders"
                icon={<FiShoppingBag />}
                flush
                actions={<Button variant="link" size="sm" onClick={() => setActiveSection('orders')}>View all</Button>}
              >
                {loading ? (
                  <div className="p-4"><Skeleton lines={5} /></div>
                ) : recent.length === 0 ? (
                  <EmptyState title="No orders yet" description="New customer orders will appear here." />
                ) : (
                  <ul className="dw-list">
                    {recent.map((o) => (
                      <li key={o.id || o._id}>
                        <div>
                          <strong>{orderRef(o)}</strong>
                          <span>{o.customerName || o.patientName || o.userId?.name || 'Customer'} · {fmtDate(o.createdAt || o.date)}</span>
                        </div>
                        <div className="dw-list__end">
                          <span className="dw-list__amount">{formatPrice(o.total ?? o.totalAmount)}</span>
                          <Badge tone={STATUS_TONE[o.status] || 'neutral'}>{o.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="col-xl-5">
              <Panel
                title="Stock alerts"
                icon={<FiAlertTriangle />}
                flush
                actions={<Button variant="link" size="sm" onClick={() => setActiveSection('medicines')}>Manage inventory</Button>}
              >
                {loading ? (
                  <div className="p-4"><Skeleton lines={4} /></div>
                ) : lowStock.length === 0 ? (
                  <EmptyState title="Stock levels look healthy" description={`No medicines below ${LOW_STOCK} units.`} />
                ) : (
                  <ul className="dw-list">
                    {lowStock.slice(0, 6).map((m) => (
                      <li key={m.id || m._id}>
                        <div>
                          <strong>{m.brand || m.name}</strong>
                          <span>{m.name}</span>
                        </div>
                        <Badge tone={Number(m.stock) === 0 ? 'error' : 'warning'}>
                          {Number(m.stock) === 0 ? 'Out of stock' : `${m.stock} left`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  );
}
