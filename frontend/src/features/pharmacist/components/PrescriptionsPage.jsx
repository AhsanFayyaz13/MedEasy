import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Modal, Form, Spinner } from 'react-bootstrap';
import { FaFileMedical, FaCheckCircle, FaTimesCircle, FaClock, FaEye, FaFilePdf } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';
import { fetchPendingPrescriptions, verifyPrescription } from '../../../services/api/pharmacistService';
import { serverUrl, fmtDate, fmtBytes } from './pharmacistShared';


/* ═══════════════════ PRESCRIPTIONS SUB-PAGE ════════════════════ */
export default function PrescriptionsPage() {
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
                  <img src={rx.fileUrl.startsWith('data:') || rx.fileUrl.startsWith('http') ? rx.fileUrl : `${serverUrl}${rx.fileUrl}`} alt="prescription" className="rx-thumbnail-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
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
                <div className="rx-patient-details-box mt-3 p-3 rounded-3" style={{ background: 'var(--color-neutral-50)', border: '1px solid var(--color-neutral-200)', fontSize: '0.82rem', textAlign: 'left' }}>
                  <h6 className="fw-bold mb-2 text-dark small" style={{ borderBottom: '1px solid var(--color-neutral-300)', paddingBottom: '4px' }}>
                    🏪 Fulfillment Routing Details
                  </h6>
                  <div className="mb-1"><strong>Patient Name:</strong> {rx.userId?.name || 'Fayyaz Ahmad'}</div>
                  <div className="mb-1"><strong>Patient Email:</strong> {rx.userId?.email || 'fayyaz@gmail.com'}</div>
                  <div className="mb-1"><strong>Contact Phone:</strong> {rx.userId?.phone || '0300-7654321'}</div>
                  <div className="mb-1.5">
                    <strong>Delivery Address:</strong> {rx.userId?.address || 'House # 42, Block B, DHA Phase 5, Lahore'}
                  </div>
                  <div className="d-flex align-items-center gap-1.5 text-success font-medium" style={{ fontSize: '0.74rem' }}>
                    <span className="dot-blink" style={{ width: 8, height: 8, background: 'var(--color-accent-500)', borderRadius: '50%', display: 'inline-block' }} />
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
                <FaFilePdf style={{ fontSize: '4rem', color: 'var(--color-error-500)' }} />
                <p className="mt-3 fw-bold">{enlarged.fileName}</p>
                <p className="text-muted small">PDF Document ({fmtBytes(enlarged.fileSize)})</p>
                <Button 
                  variant="primary" 
                  href={enlarged.fileUrl.startsWith('data:') || enlarged.fileUrl.startsWith('http') ? enlarged.fileUrl : `${serverUrl}${enlarged.fileUrl}`} 
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
                  src={enlarged.fileUrl.startsWith('data:') || enlarged.fileUrl.startsWith('http') ? enlarged.fileUrl : `${serverUrl}${enlarged.fileUrl}`} 
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
