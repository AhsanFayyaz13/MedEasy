import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Form, Button,
  Badge, Alert, Spinner,
} from 'react-bootstrap';
import {
  FaCalendarAlt, FaUserMd, FaClock, FaCheckCircle,
  FaTimesCircle, FaStar, FaMoneyBillWave, FaBriefcase,
} from 'react-icons/fa';
import { useToast } from '../context/ToastContext';
import { fetchDoctors, bookAppointment, fetchMyAppointments, cancelAppointment } from '../services/appointmentService';
import './AppointmentBooking.css';

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-PK',
  { weekday:'short', day:'numeric', month:'short', year:'numeric' });

const STATUS_CFG = {
  scheduled: { color:'primary', icon:<FaClock /> },
  completed: { color:'success', icon:<FaCheckCircle /> },
  cancelled: { color:'danger',  icon:<FaTimesCircle /> },
};

const today = new Date().toISOString().slice(0,10);
const maxDate = new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10);

export default function AppointmentBooking() {
  const { toast } = useToast();

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

  /* ── Derived ─────────────────────────────────────────── */
  const specialties  = [...new Set(doctors.map(d => d.specialty))].sort();
  const filteredDocs = specialty ? doctors.filter(d => d.specialty === specialty) : doctors;
  const selectedDoc  = doctors.find(d => d.id === Number(doctorId));
  const availSlots   = (date && selectedDoc) ? selectedDoc.slots : [];

  /* ── Validate + submit ───────────────────────────────── */
  const validate = () => {
    const e = {};
    if (!doctorId) e.doctor = 'Please select a doctor.';
    if (!date)     e.date   = 'Please pick a date.';
    if (!slot)     e.slot   = 'Please choose a time slot.';
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
                          {d.avatar} {d.name} — {d.specialty} (Rs.{d.fee})
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.doctor}</Form.Control.Feedback>
                  </Form.Group>

                  {/* Doctor card */}
                  {selectedDoc && (
                    <div className="doc-info-card mb-3">
                      <span className="doc-info-avatar">{selectedDoc.avatar}</span>
                      <div>
                        <div className="doc-info-name">{selectedDoc.name}</div>
                        <div className="doc-info-meta">
                          <span><FaBriefcase className="me-1" />{selectedDoc.experience} yrs exp.</span>
                          <span><FaStar className="me-1 text-warning" />{selectedDoc.rating}</span>
                          <span><FaMoneyBillWave className="me-1 text-success" />Rs.{selectedDoc.fee}</span>
                        </div>
                      </div>
                    </div>
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
                      {a.status === 'scheduled' && (
                        <div className="appt-history-actions">
                          <Button size="sm" variant="outline-danger"
                            disabled={cancelling === a.id}
                            onClick={() => handleCancel(a.id)}>
                            {cancelling === a.id
                              ? <Spinner size="sm" animation="border" />
                              : <><FaTimesCircle className="me-1" />Cancel</>}
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
      </Container>
    </div>
  );
}
