import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Badge, Form, Spinner, Alert } from 'react-bootstrap';
import { FaExclamationTriangle, FaUserShield, FaUserCheck } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../services/api/client';
import { serverUrl } from './pharmacistShared';


/* ═══════════════════ PHARMACIST REPRESENTATIVE SUB-PAGE ═══════ */
export default function PharmacistRepPage() {
  const { user, updatePharmacistDetails, removePharmacistDetails } = useAuth();
  const { toast } = useToast();

  const details = useMemo(() => user?.pharmacistDetails || { status: 'none' }, [user?.pharmacistDetails]);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [degreeName, setDegreeName] = useState('');
  const [degreePlace, setDegreePlace] = useState('');
  const [photo, setPhoto] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repPassword, setRepPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Populate form if editing or details exist
  useEffect(() => {
    if (details.status !== 'none') {
      setName(details.name || '');
      setAge(details.age || '');
      setLicenseNumber(details.licenseNumber || '');
      setDegreeName(details.degreeName || '');
      setDegreePlace(details.degreePlace || '');
      setPhoto(details.photo || '');
      setRepEmail(details.email || '');
      // Do not pre-fill password for security — the owner must re-enter it if updating
    }
  }, [details]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pharmacistPhoto', file);

    setUploading(true);
    try {
      const { data } = await api.post('/auth/upload-pharmacist-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPhoto(data.filePath);
      toast.success('Pharmacist representative photo uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !licenseNumber || !age || !degreeName || !degreePlace || !photo) {
      toast.error('Please fill in all details, including uploading a profile photo.');
      return;
    }
    if (!repEmail || !repEmail.includes('@')) {
      toast.error('A valid login email address is required for the pharmacist representative.');
      return;
    }
    const isNew = details.status === 'none';
    if (isNew && (!repPassword || repPassword.length < 6)) {
      toast.error('An access password of at least 6 characters is required for the pharmacist representative.');
      return;
    }
    if (repPassword && repPassword.length > 0 && repPassword.length < 6) {
      toast.error('The new access password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await updatePharmacistDetails({
        name,
        photo,
        licenseNumber,
        age: Number(age),
        degreeName,
        degreePlace,
        email: repEmail,
        password: repPassword,
      });
      toast.success('Pharmacist representative details submitted for verification!');

      // Create admin notification (using isolated admin notification key)
      try {
        const adminKey = 'medeasy_notifications_admin';
        const rawAlerts = localStorage.getItem(adminKey) || '[]';
        const alerts = JSON.parse(rawAlerts);
        alerts.unshift({
          id: 'alert-' + Date.now() + '-admin',
          text: `New Pharmacist Representative: Pharmacy "${user?.name || 'Pharmacy'}" submitted pharmacist "${name}" for administrative audit.`,
          time: Date.now(),
          emoji: 'prescription',
          unread: true,
          link: '/admin'
        });
        localStorage.setItem(adminKey, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to submit details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove this pharmacist representative? This will reset your verification badge.')) return;
    setLoading(true);
    try {
      await removePharmacistDetails();
      toast.success('Representative removed.');
      setName('');
      setAge('');
      setLicenseNumber('');
      setDegreeName('');
      setDegreePlace('');
      setPhoto('');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to remove representative.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render Form ──
  if (details.status === 'none' || isEditing) {
    return (
      <Card className="ph-glass-card shadow-lg border-0 p-4 rounded-4 animate-fade-in">
        <Card.Body>
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="ph-glass-icon bg-primary-light text-primary" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
              <FaUserShield size={24} />
            </div>
            <div>
              <h5 className="fw-bold mb-1 text-dark">Pharmacist Representative Credentials</h5>
              <p className="text-muted extra-small mb-0">Provide the credentials of your licensed pharmacist to display a verified representative badge.</p>
            </div>
          </div>

          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              {/* Photo Upload Box */}
              <Col md={12} className="mb-2">
                <Form.Label className="fw-semibold small text-dark">Pharmacist Professional Photo *</Form.Label>
                <div className="d-flex align-items-center gap-4 p-3 border rounded-3 bg-white">
                  <div className="position-relative" style={{ width: 80, height: 80 }}>
                    {photo ? (
                      <img src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `${serverUrl}${photo}`} alt="Pharmacist representative avatar" className="rounded-circle border w-100 h-100 object-fit-cover shadow-sm" />
                    ) : (
                      <div className="rounded-circle border w-100 h-100 bg-light d-flex align-items-center justify-content-center text-muted fw-bold" style={{ fontSize: '1.5rem' }}>
                        ?
                      </div>
                    )}
                    {uploading && (
                      <div className="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center">
                        <Spinner animation="border" size="sm" className="text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <Form.Control type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading || loading} />
                    <Form.Text className="text-muted extra-small">Upload a clear passport size face photo (JPEG/PNG).</Form.Text>
                  </div>
                </div>
              </Col>

              {/* Full Name */}
              <Col md={6}>
                <Form.Group controlId="pharmacistName">
                  <Form.Label className="small fw-semibold text-dark">Pharmacist Full Name *</Form.Label>
                  <Form.Control type="text" placeholder="Dr. Zainab Fatima" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* Age */}
              <Col md={6}>
                <Form.Group controlId="pharmacistAge">
                  <Form.Label className="small fw-semibold text-dark">Age (Years) *</Form.Label>
                  <Form.Control type="number" min="18" max="100" placeholder="e.g. 28" value={age} onChange={e => setAge(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* PCP License Number */}
              <Col md={6}>
                <Form.Group controlId="pharmacistLicense">
                  <Form.Label className="small fw-semibold text-dark">Pharmacy Council (PCP) Reg # *</Form.Label>
                  <Form.Control type="text" placeholder="e.g. PCP-77392-P" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* Degree Title */}
              <Col md={6}>
                <Form.Group controlId="pharmacistDegree">
                  <Form.Label className="small fw-semibold text-dark">Degree Title *</Form.Label>
                  <Form.Select value={degreeName} onChange={e => setDegreeName(e.target.value)} required disabled={loading}>
                    <option value="">Select Degree...</option>
                    <option value="Pharm.D">Pharm.D (Doctor of Pharmacy)</option>
                    <option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option>
                    <option value="M.Phil Pharmacy">M.Phil (Master of Philosophy)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Degree Place */}
              <Col md={12}>
                <Form.Group controlId="pharmacistInstitution">
                  <Form.Label className="small fw-semibold text-dark">Institution / University Name *</Form.Label>
                  <Form.Control type="text" placeholder="e.g. Punjab University College of Pharmacy" value={degreePlace} onChange={e => setDegreePlace(e.target.value)} required disabled={loading} />
                </Form.Group>
              </Col>

              {/* Sub-Account Login Credentials Section */}
              <Col md={12}>
                <div className="d-flex align-items-center gap-2 py-2 border-top mt-2">
                  <span style={{ fontSize: '1rem' }}>🔐</span>
                  <div>
                    <div className="fw-semibold text-dark small">Login Credentials for Pharmacist</div>
                    <div className="text-muted" style={{ fontSize: '0.73rem' }}>These credentials allow the hired pharmacist to log in independently once verified by Admin.</div>
                  </div>
                </div>
              </Col>

              {/* Pharmacist Rep Email */}
              <Col md={6}>
                <Form.Group controlId="repEmail">
                  <Form.Label className="small fw-semibold text-dark">Login Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="e.g. zainab.pharmacist@medeasy.com"
                    value={repEmail}
                    onChange={e => setRepEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '0.72rem' }}>The pharmacist will use this email to sign in.</Form.Text>
                </Form.Group>
              </Col>

              {/* Pharmacist Rep Password */}
              <Col md={6}>
                <Form.Group controlId="repPassword">
                  <Form.Label className="small fw-semibold text-dark">Access Password *</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={repPassword}
                      onChange={e => setRepPassword(e.target.value)}
                      required
                      disabled={loading}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      className="position-absolute top-50 end-0 translate-middle-y me-2 btn btn-link btn-sm p-0 text-muted"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <Form.Text className="text-muted" style={{ fontSize: '0.72rem' }}>They will use this to access their dashboard. {details.status !== 'none' ? 'Leave blank to keep existing password.' : ''}</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              {isEditing && (
                <Button variant="outline-secondary" onClick={() => setIsEditing(false)} disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button type="submit" className="btn-ph-save px-4" disabled={loading || uploading}>
                {loading ? <Spinner size="sm" animation="border" /> : 'Submit for Admin Audit'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    );
  }

  // ── Render Details (Pending, Approved, Declined) ──
  const isPending = details.status === 'pending';
  const isApproved = details.status === 'approved';
  const isDeclined = details.status === 'declined';

  return (
    <div className="pharmacist-rep-view animate-fade-in">
      <Row className="g-4">
        {/* Representative Card */}
        <Col lg={8}>
          <Card className={`ph-glass-card shadow-lg border-0 rounded-4 overflow-hidden ${isApproved ? 'rep-card-approved' : ''}`} style={isApproved ? { borderLeft: '5px solid var(--color-warning-600)' } : {}}>
            <Card.Body className="p-4">
              {/* Incomplete data warning */}
              {(!details.photo || !details.age || !details.degreeName || !details.degreePlace) && (
                <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 mb-3 small">
                  <FaExclamationTriangle className="flex-shrink-0" />
                  <span>Some details are missing or incomplete. Click <strong>Update Details</strong> below to fill them in and resubmit for verification.</span>
                </Alert>
              )}
              <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-start gap-4">
                {/* Photo with dynamic badge overlay */}
                <div className="position-relative" style={{ width: 120, height: 120 }}>
                  {details.photo ? (
                    <img
                      src={details.photo.startsWith('data:') || details.photo.startsWith('http') ? details.photo : `${serverUrl}${details.photo}`}
                      alt={details.name}
                      className="rounded-circle border w-100 h-100 object-fit-cover shadow"
                      onError={e => {
                        // If the stored URL is broken, fall back to initials avatar
                        e.target.style.display = 'none';
                        e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                      }}
                    />
                  ) : null}
                  {/* Fallback initials avatar — shown when no photo or image fails to load */}
                  <div
                    className="rounded-circle border w-100 h-100 bg-primary d-flex align-items-center justify-content-center text-white fw-bold shadow"
                    style={{
                      fontSize: '2rem',
                      display: details.photo ? 'none' : 'flex',
                    }}
                  >
                    {(details.name || 'P')[0].toUpperCase()}
                  </div>
                  {isApproved && (
                    <div className="position-absolute bottom-0 end-0 bg-warning text-white rounded-circle shadow border border-white d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, fontSize: '1rem' }} title="Verified representative">
                      🌟
                    </div>
                  )}
                </div>

                <div className="flex-grow-1 text-center text-sm-start">
                  <div className="d-flex align-items-center justify-content-center justify-content-sm-start gap-2 mb-1">
                    <h4 className="fw-bold text-dark mb-0">{details.name}</h4>
                    {isApproved && <Badge bg="warning" className="text-dark small d-flex align-items-center gap-1"><FaUserCheck /> Verified Rep</Badge>}
                    {isPending && <Badge bg="info" className="small">Awaiting Audit</Badge>}
                    {isDeclined && <Badge bg="danger" className="small">Audit Declined</Badge>}
                  </div>
                  <p className="text-muted small mb-3">
                    {details.degreeName || <span className="text-warning">Degree not set</span>}
                    {details.age ? ` | Age: ${details.age} Years` : ''}
                  </p>

                  <Row className="g-3 bg-light p-3 rounded-3 mb-3 border text-start">
                    <Col xs={6} md={6}>
                      <span className="text-muted extra-small d-block">PCP LICENSE NUMBER</span>
                      <strong className="text-dark small">{details.licenseNumber}</strong>
                    </Col>
                    <Col xs={6} md={6}>
                      <span className="text-muted extra-small d-block">GRADUATED FROM</span>
                      <strong className="text-dark small">{details.degreePlace}</strong>
                    </Col>
                    {details.email && (
                      <Col xs={12}>
                        <div className="d-flex align-items-center gap-2 p-2 bg-warning-subtle rounded-3 border border-warning-subtle">
                          <span>🔐</span>
                          <div>
                            <span className="text-muted extra-small d-block">PHARMACIST LOGIN EMAIL</span>
                            <strong className="text-dark small">{details.email}</strong>
                          </div>
                          <Badge bg="success" className="ms-auto small">Active Credentials</Badge>
                        </div>
                      </Col>
                    )}
                  </Row>

                  <div className="d-flex gap-2 justify-content-center justify-content-sm-start">
                    <Button variant="outline-primary" size="sm" onClick={() => setIsEditing(true)} disabled={loading}>
                      Update Details
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={handleRemove} disabled={loading}>
                      Remove Pharmacist
                    </Button>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Status Notice Panel */}
        <Col lg={4}>
          {isPending && (
            <Card className="border-0 shadow-sm bg-info-light h-100 rounded-4">
              <Card.Body className="p-4 d-flex flex-column justify-content-center text-center text-lg-start">
                <div className="ph-timeline-badge bg-info mb-3 mx-auto mx-lg-0" style={{ width: 12, height: 12 }}></div>
                <h5 className="fw-bold text-info-dark mb-2">Verification In Progress</h5>
                <p className="extra-small text-muted mb-0 leading-relaxed">
                  Your representative's academic credentials and Pharmacy Council registration certificate are currently under administrator audit. 
                  Once verified, a shiny gold badge will be applied next to their name. You can still use the rest of your dashboard to fulfill orders.
                </p>
              </Card.Body>
            </Card>
          )}

          {isApproved && (
            <Card className="border-0 shadow-sm bg-success-light h-100 rounded-4">
              <Card.Body className="p-4 d-flex flex-column justify-content-center text-center text-lg-start">
                <div className="ph-timeline-badge bg-success mb-3 mx-auto mx-lg-0" style={{ width: 12, height: 12 }}></div>
                <h5 className="fw-bold text-success-dark mb-2">Verification Approved!</h5>
                <p className="extra-small text-muted mb-0 leading-relaxed">
                  Excellent! This pharmacist representative is officially verified. Patients visiting your listed inventory items will see a golden representative badge showing that their orders are backed by a certified clinical pharmacist.
                </p>
              </Card.Body>
            </Card>
          )}

          {isDeclined && (
            <Card className="border-0 shadow-sm bg-danger-light h-100 rounded-4">
              <Card.Body className="p-4 d-flex flex-column justify-content-center text-center text-lg-start">
                <div className="ph-timeline-badge bg-danger mb-3 mx-auto mx-lg-0" style={{ width: 12, height: 12 }}></div>
                <h5 className="fw-bold text-danger-dark mb-2">Audit Failed</h5>
                <p className="extra-small text-muted mb-3 leading-relaxed">
                  We were unable to verify the pharmacist details provided. 
                  <br />
                  <strong className="text-danger d-block mt-2">Reason: {details.declineReason || 'Invalid PMC/PCP license registration.'}</strong>
                </p>
                <Button variant="danger" size="sm" onClick={() => setIsEditing(true)} className="w-100 mt-2">
                  Update & Resubmit
                </Button>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
