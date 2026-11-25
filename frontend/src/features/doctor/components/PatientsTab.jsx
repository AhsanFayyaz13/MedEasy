import { useState } from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import { FaNotesMedical, FaSearch, FaFilePrescription, FaUsers, FaHistory, FaPhoneAlt } from 'react-icons/fa';
import { fmtDate } from './doctorShared';


/* ═══════════════════ PATIENTS TAB ══════════════════════════════ */
export default function PatientsTab({ apts }) {
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
                        <pre className="mb-0 text-muted extra-small lh-base" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{h.prescription}</pre>
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
