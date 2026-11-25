import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Table, Badge, Modal, Spinner, Nav } from 'react-bootstrap';
import { FaClipboardList, FaFileMedical, FaCheckCircle, FaTimesCircle, FaClock, FaEye, FaSearch, FaShippingFast, FaBoxOpen, FaMapMarkerAlt, FaPhone, FaReceipt, FaCoins, FaTruck, FaCheck } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';
import { fetchAllOrders, updateOrderStatus, NEXT_STATUSES } from '../../../services/api/pharmacistService';
import { serverUrl, fmtDate, ORDER_STATUS_CFG, PAYMENT_LABELS } from './pharmacistShared';


/* ═══════════════════ ORDERS SUB-PAGE ═══════════════════════════ */
export default function OrdersPage({ mode = 'active' }) {
  const { toast } = useToast();
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [detail,    setDetail]    = useState(null);
  const [updating,  setUpdating]  = useState(null);
  const [search,    setSearch]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const all = await fetchAllOrders(); 
      setOrders(all);
    }
    catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setFilter('all'); setSearch(''); }, [mode]);

  const handleStatus = async (orderId, newStatus) => {
    let cancelReason = '';
    if (newStatus === 'cancelled') {
      const reason = window.prompt("Please provide a reason for cancelling this order:", "Inventory items out of stock.");
      if (reason === null) return; // cancel status update
      cancelReason = reason;
    }

    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, cancellationReason: cancelReason } : o));
      toast.success(`Order ${orderId} → ${newStatus}`);

      // Create notification for patient
      try {
        const targetOrder = orders.find(o => o.id === orderId);
        const patientId = targetOrder?.patientId || targetOrder?.userId || 99;
        const key = 'medeasy_notifications_' + patientId;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        let text = `Order #${orderId} has been marked as ${newStatus}.`;
        let emoji = 'system';
        if (newStatus === 'confirmed') {
          text = `Order Confirmed: Your order #${orderId} is confirmed and is being prepared by the pharmacy store!`;
          emoji = 'booking';
        } else if (newStatus === 'dispatched') {
          text = `Order Dispatched: Your order #${orderId} is on the way!`;
          emoji = 'booking';
        } else if (newStatus === 'delivered') {
          text = `Order Delivered: Your order #${orderId} has been successfully delivered!`;
          emoji = 'welcome';
        } else if (newStatus === 'cancelled') {
          text = `Order Cancelled: Your order #${orderId} has been cancelled by the pharmacy. Reason: ${cancelReason}.`;
          emoji = 'cancel';
        }

        alerts.unshift({
          id: 'alert-' + Date.now(),
          text,
          time: Date.now(),
          emoji,
          unread: true,
          link: `/orders`
        });
        localStorage.setItem(key, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }
    } catch(e) { toast.error(e.message); }
    finally { setUpdating(null); }
  };

  const isHistory = mode === 'history';
  const subTabs = isHistory 
    ? ['all', 'delivered', 'cancelled'] 
    : ['all', 'pending', 'confirmed', 'dispatched'];

  // Metrics calculation
  const totalActiveCount = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'dispatched').length;
  const pendingCount     = orders.filter(o => o.status === 'pending').length;
  const confirmedCount   = orders.filter(o => o.status === 'confirmed').length;
  const dispatchedCount  = orders.filter(o => o.status === 'dispatched').length;
  const deliveredCount   = orders.filter(o => o.status === 'delivered').length;
  const cancelledCount   = orders.filter(o => o.status === 'cancelled').length;

  const filteredOrders = orders.filter(o => {
    // 1. Mode check
    const matchesMode = isHistory 
      ? (o.status === 'delivered' || o.status === 'cancelled')
      : (o.status === 'pending' || o.status === 'confirmed' || o.status === 'dispatched');
    if (!matchesMode) return false;

    // 2. Filter check
    if (filter !== 'all' && o.status !== filter) return false;

    // 3. Search check
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const orderId = String(o.id || '').toLowerCase();
      const firstName = String(o.shippingAddress?.firstName || '').toLowerCase();
      const lastName = String(o.shippingAddress?.lastName || '').toLowerCase();
      const city = String(o.shippingAddress?.city || '').toLowerCase();
      const phone = String(o.shippingAddress?.phone || '').toLowerCase();
      
      return (
        orderId.includes(q) ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        city.includes(q) ||
        phone.includes(q)
      );
    }
    return true;
  });

  const getTabLabel = (tabKey) => {
    let base;
    let count;
    if (tabKey === 'all') {
      base = isHistory ? 'All History' : 'All Active';
      count = isHistory ? (deliveredCount + cancelledCount) : totalActiveCount;
    } else {
      base = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
      count = orders.filter(o => o.status === tabKey).length;
    }
    
    return (
      <span className="d-flex align-items-center gap-2">
        {base}
        <Badge bg="light" text="dark" className="rounded-pill px-2 py-0.5 border" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
          {count}
        </Badge>
      </span>
    );
  };

  const renderStatusActions = (order) => {
    const next = NEXT_STATUSES[order.status] || [];
    if (next.length === 0) {
      return (
        <span className="text-muted small d-flex align-items-center gap-1 bg-light px-2.5 py-1 rounded-3" style={{ width: 'fit-content' }}>
          {order.status === 'delivered' ? (
            <><FaCheckCircle className="text-success" /> Completed</>
          ) : (
            <><FaTimesCircle className="text-danger" /> Cancelled</>
          )}
        </span>
      );
    }

    const isUpdating = updating === order.id;

    return (
      <div className="d-flex align-items-center gap-2">
        {next.includes('confirmed') && (
          <Button 
            size="sm" 
            variant="success" 
            className="d-flex align-items-center gap-1.5 px-3 py-1.5 font-weight-700 shadow-sm border-0"
            style={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}
            onClick={() => handleStatus(order.id, 'confirmed')}
            disabled={isUpdating}
          >
            {isUpdating ? <Spinner size="sm" animation="border" /> : <FaCheck />} Confirm
          </Button>
        )}
        {next.includes('dispatched') && (
          <Button 
            size="sm" 
            variant="primary" 
            className="d-flex align-items-center gap-1.5 px-3 py-1.5 font-weight-700 shadow-sm border-0"
            style={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-600))' }}
            onClick={() => handleStatus(order.id, 'dispatched')}
            disabled={isUpdating}
          >
            {isUpdating ? <Spinner size="sm" animation="border" /> : <FaShippingFast />} Dispatch
          </Button>
        )}
        {next.includes('delivered') && (
          <Button 
            size="sm" 
            variant="info" 
            className="d-flex align-items-center gap-1.5 px-3 py-1.5 font-weight-700 shadow-sm border-0 text-white"
            style={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--color-accent-600), var(--color-accent-500))' }}
            onClick={() => handleStatus(order.id, 'delivered')}
            disabled={isUpdating}
          >
            {isUpdating ? <Spinner size="sm" animation="border" /> : <FaBoxOpen />} Deliver
          </Button>
        )}
        {next.includes('cancelled') && (
          <Button 
            size="sm" 
            variant="outline-danger" 
            className="d-flex align-items-center gap-1 px-2.5 py-1.5"
            style={{ borderRadius: '8px', fontSize: '0.75rem', border: '1px solid var(--tint-error-200)', color: 'var(--color-error-500)' }}
            onClick={() => handleStatus(order.id, 'cancelled')}
            disabled={isUpdating}
          >
            Cancel
          </Button>
        )}
      </div>
    );
  };

  const getTimelineProgress = (status) => {
    const steps = ['pending', 'confirmed', 'dispatched', 'delivered'];
    const activeIndex = steps.indexOf(status);
    
    if (status === 'cancelled') {
      return (
        <div className="w-100 p-3 mb-4 rounded-3 border-danger d-flex align-items-center gap-3" style={{ background: 'var(--color-neutral-100)', border: '1px solid var(--tint-error-200)', color: 'var(--fg-error)' }}>
          <FaTimesCircle className="fs-4 flex-shrink-0" />
          <div>
            <strong className="d-block" style={{ fontSize: '0.85rem' }}>This order has been cancelled</strong>
            {detail?.cancellationReason && <span style={{ fontSize: '0.78rem' }}>Reason: {detail.cancellationReason}</span>}
          </div>
        </div>
      );
    }

    return (
      <div className="ph-order-timeline-horizontal mb-4 p-3 rounded-4 bg-light d-flex align-items-center justify-content-between">
        {steps.map((step, idx) => {
          const isCompleted = idx <= activeIndex;
          const isActive = idx === activeIndex;
          const labels = { pending: 'Placed', confirmed: 'Confirmed', dispatched: 'Dispatched', delivered: 'Delivered' };
          const icons = { pending: <FaReceipt />, confirmed: <FaCheck />, dispatched: <FaShippingFast />, delivered: <FaBoxOpen /> };
          
          return (
            <div key={step} className="d-flex align-items-center flex-grow-1" style={{ position: 'relative' }}>
              <div className="d-flex flex-column align-items-center" style={{ zIndex: 2, minWidth: '80px' }}>
                <div 
                  className={`d-flex align-items-center justify-content-center shadow-sm rounded-circle ${isCompleted ? (isActive ? 'bg-primary text-white animate-pulse' : 'bg-success text-white') : 'bg-white text-muted border'}`} 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    boxShadow: isActive ? '0 0 0 4px color-mix(in srgb, var(--color-primary-600) 18%, transparent)' : undefined
                  }}
                >
                  {icons[step]}
                </div>
                <span className={`mt-1.5 fw-600 ${isActive ? 'text-primary fw-bold' : isCompleted ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                  {labels[step]}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div 
                  className="flex-grow-1" 
                  style={{ 
                    height: '3px', 
                    background: idx < activeIndex ? 'var(--color-accent-500)' : 'var(--color-neutral-200)', 
                    position: 'absolute', 
                    left: '50px', 
                    right: '-30px', 
                    top: '18px',
                    zIndex: 1,
                    transition: 'background 0.3s ease'
                  }} 
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* 📊 Metrics cards at the top */}
      <Row className="g-3 mb-4 animate-fade-in">
        {!isHistory ? (
          <>
            <Col sm={6} lg={3}>
              <Card className="ph-glass-card shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, var(--color-secondary-900) 0%, var(--color-secondary-800) 100%)', color: 'var(--color-white)' }}>
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="ph-glass-icon bg-white bg-opacity-10 text-white" style={{ background: 'color-mix(in srgb, var(--surface) 15%, transparent)' }}><FaClipboardList className="fs-4" /></div>
                  <div>
                    <div className="small text-white text-opacity-70 fw-600">Active Orders</div>
                    <h3 className="mb-0 fw-900">{totalActiveCount}</h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} lg={3}>
              <Card className="ph-glass-card shadow-sm border-0 h-100">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="ph-glass-icon bg-warning bg-opacity-10 text-warning" style={{ background: 'var(--color-neutral-0)' }}><FaClock className="fs-4" /></div>
                  <div>
                    <div className="small text-muted fw-600">Pending Approval</div>
                    <h3 className="mb-0 fw-900 text-warning">{pendingCount}</h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} lg={3}>
              <Card className="ph-glass-card shadow-sm border-0 h-100">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="ph-glass-icon bg-primary bg-opacity-10 text-primary" style={{ background: 'var(--color-neutral-100)' }}><FaCheckCircle className="fs-4" /></div>
                  <div>
                    <div className="small text-muted fw-600">Confirmed Orders</div>
                    <h3 className="mb-0 fw-900 text-primary">{confirmedCount}</h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} lg={3}>
              <Card className="ph-glass-card shadow-sm border-0 h-100">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="ph-glass-icon bg-info bg-opacity-10 text-info" style={{ background: 'var(--color-neutral-50)' }}><FaShippingFast className="fs-4" /></div>
                  <div>
                    <div className="small text-muted fw-600">Dispatched Transit</div>
                    <h3 className="mb-0 fw-900 text-info">{dispatchedCount}</h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </>
        ) : (
          <>
            <Card className="border-0 shadow-sm rounded-4 w-100" style={{ background: 'linear-gradient(135deg, var(--color-secondary-900) 0%, var(--color-secondary-800) 100%)', color: 'var(--color-white)' }}>
              <Card.Body className="p-4 d-flex justify-content-around flex-wrap gap-4 text-center">
                <div>
                  <div className="text-white text-opacity-70 small fw-600 mb-1">Delivered Fulfillments</div>
                  <h2 className="mb-0 fw-900 text-success" style={{ textShadow: '0 0 10px color-mix(in srgb, var(--color-accent-500) 20%, transparent)' }}>{deliveredCount}</h2>
                </div>
                <div style={{ width: '1px', background: 'color-mix(in srgb, var(--surface) 10%, transparent)' }} />
                <div>
                  <div className="text-white text-opacity-70 small fw-600 mb-1">Cancelled Orders</div>
                  <h2 className="mb-0 fw-900 text-danger" style={{ textShadow: '0 0 10px color-mix(in srgb, var(--color-error-500) 20%, transparent)' }}>{cancelledCount}</h2>
                </div>
                <div style={{ width: '1px', background: 'color-mix(in srgb, var(--surface) 10%, transparent)' }} />
                <div>
                  <div className="text-white text-opacity-70 small fw-600 mb-1">Total Handled</div>
                  <h2 className="mb-0 fw-900" style={{ color: 'var(--color-primary-400)' }}>{deliveredCount + cancelledCount}</h2>
                </div>
              </Card.Body>
            </Card>
          </>
        )}
      </Row>

      {/* 🔍 Search and Toolbar */}
      <div className="ph-toolbar mb-4 gap-3 animate-fade-in">
        <div className="ph-search-wrap" style={{ flex: 1, maxWidth: '400px' }}>
          <FaSearch className="ph-search-icon" />
          <input 
            className="ph-search w-100" 
            placeholder="Search by Order ID, customer, city or phone…" 
            value={search}
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        
        {/* Filter subtabs */}
        <Nav variant="pills" className="ph-tabs" activeKey={filter} onSelect={setFilter}>
          {subTabs.map(t => (
            <Nav.Item key={t}>
              <Nav.Link eventKey={t} className="ph-tab px-3 py-2">
                {getTabLabel(t)}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      {loading ? (
        <div className="ph-loading"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <div className="ph-table-wrap border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in">
          <Table hover responsive className="ph-table align-middle">
            <thead>
              <tr style={{ background: 'var(--color-neutral-50)' }}>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3">Customer & Location</th>
                <th className="py-3">Fulfillment Store</th>
                <th className="py-3">Date Info</th>
                <th className="py-3">Grand Total</th>
                <th className="py-3">Current Status</th>
                <th className="py-3">Update Actions</th>
                <th className="py-3 text-center">Sheets</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-5 bg-white">
                    <div className="d-flex flex-column align-items-center gap-3">
                      <FaClipboardList className="text-light" style={{ fontSize: '3.5rem' }} />
                      <div>
                        <h6 className="fw-bold text-dark mb-1">No orders found</h6>
                        <span className="small">Try refining your search query or tab filters.</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredOrders.map(o => {
                const cfg = ORDER_STATUS_CFG[o.status] || ORDER_STATUS_CFG.pending;
                return (
                  <tr key={o.id} className="bg-white">
                    <td className="px-4"><code className="order-id-code text-primary fw-bold" style={{ letterSpacing: '0.5px' }}>#{o.id.substring(0, 8)}…</code></td>
                    <td>
                      <div>
                        <strong className="text-dark d-block" style={{ fontSize: '0.88rem' }}>
                          {o.shippingAddress?.firstName} {o.shippingAddress?.lastName}
                        </strong>
                        <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                          {o.shippingAddress?.city} • {o.shippingAddress?.phone}
                        </span>
                      </div>
                    </td>
                    <td>
                      {o.prescriptionId ? (
                        <Badge bg="success" className="text-white rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                          <FaCheck size={8} /> Nishtar Pharmacy
                        </Badge>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="text-muted small">{fmtDate(o.createdAt)}</td>
                    <td className="fw-bold text-dark">Rs.{o.totalAmount.toLocaleString()}</td>
                    <td>
                      <Badge 
                        bg={cfg.color} 
                        text={cfg.text || undefined} 
                        className="status-pill text-uppercase border-0 fw-bold shadow-sm"
                        style={{ fontSize: '0.65rem', padding: '0.35em 0.8em', letterSpacing: '0.3px' }}
                      >
                        {o.status}
                      </Badge>
                    </td>
                    <td>
                      {renderStatusActions(o)}
                    </td>
                    <td className="text-center">
                      <Button 
                        size="sm" 
                        variant="light" 
                        className="btn-details shadow-sm rounded-circle d-inline-flex align-items-center justify-content-center" 
                        style={{ width: '32px', height: '32px', border: '1px solid var(--color-neutral-200)', color: 'var(--color-neutral-800)' }}
                        onClick={() => setDetail(o)}
                      >
                        <FaEye />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* 📋 Order detail modal */}
      <Modal show={!!detail} onHide={() => setDetail(null)} size="lg" centered>
        <Modal.Header closeButton className="ph-modal-header border-bottom-0 p-4">
          <Modal.Title className="fw-900 d-flex align-items-center gap-2 text-dark" style={{ fontSize: '1.15rem' }}>
            <FaClipboardList className="text-primary" /> Invoice Sheet #{detail?.id}
          </Modal.Title>
        </Modal.Header>
        {detail && (
          <Modal.Body className="p-4 pt-0">
            {/* Visual Tracking timeline progress bar */}
            {getTimelineProgress(detail.status)}

            <Row className="g-4">
              <Col md={7}>
                <div className="detail-section h-100" style={{ border: '1px solid var(--color-neutral-100)', background: 'var(--surface)', borderRadius: '16px', boxShadow: '0 4px 15px color-mix(in srgb, var(--color-black) 2%, transparent)' }}>
                  <h6 className="detail-title border-bottom pb-2 d-flex align-items-center gap-2" style={{ color: 'var(--color-neutral-900)', fontSize: '0.95rem' }}>
                    <FaReceipt className="text-primary" /> Order Items
                  </h6>
                  <div className="pe-1" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {detail.items.map(i => (
                      <div key={i.medicineId} className="detail-item-row py-2 border-bottom-dashed d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <span className="med-emoji" style={{ width: '32px', height: '32px', fontSize: '1.1rem', background: 'var(--color-neutral-100)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i.image || '💊'}</span>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{i.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>Rs.{Number(i.price).toLocaleString()} each</div>
                          </div>
                        </div>
                        <span className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                          ×{i.quantity} — <span className="text-primary">Rs.{(i.price * i.quantity).toLocaleString()}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="detail-item-row fw-900 border-top mt-3 pt-3 d-flex align-items-center justify-content-between" style={{ fontSize: '1.05rem', color: 'var(--color-neutral-900)' }}>
                    <span>Grand Total</span>
                    <span className="text-primary" style={{ fontSize: '1.25rem', textShadow: '0 0 1px color-mix(in srgb, var(--color-primary-600) 5%, transparent)' }}>Rs.{detail.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </Col>
              
              <Col md={5}>
                <div className="detail-section h-100" style={{ border: '1px solid var(--color-neutral-100)', background: 'var(--surface)', borderRadius: '16px', boxShadow: '0 4px 15px color-mix(in srgb, var(--color-black) 2%, transparent)' }}>
                  <h6 className="detail-title border-bottom pb-2 d-flex align-items-center gap-2" style={{ color: 'var(--color-neutral-900)', fontSize: '0.95rem' }}>
                    <FaTruck className="text-primary" /> Delivery Information
                  </h6>
                  <p className="detail-addr leading-relaxed p-2.5 rounded-3 bg-light border-0 mb-4" style={{ fontSize: '0.85rem', color: 'var(--color-neutral-700)' }}>
                    <strong className="d-block text-dark mb-1" style={{ fontSize: '0.9rem' }}>
                      {detail.shippingAddress?.firstName} {detail.shippingAddress?.lastName}
                    </strong>
                    <span className="d-flex align-items-center gap-1.5 mb-1.5 text-muted">
                      <FaMapMarkerAlt className="text-primary" size={12} /> {detail.shippingAddress?.address}, {detail.shippingAddress?.city}
                    </span>
                    <span className="d-flex align-items-center gap-1.5 text-muted">
                      <FaPhone className="text-primary" size={12} /> {detail.shippingAddress?.phone}
                    </span>
                  </p>

                  <h6 className="detail-title border-bottom pb-2 d-flex align-items-center gap-2" style={{ color: 'var(--color-neutral-900)', fontSize: '0.95rem' }}>
                    <FaCoins className="text-primary" /> Payment Method
                  </h6>
                  <div className="d-flex align-items-center justify-content-between p-2.5 mb-3 bg-light rounded-3">
                    <span className="fw-600 text-dark" style={{ fontSize: '0.85rem' }}>
                      {PAYMENT_LABELS[detail.paymentMethod] || detail.paymentMethod}
                    </span>
                    <Badge 
                      bg={detail.paymentStatus === 'paid' ? 'success' : 'warning'}
                      text={detail.paymentStatus !== 'paid' ? 'dark' : undefined} 
                      className="status-pill border-0 px-2.5 py-1 fw-bold text-uppercase"
                      style={{ fontSize: '0.65rem' }}
                    >
                      {detail.paymentStatus}
                    </Badge>
                  </div>
                  
                  {detail.prescriptionId && (
                    <div className="p-2.5 bg-warning-light border-warning rounded-3 text-warning-dark d-flex align-items-center justify-content-between gap-2 mt-3" style={{ fontSize: '0.78rem' }}>
                      <div className="d-flex align-items-center gap-2">
                        <FaFileMedical /> 
                        <span>Required Prescription: <code>{typeof detail.prescriptionId === 'object' ? (detail.prescriptionId._id || detail.prescriptionId.id) : detail.prescriptionId}</code></span>
                      </div>
                      {typeof detail.prescriptionId === 'object' && detail.prescriptionId.fileUrl && (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          href={detail.prescriptionId.fileUrl.startsWith('data:') || detail.prescriptionId.fileUrl.startsWith('http') ? detail.prescriptionId.fileUrl : `${serverUrl}${detail.prescriptionId.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-0.5 px-2 bg-white"
                          style={{ fontSize: '0.7rem' }}
                        >
                          <FaEye className="me-1" /> View
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
}
