import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Nav } from 'react-bootstrap';
import { FaStar } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';


/* ═══════════════ TAB 8 – RESOLUTION & AUDITS ═════════════════ */
export default function AuditsTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState('suggestions'); // 'suggestions' | 'doctors' | 'pharmacies'

  const [feedbacks, setFeedbacks] = useState([]);
  const [docReports, setDocReports] = useState([]);
  const [pharmReviews, setPharmReviews] = useState([]);
  const [pharmReports, setPharmReports] = useState([]);

  const loadAllAudits = () => {
    try {
      const fb = JSON.parse(localStorage.getItem('medeasy_feedbacks') || '[]');
      const dr = JSON.parse(localStorage.getItem('medeasy_doctor_reports') || '[]');
      const pr = JSON.parse(localStorage.getItem('medeasy_pharmacy_reviews') || '[]');
      const prep = JSON.parse(localStorage.getItem('medeasy_pharmacy_reports') || '[]');

      // sort by time descending
      setFeedbacks(fb.sort((a,b) => b.time - a.time));
      setDocReports(dr.sort((a,b) => b.time - a.time));
      setPharmReviews(pr.sort((a,b) => b.time - a.time));
      setPharmReports(prep.sort((a,b) => b.time - a.time));
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAllAudits();
    const interval = setInterval(loadAllAudits, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveFeedback = (id) => {
    try {
      const fb = JSON.parse(localStorage.getItem('medeasy_feedbacks') || '[]');
      const updated = fb.filter(item => item.id !== id);
      localStorage.setItem('medeasy_feedbacks', JSON.stringify(updated));
      setFeedbacks(updated);
      toast.success('Platform suggestion marked as reviewed.');
    } catch {
      toast.error('Operation failed.');
    }
  };

  const handleResolveDocReport = (id, action = 'resolve') => {
    try {
      const dr = JSON.parse(localStorage.getItem('medeasy_doctor_reports') || '[]');
      const updated = dr.map(item => {
        if (item.id === id) {
          return { ...item, status: 'resolved', resolutionAction: action };
        }
        return item;
      });
      localStorage.setItem('medeasy_doctor_reports', JSON.stringify(updated));
      setDocReports(updated);

      const target = dr.find(item => item.id === id);

      if (action === 'sanction') {
        toast.warn(`Doctor ${target?.doctorName} has been sanctioned. Clinical account placed under suspension.`);
        // Send notification alert to the Doctor
        const key = 'medeasy_notifications_' + target?.doctorId;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        alerts.unshift({
          id: 'alert-' + Date.now() + '-doc',
          text: `Platform Action: Your medical clinic account has been temporarily suspended by the Admin due to a clinical complaint regarding Appointment #APT-${target?.appointmentId}. Please contact medical support.`,
          time: Date.now(),
          emoji: 'complaint',
          unread: true,
          link: '/doctor'
        });
        localStorage.setItem(key, JSON.stringify(alerts));
      } else {
        toast.success('Clinical complaint has been successfully resolved.');
      }
    } catch {
      toast.error('Operation failed.');
    }
  };

  const handleResolvePharmReport = (id, action = 'resolve') => {
    try {
      const prep = JSON.parse(localStorage.getItem('medeasy_pharmacy_reports') || '[]');
      const updated = prep.map(item => {
        if (item.id === id) {
          return { ...item, status: 'resolved', resolutionAction: action };
        }
        return item;
      });
      localStorage.setItem('medeasy_pharmacy_reports', JSON.stringify(updated));
      setPharmReports(updated);

      const target = prep.find(item => item.id === id);

      if (action === 'sanction') {
        toast.warn(`Pharmacy store has been sanctioned. Store representative verification suspended.`);
        // Send notification alert to Pharmacy Representative
        const key = 'medeasy_notifications_pharmacist';
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        alerts.unshift({
          id: 'alert-' + Date.now() + '-pharm',
          text: `Platform Action: Your pharmacy store and pharmacist representative verification has been suspended due to fulfillment complaint regarding Order #${target?.orderId}.`,
          time: Date.now(),
          emoji: 'complaint',
          unread: true,
          link: '/pharmacist'
        });
        localStorage.setItem(key, JSON.stringify(alerts));
      } else {
        toast.success('Pharmacy logistics complaint resolved.');
      }
    } catch {
      toast.error('Operation failed.');
    }
  };

  const handleResolveReview = (id) => {
    try {
      const pr = JSON.parse(localStorage.getItem('medeasy_pharmacy_reviews') || '[]');
      const updated = pr.filter(item => item.id !== id);
      localStorage.setItem('medeasy_pharmacy_reviews', JSON.stringify(updated));
      setPharmReviews(updated);
      toast.success('Pharmacy rating reviewed and archived.');
    } catch {
      toast.error('Operation failed.');
    }
  };

  return (
    <div className="adm-audits mt-3 animate-fade-in">
      {/* Sub-tabs Nav */}
      <Nav variant="pills" className="mb-4 bg-light p-1.5 rounded-3 d-inline-flex gap-2">
        <Nav.Item>
          <Nav.Link 
            active={subTab === 'suggestions'} 
            onClick={() => setSubTab('suggestions')}
            className="small px-4 py-2 fw-semibold rounded-3"
            style={{ cursor: 'pointer' }}
          >
            💡 Suggestions & Feedbacks ({feedbacks.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={subTab === 'doctors'} 
            onClick={() => setSubTab('doctors')}
            className="small px-4 py-2 fw-semibold rounded-3"
            style={{ cursor: 'pointer' }}
          >
            🩺 Doctor Audits ({docReports.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={subTab === 'pharmacies'} 
            onClick={() => setSubTab('pharmacies')}
            className="small px-4 py-2 fw-semibold rounded-3"
            style={{ cursor: 'pointer' }}
          >
            🏪 Pharmacy Audits ({pharmReports.length + pharmReviews.length})
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Sub-tab 1: Platform Suggestions */}
      {subTab === 'suggestions' && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light text-secondary small">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Rating</th>
                  <th className="py-3">Subject & Suggestions</th>
                  <th className="py-3">Date</th>
                  <th className="px-4 py-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="small">
                {feedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      No platform suggestions or feedbacks submitted yet.
                    </td>
                  </tr>
                ) : (
                  feedbacks.map(f => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 fw-bold text-dark">{f.patientName}<br/><span className="text-muted extra-small">{f.patientEmail}</span></td>
                      <td className="py-3">
                        <Badge bg={f.feedbackType === 'bug' ? 'danger' : f.feedbackType === 'compliment' ? 'success' : 'info'} className="text-capitalize">
                          {f.feedbackType}
                        </Badge>
                      </td>
                      <td className="py-3 fw-semibold text-warning">
                        {[...Array(f.rating)].map((_, idx) => <FaStar key={idx} className="me-1" />)}
                      </td>
                      <td className="py-3">
                        <strong className="text-dark d-block mb-1">{f.subject}</strong>
                        <span className="text-muted d-block leading-relaxed" style={{ maxWidth: '400px' }}>{f.message}</span>
                      </td>
                      <td className="py-3 text-muted">{new Date(f.time).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-end">
                        <Button variant="outline-success" size="sm" className="rounded-pill px-3" onClick={() => handleResolveFeedback(f.id)}>
                          Mark Reviewed
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Sub-tab 2: Doctor Clinical Audits */}
      {subTab === 'doctors' && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light text-secondary small">
                <tr>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="py-3">Doctor / Clinic</th>
                  <th className="py-3">Appointment ID</th>
                  <th className="py-3">Issue Category</th>
                  <th className="py-3">Complaint Details</th>
                  <th className="py-3">Status</th>
                  <th className="px-4 py-3 text-end">Resolution Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {docReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No clinical reports against doctors found.
                    </td>
                  </tr>
                ) : (
                  docReports.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 fw-bold text-dark">{r.patientName}<br/><span className="text-muted extra-small">{r.patientEmail}</span></td>
                      <td className="py-3"><strong>{r.doctorName}</strong><br/><span className="text-muted extra-small">{r.specialty}</span></td>
                      <td className="py-3"><code>#APT-{r.appointmentId}</code></td>
                      <td className="py-3">
                        <Badge bg="danger" className="text-uppercase small" style={{ fontSize: '0.65rem' }}>
                          {r.issueType}
                        </Badge>
                      </td>
                      <td className="py-3"><span className="text-muted d-block leading-relaxed" style={{ maxWidth: '300px' }}>{r.details}</span></td>
                      <td className="py-3">
                        <Badge bg={r.status === 'resolved' ? 'success' : 'warning'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-end">
                        {r.status !== 'resolved' ? (
                          <div className="d-flex justify-content-end gap-1.5">
                            <Button variant="outline-success" size="sm" className="rounded-8 px-2.5" onClick={() => handleResolveDocReport(r.id, 'resolve')}>
                              Resolve
                            </Button>
                            <Button variant="danger" size="sm" className="rounded-8 px-2.5 text-white" onClick={() => handleResolveDocReport(r.id, 'sanction')}>
                              Sanction
                            </Button>
                          </div>
                        ) : (
                          <span className="text-success fw-bold d-inline-flex align-items-center gap-1">
                            Resolved {r.resolutionAction === 'sanction' && <Badge bg="danger">Sanctioned</Badge>}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Sub-tab 3: Pharmacy Audits */}
      {subTab === 'pharmacies' && (
        <div className="d-flex flex-column gap-4 animate-fade-in">
          {/* Section A: Pharmacy Complaints */}
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white border-0 py-3 px-4">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                ⚠️ Formal Logistics & Fulfillment Complaints
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light text-secondary small">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="py-3">Pharmacy / Order</th>
                    <th className="py-3">Issue Category</th>
                    <th className="py-3">Description</th>
                    <th className="py-3">Status</th>
                    <th className="px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {pharmReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No logistics reports against pharmacies.
                      </td>
                    </tr>
                  ) : (
                    pharmReports.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 fw-bold text-dark">{r.patientName}<br/><span className="text-muted extra-small">{r.patientEmail}</span></td>
                        <td className="py-3"><strong>{r.pharmacyName}</strong><br/><span className="text-muted extra-small">Order #{r.orderId}</span></td>
                        <td className="py-3">
                          <Badge bg="danger" className="text-uppercase" style={{ fontSize: '0.65rem' }}>
                            {r.issueType}
                          </Badge>
                        </td>
                        <td className="py-3"><span className="text-muted d-block leading-relaxed" style={{ maxWidth: '300px' }}>{r.details}</span></td>
                        <td className="py-3">
                          <Badge bg={r.status === 'resolved' ? 'success' : 'warning'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-end">
                          {r.status !== 'resolved' ? (
                            <div className="d-flex justify-content-end gap-1.5">
                              <Button variant="outline-success" size="sm" className="rounded-8 px-2.5" onClick={() => handleResolvePharmReport(r.id, 'resolve')}>
                                Resolve
                              </Button>
                              <Button variant="danger" size="sm" className="rounded-8 px-2.5 text-white" onClick={() => handleResolvePharmReport(r.id, 'sanction')}>
                                Sanction
                              </Button>
                            </div>
                          ) : (
                            <span className="text-success fw-bold">
                              Resolved {r.resolutionAction === 'sanction' && <Badge bg="danger">Sanctioned</Badge>}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Section B: Pharmacy Reviews */}
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white border-0 py-3 px-4">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <FaStar className="text-warning" /> Pharmacy Experience & Pharmacist Behavior Ratings
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light text-secondary small">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="py-3">Order ID</th>
                    <th className="py-3">Fulfillment Partner</th>
                    <th className="py-3">Rating</th>
                    <th className="py-3">Comments</th>
                    <th className="px-4 py-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {pharmReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No pharmacy delivery reviews left yet.
                      </td>
                    </tr>
                  ) : (
                    pharmReviews.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 fw-bold text-dark">{r.patientName}<br/><span className="text-muted extra-small">{r.patientEmail}</span></td>
                        <td className="py-3"><code>#{r.orderId}</code></td>
                        <td className="py-3"><strong>{r.pharmacyName}</strong></td>
                        <td className="py-3 fw-semibold text-warning">{'★'.repeat(r.rating)}</td>
                        <td className="py-3"><span className="text-muted d-block leading-relaxed" style={{ maxWidth: '300px' }}>{r.comment}</span></td>
                        <td className="px-4 py-3 text-end">
                          <Button variant="outline-success" size="sm" className="rounded-pill px-3" onClick={() => handleResolveReview(r.id)}>
                            Archive Review
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
}
