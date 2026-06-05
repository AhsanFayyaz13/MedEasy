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
  FaUserShield, FaUserCheck,
  FaShippingFast, FaBoxOpen, FaMapMarkerAlt, FaPhone,
  FaReceipt, FaCoins, FaTruck, FaCheck,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import MedicalIcon from '../components/MedicalIcon';
import {
  fetchAllMedicines, createMedicine, updateMedicine, deleteMedicine, uploadMedicinePhoto,
  fetchAllOrders, updateOrderStatus, NEXT_STATUSES,
  fetchPendingPrescriptions, verifyPrescription,
} from '../services/pharmacistService';
import './PharmacistDashboard.css';

/* ═══════════════════ HELPERS ═══════════════════════════════════ */
const serverUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://medeasy-backend-a5yi.onrender.com';
const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch (e) {
    return String(iso);
  }
};
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
  const [uploading, setUploading] = useState(false);

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadMedicinePhoto(file);
      setForm(p => ({ ...p, image: res.imageUrl }));
      toast.success('Medicine photo uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
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
                      <div className="med-cell" style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="me-2">
                          <MedicalIcon emoji={m.image} category={m.category} size={20} />
                        </div>
                        <div>
                          <div className="med-name">{m.brand || m.name}</div>
                          {m.brand && <div className="med-brand">{m.name}</div>}
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
              {form.image && (
                <Col xs={12} className="d-flex justify-content-center mb-1">
                  <div 
                    style={{ 
                      width: '100px', 
                      height: '100px', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      background: '#f8fafc',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    <MedicalIcon emoji={form.image} category={form.category} size={38} />
                  </div>
                </Col>
              )}
              <Col md={6}><Form.Group><Form.Label>Name *</Form.Label>
                <Form.Control required placeholder="Paracetamol 500mg" {...fld('name')} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Brand</Form.Label>
                <Form.Control placeholder="Panadol" {...fld('brand')} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Category *</Form.Label>
                <Form.Control required placeholder="Analgesics" {...fld('category')} /></Form.Group></Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Medicine Photo Upload</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      disabled={uploading} 
                    />
                    {uploading && <Spinner size="sm" animation="border" variant="primary" />}
                  </div>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Or Enter Icon Key / Image Path / Data URI</Form.Label>
                  <Form.Control placeholder="💊 or uploads/image.png or data:image/png;base64,..." {...fld('image')} />
                </Form.Group>
              </Col>
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
    let base = '';
    let count = 0;
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
            style={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
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
            style={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}
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
            style={{ borderRadius: '8px', fontSize: '0.75rem', border: '1px solid #fca5a5', color: '#ef4444' }}
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
        <div className="w-100 p-3 mb-4 rounded-3 border-danger d-flex align-items-center gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
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
                    boxShadow: isActive ? '0 0 0 4px rgba(37,99,235,0.18)' : undefined
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
                    background: idx < activeIndex ? '#10b981' : '#e2e8f0', 
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
              <Card className="ph-glass-card shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1e293b 100%)', color: '#fff' }}>
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="ph-glass-icon bg-white bg-opacity-10 text-white" style={{ background: 'rgba(255,255,255,0.15)' }}><FaClipboardList className="fs-4" /></div>
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
                  <div className="ph-glass-icon bg-warning bg-opacity-10 text-warning" style={{ background: '#fffbeb' }}><FaClock className="fs-4" /></div>
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
                  <div className="ph-glass-icon bg-primary bg-opacity-10 text-primary" style={{ background: '#eff6ff' }}><FaCheckCircle className="fs-4" /></div>
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
                  <div className="ph-glass-icon bg-info bg-opacity-10 text-info" style={{ background: '#ecfeff' }}><FaShippingFast className="fs-4" /></div>
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
            <Card className="border-0 shadow-sm rounded-4 w-100" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff' }}>
              <Card.Body className="p-4 d-flex justify-content-around flex-wrap gap-4 text-center">
                <div>
                  <div className="text-white text-opacity-70 small fw-600 mb-1">Delivered Fulfillments</div>
                  <h2 className="mb-0 fw-900 text-success" style={{ textShadow: '0 0 10px rgba(16,185,129,0.2)' }}>{deliveredCount}</h2>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <div className="text-white text-opacity-70 small fw-600 mb-1">Cancelled Orders</div>
                  <h2 className="mb-0 fw-900 text-danger" style={{ textShadow: '0 0 10px rgba(239,68,68,0.2)' }}>{cancelledCount}</h2>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <div className="text-white text-opacity-70 small fw-600 mb-1">Total Handled</div>
                  <h2 className="mb-0 fw-900" style={{ color: '#38bdf8' }}>{deliveredCount + cancelledCount}</h2>
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
              <tr style={{ background: '#f8fafc' }}>
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
                        style={{ width: '32px', height: '32px', border: '1px solid #e2e8f0', color: '#1e293b' }}
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
                <div className="detail-section h-100" style={{ border: '1px solid #f1f5f9', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <h6 className="detail-title border-bottom pb-2 d-flex align-items-center gap-2" style={{ color: '#0d1b2a', fontSize: '0.95rem' }}>
                    <FaReceipt className="text-primary" /> Order Items
                  </h6>
                  <div className="pe-1" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {detail.items.map(i => (
                      <div key={i.medicineId} className="detail-item-row py-2 border-bottom-dashed d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <span className="med-emoji" style={{ width: '32px', height: '32px', fontSize: '1.1rem', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i.image || '💊'}</span>
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
                  <div className="detail-item-row fw-900 border-top mt-3 pt-3 d-flex align-items-center justify-content-between" style={{ fontSize: '1.05rem', color: '#0d1b2a' }}>
                    <span>Grand Total</span>
                    <span className="text-primary" style={{ fontSize: '1.25rem', textShadow: '0 0 1px rgba(37,99,235,0.05)' }}>Rs.{detail.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </Col>
              
              <Col md={5}>
                <div className="detail-section h-100" style={{ border: '1px solid #f1f5f9', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <h6 className="detail-title border-bottom pb-2 d-flex align-items-center gap-2" style={{ color: '#0d1b2a', fontSize: '0.95rem' }}>
                    <FaTruck className="text-primary" /> Delivery Information
                  </h6>
                  <p className="detail-addr leading-relaxed p-2.5 rounded-3 bg-light border-0 mb-4" style={{ fontSize: '0.85rem', color: '#374151' }}>
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

                  <h6 className="detail-title border-bottom pb-2 d-flex align-items-center gap-2" style={{ color: '#0d1b2a', fontSize: '0.95rem' }}>
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
                          href={detail.prescriptionId.fileUrl.startsWith('data:') ? detail.prescriptionId.fileUrl : `${serverUrl}${detail.prescriptionId.fileUrl}`}
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

      // Create notification
      try {
        const targetRx = rxList.find(p => p.id === id);
        const patientId = targetRx?.patientId || targetRx?.userId || 99;
        const key = 'medeasy_notifications_' + patientId;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        if (status === 'approved') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Prescription Approved! Your uploaded doctor's prescription #RX-${id} has been verified by the pharmacist.`,
            time: Date.now(),
            emoji: 'booking',
            unread: true,
            link: '/prescriptions/upload'
          });
        } else if (status === 'rejected') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Prescription Declined: Your uploaded prescription #RX-${id} was declined by the pharmacist. Reason: ${rejectionReason}.`,
            time: Date.now(),
            emoji: 'cancel',
            unread: true,
            link: '/prescriptions/upload'
          });
        }
        localStorage.setItem(key, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

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
                {rx.fileUrl && rx.fileType !== 'application/pdf' ? (
                  <img src={rx.fileUrl.startsWith('data:') ? rx.fileUrl : `${serverUrl}${rx.fileUrl}`} alt="prescription" className="rx-thumbnail-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                ) : (
                  <span className="rx-preview-icon">{RX_ICON[rx.fileType] || '📎'}</span>
                )}
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

                {/* 🏪 Non-Confidential Patient Fulfillment Details */}
                <div className="rx-patient-details-box mt-3 p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.82rem', textAlign: 'left' }}>
                  <h6 className="fw-bold mb-2 text-dark small" style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
                    🏪 Fulfillment Routing Details
                  </h6>
                  <div className="mb-1"><strong>Patient Name:</strong> {rx.userId?.name || 'Fayyaz Ahmad'}</div>
                  <div className="mb-1"><strong>Patient Email:</strong> {rx.userId?.email || 'fayyaz@gmail.com'}</div>
                  <div className="mb-1"><strong>Contact Phone:</strong> {rx.userId?.phone || '0300-7654321'}</div>
                  <div className="mb-1.5">
                    <strong>Delivery Address:</strong> {rx.userId?.address || 'House # 42, Block B, DHA Phase 5, Lahore'}
                  </div>
                  <div className="d-flex align-items-center gap-1.5 text-success font-medium" style={{ fontSize: '0.74rem' }}>
                    <span className="dot-blink" style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                    Broadcasted to Nearest Representative Fulfillers
                  </div>
                </div>

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
          {enlarged?.fileUrl ? (
            enlarged.fileType === 'application/pdf' ? (
              <div className="d-flex flex-column align-items-center justify-content-center p-4">
                <FaFilePdf style={{ fontSize: '4rem', color: '#ef4444' }} />
                <p className="mt-3 fw-bold">{enlarged.fileName}</p>
                <p className="text-muted small">PDF Document ({fmtBytes(enlarged.fileSize)})</p>
                <Button 
                  variant="primary" 
                  href={enlarged.fileUrl.startsWith('data:') ? enlarged.fileUrl : `${serverUrl}${enlarged.fileUrl}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-2"
                >
                  Open PDF in New Tab
                </Button>
              </div>
            ) : (
              <div className="rx-image-container">
                <img 
                  src={enlarged.fileUrl.startsWith('data:') ? enlarged.fileUrl : `${serverUrl}${enlarged.fileUrl}`} 
                  alt={enlarged.fileName} 
                  className="img-fluid rounded shadow-sm"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                />
              </div>
            )
          ) : (
            <div className="rx-enlarge-placeholder">
              <span style={{ fontSize:'5rem' }}>{RX_ICON[enlarged?.fileType] || '📎'}</span>
              <p className="mt-2 text-muted">{enlarged?.fileName}</p>
              <p className="text-muted small">{enlarged && fmtBytes(enlarged.fileSize)}</p>
              <p className="small text-danger">No file source available in demo mode</p>
            </div>
          )}
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
        {user?.role === 'pharmacy' ? (
          <>
            <h2>Welcome back, {user?.name || 'Pharmacy'}!</h2>
            <p className="mb-0 text-light opacity-75 small">{user?.pharmacyName || 'Pharmacy Store'} | Here is an overview of today's active apothecary operations.</p>
          </>
        ) : (
          <>
            <h2>Welcome back, {user?.name || 'Pharmacist'}!</h2>
            <p className="mb-0 text-light opacity-75 small">Here is an overview of today's active apothecary operations.</p>
          </>
        )}
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

/* ═══════════════════ PHARMACIST REPRESENTATIVE SUB-PAGE ═══════ */
function PharmacistRepPage() {
  const { user, updatePharmacistDetails, removePharmacistDetails } = useAuth();
  const { toast } = useToast();

  const details = user?.pharmacistDetails || { status: 'none' };

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [degreeName, setDegreeName] = useState('');
  const [degreePlace, setDegreePlace] = useState('');
  const [photo, setPhoto] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repPassword, setRepPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Populate form if editing or details exist
  useEffect(() => {
    if (details.status !== 'none') {
      setName(details.name || '');
      setAge(details.age || '');
      setLicenseNumber(details.licenseNumber || '');
      setDegreeName(details.degreeName || '');
      setDegreePlace(details.degreePlace || '');
      setPhoto(details.photo || '');
      setRepEmail(details.email || '');
      // Do not pre-fill password for security — the owner must re-enter it if updating
    }
  }, [details]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pharmacistPhoto', file);

    setUploading(true);
    try {
      const { data } = await api.post('/auth/upload-pharmacist-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPhoto(data.filePath);
      toast.success('Pharmacist representative photo uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !licenseNumber || !age || !degreeName || !degreePlace || !photo) {
      toast.error('Please fill in all details, including uploading a profile photo.');
      return;
    }
    if (!repEmail || !repEmail.includes('@')) {
      toast.error('A valid login email address is required for the pharmacist representative.');
      return;
    }
    const isNew = details.status === 'none';
    if (isNew && (!repPassword || repPassword.length < 6)) {
      toast.error('An access password of at least 6 characters is required for the pharmacist representative.');
      return;
    }
    if (repPassword && repPassword.length > 0 && repPassword.length < 6) {
      toast.error('The new access password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await updatePharmacistDetails({
        name,
        photo,
        licenseNumber,
        age: Number(age),
        degreeName,
        degreePlace,
        email: repEmail,
        password: repPassword,
      });
      toast.success('Pharmacist representative details submitted for verification!');

      // Create admin notification (using isolated admin notification key)
      try {
        const adminKey = 'medeasy_notifications_admin';
        const rawAlerts = localStorage.getItem(adminKey) || '[]';
        const alerts = JSON.parse(rawAlerts);
        alerts.unshift({
          id: 'alert-' + Date.now() + '-admin',
          text: `New Pharmacist Representative: Pharmacy "${user?.name || 'Pharmacy'}" submitted pharmacist "${name}" for administrative audit.`,
          time: Date.now(),
          emoji: 'prescription',
          unread: true,
          link: '/admin'
        });
        localStorage.setItem(adminKey, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to submit details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove this pharmacist representative? This will reset your verification badge.')) return;
    setLoading(true);
    try {
      await removePharmacistDetails();
      toast.success('Representative removed.');
      setName('');
      setAge('');
      setLicenseNumber('');
      setDegreeName('');
      setDegreePlace('');
      setPhoto('');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to remove representative.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render Form ──
  if (details.status === 'none' || isEditing) {
    return (
      <Card className="ph-glass-card shadow-lg border-0 p-4 rounded-4 animate-fade-in">
        <Card.Body>
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="ph-glass-icon bg-primary-light text-primary" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
              <FaUserShield size={24} />
            </div>
            <div>
              <h5 className="fw-bold mb-1 text-dark">Pharmacist Representative Credentials</h5>
              <p className="text-muted extra-small mb-0">Provide the credentials of your licensed pharmacist to display a verified representative badge.</p>
            </div>
          </div>

          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              {/* Photo Upload Box */}
              <Col md={12} className="mb-2">
                <Form.Label className="fw-semibold small text-dark">Pharmacist Professional Photo *</Form.Label>
                <div className="d-flex align-items-center gap-4 p-3 border rounded-3 bg-white">
                  <div className="position-relative" style={{ width: 80, height: 80 }}>
                    {photo ? (
                      <img src={photo.startsWith('data:') ? photo : `${serverUrl}${photo}`} alt="Pharmacist representative avatar" className="rounded-circle border w-100 h-100 object-fit-cover shadow-sm" />
                    ) : (
                      <div className="rounded-circle border w-100 h-100 bg-light d-flex align-items-center justify-content-center text-muted fw-bold" style={{ fontSize: '1.5rem' }}>
                        ?
                      </div>
                    )}
                    {uploading && (
                      <div className="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center">
                        <Spinner animation="border" size="sm" className="text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <Form.Control type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading || loading} />
                    <Form.Text className="text-muted extra-small">Upload a clear passport size face photo (JPEG/PNG).</Form.Text>
                  </div>
                </div>
              </Col>

              {/* Full Name */}
              <Col md={6}>
                <Form.Group controlId="pharmacistName">
                  <Form.Label className="small fw-semibold text-dark">Pharmacist Full Name *</Form.Label>
                  <Form.Control type="text" placeholder="Dr. Zainab Fatima" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* Age */}
              <Col md={6}>
                <Form.Group controlId="pharmacistAge">
                  <Form.Label className="small fw-semibold text-dark">Age (Years) *</Form.Label>
                  <Form.Control type="number" min="18" max="100" placeholder="e.g. 28" value={age} onChange={e => setAge(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* PCP License Number */}
              <Col md={6}>
                <Form.Group controlId="pharmacistLicense">
                  <Form.Label className="small fw-semibold text-dark">Pharmacy Council (PCP) Reg # *</Form.Label>
                  <Form.Control type="text" placeholder="e.g. PCP-77392-P" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* Degree Title */}
              <Col md={6}>
                <Form.Group controlId="pharmacistDegree">
                  <Form.Label className="small fw-semibold text-dark">Degree Title *</Form.Label>
                  <Form.Select value={degreeName} onChange={e => setDegreeName(e.target.value)} required disabled={loading}>
                    <option value="">Select Degree...</option>
                    <option value="Pharm.D">Pharm.D (Doctor of Pharmacy)</option>
                    <option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option>
                    <option value="M.Phil Pharmacy">M.Phil (Master of Philosophy)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Degree Place */}
              <Col md={12}>
                <Form.Group controlId="pharmacistInstitution">
                  <Form.Label className="small fw-semibold text-dark">Institution / University Name *</Form.Label>
                  <Form.Control type="text" placeholder="e.g. Punjab University College of Pharmacy" value={degreePlace} onChange={e => setDegreePlace(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* Sub-Account Login Credentials Section */}
              <Col md={12}>
                <div className="d-flex align-items-center gap-2 py-2 border-top mt-2">
                  <span style={{ fontSize: '1rem' }}>🔐</span>
                  <div>
                    <div className="fw-semibold text-dark small">Login Credentials for Pharmacist</div>
                    <div className="text-muted" style={{ fontSize: '0.73rem' }}>These credentials allow the hired pharmacist to log in independently once verified by Admin.</div>
                  </div>
                </div>
              </Col>

              {/* Pharmacist Rep Email */}
              <Col md={6}>
                <Form.Group controlId="repEmail">
                  <Form.Label className="small fw-semibold text-dark">Login Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="e.g. zainab.pharmacist@medeasy.com"
                    value={repEmail}
                    onChange={e => setRepEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '0.72rem' }}>The pharmacist will use this email to sign in.</Form.Text>
                </Form.Group>
              </Col>

              {/* Pharmacist Rep Password */}
              <Col md={6}>
                <Form.Group controlId="repPassword">
                  <Form.Label className="small fw-semibold text-dark">Access Password *</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={repPassword}
                      onChange={e => setRepPassword(e.target.value)}
                      required
                      disabled={loading}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      className="position-absolute top-50 end-0 translate-middle-y me-2 btn btn-link btn-sm p-0 text-muted"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <Form.Text className="text-muted" style={{ fontSize: '0.72rem' }}>They will use this to access their dashboard. {details.status !== 'none' ? 'Leave blank to keep existing password.' : ''}</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              {isEditing && (
                <Button variant="outline-secondary" onClick={() => setIsEditing(false)} disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button type="submit" className="btn-ph-save px-4" disabled={loading || uploading}>
                {loading ? <Spinner size="sm" animation="border" /> : 'Submit for Admin Audit'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    );
  }

  // ── Render Details (Pending, Approved, Declined) ──
  const isPending = details.status === 'pending';
  const isApproved = details.status === 'approved';
  const isDeclined = details.status === 'declined';

  return (
    <div className="pharmacist-rep-view animate-fade-in">
      <Row className="g-4">
        {/* Representative Card */}
        <Col lg={8}>
          <Card className={`ph-glass-card shadow-lg border-0 rounded-4 overflow-hidden ${isApproved ? 'rep-card-approved' : ''}`} style={isApproved ? { borderLeft: '5px solid #d97706' } : {}}>
            <Card.Body className="p-4">
              {/* Incomplete data warning */}
              {(!details.photo || !details.age || !details.degreeName || !details.degreePlace) && (
                <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 mb-3 small">
                  <FaExclamationTriangle className="flex-shrink-0" />
                  <span>Some details are missing or incomplete. Click <strong>Update Details</strong> below to fill them in and resubmit for verification.</span>
                </Alert>
              )}
              <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-start gap-4">
                {/* Photo with dynamic badge overlay */}
                <div className="position-relative" style={{ width: 120, height: 120 }}>
                  {details.photo ? (
                    <img
                      src={details.photo.startsWith('data:') ? details.photo : `${serverUrl}${details.photo}`}
                      alt={details.name}
                      className="rounded-circle border w-100 h-100 object-fit-cover shadow"
                      onError={e => {
                        // If the stored URL is broken, fall back to initials avatar
                        e.target.style.display = 'none';
                        e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                      }}
                    />
                  ) : null}
                  {/* Fallback initials avatar — shown when no photo or image fails to load */}
                  <div
                    className="rounded-circle border w-100 h-100 bg-primary d-flex align-items-center justify-content-center text-white fw-bold shadow"
                    style={{
                      fontSize: '2rem',
                      display: details.photo ? 'none' : 'flex',
                    }}
                  >
                    {(details.name || 'P')[0].toUpperCase()}
                  </div>
                  {isApproved && (
                    <div className="position-absolute bottom-0 end-0 bg-warning text-white rounded-circle shadow border border-white d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, fontSize: '1rem' }} title="Verified representative">
                      🌟
                    </div>
                  )}
                </div>

                <div className="flex-grow-1 text-center text-sm-start">
                  <div className="d-flex align-items-center justify-content-center justify-content-sm-start gap-2 mb-1">
                    <h4 className="fw-bold text-dark mb-0">{details.name}</h4>
                    {isApproved && <Badge bg="warning" className="text-dark small d-flex align-items-center gap-1"><FaUserCheck /> Verified Rep</Badge>}
                    {isPending && <Badge bg="info" className="small">Awaiting Audit</Badge>}
                    {isDeclined && <Badge bg="danger" className="small">Audit Declined</Badge>}
                  </div>
                  <p className="text-muted small mb-3">
                    {details.degreeName || <span className="text-warning">Degree not set</span>}
                    {details.age ? ` | Age: ${details.age} Years` : ''}
                  </p>

                  <Row className="g-3 bg-light p-3 rounded-3 mb-3 border text-start">
                    <Col xs={6} md={6}>
                      <span className="text-muted extra-small d-block">PCP LICENSE NUMBER</span>
                      <strong className="text-dark small">{details.licenseNumber}</strong>
                    </Col>
                    <Col xs={6} md={6}>
                      <span className="text-muted extra-small d-block">GRADUATED FROM</span>
                      <strong className="text-dark small">{details.degreePlace}</strong>
                    </Col>
                    {details.email && (
                      <Col xs={12}>
                        <div className="d-flex align-items-center gap-2 p-2 bg-warning-subtle rounded-3 border border-warning-subtle">
                          <span>🔐</span>
                          <div>
                            <span className="text-muted extra-small d-block">PHARMACIST LOGIN EMAIL</span>
                            <strong className="text-dark small">{details.email}</strong>
                          </div>
                          <Badge bg="success" className="ms-auto small">Active Credentials</Badge>
                        </div>
                      </Col>
                    )}
                  </Row>

                  <div className="d-flex gap-2 justify-content-center justify-content-sm-start">
                    <Button variant="outline-primary" size="sm" onClick={() => setIsEditing(true)} disabled={loading}>
                      Update Details
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={handleRemove} disabled={loading}>
                      Remove Pharmacist
                    </Button>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Status Notice Panel */}
        <Col lg={4}>
          {isPending && (
            <Card className="border-0 shadow-sm bg-info-light h-100 rounded-4">
              <Card.Body className="p-4 d-flex flex-column justify-content-center text-center text-lg-start">
                <div className="ph-timeline-badge bg-info mb-3 mx-auto mx-lg-0" style={{ width: 12, height: 12 }}></div>
                <h5 className="fw-bold text-info-dark mb-2">Verification In Progress</h5>
                <p className="extra-small text-muted mb-0 leading-relaxed">
                  Your representative's academic credentials and Pharmacy Council registration certificate are currently under administrator audit. 
                  Once verified, a shiny gold badge will be applied next to their name. You can still use the rest of your dashboard to fulfill orders.
                </p>
              </Card.Body>
            </Card>
          )}

          {isApproved && (
            <Card className="border-0 shadow-sm bg-success-light h-100 rounded-4">
              <Card.Body className="p-4 d-flex flex-column justify-content-center text-center text-lg-start">
                <div className="ph-timeline-badge bg-success mb-3 mx-auto mx-lg-0" style={{ width: 12, height: 12 }}></div>
                <h5 className="fw-bold text-success-dark mb-2">Verification Approved!</h5>
                <p className="extra-small text-muted mb-0 leading-relaxed">
                  Excellent! This pharmacist representative is officially verified. Patients visiting your listed inventory items will see a golden representative badge showing that their orders are backed by a certified clinical pharmacist.
                </p>
              </Card.Body>
            </Card>
          )}

          {isDeclined && (
            <Card className="border-0 shadow-sm bg-danger-light h-100 rounded-4">
              <Card.Body className="p-4 d-flex flex-column justify-content-center text-center text-lg-start">
                <div className="ph-timeline-badge bg-danger mb-3 mx-auto mx-lg-0" style={{ width: 12, height: 12 }}></div>
                <h5 className="fw-bold text-danger-dark mb-2">Audit Failed</h5>
                <p className="extra-small text-muted mb-3 leading-relaxed">
                  We were unable to verify the pharmacist details provided. 
                  <br />
                  <strong className="text-danger d-block mt-2">Reason: {details.declineReason || 'Invalid PMC/PCP license registration.'}</strong>
                </p>
                <Button variant="danger" size="sm" onClick={() => setIsEditing(true)} className="w-100 mt-2">
                  Update & Resubmit
                </Button>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}

/* ═══════════════════ SIDEBAR LAYOUT ════════════════════════════ */
const SECTIONS = [
  { key:'overview',      label:'Dashboard Overview',   icon:<FaChartBar /> },
  { key:'orders',        label:'Manage Orders',        icon:<FaClipboardList /> },
  { key:'prescriptions', label:'Verify Rx',            icon:<FaFileMedical /> },
  { key:'medicines',     label:'Inventory',            icon:<FaPills /> },
  { key:'pharmacist-rep',label:'Pharmacist Representative', icon:<FaUserShield /> },
  { key:'history',       label:'Order History',        icon:<FaHistory /> },
];

export default function PharmacistDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPharmacyOwner = user?.role === 'pharmacy';

  const visibleSections = SECTIONS.filter(s => {
    if (s.key === 'pharmacist-rep') {
      return isPharmacyOwner;
    }
    return true;
  });

  const section = visibleSections.find(s => s.key === active) || visibleSections[0];

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
              <div className="ph-sidebar-name">{user?.name || 'Pharmacy'}</div>
              <div className="ph-sidebar-role">
                {user?.role === 'pharmacy' 
                  ? `🏪 ${user?.pharmacyName || 'Pharmacy Store'}`
                  : 'Licensed Pharmacist'}
              </div>
            </div>
          </div>
          <nav className="ph-nav">
            {visibleSections.map(s => (
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
            {active === 'pharmacist-rep'&& isPharmacyOwner && <PharmacistRepPage />}
            {active === 'history'       && <OrdersPage mode="history" />}
          </div>
        </main>
      </div>
    </div>
  );
}
