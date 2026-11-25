import { Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { FaUserMd, FaCalendarCheck, FaNotesMedical, FaCheckCircle, FaClock, FaHistory, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { fmtDate, STATUS_CFG } from './doctorShared';


/* ═══════════════════ OVERVIEW TAB ══════════════════════════════ */
export default function OverviewTab({ apts, loading, setActive, openComplete }) {
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
          { label: "Today's Appointments", value: todayCount, color: 'var(--fg-primary)', icon: <FaCalendarCheck />, tab: 'schedule' },
          { label: 'Pending Consultations', value: pendingCount, color: 'var(--color-violet-500)', icon: <FaClock />, tab: 'schedule' },
          { label: 'Completed Cases', value: completedCount, color: 'var(--color-accent-500)', icon: <FaCheckCircle />, tab: 'schedule' },
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
                    <div className="next-patient-avatar">{(nextPatient.patientName || 'P')[0]}</div>
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
                        <div className="today-avatar small">{(a.patientName || 'P')[0]}</div>
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
