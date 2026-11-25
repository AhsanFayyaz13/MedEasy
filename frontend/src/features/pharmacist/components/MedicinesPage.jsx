import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Button, Table, Badge, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { fetchAllMedicines, createMedicine, updateMedicine, deleteMedicine, uploadMedicinePhoto } from '../../../services/api/pharmacistService';
import { EMPTY_MED } from './pharmacistShared';


/* ═══════════════════ MEDICINES SUB-PAGE ════════════════════════ */
export default function MedicinesPage() {
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
                      border: '1px solid var(--color-neutral-200)', 
                      background: 'var(--color-neutral-50)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px color-mix(in srgb, var(--color-black) 4%, transparent)'
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
