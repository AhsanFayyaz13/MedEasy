import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import {
  FaUpload, FaFileMedical, FaFilePdf, FaFileImage, FaTimes,
  FaCheckCircle, FaTimesCircle, FaClock, FaTrash, FaInfoCircle,
  FaRedo, FaShieldAlt, FaExclamationTriangle, FaLink,
} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { uploadPrescription, fetchPrescriptions, deletePrescription } from '../services/prescriptionService';
import './PrescriptionUpload.css';

const MAX_FILE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/(1024*1024)).toFixed(2)} MB`;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function validateFile(f) {
  if (!f) return 'Please select a file.';
  if (!ALLOWED_TYPES.includes(f.type)) return 'Accepted: JPG, PNG, WebP, PDF.';
  if (f.size > MAX_FILE_MB*1024*1024) return `Max file size is ${MAX_FILE_MB} MB.`;
  return null;
}

const STATUS_CFG = {
  pending:  { label:'Pending Review', color:'warning', textDark:true,  icon:<FaClock />,       bg:'#fef3c7', border:'#fde68a' },
  verified: { label:'Verified',       color:'success', textDark:false, icon:<FaCheckCircle />, bg:'#d1fae5', border:'#6ee7b7' },
  rejected: { label:'Rejected',       color:'danger',  textDark:false, icon:<FaTimesCircle />, bg:'#fee2e2', border:'#fca5a5' },
};

function FileTypeIcon({ type, size='1.4rem' }) {
  return type === 'application/pdf'
    ? <FaFilePdf  style={{fontSize:size,color:'#ef4444'}} />
    : <FaFileImage style={{fontSize:size,color:'#0284c7'}} />;
}

function DropZone({ file, onFile, error }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div
      className={`rx-drop-zone${drag?' dragging':''}${error?' has-error':''}${file?' has-file':''}`}
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)onFile(f);}}
      onClick={()=>!file&&ref.current?.click()}
      role="button" tabIndex={0}
      onKeyDown={e=>!file&&e.key==='Enter'&&ref.current?.click()}
    >
      {file ? (
        <div className="dz-file-preview">
          {preview
            ? <img src={preview} alt="preview" className="dz-img-preview"/>
            : <div className="dz-pdf-preview"><FileTypeIcon type={file.type} size="3rem"/></div>}
          <div className="dz-file-meta">
            <span className="dz-file-name">{file.name}</span>
            <span className="dz-file-size">{fmtBytes(file.size)}</span>
          </div>
          <button className="dz-remove-btn" type="button"
            onClick={e=>{e.stopPropagation();onFile(null);}} aria-label="Remove">
            <FaTimes/>
          </button>
        </div>
      ) : (
        <div className="dz-empty">
          <div className="dz-upload-icon"><FaFileMedical/></div>
          <p className="dz-primary-text">Drag & drop your prescription</p>
          <p className="dz-secondary-text">or <span className="dz-browse-link">click to browse</span></p>
          <p className="dz-types">JPG · PNG · WebP · PDF · Max {MAX_FILE_MB} MB</p>
        </div>
      )}
      <Form.Control ref={ref} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="d-none" id="prescription-file-input"
        onChange={e=>onFile(e.target.files[0]||null)} />
    </div>
  );
}

function PrescriptionCard({ rx, onDelete }) {
  const cfg = STATUS_CFG[rx.status] || STATUS_CFG.pending;
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => { setDeleting(true); await onDelete(rx.id); setDeleting(false); };

  return (
    <div className={`rx-history-card status-${rx.status}`} style={{borderLeftColor:cfg.border}}>
      <div className="rx-card-icon-wrap" style={{background:cfg.bg}}>
        <FileTypeIcon type={rx.fileType} size="1.5rem"/>
      </div>
      <div className="rx-card-body">
        <div className="rx-card-top">
          <div className="rx-name-wrap">
            <span className="rx-file-name">{rx.fileName}</span>
            <span className="rx-file-meta">{fmtBytes(rx.fileSize)} · {fmtDate(rx.uploadedAt)}</span>
            <span className="rx-id-label">ID: <code>{rx.id}</code></span>
          </div>
          <Badge bg={cfg.color} text={cfg.textDark?'dark':undefined} className="rx-status-badge">
            {cfg.icon}<span className="ms-1">{cfg.label}</span>
          </Badge>
        </div>

        {rx.notes && (
          <p className="rx-notes"><FaInfoCircle className="me-1"/>{rx.notes}</p>
        )}
        {rx.reviewedBy && (
          <p className="rx-reviewer">
            <FaShieldAlt className="me-1"/>
            Reviewed by <strong>{rx.reviewedBy}</strong> on {fmtDate(rx.reviewedAt)}
          </p>
        )}
        {rx.status === 'rejected' && rx.rejectionReason && (
          <Alert variant="danger" className="rx-reject-alert py-2">
            <FaExclamationTriangle className="me-2"/>
            <strong>Rejection reason:</strong> {rx.rejectionReason}
          </Alert>
        )}
        {rx.linkedOrderIds?.length > 0 && (
          <div className="rx-linked-orders">
            <FaLink className="me-1"/>Linked orders:&nbsp;
            {rx.linkedOrderIds.map(oid=>(
              <Link key={oid} to={`/orders/${oid}`} className="rx-order-link">{oid}</Link>
            ))}
          </div>
        )}
        <div className="rx-card-actions">
          {rx.status==='rejected' && (
            <span className="rx-reupload-hint"><FaRedo className="me-1"/>Please re-upload a valid prescription.</span>
          )}
          {rx.status==='pending' && (
            <Button variant="outline-danger" size="sm" className="rx-del-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spinner animation="border" size="sm"/> : <><FaTrash className="me-1"/>Delete</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionUpload() {
  const { toast } = useToast();
  const location = useLocation();
  const requiredForMedicine = location.state?.requiredForMedicine;

  const [file, setFile]               = useState(null);
  const [notes, setNotes]             = useState('');
  const [fileError, setFileError]     = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadAlert, setUploadAlert] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true); setHistoryError(null);
    try { setPrescriptions(await fetchPrescriptions()); }
    catch(e) { setHistoryError(e.message||'Failed to load history.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (requiredForMedicine) {
      setNotes(`Prescription for: ${requiredForMedicine}`);
    }
  }, [requiredForMedicine]);

  const handleFile = (f) => { setFile(f); setFileError(null); setUploadAlert(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadAlert(null);
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    setUploading(true);
    try {
      const result = await uploadPrescription(file, notes);
      setUploadAlert({ variant:'success', msg:`Uploaded! ID: ${result.id}. A pharmacist will review it within 30 minutes.` });
      toast.success(`Prescription ${result.id} submitted`);

      // Create notification
      try {
        // 1. Patient Confirmation Alert
        const pKey = 'medeasy_notifications_' + (user?._id || user?.id || 'patient');
        const pRaw = localStorage.getItem(pKey) || '[]';
        const pAlerts = JSON.parse(pRaw);
        pAlerts.unshift({
          id: 'alert-' + Date.now(),
          text: `Prescription Submitted: Your prescription (#RX-${result.id}) has been uploaded and sent for review!`,
          time: Date.now(),
          emoji: 'prescription',
          unread: true,
          link: '/prescriptions/upload'
        });
        localStorage.setItem(pKey, JSON.stringify(pAlerts));

        // 2. Pharmacist/Admin Audit Notification Alert
        const phKey = 'medeasy_notifications_pharmacist';
        const phRaw = localStorage.getItem(phKey) || '[]';
        const phAlerts = JSON.parse(phRaw);
        phAlerts.unshift({
          id: 'alert-' + Date.now() + '-admin',
          text: `New Prescription Uploaded: Patient ${user?.name || 'Patient'} uploaded a new medical prescription #RX-${result.id} for review.`,
          time: Date.now(),
          emoji: 'prescription',
          unread: true,
          link: '/pharmacist'
        });
        localStorage.setItem(phKey, JSON.stringify(phAlerts));
      } catch (err) {
        console.error(err);
      }

      setFile(null); setNotes(''); setFileError(null);
      await loadHistory();
    } catch(e) {
      const msg = e?.response?.data?.detail || e?.message || 'Upload failed. Please try again.';
      setUploadAlert({ variant:'danger', msg });
      toast.error(msg);
    } finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deletePrescription(id);
      setPrescriptions(prev=>prev.filter(p=>p.id!==id));
      toast.success(`Prescription ${id} deleted.`);
    } catch(e) { toast.error(e.message||'Could not delete.'); }
  };

  const counts = prescriptions.reduce((a,p)=>({...a,[p.status]:(a[p.status]||0)+1}),{});

  return (
    <div className="prescription-page">
      <Container className="py-4 py-md-5">
        <div className="rx-page-header">
          <div>
            <h1 className="rx-page-title">Upload Prescription</h1>
            <p className="rx-page-subtitle">
              Submit a valid prescription. Our licensed pharmacists verify it within 30 minutes.
            </p>
          </div>
          <div className="rx-info-pills d-none d-md-flex">
            <span className="rx-info-pill"><FaClock className="me-1"/>~30 min review</span>
            <span className="rx-info-pill"><FaShieldAlt className="me-1"/>Secure &amp; private</span>
          </div>
        </div>

        <Row className="gx-4 gy-4">
          {/* ═══ Upload form ═══════════════════════════════════ */}
          <Col lg={5} xl={4}>
            <Card className="rx-upload-card">
              <Card.Body className="p-4">
                <h5 className="rx-section-title"><FaUpload className="me-2"/>New Prescription</h5>
                {requiredForMedicine && (
                  <Alert variant="warning" className="small-warning-alert py-2 mb-3 animate-fade-in" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontSize: '0.8rem', textAlign: 'left' }}>
                    <FaInfoCircle className="me-2 fs-5" />
                    A prescription is required for <strong>{requiredForMedicine}</strong>. Upload it below.
                  </Alert>
                )}
                <Form noValidate onSubmit={handleSubmit}>
                  <DropZone file={file} onFile={handleFile} error={fileError}/>
                  {fileError && (
                    <div className="rx-field-error mt-2">
                      <FaExclamationTriangle className="me-1"/>{fileError}
                    </div>
                  )}
                  <Form.Group className="mt-3" controlId="rxNotes">
                    <Form.Label className="rx-label">
                      Notes for pharmacist <span className="rx-optional">(optional)</span>
                    </Form.Label>
                    <Form.Control as="textarea" rows={3} className="rx-textarea"
                      placeholder="Medicine name, dosage, special instructions…"
                      value={notes} onChange={e=>setNotes(e.target.value)}/>
                  </Form.Group>

                  {uploadAlert && (
                    <Alert variant={uploadAlert.variant} className="rx-upload-alert mt-3"
                      dismissible onClose={()=>setUploadAlert(null)}>
                      {uploadAlert.variant==='success'
                        ? <FaCheckCircle className="me-2"/>
                        : <FaExclamationTriangle className="me-2"/>}
                      {uploadAlert.msg}
                    </Alert>
                  )}

                  <Button type="submit" className="btn-rx-upload w-100 mt-3"
                    disabled={uploading||!file} id="upload-prescription-btn">
                    {uploading
                      ? <><Spinner animation="border" size="sm" className="me-2"/>Uploading…</>
                      : <><FaUpload className="me-2"/>Submit Prescription</>}
                  </Button>
                </Form>

                <div className="rx-guidelines mt-4">
                  <p className="rx-guidelines-title d-flex align-items-center"><FaInfoCircle className="text-primary me-2" /> Prescription Guidelines</p>
                  <ul className="rx-guidelines-list">
                    <li>Must be issued within the last 30 days</li>
                    <li>Doctor's stamp &amp; signature required</li>
                    <li>Patient name must match your profile</li>
                    <li>Image must be clear and legible</li>
                  </ul>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* ═══ History ════════════════════════════════════════ */}
          <Col lg={7} xl={8}>
            {!loading && prescriptions.length > 0 && (
              <div className="rx-summary-row mb-3">
                <span className="rx-summary-label">Prescription History</span>
                <div className="rx-count-badges">
                  {counts.verified && <Badge bg="success" className="rx-count-badge"><FaCheckCircle className="me-1"/>{counts.verified} Verified</Badge>}
                  {counts.pending  && <Badge bg="warning" text="dark" className="rx-count-badge"><FaClock className="me-1"/>{counts.pending} Pending</Badge>}
                  {counts.rejected && <Badge bg="danger" className="rx-count-badge"><FaTimesCircle className="me-1"/>{counts.rejected} Rejected</Badge>}
                </div>
              </div>
            )}

            {loading && (
              <div className="rx-loading">
                <Spinner animation="border" variant="primary"/>
                <span>Loading history…</span>
              </div>
            )}
            {historyError && !loading && (
              <Alert variant="danger" className="rounded-3">
                <FaExclamationTriangle className="me-2"/>{historyError}
                <Button variant="link" size="sm" className="p-0 ms-2 align-baseline" onClick={loadHistory}>Retry</Button>
              </Alert>
            )}
            {!loading && !historyError && prescriptions.length === 0 && (
              <div className="rx-history-empty">
                <div className="rx-empty-icon"><FaFileMedical/></div>
                <h5>No prescriptions yet</h5>
                <p>Upload your first prescription using the form on the left.</p>
              </div>
            )}
            {!loading && prescriptions.map(rx=>(
              <PrescriptionCard key={rx.id} rx={rx} onDelete={handleDelete}/>
            ))}
          </Col>
        </Row>
      </Container>
    </div>
  );
}
