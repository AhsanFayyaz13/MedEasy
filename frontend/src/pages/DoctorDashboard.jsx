import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Modal, Form, Spinner, Alert, Nav,
} from 'react-bootstrap';
import {
  FaUserMd, FaCalendarCheck, FaNotesMedical, FaCheckCircle,
  FaTimesCircle, FaClock, FaSearch, FaFilePrescription,
  FaUsers, FaChartBar, FaHistory, FaPhoneAlt, FaChevronRight,
  FaPaperPlane,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';
import { fetchDoctorAppointments, completeAppointment, cancelAppointment } from '../services/appointmentService';
import './DoctorDashboard.css';

/* ─── Helpers ────────────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  } catch (e) {
    return d;
  }
};

/**
 * sendNotification — Writes a notification to a user's isolated localStorage bucket.
 * For patients: writes to both the specific patientId key AND 'medeasy_notifications_patient'
 * so the currently logged-in patient can receive it regardless of which ID was stored
 * on the mock appointment record.
 * @param {'doctor'|'pharmacist'|'admin'|'patient'} role
 * @param {string|number} [specificId] - The specific user ID if targeting a patient
 * @param {Object} notification - The notification object to push
 */
function sendNotification(role, specificId, notification) {
  try {
    // Always write to the role-specific key for professional roles
    if (role === 'doctor' || role === 'pharmacist' || role === 'admin') {
      const key = `medeasy_notifications_${role}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      // Dedup: skip if same text appeared within last 3s
      const isDup = existing.some(a => a.text === notification.text && Date.now() - a.time < 3000);
      if (!isDup) {
        existing.unshift(notification);
        localStorage.setItem(key, JSON.stringify(existing));
      }
      return;
    }

    // For patients: write to specific ID key AND the generic 'patient' broadcast key
    const keysToWrite = new Set();
    if (specificId) keysToWrite.add(`medeasy_notifications_${specificId}`);
    keysToWrite.add('medeasy_notifications_patient'); // broadcast fallback

    keysToWrite.forEach(key => {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const isDup = existing.some(a => a.text === notification.text && Date.now() - a.time < 3000);
      if (!isDup) {
        existing.unshift(notification);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    });
  } catch (err) {
    console.error('sendNotification error:', err);
  }
}

const STATUS_CFG = {
  scheduled: { color:'primary', icon:<FaClock /> },
  completed: { color:'success', icon:<FaCheckCircle /> },
  cancelled: { color:'danger',  icon:<FaTimesCircle /> },
};

/* ═══════════════════ OVERVIEW TAB ══════════════════════════════ */
function OverviewTab({ apts, loading, setActive, openComplete }) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const todayAptsList = apts.filter(a => a.date === today);
  const todayCount = todayAptsList.length;
  const completedCount = apts.filter(a => a.status === 'completed').length;
  const pendingCount = apts.filter(a => a.status === 'scheduled').length;

  // Next Patient Alert
  const nextPatient = apts
    .filter(a => a.status === 'scheduled' && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];

  return (
    <div className="doc-overview">
      {/* Welcome Banner */}
      <div className="doc-welcome-banner mb-4">
        <h2>Welcome back, Dr. {user?.name || 'Usama'}!</h2>
        <p>Managing healthcare operations and patient consultations with absolute precision.</p>
      </div>

      {/* Metrics Cards */}
      <Row className="g-3 mb-4">
        {[
          { label: "Today's Appointments", value: todayCount, color: '#0284c7', icon: <FaCalendarCheck />, tab: 'schedule' },
          { label: 'Pending Consultations', value: pendingCount, color: '#6366f1', icon: <FaClock />, tab: 'schedule' },
          { label: 'Completed Cases', value: completedCount, color: '#10b981', icon: <FaCheckCircle />, tab: 'schedule' },
        ].map(s => (
          <Col md={4} key={s.label}>
            <Card className="doc-stat-card clickable shadow-sm" onClick={() => setActive(s.tab)} style={{ '--doc-accent': s.color }}>
              <Card.Body>
                <div className="doc-stat-icon">{s.icon}</div>
                <div className="doc-stat-num">{loading ? '...' : s.value}</div>
                <div className="doc-stat-label">{s.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        {/* Next Patient Alert Banner */}
        <Col lg={6}>
          <Card className="doc-alert-card h-100 shadow-sm border-0">
            <Card.Header className="bg-transparent border-0 pt-3">
              <h5 className="fw-bold mb-0 text-primary d-flex align-items-center gap-2">
                <FaUserMd /> Immediate Next Appointment
              </h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column justify-content-between">
              {nextPatient ? (
                <div>
                  <div className="next-patient-banner mb-3 d-flex align-items-center gap-3">
                    <div className="next-patient-avatar">{nextPatient.patientName[0]}</div>
                    <div>
                      <h5 className="mb-0 fw-800 text-dark">{nextPatient.patientName}</h5>
                      <span className="text-muted extra-small">{nextPatient.patientEmail}</span>
                    </div>
                  </div>
                  <div className="next-patient-meta mb-3 p-3 bg-light rounded-12">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted small">Date & Time:</span>
                      <span className="fw-bold text-dark small">{fmtDate(nextPatient.date)} at {nextPatient.time}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted small">Reason:</span>
                      <span className="fw-bold text-dark small">{nextPatient.reason || 'General Consultation'}</span>
                    </div>
                  </div>
                  <Button className="btn-doc-action w-100 mt-2" onClick={() => openComplete(nextPatient)}>
                    <FaNotesMedical className="me-2" /> Start Consultation
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 my-auto">
                  <FaCheckCircle className="text-success mb-2" size={42} />
                  <h6 className="fw-bold mb-1 text-dark">All Caught Up!</h6>
                  <p className="text-muted small mb-0">No pending appointments scheduled ahead.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Timeline of Today's Consultations */}
        <Col lg={6}>
          <Card className="doc-schedule-card h-100 shadow-sm border-0">
            <Card.Header className="bg-transparent border-0 pt-3">
              <h5 className="fw-bold mb-0 text-dark"><FaHistory className="me-2 text-info" />Today's Consultation List</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>
              ) : todayAptsList.length === 0 ? (
                <div className="text-center py-4 text-muted small">No appointments scheduled for today.</div>
              ) : (
                <div className="today-list">
                  {todayAptsList.slice(0, 4).map(a => (
                    <div key={a.id} className="today-item d-flex align-items-center justify-content-between py-2 border-bottom-dashed">
                      <div className="d-flex align-items-center gap-3">
                        <div className="today-avatar small">{a.patientName[0]}</div>
                        <div>
                          <div className="fw-bold text-dark small">{a.patientName}</div>
                          <span className="text-muted small">{a.time} · <Badge bg={STATUS_CFG[a.status]?.color || 'secondary'} className="extra-small">{a.status}</Badge></span>
                        </div>
                      </div>
                      {a.status === 'scheduled' && (
                        <Button size="sm" variant="outline-primary" className="rounded-8 py-1" onClick={() => openComplete(a)}>
                          Consult <FaChevronRight size={10} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* ═══════════════════ SCHEDULE TAB ══════════════════════════════ */
function ScheduleTab({ apts, loading, openComplete, handleCancel, setViewRx, setChatApt }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const visible = apts.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = a.patientName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <Card className="doc-card shadow-sm border-0">
      <Card.Body>
        <div className="doc-toolbar mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <Nav variant="pills" className="doc-tabs" activeKey={filter} onSelect={setFilter}>
            {['all','scheduled','completed','cancelled'].map(t => (
              <Nav.Item key={t}>
                <Nav.Link eventKey={t} className="doc-tab">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t !== 'all' && (
                    <span className="doc-tab-count">{apts.filter(a => a.status === t).length}</span>
                  )}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <div className="doc-search-wrap">
            <FaSearch className="doc-search-icon" />
            <input className="doc-search" placeholder="Search patient…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="doc-loading"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <div className="table-responsive">
            <Table hover className="doc-table">
              <thead>
                <tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No appointments found.</td></tr>
                )}
                {visible.map((a) => {
                  const cfg = STATUS_CFG[a.status] || STATUS_CFG.scheduled;
                  const isScheduled = a.status === 'scheduled';
                  return (
                    <tr key={a.id}>
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
                        <div className="apt-actions gap-2">
                          {isScheduled ? (
                            <>
                              <Button size="sm" className="btn-complete" onClick={() => openComplete(a)}>
                                <FaNotesMedical className="me-1" /> Complete
                              </Button>
                              <Button size="sm" variant="outline-primary" className="rounded-8 px-2.5" onClick={() => setChatApt(a)}>
                                💬 Chat
                              </Button>
                              <Button size="sm" variant="outline-danger" className="rounded-8" onClick={() => handleCancel(a.id)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline-primary" className="rounded-8 px-2.5 me-2" onClick={() => setChatApt(a)}>
                                💬 Chat
                              </Button>
                              {a.status === 'completed' && a.prescription && (
                                <Button size="sm" variant="outline-success" className="rounded-8 me-2" onClick={() => setViewRx(a)}>
                                  <FaFilePrescription className="me-1" /> View Rx
                                </Button>
                              )}
                              {a.status === 'completed' && (
                                <Button size="sm" variant="outline-secondary" className="rounded-8" onClick={() => openComplete(a)}>
                                  Edit Notes
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

/* ═══════════════════ PRESCRIBE TAB ═════════════════════════════ */
function PrescribeTab({ apts, handleIssueIndependent }) {
  const [patientEmail, setPatientEmail] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Extract unique patients from appointments
  const patientsList = Array.from(new Set(apts.map(a => a.patientEmail))).map(email => {
    const apt = apts.find(a => a.patientEmail === email);
    return { email: email, name: apt.patientName };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientEmail) return;
    setSaving(true);
    const selectedPat = patientsList.find(p => p.email === patientEmail);
    await handleIssueIndependent({
      patientName: selectedPat.name,
      patientEmail: selectedPat.email,
      notes: notes,
      prescription: instructions,
    });
    setSaving(false);
    setPatientEmail('');
    setInstructions('');
    setNotes('');
  };

  return (
    <Card className="doc-card shadow-sm border-0">
      <Card.Body className="p-4">
        <h5 className="fw-bold text-dark mb-3"><FaFilePrescription className="text-primary me-2" /> Digital Prescription Pad</h5>
        <p className="text-muted small">Write prescriptions and treatment plans directly to your registered patient's medical history files.</p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="doc-label">Select Patient *</Form.Label>
            <Form.Select required value={patientEmail} onChange={e => setPatientEmail(e.target.value)} className="rounded-10">
              <option value="">-- Select Patient --</option>
              {patientsList.map(p => (
                <option key={p.email} value={p.email}>{p.name} ({p.email})</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="doc-label">Diagnosis / Treatment Notes</Form.Label>
            <Form.Control as="textarea" rows={3} placeholder="Enter diagnosis advice, physical findings, or general recommendations..." value={notes} onChange={e => setNotes(e.target.value)} className="rounded-10" />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="doc-label">Prescription Instructions *</Form.Label>
            <div className="rx-pad">
              <div className="rx-pad-header">
                <FaFilePrescription className="me-2 text-success" />
                <strong>Rx Medications List</strong>
                <span className="rx-pad-date ms-auto">Today</span>
              </div>
              <Form.Control required as="textarea" rows={5} className="rx-textarea" placeholder="e.g.&#10;Amoxicillin 500mg -- 3 times daily x 7 days&#10;Paracetamol 500mg -- as needed for pain&#10;&#10;(Write one medicine per line for clarity)" value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
          </Form.Group>

          <div className="d-flex justify-content-end">
            <Button type="submit" className="btn-doc-action py-2 px-4 rounded-10" disabled={saving || !patientEmail || !instructions.trim()}>
              {saving ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-1" /> Issue E-Prescription</>}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

/* ═══════════════════ PATIENTS TAB ══════════════════════════════ */
function PatientsTab({ apts }) {
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Extract unique patient list
  const patientsList = Array.from(new Set(apts.map(a => a.patientEmail))).map((email, idx) => {
    const apt = apts.find(a => a.patientEmail === email);
    const phoneList = ['0300-1234567', '0321-7654321', '0333-9876543', '0345-2345678'];
    const gendersList = ['Female', 'Male', 'Female', 'Male'];
    return {
      email: email,
      name: apt.patientName,
      phone: apt.patientPhone || phoneList[idx % phoneList.length],
      gender: apt.gender || gendersList[idx % gendersList.length]
    };
  });

  const visible = patientsList.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const activePatient = selectedEmail ? patientsList.find(p => p.email === selectedEmail) : patientsList[0];
  const patientHistory = activePatient ? apts.filter(a => a.patientEmail === activePatient.email) : [];

  return (
    <Row className="g-4">
      {/* Patient List (Left Side) */}
      <Col md={5} lg={4}>
        <Card className="doc-card shadow-sm border-0 h-100">
          <Card.Body className="d-flex flex-column gap-3 p-3">
            <div className="doc-search-wrap w-100">
              <FaSearch className="doc-search-icon" />
              <input className="doc-search w-100" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="patient-directory-list flex-grow-1 overflow-auto" style={{ maxHeight: '420px' }}>
              {visible.length === 0 ? (
                <div className="text-center py-4 text-muted small">No patients found.</div>
              ) : (
                visible.map(p => (
                  <div key={p.email} className={`patient-dir-item p-3 rounded-12 mb-2 clickable d-flex align-items-center gap-3 ${activePatient?.email === p.email ? 'active' : ''}`} onClick={() => setSelectedEmail(p.email)}>
                    <div className="patient-avatar small">{p.name[0]}</div>
                    <div className="flex-grow-1 min-width-0">
                      <div className="fw-bold text-dark small text-truncate">{p.name}</div>
                      <span className="text-muted extra-small text-truncate d-block">{p.email}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Patient Health File (Right Side) */}
      <Col md={7} lg={8}>
        {activePatient ? (
          <Card className="doc-card shadow-sm border-0 h-100">
            <Card.Header className="bg-transparent border-0 pt-4 px-4">
              <div className="d-flex align-items-center gap-3 pb-3 border-bottom">
                <div className="patient-avatar large">{activePatient.name[0]}</div>
                <div>
                  <h4 className="fw-800 text-dark mb-0">{activePatient.name}</h4>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    <Badge bg="light" text="dark" className="small"><FaPhoneAlt size={10} className="me-1" />{activePatient.phone}</Badge>
                    <Badge bg="light" text="dark" className="small">{activePatient.gender}</Badge>
                    <Badge bg="primary" className="small">{patientHistory.length} Visits</Badge>
                  </div>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-4 overflow-auto" style={{ maxHeight: '350px' }}>
              <h5 className="fw-bold text-dark mb-3"><FaHistory className="text-info me-2" /> EHR Consultation History</h5>
              
              <div className="patient-ehr-timeline">
                {patientHistory.map((h, index) => (
                  <div key={h.id || index} className="ehr-visit-card p-3 rounded-12 mb-3 bg-light border-start-accent">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold text-primary small">{fmtDate(h.date)}</span>
                      <Badge bg={h.status === 'completed' ? 'success' : h.status === 'scheduled' ? 'warning' : 'danger'} className="extra-small">
                        {h.status}
                      </Badge>
                    </div>
                    {h.reason && <p className="mb-2 text-dark small"><strong>Reason for visit:</strong> "{h.reason}"</p>}
                    
                    {h.notes && (
                      <div className="ehr-notes p-2 bg-white rounded border mb-2">
                        <span className="text-muted extra-small d-block fw-bold"><FaNotesMedical /> Diagnosis Notes</span>
                        <p className="mb-0 text-muted extra-small">{h.notes}</p>
                      </div>
                    )}

                    {h.prescription && (
                      <div className="ehr-prescription p-2 bg-white rounded border">
                        <span className="text-success extra-small d-block fw-bold"><FaFilePrescription /> Issued Prescription</span>
                        <pre className="mb-0 text-muted extra-small lh-base" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{h.prescription}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Card className="doc-card shadow-sm border-0 h-100 d-flex align-items-center justify-content-center p-4">
            <div className="text-center text-muted">
              <FaUsers size={48} className="mb-2" />
              <h6>No patient selected</h6>
              <p className="small">Select a patient from the sidebar lookup directory to view their health file.</p>
            </div>
          </Card>
        )}
      </Col>
    </Row>
  );
}

/* ═══════════════════ MAIN DOCTOR DASHBOARD ═════════════════════ */
export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [apts,     setApts]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [active,   setActive]   = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Complete / Note Modal
  const [modal,    setModal]    = useState(null);   // appointment object | null
  const [notes,    setNotes]    = useState('');
  const [rx,       setRx]       = useState('');
  const [saving,   setSaving]   = useState(false);
  const [viewRx,   setViewRx]   = useState(null);   // appointment to view Rx

  /* ── Chat E2E System ── */
  const [chatApt, setChatApt] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [typedMsg, setTypedMsg] = useState('');
  const chatBottomRef = useRef(null);
  const location = useLocation();

  const loadChatMsgs = useCallback(() => {
    if (!chatApt) return;
    try {
      const raw = localStorage.getItem('medeasy_chats');
      const all = raw ? JSON.parse(raw) : [];
      const filtered = all.filter(m => m.appointmentId === chatApt.id);
      setChatMsgs(filtered);
    } catch(e) {
      console.error(e);
    }
  }, [chatApt]);

  useEffect(() => {
    if (chatApt) {
      loadChatMsgs();
      const interval = setInterval(loadChatMsgs, 1000);
      return () => clearInterval(interval);
    }
  }, [chatApt, loadChatMsgs]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatParam = params.get('chat');
    if (chatParam && apts.length > 0) {
      const found = apts.find(a => String(a.id) === String(chatParam) || `#APT-${a.id}` === chatParam || `APT-${a.id}` === chatParam);
      if (found) {
        setChatApt(found);
        setActive('schedule'); // Auto-switch active tab to schedule workspace
      }
    }
  }, [location.search, apts]);

  const handleSendChat = (e) => {
    if (e) e.preventDefault();
    if (!typedMsg.trim() || !chatApt) return;

    try {
      const raw = localStorage.getItem('medeasy_chats') || '[]';
      const all = JSON.parse(raw);
      
      const newMsg = {
        id: 'msg-' + Date.now(),
        appointmentId: chatApt.id,
        senderId: user?.id || 1,
        senderName: `Dr. ${user?.name || 'Sara Ali'}`,
        senderRole: 'doctor',
        text: typedMsg,
        time: Date.now()
      };

      all.push(newMsg);
      localStorage.setItem('medeasy_chats', JSON.stringify(all));
      setChatMsgs(prev => [...prev, newMsg]);
      setTypedMsg('');

      // ── Notify Patient: Doctor sent a chat reply ──
      sendNotification('patient', chatApt.patientId, {
        id: 'chat-notif-' + Date.now(),
        text: `Dr. ${user?.name || 'Doctor'} replied to your message — Appointment #APT-${chatApt.id}.`,
        time: Date.now(),
        emoji: '💬',
        unread: true,
        link: `/appointments/book?chat=${chatApt.id}`
      });

    } catch (err) {
      console.error(err);
    }
  };

  const handleSuggestReschedule = () => {
    setTypedMsg("I am not available at your selected date/time. Would you be comfortable with rescheduling to [Day] at [Time] instead? Let me know so we can consult.");
  };

  const DOCTOR_ID = user?.id ?? 1;

  const load = useCallback(async () => {
    setLoading(true);
    try { setApts(await fetchDoctorAppointments(DOCTOR_ID)); }
    catch(e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [DOCTOR_ID, toast]);

  useEffect(() => { load(); }, [load]);

  /* ── Complete Consultation Save ── */
  const openComplete = (a) => { setModal(a); setNotes(a.notes||''); setRx(a.prescription||''); };
  const handleComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await completeAppointment(modal.id, { notes, prescription: rx });
      setApts(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast.success(`Consultation recorded. E-prescription generated successfully.`);

      // ── Notify Patient: E-Prescription issued ──
      try {
        sendNotification('patient', modal.patientId, {
          id: 'rx-notif-' + Date.now(),
          text: `E-Prescription Issued: Dr. ${user?.name || 'Doctor'} issued a new digital prescription for your case #APT-${modal.id}.`,
          time: Date.now(),
          emoji: '💊',
          unread: true,
          link: '/appointments/book'
        });
      } catch (err) {
        console.error(err);
      }

      setModal(null);
    } catch(e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  /* ── Cancel Appointment ── */
  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await cancelAppointment(id);
      setApts(prev => prev.map(a => a.id === id ? {...a, status:'cancelled'} : a));
      toast.success(`Appointment marked as cancelled.`);

      // ── Notify Patient: Appointment cancelled ──
      try {
        const target = apts.find(a => a.id === id);
        sendNotification('patient', target?.patientId, {
          id: 'cancel-notif-' + Date.now(),
          text: `Appointment Cancelled: Dr. ${user?.name || 'Doctor'} cancelled your appointment #APT-${id}.`,
          time: Date.now(),
          emoji: '❌',
          unread: true,
          link: '/appointments/book'
        });
      } catch (err) {
        console.error(err);
      }

    } catch(e) { toast.error(e.message); }
  };

  /* ── Issue Independent Prescription ── */
  const handleIssueIndependent = async (data) => {
    try {
      // Find a scheduled appointment for this patient, or create a mock finished appointment record!
      const scheduledApt = apts.find(a => a.patientEmail === data.patientEmail && a.status === 'scheduled');
      if (scheduledApt) {
        const updated = await completeAppointment(scheduledApt.id, { notes: data.notes, prescription: data.prescription });
        setApts(prev => prev.map(a => a.id === updated.id ? updated : a));
        toast.success(`Prescription issued. Active appointment completed!`);
      } else {
        // Generate mock independent completed appointment
        const nextId = Math.max(...apts.map(a => a.id), 0) + 1;
        const newCompleted = {
          id: nextId,
          patientName: data.patientName,
          patientEmail: data.patientEmail,
          date: new Date().toISOString().slice(0, 10),
          time: '12:00 PM',
          reason: 'Direct E-Prescription Pad',
          status: 'completed',
          notes: data.notes,
          prescription: data.prescription,
        };
        // Add to our local array state
        setApts(prev => [newCompleted, ...prev]);
        toast.success(`Independent E-Prescription issued successfully!`);
      }
      setActive('schedule'); // Switch to schedule view to review history
    } catch (e) {
      toast.error(e.message);
    }
  };

  const SECTIONS = [
    { key: 'overview',     label: 'Dashboard Overview', icon: <FaChartBar /> },
    { key: 'schedule',     label: 'My Schedule',        icon: <FaCalendarCheck /> },
    { key: 'prescribe',    label: 'Issue Prescription', icon: <FaFilePrescription /> },
    { key: 'patients',     label: 'My Patients',        icon: <FaUsers /> },
  ];

  const currentSection = SECTIONS.find(s => s.key === active);

  return (
    <div className="doc-page">
      {/* Mobile Sidebar Toggle Button */}
      <button className="doc-mobile-toggle d-lg-none" onClick={() => setMobileOpen(o => !o)}>
        ☰ Medical Board Menu
      </button>

      <div className="doc-layout">
        {/* ── Sidebar ── */}
        <aside className={`doc-sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="doc-sidebar-header">
            <div className="doc-avatar-wrapper">
              <FaUserMd size={26} className="doc-avatar-svg" />
            </div>
            <div>
              <div className="doc-sidebar-name">{user?.name || 'Dr. Sara Ali'}</div>
              <div className="doc-sidebar-role">Lead Consultant</div>
            </div>
          </div>
          <nav className="doc-nav">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                className={`doc-nav-item ${active === s.key ? 'active' : ''}`}
                onClick={() => { setActive(s.key); setMobileOpen(false); }}
              >
                <span className="doc-nav-icon">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content area ── */}
        <main className="doc-main">
          <div className="doc-main-header mb-4">
            <h1 className="doc-title">
              {currentSection?.icon} <span className="ms-2">{currentSection?.label}</span>
            </h1>
            <p className="doc-subtitle text-muted mt-1">Hello Dr. {user?.name || 'Sara Ali'}, managing healthcare operations with precision.</p>
          </div>

          <div className="doc-content">
            {active === 'overview'  && <OverviewTab apts={apts} loading={loading} setActive={setActive} openComplete={openComplete} />}
            {active === 'schedule'  && <ScheduleTab apts={apts} loading={loading} openComplete={openComplete} handleCancel={handleCancel} setViewRx={setViewRx} setChatApt={setChatApt} />}
            {active === 'prescribe' && <PrescribeTab apts={apts} handleIssueIndependent={handleIssueIndependent} />}
            {active === 'patients'  && <PatientsTab apts={apts} />}
          </div>
        </main>
      </div>

      {/* ── Consultation & Notes Writing Modal ── */}
      <Modal show={!!modal} onHide={() => setModal(null)} size="lg" centered>
        <Modal.Header closeButton className="doc-modal-header">
          <Modal.Title>
            {modal?.status === 'completed' ? 'Edit Consultation Notes' : 'Complete Appointment'}
            <span className="modal-apt-id ms-2">#APT-{modal?.id}</span>
          </Modal.Title>
        </Modal.Header>
        {modal && (
          <Modal.Body>
            <div className="modal-patient-info mb-4">
              <div className="modal-patient-avatar">{modal.patientName[0]}</div>
              <div className="flex-grow-1">
                <div className="modal-patient-name">{modal.patientName}</div>
                <div className="modal-patient-meta">{fmtDate(modal.date)} at {modal.time}</div>
                {modal.reason && <div className="modal-patient-reason mt-2 p-2 rounded bg-light border-start border-primary">"{modal.reason}"</div>}
              </div>
            </div>

            <Form onSubmit={handleComplete}>
              <Form.Group className="mb-3">
                <Form.Label className="doc-label">
                  <FaNotesMedical className="me-1 text-primary" /> Consultation Notes
                </Form.Label>
                <Form.Control required as="textarea" rows={4}
                  placeholder="Enter diagnosis, physical examination details, treatment plans..."
                  value={notes} onChange={e => setNotes(e.target.value)} className="rounded-12" />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="doc-label">
                  <FaFilePrescription className="me-1 text-success" /> Prescription Pad
                </Form.Label>
                <div className="rx-pad">
                  <div className="rx-pad-header">
                    <FaFilePrescription className="me-2 text-success" />
                    <strong>E-Prescription Instructions</strong>
                    <span className="rx-pad-date ms-auto">{fmtDate(modal.date)}</span>
                  </div>
                  <Form.Control required as="textarea" rows={5}
                    className="rx-textarea"
                    placeholder={"e.g.\nAmoxicillin 500mg -- 3x/day x 7 days\nParacetamol 500mg -- as needed for pain\n\n(Write one medicine per line for clarity)"}
                    value={rx} onChange={e => setRx(e.target.value)} />
                </div>
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="outline-secondary" className="rounded-10 px-4" type="button" onClick={() => setModal(null)}>Cancel</Button>
                <Button type="submit" className="btn-complete-save px-4 rounded-10" disabled={saving}>
                  {saving ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-1" /> Save & Complete Case</>}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        )}
      </Modal>

      {/* ── View Prescription Modal ── */}
      <Modal show={!!viewRx} onHide={() => setViewRx(null)} centered>
        <Modal.Header closeButton className="doc-modal-header">
          <Modal.Title><FaFilePrescription className="me-2 text-success" /> Prescription - {viewRx?.patientName}</Modal.Title>
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
              <div className="rx-view-notes mt-3 p-3 bg-light rounded-12">
                <strong>Diagnosis & Treatment Notes:</strong>
                <p className="mt-2 text-muted mb-0">{viewRx.notes}</p>
              </div>
            )}
          </Modal.Body>
        )}
      </Modal>

      {/* ── Doctor Chat Modal ── */}
      <Modal show={!!chatApt} onHide={() => setChatApt(null)} centered size="md">
        <Modal.Header closeButton className="bg-primary text-white border-0 py-3 rounded-top-4">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <span>💬 Consultation Chat with {chatApt?.patientName}</span>
            <Badge bg="light" text="dark" className="fs-7 fw-normal">
              #APT-{chatApt?.id}
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 bg-light rounded-bottom-4 d-flex flex-column" style={{ height: '450px' }}>
          {/* Patient Details & Time slot display */}
          {chatApt && (
            <div className="p-2.5 bg-white border-bottom d-flex align-items-center justify-content-between px-3">
              <span className="small text-muted" style={{ fontSize: '0.78rem' }}>
                Slot: <strong>{fmtDate(chatApt.date)} at {chatApt.time}</strong>
              </span>
              <Button 
                variant="outline-warning" 
                size="sm" 
                className="py-1 px-2 text-dark font-medium small rounded-8 d-flex align-items-center gap-1"
                onClick={handleSuggestReschedule}
                style={{ fontSize: '0.72rem' }}
              >
                ⚠️ Suggest Rescheduling
              </Button>
            </div>
          )}

          {/* Scrollable messages area */}
          <div className="flex-grow-1 p-3 overflow-y-auto d-flex flex-column gap-2" style={{ maxHeight: '380px' }}>
            {chatMsgs.length === 0 ? (
              <div className="my-auto text-center text-muted py-4">
                <p className="mb-1 fw-semibold">No messages yet.</p>
                <p className="small mb-0">Send a message to patient to start the consultation or propose adjustments.</p>
              </div>
            ) : (
              chatMsgs.map(m => {
                const isMe = m.senderRole === 'doctor';
                return (
                  <div key={m.id} className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                    <div className="d-flex align-items-center gap-2 mb-0.5">
                      <span className="fw-semibold text-dark" style={{ fontSize: '0.72rem' }}>
                        {isMe ? 'You' : m.senderName}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                        {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div 
                      className={`px-3 py-2 text-start`}
                      style={{
                        maxWidth: '85%',
                        fontSize: '0.88rem',
                        lineHeight: '1.4',
                        background: isMe ? '#2563eb' : '#fff',
                        color: isMe ? '#fff' : '#1f2937',
                        border: isMe ? 'none' : '1px solid #e5e7eb',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat input box */}
          <Form onSubmit={handleSendChat} className="p-3 bg-white border-top d-flex gap-2 align-items-center rounded-bottom-4">
            <Form.Control
              type="text"
              placeholder="Type your message here..."
              value={typedMsg}
              onChange={e => setTypedMsg(e.target.value)}
              className="rounded-pill"
              style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="rounded-circle d-flex align-items-center justify-content-center" 
              style={{ width: '42px', height: '42px', flexShrink: 0, padding: 0 }}
              disabled={!typedMsg.trim()}
            >
              <FaPaperPlane size={14} />
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
}
