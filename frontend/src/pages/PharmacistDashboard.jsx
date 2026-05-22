import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Table, Badge,
  Modal, Form, Spinner, Alert, Nav,
} from 'react-bootstrap';
import {
  FaPills, FaClipboardList, FaFileMedical,
  FaPlus, FaEdit, FaTrash, FaExclamationTriangle,
  FaCheckCircle, FaTimesCircle, FaClock, FaEye,
  FaTimes, FaSearch, FaChartBar, FaHistory,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchAllMedicines, createMedicine, updateMedicine, deleteMedicine,
  fetchAllOrders, updateOrderStatus, NEXT_STATUSES,
  fetchPendingPrescriptions, verifyPrescription,
} from '../services/pharmacistService';
import './PharmacistDashboard.css';

/* ═══════════════════ HELPERS ═══════════════════════════════════ */
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-PK', {
  day: 'numeric', month: 'short', year: 'numeric',
});
const fmtBytes = (b) => b < 1024 * 1024
  ? `${(b / 1024).toFixed(0)} KB`
  : `${(b / (1024 * 1024)).toFixed(1)} MB`;

const ORDER_STATUS_CFG = {
  pending:   { color: 'warning', text: 'dark' },
  confirmed: { color: 'primary', text: null },
  dispatched:{ color: 'info',    text: null },
  delivered: { color: 'success', text: null },
  cancelled: { color: 'danger',  text: null },
};

const PAYMENT_LABELS = { cod:'Cash on Delivery', jazz:'JazzCash', easy:'EasyPaisa', card:'Card' };
const EMPTY_MED = {
  name:'', brand:'', category:'', price:'', original_price:'',
  stock:'', requires_prescription: false, description:'', image:'💊',
};

/* ═══════════════════ MEDICINES SUB-PAGE ════════════════════════ */
function MedicinesPage() {
  const { toast } = useToast();
  const [meds,    setMeds]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null);   // null | 'add' | med-object
  const [form,    setForm]    = useState(EMPTY_MED);
  const [saving,  setSaving]  = useState(false);
  const [delId,   setDelId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setMeds(await fetchAllMedicines()); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(EMPTY_MED); setModal('add'); };
  const openEdit = (m) => { setForm({ ...m }); setModal(m); };
  const closeModal = () => { setModal(null); setSaving(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:          Number(form.price),
        original_price: Number(form.original_price) || Number(form.price),
        stock:          Number(form.stock),
      };
      if (modal === 'add') {
        const created = await createMedicine(payload);
        setMeds(prev => [created, ...prev]);
        toast.success(`${created.name} added`);
      } else {
        const updated = await updateMedicine(modal.id, payload);
        setMeds(prev => prev.map(m => m.id === updated.id ? updated : m));
        toast.success(`${updated.name} updated`);
      }
      closeModal();
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDelId(id);
    try {
      await deleteMedicine(id);
      setMeds(prev => prev.filter(m => m.id !== id));
      toast.success('Medicine deleted');
    } catch(e) { toast.error(e.message); }
    finally { setDelId(null); }
  };

  const visible = meds.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.brand.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );
  const lowStock  = meds.filter(m => m.stock > 0  && m.stock < 10).length;
  const outStock  = meds.filter(m => m.stock === 0).length;

  const fld = (k) => ({ value: form[k] ?? '', onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <>
      {/* Stats row */}
      <div className="ph-stat-row mb-3">
        <div className="ph-stat"><span className="ph-stat-num">{meds.length}</span><span>Total</span></div>
        <div className="ph-stat warn"><span className="ph-stat-num">{lowStock}</span><span>Low Stock</span></div>
        <div className="ph-stat danger"><span className="ph-stat-num">{outStock}</span><span>Out of Stock</span></div>
      </div>

      {/* Toolbar */}
      <div className="ph-toolbar mb-3">
        <div className="ph-search-wrap">
          <FaSearch className="ph-search-icon" />
          <input className="ph-search" placeholder="Search medicines…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <Button className="btn-ph-add" onClick={openAdd}>
          <FaPlus className="me-1" />Add Medicine
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="ph-loading"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <div className="ph-table-wrap">
          <Table hover responsive className="ph-table">
            <thead>
              <tr>
                <th>#</th><th>Medicine</th><th>Category</th>
                <th>Price</th><th>Stock</th><th>Rx</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted py-4">No medicines found.</td></tr>
              )}
              {visible.map(m => {
                const lowRow = m.stock > 0 && m.stock < 10;
                const outRow = m.stock === 0;
                return (
                  <tr key={m.id} className={outRow ? 'row-danger' : lowRow ? 'row-warn' : ''}>
                    <td className="text-muted small">{m.id}</td>
                    <td>
                      <div className="med-cell">
                        <span className="med-emoji">{m.image}</span>
                        <div>
                          <div className="med-name">{m.name}</div>
                          <div className="med-brand">{m.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge bg="secondary" className="cat-badge">{m.category}</Badge></td>
                    <td className="fw-bold">Rs.{m.price}</td>
                    <td>
                      {outRow
                        ? <Badge bg="danger">Out of Stock</Badge>
                        : lowRow
                          ? <span className="stock-low"><FaExclamationTriangle className="me-1"/>{m.stock}</span>
                          : <span className="stock-ok">{m.stock}</span>}
                    </td>
                    <td>{m.requires_prescription ? <Badge bg="warning" text="dark">Rx</Badge> : '—'}</td>
                    <td>
                      <div className="action-btns">
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(m)}><FaEdit /></Button>
                        <Button size="sm" variant="outline-danger"
                          onClick={() => handleDelete(m.id)} disabled={delId === m.id}>
                          {delId === m.id ? <Spinner size="sm" animation="border" /> : <FaTrash />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal show={!!modal} onHide={closeModal} size="lg" centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title>{modal === 'add' ? 'Add New Medicine' : `Edit – ${modal?.name}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSave}>
            <Row className="g-3">
              <Col md={6}><Form.Group><Form.Label>Name *</Form.Label>
                <Form.Control required placeholder="Paracetamol 500mg" {...fld('name')} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Brand</Form.Label>
                <Form.Control placeholder="Panadol" {...fld('brand')} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Category *</Form.Label>
                <Form.Control required placeholder="Analgesics" {...fld('category')} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Image Emoji</Form.Label>
                <Form.Control placeholder="💊" {...fld('image')} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Price (Rs.) *</Form.Label>
                <Form.Control required type="number" min="0" {...fld('price')} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Original Price (Rs.)</Form.Label>
                <Form.Control type="number" min="0" {...fld('original_price')} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Stock *</Form.Label>
                <Form.Control required type="number" min="0" {...fld('stock')} /></Form.Group></Col>
              <Col xs={12}><Form.Group><Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={2} {...fld('description')} /></Form.Group></Col>
              <Col xs={12}><Form.Check type="switch" id="rxSwitch" label="Requires Prescription"
                checked={!!form.requires_prescription}
                onChange={e => setForm(p => ({ ...p, requires_prescription: e.target.checked }))} /></Col>
            </Row>
            <div className="mt-4 d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" type="button" onClick={closeModal}>Cancel</Button>
              <Button className="btn-ph-save" type="submit" disabled={saving}>
                {saving ? <Spinner size="sm" animation="border" /> : modal === 'add' ? 'Add Medicine' : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}

/* ═══════════════════ ORDERS SUB-PAGE ═══════════════════════════ */
function OrdersPage({ mode = 'active' }) {
  const { toast } = useToast();
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [detail,    setDetail]    = useState(null);
  const [updating,  setUpdating]  = useState(null);

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
  useEffect(() => { setFilter('all'); }, [mode]);

  const handleStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order ${orderId} → ${newStatus}`);
    } catch(e) { toast.error(e.message); }
    finally { setUpdating(null); }
  };

  const isHistory = mode === 'history';
  const subTabs = isHistory 
    ? ['all', 'delivered', 'cancelled'] 
    : ['all', 'pending', 'confirmed', 'dispatched'];

  const filteredOrders = orders.filter(o => {
    if (isHistory) {
      const isHistOrder = o.status === 'delivered' || o.status === 'cancelled';
      if (!isHistOrder) return false;
      if (filter === 'all') return true;
      return o.status === filter;
    } else {
      const isActiveOrder = o.status === 'pending' || o.status === 'confirmed' || o.status === 'dispatched';
      if (!isActiveOrder) return false;
      if (filter === 'all') return true;
      return o.status === filter;
    }
  });

  return (
    <>
      {/* Filter tabs */}
      <Nav variant="pills" className="ph-tabs mb-3" activeKey={filter} onSelect={setFilter}>
        {subTabs.map(t => (
          <Nav.Item key={t}>
            <Nav.Link eventKey={t} className="ph-tab">
              {t === 'all' ? (isHistory ? 'All History' : 'All Active') : (t.charAt(0).toUpperCase() + t.slice(1))}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {loading ? (
        <div className="ph-loading"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <div className="ph-table-wrap">
          <Table hover responsive className="ph-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Update Status</th><th>Details</th></tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted py-4">No orders found.</td></tr>
              )}
              {filteredOrders.map(o => {
                const cfg  = ORDER_STATUS_CFG[o.status] || ORDER_STATUS_CFG.pending;
                const next = NEXT_STATUSES[o.status] || [];
                return (
                  <tr key={o.id}>
                    <td><code className="order-id-code">{o.id}</code></td>
                    <td>{o.shippingAddress?.firstName} {o.shippingAddress?.lastName}</td>
                    <td className="text-muted small">{fmtDate(o.createdAt)}</td>
                    <td className="fw-bold">Rs.{o.totalAmount.toLocaleString()}</td>
                    <td>
                      <Badge bg={cfg.color} text={cfg.text || undefined} className="status-pill">
                        {o.status}
                      </Badge>
                    </td>
                    <td>
                      {next.length > 0 ? (
                        <Form.Select size="sm" className="status-select"
                          value=""
                          disabled={updating === o.id}
                          onChange={e => { if(e.target.value) handleStatus(o.id, e.target.value); }}>
                          <option value="">Move to…</option>
                          {next.map(s => <option key={s} value={s}>{s}</option>)}
                        </Form.Select>
                      ) : <span className="text-muted small">—</span>}
                    </td>
                    <td>
                      <Button size="sm" variant="outline-secondary" onClick={() => setDetail(o)}>
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

      {/* Order detail modal */}
      <Modal show={!!detail} onHide={() => setDetail(null)} size="lg" centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title>Order Details — {detail?.id}</Modal.Title>
        </Modal.Header>
        {detail && (
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <div className="detail-section">
                  <h6 className="detail-title">Items</h6>
                  {detail.items.map(i => (
                    <div key={i.medicineId} className="detail-item-row">
                      <span>{i.image} {i.name}</span>
                      <span className="ms-auto">×{i.quantity} — Rs.{(i.price * i.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="detail-item-row fw-bold border-top mt-2 pt-2">
                    <span>Total</span><span className="ms-auto">Rs.{detail.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div className="detail-section">
                  <h6 className="detail-title">Shipping</h6>
                  <p className="detail-addr">
                    {detail.shippingAddress.firstName} {detail.shippingAddress.lastName}<br />
                    {detail.shippingAddress.address}<br />
                    {detail.shippingAddress.city}<br />
                    {detail.shippingAddress.phone}
                  </p>
                  <h6 className="detail-title mt-3">Payment</h6>
                  <p>{PAYMENT_LABELS[detail.paymentMethod] || detail.paymentMethod}
                    <Badge bg={detail.paymentStatus === 'paid' ? 'success' : 'warning'}
                      text={detail.paymentStatus !== 'paid' ? 'dark' : undefined} className="ms-2">
                      {detail.paymentStatus}
                    </Badge>
                  </p>
                  {detail.prescriptionId && <p className="text-muted small">Rx: <code>{detail.prescriptionId}</code></p>}
                </div>
              </Col>
            </Row>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
}

/* ═══════════════════ PRESCRIPTIONS SUB-PAGE ════════════════════ */
function PrescriptionsPage() {
  const { toast } = useToast();
  const [rxList,    setRxList]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [enlarged,  setEnlarged]  = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [reason,    setReason]    = useState('');
  const [acting,    setActing]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRxList(await fetchPendingPrescriptions()); }
    catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, status, rejectionReason = '') => {
    setActing(id + status);
    try {
      await verifyPrescription(id, status, rejectionReason);
      setRxList(prev => prev.filter(p => p.id !== id));
      toast.success(`Prescription ${id} ${status}`);
      setRejectFor(null); setReason('');
    } catch(e) { toast.error(e.message); }
    finally { setActing(null); }
  };

  const RX_ICON = { 'image/jpeg':'🖼️', 'image/png':'🖼️', 'image/webp':'🖼️', 'application/pdf':'📄' };

  return (
    <>
      <div className="ph-stat-row mb-3">
        <div className="ph-stat warn">
          <span className="ph-stat-num">{rxList.length}</span>
          <span>Pending Review</span>
        </div>
      </div>

      {loading ? (
        <div className="ph-loading"><Spinner animation="border" variant="primary" /></div>
      ) : rxList.length === 0 ? (
        <div className="ph-empty">
          <FaCheckCircle className="ph-empty-icon text-success" />
          <h5>All caught up!</h5>
          <p>No pending prescriptions to review.</p>
        </div>
      ) : (
        <div className="rx-verify-grid">
          {rxList.map(rx => (
            <Card key={rx.id} className="rx-verify-card">
              {/* File preview */}
              <div className="rx-preview-box" role="button"
                onClick={() => setEnlarged(rx)}
                title="Click to enlarge">
                <span className="rx-preview-icon">{RX_ICON[rx.fileType] || '📎'}</span>
                <div className="rx-preview-overlay"><FaEye /></div>
              </div>

              <Card.Body className="rx-card-body-inner">
                <div className="rx-id-line"><code>{rx.id}</code>
                  <Badge bg="warning" text="dark"><FaClock /> Pending</Badge>
                </div>

                <div className="rx-file-line">{rx.fileName}</div>
                <div className="rx-meta-line">
                  {fmtBytes(rx.fileSize)} · {fmtDate(rx.uploadedAt)}
                </div>

                {rx.notes && (
                  <div className="rx-notes-box">
                    <FaFileMedical className="me-1" />{rx.notes}
                  </div>
                )}

                <div className="rx-action-row">
                  <Button size="sm" className="btn-approve"
                    disabled={!!acting}
                    onClick={() => act(rx.id, 'verified')}>
                    {acting === rx.id+'verified'
                      ? <Spinner size="sm" animation="border" />
                      : <><FaCheckCircle className="me-1" />Approve</>}
                  </Button>
                  <Button size="sm" variant="outline-danger"
                    disabled={!!acting}
                    onClick={() => { setRejectFor(rx); setReason(''); }}>
                    {acting === rx.id+'rejected'
                      ? <Spinner size="sm" animation="border" />
                      : <><FaTimesCircle className="me-1" />Reject</>}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Enlarge modal */}
      <Modal show={!!enlarged} onHide={() => setEnlarged(null)} centered size="lg">
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title>{enlarged?.fileName}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-3">
          <div className="rx-enlarge-placeholder">
            <span style={{ fontSize:'5rem' }}>{RX_ICON[enlarged?.fileType] || '📎'}</span>
            <p className="mt-2 text-muted">{enlarged?.fileName}</p>
            <p className="text-muted small">{enlarged && fmtBytes(enlarged.fileSize)}</p>
          </div>
        </Modal.Body>
      </Modal>

      {/* Reject reason modal */}
      <Modal show={!!rejectFor} onHide={() => setRejectFor(null)} centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title>Reject Prescription</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Provide a reason so the patient knows how to resubmit.</p>
          <Form.Group>
            <Form.Label>Rejection Reason *</Form.Label>
            <Form.Control as="textarea" rows={3}
              placeholder="e.g. Prescription is expired / signature missing / illegible image"
              value={reason} onChange={e => setReason(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setRejectFor(null)}>Cancel</Button>
          <Button variant="danger" disabled={!reason.trim() || !!acting}
            onClick={() => act(rejectFor.id, 'rejected', reason)}>
            {acting ? <Spinner size="sm" animation="border" /> : 'Confirm Rejection'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

/* ═══════════════════ OVERVIEW PAGE ═════════════════════════════ */
function OverviewPage({ setActiveSection }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, verification: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [meds, ordersList, prescriptions] = await Promise.all([
          fetchAllMedicines(),
          fetchAllOrders(),
          fetchPendingPrescriptions(),
        ]);
        const lowStockCount = meds.filter(m => m.stock < 10).length;
        const pendingOrdersCount = ordersList.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'dispatched').length;
        const pendingRxCount = prescriptions.length;
        setStats({
          pending: pendingOrdersCount,
          verification: pendingRxCount,
          lowStock: lowStockCount
        });
      } catch (e) {
        console.error("Failed to load overview stats:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const notifications = [
    { time: '10 mins ago', text: 'Low stock alert: Amoxicillin 250mg is down to 8 units.', type: 'danger' },
    { time: '45 mins ago', text: 'Order #ORD-9982 was verified and marked as Dispatched.', type: 'success' },
    { time: '2 hours ago', text: 'Prescription #RX-4091 uploaded by Ahmed Khan was Approved.', type: 'info' },
    { time: '4 hours ago', text: 'System: Database sync completed successfully.', type: 'primary' },
  ];

  return (
    <div className="ph-overview">
      {/* Welcome Banner */}
      <div className="ph-welcome-banner mb-4">
        <h2>Welcome back, {user?.name || 'Pharmacist'}!</h2>
        <p>Here is an overview of today's active apothecary operations.</p>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="ph-glass-card shadow-sm clickable" onClick={() => setActiveSection('orders')}>
            <Card.Body className="d-flex align-items-center gap-3">
              <div className="ph-glass-icon bg-warning-light text-warning">
                <FaClipboardList size={24} />
              </div>
              <div>
                <h4 className="fw-900 mb-0">{loading ? '...' : stats.pending}</h4>
                <div className="text-muted small">Pending Orders</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="ph-glass-card shadow-sm clickable" onClick={() => setActiveSection('prescriptions')}>
            <Card.Body className="d-flex align-items-center gap-3">
              <div className="ph-glass-icon bg-info-light text-info">
                <FaFileMedical size={24} />
              </div>
              <div>
                <h4 className="fw-900 mb-0">{loading ? '...' : stats.verification}</h4>
                <div className="text-muted small">Awaiting Verification</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="ph-glass-card shadow-sm clickable" onClick={() => setActiveSection('medicines')}>
            <Card.Body className="d-flex align-items-center gap-3">
              <div className="ph-glass-icon bg-danger-light text-danger">
                <FaPills size={24} />
              </div>
              <div>
                <h4 className="fw-900 mb-0">{loading ? '...' : stats.lowStock}</h4>
                <div className="text-muted small">Low Stock Items</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Notifications timeline */}
      <Card className="ph-glass-card shadow-sm mt-4">
        <Card.Header className="bg-transparent border-0 pt-3">
          <h5 className="fw-bold mb-0"><FaHistory className="me-2 text-primary" />Recent Apothecary Activity</h5>
        </Card.Header>
        <Card.Body>
          <div className="ph-timeline">
            {notifications.map((n, idx) => (
              <div key={idx} className="ph-timeline-item d-flex gap-3 mb-3 pb-3 border-bottom-dashed">
                <div className={`ph-timeline-badge bg-${n.type}`}></div>
                <div className="flex-grow-1">
                  <p className="mb-0 fw-600 text-dark small">{n.text}</p>
                  <span className="text-muted extra-small">{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

/* ═══════════════════ SIDEBAR LAYOUT ════════════════════════════ */
const SECTIONS = [
  { key:'overview',      label:'Dashboard Overview',   icon:<FaChartBar /> },
  { key:'orders',        label:'Manage Orders',        icon:<FaClipboardList /> },
  { key:'prescriptions', label:'Verify Rx',            icon:<FaFileMedical /> },
  { key:'medicines',     label:'Inventory',            icon:<FaPills /> },
  { key:'history',       label:'Order History',        icon:<FaHistory /> },
];

export default function PharmacistDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  const section = SECTIONS.find(s => s.key === active);

  return (
    <div className="ph-page">
      {/* Mobile sidebar toggle */}
      <button className="ph-mobile-toggle d-lg-none" onClick={() => setMobileOpen(o => !o)}>
        ☰ Dashboard Menu
      </button>

      <div className="ph-layout">
        {/* ── Sidebar ── */}
        <aside className={`ph-sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="ph-sidebar-header">
            <div className="ph-avatar">{user?.name?.[0] || 'P'}</div>
            <div>
              <div className="ph-sidebar-name">{user?.name || 'Pharmacist'}</div>
              <div className="ph-sidebar-role">PharmD</div>
            </div>
          </div>
          <nav className="ph-nav">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                className={`ph-nav-item ${active === s.key ? 'active' : ''}`}
                onClick={() => { setActive(s.key); setMobileOpen(false); }}
              >
                <span className="ph-nav-icon">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="ph-main">
          <div className="ph-main-header">
            <h1 className="ph-main-title">{section?.icon} {section?.label}</h1>
          </div>

          <div className="ph-content">
            {active === 'overview'      && <OverviewPage setActiveSection={setActive} />}
            {active === 'medicines'     && <MedicinesPage />}
            {active === 'orders'        && <OrdersPage mode="active" />}
            {active === 'prescriptions' && <PrescriptionsPage />}
            {active === 'history'       && <OrdersPage mode="history" />}
          </div>
        </main>
      </div>
    </div>
  );
}
