import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Row, Col, Card, Form, Button,
  Badge, Alert, Spinner, Modal,
} from 'react-bootstrap';
import {
  FaCalendarAlt, FaUserMd, FaClock, FaCheckCircle,
  FaTimesCircle, FaStar, FaMoneyBillWave, FaBriefcase,
  FaPaperPlane,
} from 'react-icons/fa';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { fetchDoctors, bookAppointment, fetchMyAppointments, cancelAppointment } from '../services/appointmentService';
import MOCK_APPOINTMENTS from '../data/mockAppointments';
import ReviewSection from '../components/ReviewSection';
import { useLocation } from 'react-router-dom';
import './AppointmentBooking.css';

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-PK',
  { weekday:'short', day:'numeric', month:'short', year:'numeric' });

const STATUS_CFG = {
  scheduled: { color:'primary', icon:<FaClock /> },
  completed: { color:'success', icon:<FaCheckCircle /> },
  cancelled: { color:'danger',  icon:<FaTimesCircle /> },
};

const getLocalDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = getLocalDateString(new Date());
const maxDate = getLocalDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

/**
 * getNotifKey — Returns the isolated localStorage notification key for a given recipient.
 * Strategy:
 *   - For role-based accounts (doctor, pharmacist, admin) that log in once: use role.
 *   - For patients (multiple accounts possible): use their _id / id.
 *   - When targeting by appointment data (doctorId is numeric mock ID), we route to 'doctor' role key
 *     since in mock mode only one doctor is ever logged in at a time.
 * @param {'doctor'|'pharmacist'|'admin'|'patient'} role
 * @param {string|number} [id] - Optional user _id for patient targeting
 */
function getNotifKey(role, id) {
  if (role === 'doctor' || role === 'pharmacist' || role === 'admin') {
    return 'medeasy_notifications_' + role;
  }
  // Patient: use ID or fallback
  return 'medeasy_notifications_' + (id || 'patient');
}

export default function AppointmentBooking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();

  /* ── Chat E2E System ── */
  const [chatApt, setChatApt] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [typedMsg, setTypedMsg] = useState('');
  const chatBottomRef = useRef(null);

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

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!typedMsg.trim() || !chatApt) return;

    try {
      const raw = localStorage.getItem('medeasy_chats') || '[]';
      const all = JSON.parse(raw);
      
      const newMsg = {
        id: 'msg-' + Date.now(),
        appointmentId: chatApt.id,
        senderId: user?._id || 99,
        senderName: user?.name || 'Patient',
        senderRole: 'patient',
        text: typedMsg,
        time: Date.now()
      };

      all.push(newMsg);
      localStorage.setItem('medeasy_chats', JSON.stringify(all));
      setChatMsgs(prev => [...prev, newMsg]);
      setTypedMsg('');

      // ── Notify Doctor: Patient sent a message ──
      // Use role-based key so the doctor always receives it regardless of session ID
      const doctorKey = getNotifKey('doctor');
      try {
        const rawAlerts = localStorage.getItem(doctorKey) || '[]';
        const alerts = JSON.parse(rawAlerts);
        const alertText = `Patient ${user?.name || 'Patient'} sent you a message — Appointment #APT-${chatApt.id}.`;
        // Avoid duplicate notifications (same message within 3 seconds)
        const isDup = alerts.some(a => a.text === alertText && Date.now() - a.time < 3000);
        if (!isDup) {
          alerts.unshift({
            id: 'chat-notif-' + Date.now(),
            text: alertText,
            time: Date.now(),
            emoji: '💬',
            unread: true,
            link: `/doctor?tab=schedule&chat=${chatApt.id}`
          });
          localStorage.setItem(doctorKey, JSON.stringify(alerts));
        }
      } catch (err) {
        console.error(err);
      }

    } catch (err) {
      console.error(err);
    }
  };

  /* ── Report Doctor/Clinical Issue E2E ── */
  const [reportApt, setReportApt] = useState(null);
  const [reportIssueType, setReportIssueType] = useState('no-show');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportApt || !reportDetails.trim()) return;

    setSubmittingReport(true);
    try {
      const raw = localStorage.getItem('medeasy_doctor_reports') || '[]';
      const all = JSON.parse(raw);

      const newReport = {
        id: 'rep-' + Date.now(),
        appointmentId: reportApt.id,
        doctorId: reportApt.doctorId,
        doctorName: reportApt.doctorName,
        specialty: reportApt.specialty,
        patientName: user?.name || 'Patient',
        patientEmail: user?.email || '',
        issueType: reportIssueType,
        details: reportDetails,
        status: 'pending',
        time: Date.now()
      };

      all.push(newReport);
      localStorage.setItem('medeasy_doctor_reports', JSON.stringify(all));

      // Send Alert notification to Admin
      const rawAlerts = localStorage.getItem('medeasy_notifications_admin') || '[]';
      const alerts = JSON.parse(rawAlerts);
      alerts.unshift({
        id: 'alert-' + Date.now() + '-admin',
        text: `Clinical Complaint: Patient ${user?.name || 'Patient'} submitted a clinical complaint against Dr. ${reportApt.doctorName} (Appointment #APT-${reportApt.id}): "${reportDetails.slice(0, 40)}..."`,
        time: Date.now(),
        emoji: '⚖️',
        unread: true,
        link: '/admin?tab=audits'
      });
      localStorage.setItem('medeasy_notifications_admin', JSON.stringify(alerts));

      toast.success('Your report has been successfully submitted to the medical board.');
      setReportApt(null);
      setReportDetails('');
      setReportIssueType('no-show');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit complaint.');
    } finally {
      setSubmittingReport(false);
    }
  };

  /* ── Doctors state ──────────────────────────────────────── */
  const [doctors,  setDoctors]  = useState([]);
  const [specialty,setSpecialty]= useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date,     setDate]     = useState('');
  const [slot,     setSlot]     = useState('');
  const [reason,   setReason]   = useState('');
  const [booking,  setBooking]  = useState(false);
  const [success,  setSuccess]  = useState(null);   // booked appointment
  const [errors,   setErrors]   = useState({});

  /* ── Upcoming appointments state ─────────────────────── */
  const [myApts,    setMyApts]    = useState([]);
  const [loadingApts, setLoadingApts] = useState(true);
  const [cancelling,  setCancelling]  = useState(null);

  /* ── Load data ───────────────────────────────────────── */
  const loadDoctors = useCallback(async () => {
    try { setDoctors(await fetchDoctors()); }
    catch(e) { toast.error(e.message); }
  }, [toast]);

  const loadMyApts = useCallback(async () => {
    setLoadingApts(true);
    try { setMyApts(await fetchMyAppointments()); }
    catch(e) { toast.error(e.message); }
    finally { setLoadingApts(false); }
  }, [toast]);

  useEffect(() => { loadDoctors(); loadMyApts(); }, [loadDoctors, loadMyApts]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatParam = params.get('chat');
    if (chatParam && myApts.length > 0) {
      const found = myApts.find(a => String(a.id) === String(chatParam) || `#APT-${a.id}` === chatParam || `APT-${a.id}` === chatParam);
      if (found) {
        setChatApt(found);
      }
    }
  }, [location.search, myApts]);

  /* ── Derived ─────────────────────────────────────────── */
  const specialties  = [...new Set(doctors.map(d => d.specialty))].sort();
  const filteredDocs = specialty ? doctors.filter(d => d.specialty === specialty) : doctors;
  const selectedDoc  = doctors.find(d => d.id === Number(doctorId));
  
  const getBookedSlots = () => {
    if (!selectedDoc || !date) return [];
    const combined = [...myApts, ...MOCK_APPOINTMENTS];
    return combined
      .filter(a => a.doctorId === selectedDoc.id && a.date === date && a.status === 'scheduled')
      .map(a => a.time);
  };
  const bookedSlots = getBookedSlots();
  const availSlots   = (date && selectedDoc)
    ? selectedDoc.slots.filter(s => !bookedSlots.includes(s))
    : [];

  /* ── Validate + submit ───────────────────────────────── */
  const validate = () => {
    const e = {};
    if (!doctorId) e.doctor = 'Please select a doctor.';
    
    if (!date) {
      e.date = 'Please pick a date.';
    } else {
      const parsedDate = new Date(date + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      const maxDateVal = new Date(maxDate + 'T00:00:00');
      
      if (isNaN(parsedDate.getTime())) {
        e.date = 'Please enter a valid, real calendar date.';
      } else if (parsedDate < todayDate) {
        e.date = 'You cannot book an appointment for a past date.';
      } else if (parsedDate > maxDateVal) {
        e.date = 'Appointments can only be booked up to 30 days in advance.';
      }
    }
    
    if (!slot) e.slot = 'Please choose a time slot.';
    return e;
  };

  const handleBook = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setBooking(true); setSuccess(null);
    try {
      const appt = await bookAppointment({ doctorId: Number(doctorId), date, time: slot, reason });
      setSuccess(appt);
      toast.success('Appointment booked successfully!');

      // Create in-web alert notification
      try {
        const key = 'medeasy_notifications_' + (user?._id || user?.id || 'patient');
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        alerts.unshift({
          id: 'alert-' + Date.now(),
          text: `Booking confirmed: Appointment #APT-${appt.id} scheduled with ${appt.doctorName} on ${fmtDate(appt.date)} at ${appt.time}.`,
          time: Date.now(),
          emoji: '📅',
          unread: true,
          link: `/appointments/book?chat=${appt.id}`
        });
        localStorage.setItem(key, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

      setDoctorId(''); setDate(''); setSlot(''); setReason(''); setSpecialty('');
      await loadMyApts();
    } catch(e) { toast.error(e.message || 'Booking failed.'); }
    finally { setBooking(false); }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await cancelAppointment(id);
      setMyApts(prev => prev.map(a => a.id === id ? {...a, status:'cancelled'} : a));
      toast.success('Appointment cancelled.');
    } catch(e) { toast.error(e.message); }
    finally { setCancelling(null); }
  };

  return (
    <div className="appt-page">
      <Container className="py-4 py-md-5">

        {/* Header */}
        <div className="appt-header mb-4">
          <h1 className="appt-title"><FaCalendarAlt className="me-2" />Book an Appointment</h1>
          <p className="appt-subtitle">Choose a doctor, pick a date and time slot, and confirm your booking.</p>
        </div>

        <Row className="gx-4 gy-4">

          {/* ═══ Booking form ══════════════════════════════ */}
          <Col lg={6} xl={5}>
            <Card className="appt-card">
              <Card.Body className="p-4">
                <h5 className="appt-section-title"><FaUserMd className="me-2" />New Booking</h5>

                {success && (
                  <Alert variant="success" className="appt-success-alert" dismissible onClose={() => setSuccess(null)}>
                    <FaCheckCircle className="me-2" />
                    <strong>Booked!</strong> {success.doctorName} on {fmtDate(success.date)} at {success.time}
                    <br /><code className="small">{success.id}</code>
                  </Alert>
                )}

                <Form noValidate onSubmit={handleBook}>
                  {/* Specialty filter */}
                  <Form.Group className="mb-3" controlId="aptSpecialty">
                    <Form.Label className="appt-label">Filter by Specialty</Form.Label>
                    <Form.Select value={specialty} onChange={e => { setSpecialty(e.target.value); setDoctorId(''); setSlot(''); }}>
                      <option value="">All Specialties</option>
                      {specialties.map(s => <option key={s}>{s}</option>)}
                    </Form.Select>
                  </Form.Group>

                  {/* Doctor */}
                  <Form.Group className="mb-3" controlId="aptDoctor">
                    <Form.Label className="appt-label">Doctor *</Form.Label>
                    <Form.Select value={doctorId} isInvalid={!!errors.doctor}
                      onChange={e => { setDoctorId(e.target.value); setSlot(''); }}>
                      <option value="">Select a doctor…</option>
                      {filteredDocs.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.avatar} {d.name} — {d.specialty}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.doctor}</Form.Control.Feedback>
                  </Form.Group>

                  {/* Doctor card */}
                  {selectedDoc && (
                    <Card className="doc-profile-card border-0 shadow-sm mb-4 rounded-4 animate-fade-in" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-start gap-3">
                          {/* Avatar block */}
                          <div className="doc-avatar-circle d-flex align-items-center justify-content-center shadow-xs" style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', fontSize: '2.2rem' }}>
                            {selectedDoc.avatar || '🩺'}
                          </div>

                          {/* Info block */}
                          <div className="flex-grow-1">
                            <h5 className="doc-profile-name fw-bold mb-1 text-dark d-flex align-items-center gap-2" style={{ fontSize: '1.05rem', textAlign: 'left' }}>
                              {selectedDoc.name}
                              <Badge bg="success" className="px-2 py-1 text-white rounded-pill fw-600" style={{ fontSize: '0.65rem', verticalAlign: 'middle' }}>
                                Verified Expert
                              </Badge>
                            </h5>
                            <p className="doc-profile-specialty text-primary fw-600 mb-2 small text-uppercase tracking-wider" style={{ textAlign: 'left' }}>
                              {selectedDoc.specialty}
                            </p>

                            {/* Meta row */}
                            <div className="d-flex flex-wrap gap-x-3 gap-y-1 text-muted small border-top pt-2 mt-1" style={{ textAlign: 'left' }}>
                              <span className="d-flex align-items-center gap-1" title="Practice Experience">
                                <FaBriefcase className="text-secondary" /> <strong>{selectedDoc.experience} Years</strong> Experience
                              </span>
                              <span className="d-flex align-items-center gap-1" title="Patient Rating">
                                <FaStar className="text-warning" /> <strong>{selectedDoc.rating}</strong> / 5.0 Rating
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Consultation Price alert block */}
                        <div className="consultation-fee-badge mt-3 p-3 rounded-3 d-flex align-items-center justify-content-between" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                          <span className="small text-success-dark fw-600 d-flex align-items-center gap-1">
                            <FaMoneyBillWave /> Consultation Checkup Fee
                          </span>
                          <span className="fw-bold fs-6 text-success">
                            Rs. {selectedDoc.fee.toLocaleString()}
                          </span>
                        </div>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Date */}
                  <Form.Group className="mb-3" controlId="aptDate">
                    <Form.Label className="appt-label"><FaCalendarAlt className="me-1" />Date *</Form.Label>
                    <Form.Control type="date" min={today} max={maxDate} isInvalid={!!errors.date}
                      value={date} onChange={e => { setDate(e.target.value); setSlot(''); }} />
                    <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
                  </Form.Group>

                  {/* Time slots */}
                  <Form.Group className="mb-3">
                    <Form.Label className="appt-label"><FaClock className="me-1" />Time Slot *</Form.Label>
                    {!date || !doctorId ? (
                      <p className="slot-hint">Select a doctor and date first.</p>
                    ) : (
                      <div className="slot-grid">
                        {availSlots.map(s => (
                          <button key={s} type="button"
                            className={`slot-btn ${slot === s ? 'active' : ''}`}
                            onClick={() => setSlot(s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.slot && <div className="slot-error">{errors.slot}</div>}
                  </Form.Group>

                  {/* Reason */}
                  <Form.Group className="mb-4" controlId="aptReason">
                    <Form.Label className="appt-label">Reason for Visit <span className="opt-label">(optional)</span></Form.Label>
                    <Form.Control as="textarea" rows={3}
                      placeholder="Describe your symptoms or reason for visit…"
                      value={reason} onChange={e => setReason(e.target.value)} />
                  </Form.Group>

                  <Button type="submit" className="btn-book w-100" disabled={booking}>
                    {booking
                      ? <><Spinner size="sm" animation="border" className="me-2" />Booking…</>
                      : <><FaCheckCircle className="me-2" />Confirm Booking</>}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* ═══ Upcoming appointments ══════════════════════ */}
          <Col lg={6} xl={7}>
            <h5 className="appt-section-title mb-3">
              <FaCalendarAlt className="me-2" />My Appointments
            </h5>

            {loadingApts ? (
              <div className="appt-loading"><Spinner animation="border" variant="primary" /></div>
            ) : myApts.length === 0 ? (
              <div className="appt-empty">
                <FaCalendarAlt className="appt-empty-icon" />
                <p>No appointments booked yet.</p>
              </div>
            ) : (
              myApts.map(a => {
                const cfg = STATUS_CFG[a.status] || STATUS_CFG.scheduled;
                return (
                  <Card key={a.id} className={`appt-history-card mb-3 status-${a.status}`}>
                    <Card.Body>
                      <div className="appt-history-top">
                        <div>
                          <div className="appt-doc-name">{a.doctorName}</div>
                          <div className="appt-specialty">{a.specialty}</div>
                        </div>
                        <Badge bg={cfg.color} className="appt-status-badge">
                          {cfg.icon} <span className="ms-1">{a.status}</span>
                        </Badge>
                      </div>
                      <div className="appt-history-meta">
                        <span><FaCalendarAlt className="me-1" />{fmtDate(a.date)}</span>
                        <span><FaClock className="me-1" />{a.time}</span>
                        <code className="apt-id">{a.id}</code>
                      </div>
                      {a.reason && <p className="appt-reason">"{a.reason}"</p>}
                      {a.notes && (
                        <div className="appt-notes-box">
                          <strong>Doctor's Notes:</strong> {a.notes}
                        </div>
                      )}
                      {a.prescription && (
                        <div className="appt-rx-box">
                          <FaCalendarAlt className="me-1 text-success" />
                          <strong>Prescription issued</strong>
                        </div>
                      )}
                      {(a.status === 'scheduled' || a.status === 'completed') && (
                        <div className="appt-history-actions d-flex gap-2 flex-wrap mt-2">
                          {a.status === 'scheduled' && (
                            <>
                              <Button size="sm" variant="outline-primary" className="rounded-8"
                                onClick={() => setChatApt(a)}>
                                💬 Chat
                              </Button>
                              <Button size="sm" variant="outline-danger" className="rounded-8"
                                disabled={cancelling === a.id}
                                onClick={() => handleCancel(a.id)}>
                                {cancelling === a.id
                                  ? <Spinner size="sm" animation="border" />
                                  : <><FaTimesCircle className="me-1" />Cancel</>}
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline-warning" className="rounded-8 d-flex align-items-center gap-1"
                            onClick={() => setReportApt(a)}>
                            ⚠️ Report Issue
                          </Button>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                );
              })
            )}
          </Col>
        </Row>

        {/* ═══ Doctor Reviews ═════════════════════════════ */}
        {selectedDoc && (
          <Row className="mt-5">
            <Col>
              <hr />
              <h4 className="mb-4">Reviews for {selectedDoc.name}</h4>
              <ReviewSection targetType="doctor" targetId={selectedDoc.id} />
            </Col>
          </Row>
        )}

        {/* ── Patient Chat Modal ── */}
        <Modal show={!!chatApt} onHide={() => setChatApt(null)} centered size="md">
          <Modal.Header closeButton className="bg-primary text-white border-0 py-3 rounded-top-4">
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
              <span>💬 Chat with {chatApt?.doctorName}</span>
              <Badge bg="light" text="dark" className="fs-7 fw-normal">
                #APT-{chatApt?.id}
              </Badge>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0 bg-light rounded-bottom-4 d-flex flex-column" style={{ height: '450px' }}>
            {/* Scrollable messages area */}
            <div className="flex-grow-1 p-3 overflow-y-auto d-flex flex-column gap-2" style={{ maxHeight: '380px' }}>
              {chatMsgs.length === 0 ? (
                <div className="my-auto text-center text-muted py-4">
                  <p className="mb-1 fw-semibold">No messages yet.</p>
                  <p className="small mb-0">Start the conversation below regarding your appointment!</p>
                </div>
              ) : (
                chatMsgs.map(m => {
                  const isMe = m.senderRole === 'patient';
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

        {/* ── Report Doctor Modal ── */}
        <Modal show={!!reportApt} onHide={() => setReportApt(null)} centered>
          <Modal.Header closeButton className="bg-danger text-white border-0 py-3 rounded-top-4">
            <Modal.Title className="fs-5 fw-bold">⚠️ Report Doctor / Clinical Issue</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light rounded-bottom-4">
            <p className="small text-muted mb-3">
              Your safety and quality of clinical care are our top priorities. Filing this report initiates an administrative audit on <strong>{reportApt?.doctorName}</strong>.
            </p>
            <Form onSubmit={handleReportSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Select Issue Category</Form.Label>
                <Form.Select value={reportIssueType} onChange={e => setReportIssueType(e.target.value)}>
                  <option value="no-show">No-Show / Doctor Missed Appointment</option>
                  <option value="conduct">Improper Professional Conduct / Behavior</option>
                  <option value="incorrect-advice">Inappropriate / Harmful Clinical Advice</option>
                  <option value="overcharging">Overcharging / Fee Issue</option>
                  <option value="other">Other Incident</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold">Description of the Incident *</Form.Label>
                <Form.Control 
                  required 
                  as="textarea" 
                  rows={4} 
                  placeholder="Provide clinical details, times, or issues that occurred during or after this consultation..." 
                  value={reportDetails} 
                  onChange={e => setReportDetails(e.target.value)} 
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="outline-secondary" className="rounded-10 px-3" onClick={() => setReportApt(null)}>Cancel</Button>
                <Button type="submit" variant="danger" className="rounded-10 px-4 text-white" disabled={submittingReport}>
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

      </Container>
    </div>
  );
}
