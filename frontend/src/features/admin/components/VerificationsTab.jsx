import { useState } from 'react';
import api from '../../../services/api/client';
import { Row, Col, Card, Table, Badge, Button, Modal } from 'react-bootstrap';
import { FaFileMedical, FaDownload, FaCheckCircle, FaUserCheck } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';
import { pdfPlaceholder, serverUrl } from './adminShared';


/* ═══════════════ TAB 1.5 – PROFESSIONAL VERIFICATIONS ════════ */
export default function VerificationsTab({ users, setUsers }) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  // Filter professionals whose profiles are NOT verified yet, or pharmacies with pending pharmacist audits
  const pending = users.filter(u => {
    const emailStr = u.email || '';
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                        emailStr.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    if (u.role === 'doctor' || u.role === 'pharmacist') {
      return u.isVerifiedProfile === false;
    }
    if (u.role === 'pharmacy') {
      return u.pharmacistDetails?.status === 'pending';
    }
    return false;
  });

  const handleApprove = async (id) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    
    try {
      const isRealDbUser = typeof id === 'string' && id.length === 24; // Mongo id is 24 chars string
      if (isRealDbUser) {
        await api.put(`/admin/users/${id}/approve`);
      }
      
      setUsers(prev => prev.map(u => u.id === id 
        ? { 
            ...u, 
            isVerifiedProfile: true,
            pharmacistDetails: u.pharmacistDetails ? { ...u.pharmacistDetails, status: 'approved' } : undefined
          } 
        : u
      ));
      
      toast.success(`Success! ${target.name} has been verified and approved.`);

      // Create notification
      try {
        const key = 'medeasy_notifications_' + target.id;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        if (target.role === 'pharmacy') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Pharmacist Representative Approved! Your store representative ${target.pharmacistDetails?.name || 'pharmacist'} is now verified and active.`,
            time: Date.now(),
            emoji: 'welcome',
            unread: true,
            link: '/pharmacist'
          });
        } else if (target.role === 'doctor') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Congratulations Dr. ${target.name}! Your professional clinical profile has been verified and approved.`,
            time: Date.now(),
            emoji: 'booking',
            unread: true,
            link: '/doctor'
          });
        }
        localStorage.setItem(key, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

      setShowModal(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve credentials.');
    }
  };

  const handleReject = async (id) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    
    const reason = window.prompt(`Provide a decline reason for ${target.name}:`, 'Credentials did not pass our audit.');
    if (reason === null) return; // cancelled prompt
    
    try {
      const isRealDbUser = typeof id === 'string' && id.length === 24;
      if (isRealDbUser) {
        await api.put(`/admin/users/${id}/decline`, { reason });
      }
      
      setUsers(prev => prev.map(u => u.id === id
        ? {
            ...u,
            pharmacistDetails: u.pharmacistDetails ? { ...u.pharmacistDetails, status: 'declined', declineReason: reason } : undefined
          }
        : u
      ));
      
      toast.error(`Credentials for ${target.name} declined.`);

      // Create notification
      try {
        const key = 'medeasy_notifications_' + target.id;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        if (target.role === 'pharmacy') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Pharmacist Representative Declined: ${reason}. Please update your representative details.`,
            time: Date.now(),
            emoji: 'cancel',
            unread: true,
            link: '/pharmacist'
          });
        } else if (target.role === 'doctor') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Professional Profile Declined: ${reason}. Please review and re-verify your documents.`,
            time: Date.now(),
            emoji: 'cancel',
            unread: true,
            link: '/profile'
          });
        }
        localStorage.setItem(key, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

      setShowModal(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline credentials.');
    }
  };

  const openDetailsModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaUserCheck className="me-2 text-warning" /> Professional Account Auditing</h5>
        <div className="adm-user-summary">
          <span className="adm-user-total">{pending.length} pending requests</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="adm-toolbar mb-3">
        <input className="adm-search" placeholder="Search pending professionals by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="adm-table-wrap">
        <Table hover responsive className="adm-table">
          <thead>
            <tr>
              <th>#ID</th>
              <th>Applicant</th>
              <th>Role</th>
              <th>Academic Credentials</th>
              <th>PMC/PCP License</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-5">
                  <div className="d-flex flex-column align-items-center gap-2">
                    <FaCheckCircle size={40} className="text-success mb-2" />
                    <h6 className="fw-bold text-dark">All Caught Up!</h6>
                    <p className="extra-small text-muted mb-0">No professional registrations are currently pending verification.</p>
                  </div>
                </td>
              </tr>
            )}
            {pending.map((u) => (
              <tr key={u.id}>
                <td className="text-muted small">#U-{u.id}</td>
                <td>
                  <div className="adm-user-cell">
                    <div className="adm-user-av" style={{background: u.role === 'doctor' ? 'var(--color-violet-500)' : 'var(--color-accent-500)'}}>
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="adm-user-name">{u.name}</div>
                      <div className="adm-user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge bg={u.role === 'doctor' ? 'info' : 'success'} className="cat-badge text-capitalize">
                    {u.role}
                  </Badge>
                </td>
                <td>
                  <div className="fw-bold small">{u.degree || u.degreeName || '—'}</div>
                  <div className="text-muted extra-small">{u.degreePlace || '—'}</div>
                </td>
                <td>
                  <code>{u.pmcRegistration || u.licenseNumber || '—'}</code>
                </td>
                <td className="text-muted small">
                  {u.pharmacyLocation || u.clinicAddress || u.address || '—'}
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-primary" onClick={() => openDetailsModal(u)}>
                      View Details
                    </Button>
                    <Button size="sm" variant="success" className="py-1" onClick={() => handleApprove(u.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleReject(u.id)}>
                      Decline
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Details Audit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title className="fw-bold">
            <FaUserCheck className="me-2 text-warning" /> 
            Professional Credentials Audit
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedUser && (
            <div>
              {/* Profile Card Header */}
              <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                <div className="adm-user-av" style={{ width: 64, height: 64, fontSize: '1.75rem', background: selectedUser.role === 'doctor' ? 'var(--color-violet-500)' : 'var(--color-accent-500)' }}>
                  {selectedUser.name[0]}
                </div>
                <div>
                  <h4 className="fw-bold text-dark mb-1">{selectedUser.name}</h4>
                  <p className="text-muted mb-0 small">{selectedUser.email} | Phone: {selectedUser.phone || 'N/A'}</p>
                  <Badge bg={selectedUser.role === 'doctor' ? 'info' : 'success'} className="cat-badge text-capitalize mt-2">
                    Pending {selectedUser.role} Profile Verification
                  </Badge>
                </div>
              </div>

              {/* Detail Panels */}
              <Row className="g-4">
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm bg-light">
                    <Card.Body>
                      <h6 className="fw-bold text-primary mb-3">
                        {selectedUser.role === 'pharmacy' ? 'Pharmacist Credentials' : 'Academic & Experience'}
                      </h6>
                      {selectedUser.role === 'pharmacy' && (
                        <>
                          {selectedUser.pharmacistDetails?.photo && (
                            <div className="mb-3">
                              <span className="text-muted extra-small d-block mb-2">PHARMACIST PHOTO</span>
                              <img src={selectedUser.pharmacistDetails.photo.startsWith('data:') || selectedUser.pharmacistDetails.photo.startsWith('http') ? selectedUser.pharmacistDetails.photo : `${serverUrl}${selectedUser.pharmacistDetails.photo}`} alt="Pharmacist representative" className="rounded border object-fit-cover shadow-sm" style={{ width: 70, height: 70, objectFit: 'cover' }} />
                            </div>
                          )}
                          <div className="mb-2">
                            <span className="text-muted extra-small d-block">LICENSED PHARMACIST</span>
                            <strong className="text-dark small">
                              {selectedUser.pharmacistDetails?.name || selectedUser.pharmacistName || '—'}
                              {selectedUser.pharmacistDetails?.age && ` (Age: ${selectedUser.pharmacistDetails.age} years)`}
                            </strong>
                          </div>
                        </>
                      )}
                      <div className="mb-2">
                        <span className="text-muted extra-small d-block">DEGREE TITLE</span>
                        <strong className="text-dark small">{selectedUser.pharmacistDetails?.degreeName || selectedUser.degree || selectedUser.degreeName || '—'}</strong>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted extra-small d-block">INSTITUTION</span>
                        <strong className="text-dark small">{selectedUser.pharmacistDetails?.degreePlace || selectedUser.degreePlace || '—'}</strong>
                      </div>
                      {selectedUser.role === 'doctor' && (
                        <>
                          <div className="mb-2">
                            <span className="text-muted extra-small d-block">SPECIALTY</span>
                            <strong className="text-dark small">{selectedUser.specialty || '—'}</strong>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted extra-small d-block">PRACTICE EXPERIENCE</span>
                            <strong className="text-dark small">{selectedUser.experience || 0} Years</strong>
                          </div>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm bg-light">
                    <Card.Body>
                      <h6 className="fw-bold text-primary mb-3">
                        {selectedUser.role === 'pharmacy' ? 'Pharmacy Details' : 'Professional Licensing'}
                      </h6>
                      {selectedUser.role === 'pharmacy' && (
                        <div className="mb-2">
                          <span className="text-muted extra-small d-block">STORE NAME</span>
                          <strong className="text-dark small">{selectedUser.pharmacyName || '—'}</strong>
                        </div>
                      )}
                      <div className="mb-3">
                        <span className="text-muted extra-small d-block">
                          {selectedUser.role === 'pharmacy' ? 'PCP REGISTRATION / LICENSE' : 'LICENSE / PMC REGISTRATION'}
                        </span>
                        <code className="fs-6 fw-bold text-danger">{selectedUser.pharmacistDetails?.licenseNumber || selectedUser.pmcRegistration || selectedUser.licenseNumber || '—'}</code>
                      </div>
                      <div className="mb-3">
                        <span className="text-muted extra-small d-block">PRACTICE LOCATION</span>
                        <strong className="text-dark small">{selectedUser.pharmacyLocation || selectedUser.clinicAddress || selectedUser.address || '—'}</strong>
                      </div>
                      {selectedUser.role === 'doctor' && (
                        <div className="mb-2">
                          <span className="text-muted extra-small d-block">CONSULTATION FEE</span>
                          <strong className="text-dark small">Rs. {selectedUser.consultationFee?.toLocaleString() || 0}</strong>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                {/* Uploaded Documents & Picture Preview Attachment */}
                <Col md={12}>
                  <Card className="border-0 shadow-sm bg-light">
                    <Card.Body>
                      {selectedUser.role === 'pharmacy' && selectedUser.pharmacyOutsidePicture && (
                        <div className="mb-4 pb-3 border-bottom">
                          <span className="text-muted extra-small d-block mb-2 fw-semibold">PHARMACY OUTSIDE SHOP PICTURE</span>
                          <div className="position-relative overflow-hidden rounded border bg-white p-2" style={{ maxWidth: '100%', maxHeight: '300px', display: 'inline-block' }}>
                            <img 
                              src={selectedUser.pharmacyOutsidePicture.startsWith('data:') || selectedUser.pharmacyOutsidePicture.startsWith('http') ? selectedUser.pharmacyOutsidePicture : `${serverUrl}${selectedUser.pharmacyOutsidePicture}`} 
                              alt="Pharmacy Outside View" 
                              className="img-fluid rounded"
                              style={{ maxHeight: '280px', objectFit: 'contain', transition: 'transform 0.3s' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          </div>
                        </div>
                      )}
                      <h6 className="fw-bold text-primary mb-3">Uploaded Verification Proofs</h6>
                      <div className="p-3 border rounded bg-white d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <FaFileMedical className="text-danger" size={32} />
                          <div>
                            <strong className="d-block small">Professional_License_Certificate.pdf</strong>
                            <span className="text-muted extra-small">Digitally signed & hashed (2.4 MB)</span>
                          </div>
                        </div>
                        <Button variant="outline-secondary" size="sm" onClick={() => pdfPlaceholder('Professional License')}>
                          <FaDownload className="me-1" /> View PDF
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Footer Actions */}
              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="outline-danger" onClick={() => handleReject(selectedUser.id)}>Decline Applicant</Button>
                <Button variant="success" className="px-4" onClick={() => handleApprove(selectedUser.id)}>Verify & Approve</Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
