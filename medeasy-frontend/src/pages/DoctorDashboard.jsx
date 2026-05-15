import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Modal, Form, Spinner, Alert, Nav,
} from 'react-bootstrap';
import {
  FaUserMd, FaCalendarCheck, FaNotesMedical, FaCheckCircle,
  FaTimesCircle, FaClock, FaSearch, FaFilePrescription,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchDoctorAppointments, completeAppointment, cancelAppointment } from '../services/appointmentService';
import './DoctorDashboard.css';

/* ─── Helpers ────────────────────────────────────────────────── */
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
const STATUS_CFG = {
  scheduled: { color:'primary', icon:<FaClock /> },
  completed: { color:'success', icon:<FaCheckCircle /> },
  cancelled: { color:'danger',  icon:<FaTimesCircle /> },
};
const TABS = ['all','scheduled','completed','cancelled'];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [apts,     setApts]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null);   // appointment object | null
  const [notes,    setNotes]    = useState('');
  const [rx,       setRx]       = useState('');
  const [saving,   setSaving]   = useState(false);
  const [viewRx,   setViewRx]   = useState(null);   // appointment to view Rx

  const DOCTOR_ID = user?.id ?? 1;  // fallback to Dr. Sara Ali mock

  const load = useCallback(async () => {
    setLoading(true);
    try { setApts(await fetchDoctorAppointments(DOCTOR_ID)); }
    catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [DOCTOR_ID, toast]);

  useEffect(() => { load(); }, [load]);

  /* ── Stats ────────────────────────────────────────────────── */
  const today     = new Date().toISOString().slice(0,10);
  const todayApts = apts.filter(a => a.date === today).length;
  const completed = apts.filter(a => a.status === 'completed').length;
  const pending   = apts.filter(a => a.status === 'scheduled').length;

  /* ── Filtered list ───────────────────────────────────────── */
  const visible = apts.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = a.patientName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  /* ── Complete handler ────────────────────────────────────── */
  const openComplete = (a) => { setModal(a); setNotes(a.notes||''); setRx(a.prescription||''); };
  const handleComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await completeAppointment(modal.id, { notes, prescription: rx });
      setApts(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast.success(`Appointment ${modal.id} marked complete`);
      setModal(null);
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  /* ── Cancel handler ──────────────────────────────────────── */
  const handleCancel = async (id) => {
    try {
      await cancelAppointment(id);
      setApts(prev => prev.map(a => a.id === id ? {...a, status:'cancelled'} : a));
      toast.success(`Appointment ${id} cancelled`);
    } catch(e) { toast.error(e.message); }
  };

  return (
    <div className="doc-page">
      <Container className="py-4">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="doc-header mb-4">
          <div>
            <h1 className="doc-title"><FaUserMd className="me-2" />Doctor Dashboard</h1>
            <p className="doc-subtitle">Welcome back, {user?.name || 'Doctor'}</p>
          </div>
        </div>

        {/* ── Stat cards ───────────────────────────────────── */}
        <Row className="g-3 mb-4">
          {[
            { label:"Today's Appointments", value: todayApts, color:'#38bdf8', icon:<FaCalendarCheck /> },
            { label:'Scheduled',            value: pending,   color:'#818cf8', icon:<FaClock /> },
            { label:'Completed',            value: completed, color:'#34d399', icon:<FaCheckCircle /> },
          ].map(s => (
            <Col md={4} key={s.label}>
              <Card className="doc-stat-card" style={{'--doc-accent': s.color}}>
                <Card.Body>
                  <div className="doc-stat-icon">{s.icon}</div>
                  <div className="doc-stat-num">{s.value}</div>
                  <div className="doc-stat-label">{s.label}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Appointments table ────────────────────────────── */}
        <Card className="doc-card">
          <Card.Body>
            {/* Toolbar */}
            <div className="doc-toolbar mb-3">
              <Nav variant="pills" className="doc-tabs" activeKey={filter} onSelect={setFilter}>
                {TABS.map(t => (
                  <Nav.Item key={t}>
                    <Nav.Link eventKey={t} className="doc-tab">
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                      {t !== 'all' && (
                        <span className="doc-tab-count">{apts.filter(a=>a.status===t).length}</span>
                      )}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
              <div className="doc-search-wrap">
                <FaSearch className="doc-search-icon" />
                <input className="doc-search" placeholder="Search patient…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <div className="doc-loading"><Spinner animation="border" variant="primary" /></div>
            ) : (
              <Table hover responsive className="doc-table">
                <thead>
                  <tr><th>#</th><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No appointments found.</td></tr>
                  )}
                  {visible.map((a, i) => {
                    const cfg = STATUS_CFG[a.status] || STATUS_CFG.scheduled;
                    const isScheduled = a.status === 'scheduled';
                    return (
                      <tr key={a.id}>
                        <td className="text-muted small">{i+1}</td>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">{a.patientName[0]}</div>
                            <div>
                              <div className="patient-name">{a.patientName}</div>
                              <div className="patient-email">{a.patientEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="apt-date">{fmtDate(a.date)}</td>
                        <td><Badge bg="light" text="dark" className="time-badge">{a.time}</Badge></td>
                        <td className="apt-reason">{a.reason || '—'}</td>
                        <td>
                          <Badge bg={cfg.color} className="status-pill">
                            {cfg.icon} <span className="ms-1">{a.status}</span>
                          </Badge>
                        </td>
                        <td>
                          <div className="apt-actions">
                            {isScheduled && (
                              <>
                                <Button size="sm" className="btn-complete" onClick={() => openComplete(a)}>
                                  <FaNotesMedical className="me-1" />Complete
                                </Button>
                                <Button size="sm" variant="outline-danger" onClick={() => handleCancel(a.id)}>
                                  Cancel
                                </Button>
                              </>
                            )}
                            {a.status === 'completed' && a.prescription && (
                              <Button size="sm" variant="outline-success" onClick={() => setViewRx(a)}>
                                <FaFilePrescription className="me-1" />View Rx
                              </Button>
                            )}
                            {a.status === 'completed' && (
                              <Button size="sm" variant="outline-secondary" onClick={() => openComplete(a)}>
                                Edit Notes
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* ── Complete / Notes Modal ────────────────────────── */}
      <Modal show={!!modal} onHide={() => setModal(null)} size="lg" centered>
        <Modal.Header closeButton className="doc-modal-header">
          <Modal.Title>
            {modal?.status === 'completed' ? 'Edit Notes' : 'Complete Appointment'}
            <span className="modal-apt-id ms-2">{modal?.id}</span>
          </Modal.Title>
        </Modal.Header>
        {modal && (
          <Modal.Body>
            <div className="modal-patient-info mb-4">
              <div className="modal-patient-avatar">{modal.patientName[0]}</div>
              <div>
                <div className="modal-patient-name">{modal.patientName}</div>
                <div className="modal-patient-meta">{fmtDate(modal.date)} at {modal.time}</div>
                {modal.reason && <div className="modal-patient-reason">"{modal.reason}"</div>}
              </div>
            </div>

            <Form onSubmit={handleComplete}>
              <Form.Group className="mb-3">
                <Form.Label className="doc-label">
                  <FaNotesMedical className="me-1" />Consultation Notes
                </Form.Label>
                <Form.Control as="textarea" rows={4}
                  placeholder="Enter diagnosis, treatment plan, follow-up instructions…"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="doc-label">
                  <FaFilePrescription className="me-1" />Prescription Pad
                </Form.Label>
                <div className="rx-pad">
                  <div className="rx-pad-header">
                    <FaFilePrescription className="me-2 text-success" />
                    <strong>Prescription</strong>
                    <span className="rx-pad-date ms-auto">{fmtDate(modal.date)}</span>
                  </div>
                  <Form.Control as="textarea" rows={5}
                    className="rx-textarea"
                    placeholder={"e.g.\nAmoxicillin 500mg – 3×/day × 7 days\nParacetamol 500mg – as needed\n\n(One medicine per line)"}
                    value={rx} onChange={e => setRx(e.target.value)} />
                </div>
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="outline-secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
                <Button type="submit" className="btn-complete-save" disabled={saving}>
                  {saving ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-1" />Mark as Completed</>}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        )}
      </Modal>

      {/* ── View Rx Modal ─────────────────────────────────── */}
      <Modal show={!!viewRx} onHide={() => setViewRx(null)} centered>
        <Modal.Header closeButton className="doc-modal-header">
          <Modal.Title><FaFilePrescription className="me-2 text-success" />Prescription — {viewRx?.patientName}</Modal.Title>
        </Modal.Header>
        {viewRx && (
          <Modal.Body>
            <div className="rx-view-box">
              <div className="rx-view-header">
                <span>Patient: <strong>{viewRx.patientName}</strong></span>
                <span>Date: {fmtDate(viewRx.date)}</span>
              </div>
              <pre className="rx-view-text">{viewRx.prescription}</pre>
            </div>
            {viewRx.notes && (
              <div className="rx-view-notes mt-3">
                <strong>Consultation Notes:</strong>
                <p className="mt-1 text-muted">{viewRx.notes}</p>
              </div>
            )}
          </Modal.Body>
        )}
      </Modal>
    </div>
  );
}
