import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { FaUserMd, FaCalendarCheck, FaNotesMedical, FaCheckCircle, FaFilePrescription, FaUsers, FaChartBar, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useLocation } from 'react-router-dom';
import { fetchDoctorAppointments, completeAppointment, cancelAppointment } from '../../../services/api/appointmentService';
import './DoctorDashboard.css';
import { fmtDate, safeFmtTime, sendNotification } from '../components/doctorShared';
import OverviewTab from '../components/OverviewTab';
import ScheduleTab from '../components/ScheduleTab';
import PrescribeTab from '../components/PrescribeTab';
import PatientsTab from '../components/PatientsTab';


/* ─── Helpers ────────────────────────────────────────────────── */


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
        emoji: 'chat',
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
          emoji: 'prescription',
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
          emoji: 'cancel',
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
              <div className="modal-patient-avatar">{(modal.patientName || 'P')[0]}</div>
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
                        {safeFmtTime(m.time)}
                      </span>
                    </div>
                    <div 
                      className={`px-3 py-2 text-start`}
                      style={{
                        maxWidth: '85%',
                        fontSize: '0.88rem',
                        lineHeight: '1.4',
                        background: isMe ? 'var(--color-primary-600)' : 'var(--color-white)',
                        color: isMe ? 'var(--color-white)' : 'var(--color-neutral-800)',
                        border: isMe ? 'none' : '1px solid var(--color-neutral-200)',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        boxShadow: '0 1px 2px color-mix(in srgb, var(--color-black) 5%, transparent)'
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
