import { useState, useEffect } from 'react';
import { Container, Card, Row, Col, ListGroup, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { 
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaEdit, FaCheckCircle, 
  FaExclamationTriangle, FaHospital, FaCalendarCheck, FaGraduationCap, 
  FaRegAddressCard, FaDollarSign, FaUserMd, FaHourglassHalf, FaCalendarDay,
  FaCamera
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Profile.css';

// Specialty choices for Doctors
const SPECIALTIES = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Gynecologist',
  'Psychiatrist',
  'Orthopedist',
  'Neurologist',
  'Ophthalmologist',
  'ENT Specialist'
];

// Degree choices for Pharmacists
const PHARM_DEGREES = [
  'Pharm.D (Doctor of Pharmacy)',
  'B.Pharm (Bachelor of Pharmacy)',
  'M.Phil (Pharmaceutical Sciences)',
  'Ph.D. (Pharmacology/Pharmaceutics)'
];

// Days of the week
const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function Profile() {
  const { user, updateProfile, uploadProfilePhoto, loading, authError, clearAuthError } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const serverUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://medeasy-backend-a5yi.onrender.com';
  
  // Local form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    // Pharmacist fields
    pharmacyName: '',
    degreeName: '',
    degreePlace: '',
    licenseNumber: '',
    // Doctor fields
    specialty: '',
    pmcRegistration: '',
    degree: '',
    experience: 0,
    clinicAddress: '',
    availableDays: [],
    consultationFee: 0,
  });

  // Prefill form when user details load or we start editing
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        pharmacyName: user.pharmacyName || '',
        degreeName: user.degreeName || '',
        degreePlace: user.degreePlace || '',
        licenseNumber: user.licenseNumber || '',
        specialty: user.specialty || '',
        pmcRegistration: user.pmcRegistration || '',
        degree: user.degree || '',
        experience: user.experience || 0,
        clinicAddress: user.clinicAddress || '',
        availableDays: user.availableDays || [],
        consultationFee: user.consultationFee || 0,
      });
    }
  }, [user, isEditing]);

  // Clear states on unmount
  useEffect(() => {
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear errors for that field
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const active = prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day];
      return { ...prev, availableDays: active };
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({ ...prev, photo: 'Please select a valid image file (PNG/JPG).' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({ ...prev, photo: 'File size must be under 5MB.' }));
      return;
    }

    try {
      setSuccessMsg('');
      clearAuthError();
      await uploadProfilePhoto(file);
      setSuccessMsg('Profile photo uploaded successfully!');
    } catch {
      // Handled by AuthContext authError
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required.';
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    }

    // Role-specific validation — hired pharmacist reps cannot change credentials
    if (user?.role === 'pharmacist') {
      // No credential validation needed — managed by pharmacy owner
    } else if (user?.role === 'pharmacy' && isEditing) {
      // Pharmacy owners only have basic profile fields
    } else if (user?.role === 'doctor' && isEditing) {
      if (!formData.specialty) errors.specialty = 'Please select your medical specialty.';
      if (!formData.pmcRegistration.trim()) errors.pmcRegistration = 'PMC/PMDC license number is required.';
      if (!formData.degree.trim()) errors.degree = 'Educational degrees (e.g. MBBS) are required.';
      if (formData.experience < 0) errors.experience = 'Experience cannot be negative.';
      if (!formData.clinicAddress.trim()) errors.clinicAddress = 'Physical clinic or hospital location is required.';
      if (formData.consultationFee < 0) errors.consultationFee = 'Fee cannot be negative.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    clearAuthError();

    if (!validateForm()) return;

    try {
      await updateProfile(formData);
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Handled by AuthContext authError
    }
  };

  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <div className="profile-page">
      <Container className="py-5">
        <h1 className="page-title text-start mb-4">My Account Profile</h1>

        {/* Global Notifications */}
        {successMsg && (
          <Alert variant="success" className="profile-alert animate-fade" dismissible onClose={() => setSuccessMsg('')}>
            <FaCheckCircle className="me-2 fs-5" />
            {successMsg}
          </Alert>
        )}

        {authError && (
          <Alert variant="danger" className="profile-alert animate-fade" dismissible onClose={clearAuthError}>
            <FaExclamationTriangle className="me-2 fs-5" />
            <strong>Update Failed:</strong> {authError}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} noValidate>
          <Row className="gy-4">
            
            {/* ─── Column 1: Sidebar Profile Card ─── */}
            <Col lg={4}>
              <Card className="profile-sidebar-card text-center shadow-sm">
                <Card.Body className="p-4">
                  
                  {/* Avatar & Role */}
                  <div className="profile-avatar-container mb-3">
                    <div className="profile-avatar-circle mx-auto position-relative">
                      {user?.profileImage ? (
                        <img 
                          src={`${serverUrl}${user.profileImage}`} 
                          alt="Profile" 
                          className="profile-avatar-img" 
                        />
                      ) : (
                        user?.role === 'doctor' ? <FaUserMd size={48} /> : <FaUser size={40} />
                      )}
                      
                      {isEditing && (
                        <label htmlFor="profile-photo-upload" className="avatar-edit-overlay">
                          <FaCamera size={18} />
                          <input 
                            type="file" 
                            id="profile-photo-upload" 
                            accept="image/*" 
                            onChange={handlePhotoChange} 
                            className="d-none" 
                          />
                        </label>
                      )}
                    </div>
                    <span className="profile-role-badge text-capitalize">{user?.role}</span>
                  </div>

                  <h3 className="profile-user-name mt-3">{user?.name}</h3>
                  <p className="profile-user-phone text-muted font-monospace">{user?.phone}</p>
                  <p className="profile-join-date small text-muted">Member since {formattedDate}</p>

                  {/* Verification status for Doctor / Pharmacist */}
                  {(user?.role === 'doctor' || user?.role === 'pharmacist') && (
                    <div className="my-3">
                      {user.isVerifiedProfile ? (
                        <div className="badge-verified shadow-sm">
                          <FaCheckCircle className="me-2" /> Verified Profile
                        </div>
                      ) : (
                        <div className="badge-pending shadow-sm">
                          <FaExclamationTriangle className="me-2" /> Verification Pending
                        </div>
                      )}
                      
                      {!user.isVerifiedProfile && !isEditing && (
                        <Alert variant="warning" className="small-warning-alert mt-3 py-2 text-start">
                          Please complete your professional credentials below to activate consultation & verification features.
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Edit Controls */}
                  <div className="mt-4 pt-3 border-top w-100">
                    {!isEditing ? (
                      <Button 
                        variant="primary" 
                        className="btn-edit-profile w-100" 
                        onClick={() => {
                          setIsEditing(true);
                          setSuccessMsg('');
                          clearAuthError();
                        }}
                      >
                        <FaEdit className="me-2" /> Edit Profile Details
                      </Button>
                    ) : (
                      <div className="d-flex gap-2">
                        <Button 
                          variant="secondary" 
                          className="w-100"
                          onClick={() => {
                            setIsEditing(false);
                            setFormErrors({});
                            clearAuthError();
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          variant="success" 
                          className="btn-save-profile w-100"
                          disabled={loading}
                        >
                          {loading ? <Spinner animation="border" size="sm" /> : 'Save Details'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* ─── Column 2: Profile Content & Forms ─── */}
            <Col lg={8}>
              
              {/* Card 1: Account Core Details */}
              <Card className="profile-section-card shadow-sm mb-4">
                <Card.Body className="p-4 p-md-5">
                  <h4 className="section-title mb-4">
                    <span className="title-icon-wrap"><FaUser className="text-primary" /></span> 
                    Account Information
                  </h4>

                  {!isEditing ? (
                    // VIEW MODE: Core details
                    <ListGroup variant="flush" className="profile-details-list">
                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaUser className="me-2 text-muted" /> Full Name</span>
                        <span className="detail-value fw-semibold">{user?.name}</span>
                      </ListGroup.Item>

                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaEnvelope className="me-2 text-muted" /> Email Address</span>
                        <span className="detail-value font-monospace">{user?.email || <span className="text-italic text-muted">Not provided</span>}</span>
                      </ListGroup.Item>

                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaPhone className="me-2 text-muted" /> Mobile Number</span>
                        <span className="detail-value font-monospace">{user?.phone}</span>
                      </ListGroup.Item>

                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-start">
                        <span className="detail-label mb-1 mb-sm-0"><FaMapMarkerAlt className="me-2 text-muted" /> Physical Address</span>
                        <span className="detail-value text-sm-end">{user?.address || <span className="text-italic text-muted">Not provided</span>}</span>
                      </ListGroup.Item>
                    </ListGroup>
                  ) : (
                    // EDIT MODE: Core details
                    <div className="row g-3">
                      <Form.Group as={Col} md={6} controlId="formName">
                        <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          isInvalid={!!formErrors.name}
                        />
                        <Form.Control.Feedback type="invalid">{formErrors.name}</Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group as={Col} md={6} controlId="formPhone">
                        <Form.Label>Phone Number <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="phone"
                          value={formData.phone}
                          disabled // Lock phone number to protect signups
                        />
                        <Form.Text className="text-muted">Mobile numbers are locked after verification.</Form.Text>
                      </Form.Group>

                      <Form.Group as={Col} md={12} controlId="formEmail">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          placeholder="you@example.com"
                          onChange={handleChange}
                          isInvalid={!!formErrors.email}
                        />
                        <Form.Control.Feedback type="invalid">{formErrors.email}</Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group as={Col} md={12} controlId="formAddress">
                        <Form.Label>Physical Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="address"
                          value={formData.address}
                          placeholder="House, Street, Sector, City..."
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Card 2: Pharmacist Credentials Section */}
              {user?.role === 'pharmacist' && (
                <Card className="profile-section-card shadow-sm">
                  <Card.Body className="p-4 p-md-5">
                    <h4 className="section-title mb-3">
                      <span className="title-icon-wrap"><FaHospital className="text-success" /></span>{' '}
                      Professional Pharmacy Credentials
                    </h4>

                    {/* Managed-by-sponsor notice */}
                    <div className="d-flex align-items-start gap-3 p-3 mb-4 rounded-3 border" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderColor: '#f59e0b !important' }}>
                      <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🔒</span>
                      <div>
                        <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.9rem' }}>Credentials Managed by Sponsoring Pharmacy</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                          Your professional credentials (license, degree, and pharmacy affiliation) are set and managed exclusively by the pharmacy that hired you. If any details are incorrect, please contact your pharmacy owner.
                        </div>
                      </div>
                    </div>

                    {/* Read-only credentials view — always, regardless of edit mode */}
                    <ListGroup variant="flush" className="profile-details-list">
                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaHospital className="me-2 text-muted" /> Pharmacy Affiliation</span>
                        <span className="detail-value fw-semibold">{user.pharmacistDetails?.name ? `Registered under ${user.pharmacyName || 'Pharmacy'}` : user.pharmacyName || <span className="text-italic text-muted">Not assigned</span>}</span>
                      </ListGroup.Item>

                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaGraduationCap className="me-2 text-muted" /> Professional Degree</span>
                        <span className="detail-value">{user.pharmacistDetails?.degreeName || <span className="text-italic text-muted">Not set by pharmacy</span>}</span>
                      </ListGroup.Item>

                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaHospital className="me-2 text-muted" /> Graduation Institution</span>
                        <span className="detail-value">{user.pharmacistDetails?.degreePlace || <span className="text-italic text-muted">Not set by pharmacy</span>}</span>
                      </ListGroup.Item>

                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaRegAddressCard className="me-2 text-muted" /> Council License / Reg Number</span>
                        <span className="detail-value font-monospace fw-semibold text-success">{user.pharmacistDetails?.licenseNumber || <span className="text-italic text-muted">Not set by pharmacy</span>}</span>
                      </ListGroup.Item>

                      <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                        <span className="detail-label"><FaEnvelope className="me-2 text-muted" /> Login Email</span>
                        <span className="detail-value font-monospace">{user.pharmacistDetails?.email || user.email || <span className="text-italic text-muted">Managed by pharmacy</span>}</span>
                      </ListGroup.Item>
                    </ListGroup>

                    <div className="mt-3 p-2 rounded-2 bg-light border d-flex align-items-center gap-2" style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      <span>⚠️</span>
                      <span>If your details are removed from our system by your employer, your account access will be revoked and you will no longer be able to log in.</span>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Card 3: Doctor Consultation Profiles */}
              {user?.role === 'doctor' && (
                <Card className="profile-section-card shadow-sm">
                  <Card.Body className="p-4 p-md-5">
                    <h4 className="section-title mb-4">
                      <span className="title-icon-wrap"><FaUserMd className="text-indigo" /></span> 
                      Doctor Consultation Credentials
                    </h4>

                    {!isEditing ? (
                      // VIEW MODE: Doctor
                      <ListGroup variant="flush" className="profile-details-list">
                        <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                          <span className="detail-label"><FaUserMd className="me-2 text-muted" /> Medical Specialty</span>
                          <span className="detail-value fw-bold text-primary">{user.specialty || <span className="text-italic text-muted">Empty (Please complete)</span>}</span>
                        </ListGroup.Item>

                        <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                          <span className="detail-label"><FaRegAddressCard className="me-2 text-muted" /> PMC / PMDC Reg Number</span>
                          <span className="detail-value font-monospace fw-semibold text-success">{user.pmcRegistration || <span className="text-italic text-muted">Empty (Please complete)</span>}</span>
                        </ListGroup.Item>

                        <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                          <span className="detail-label"><FaGraduationCap className="me-2 text-muted" /> Professional Degrees</span>
                          <span className="detail-value">{user.degree || <span className="text-italic text-muted">Empty (Please complete)</span>}</span>
                        </ListGroup.Item>

                        <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                          <span className="detail-label"><FaHourglassHalf className="me-2 text-muted" /> Clinical Experience</span>
                          <span className="detail-value">{user.experience !== undefined ? `${user.experience} Years` : <span className="text-italic text-muted">Empty</span>}</span>
                        </ListGroup.Item>

                        <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-start">
                          <span className="detail-label mb-1 mb-sm-0"><FaHospital className="me-2 text-muted" /> Physical Clinic Location</span>
                          <span className="detail-value text-sm-end">{user.clinicAddress || <span className="text-italic text-muted">Empty</span>}</span>
                        </ListGroup.Item>

                        <ListGroup.Item className="px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                          <span className="detail-label"><FaDollarSign className="me-2 text-muted" /> Consultation Fee</span>
                          <span className="detail-value fw-bold text-success">{user.consultationFee ? `${user.consultationFee} PKR` : 'Free / 0 PKR'}</span>
                        </ListGroup.Item>

                        <ListGroup.Item className="px-0 py-3 d-flex flex-column justify-content-start">
                          <span className="detail-label mb-2"><FaCalendarDay className="me-2 text-muted" /> Weekly Availability Days</span>
                          <div className="d-flex flex-wrap gap-2 mt-1">
                            {user.availableDays && user.availableDays.length > 0 ? (
                              user.availableDays.map((day) => (
                                <Badge key={day} bg="info" className="px-3 py-2 text-white rounded-pill shadow-xs">
                                  {day}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-italic text-muted">No consultation days specified.</span>
                            )}
                          </div>
                        </ListGroup.Item>
                      </ListGroup>
                    ) : (
                      // EDIT MODE: Doctor
                      <div className="row g-3">
                        <Form.Group as={Col} md={6} controlId="formSpecialty">
                          <Form.Label>Medical Specialty <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            name="specialty"
                            value={formData.specialty}
                            onChange={handleChange}
                            isInvalid={!!formErrors.specialty}
                          >
                            <option value="">-- Select Specialty --</option>
                            {SPECIALTIES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">{formErrors.specialty}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} md={6} controlId="formPmcRegistration">
                          <Form.Label>PMC/PMDC License Number <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="text"
                            name="pmcRegistration"
                            placeholder="e.g. 98765-P / PMC-12345"
                            value={formData.pmcRegistration}
                            onChange={handleChange}
                            isInvalid={!!formErrors.pmcRegistration}
                          />
                          <Form.Control.Feedback type="invalid">{formErrors.pmcRegistration}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} md={8} controlId="formDegree">
                          <Form.Label>Educational Degrees <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="text"
                            name="degree"
                            placeholder="e.g. MBBS, FCPS (Dermatology), MD"
                            value={formData.degree}
                            onChange={handleChange}
                            isInvalid={!!formErrors.degree}
                          />
                          <Form.Control.Feedback type="invalid">{formErrors.degree}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} md={4} controlId="formExperience">
                          <Form.Label>Years of Experience</Form.Label>
                          <Form.Control
                            type="number"
                            name="experience"
                            min={0}
                            value={formData.experience}
                            onChange={handleChange}
                            isInvalid={!!formErrors.experience}
                          />
                          <Form.Control.Feedback type="invalid">{formErrors.experience}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} md={8} controlId="formClinicAddress">
                          <Form.Label>Physical Clinic/Hospital Location <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="text"
                            name="clinicAddress"
                            placeholder="e.g. Medicare Clinic, Sector F-8, Islamabad"
                            value={formData.clinicAddress}
                            onChange={handleChange}
                            isInvalid={!!formErrors.clinicAddress}
                          />
                          <Form.Control.Feedback type="invalid">{formErrors.clinicAddress}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} md={4} controlId="formConsultationFee">
                          <Form.Label>Consultation Fee (PKR)</Form.Label>
                          <Form.Control
                            type="number"
                            name="consultationFee"
                            min={0}
                            step={100}
                            value={formData.consultationFee}
                            onChange={handleChange}
                            isInvalid={!!formErrors.consultationFee}
                          />
                          <Form.Control.Feedback type="invalid">{formErrors.consultationFee}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} md={12} controlId="formAvailableDays">
                          <Form.Label className="d-block mb-2">Consultation Days in Week</Form.Label>
                          <div className="d-flex flex-wrap gap-2 py-1">
                            {DAYS_OF_WEEK.map((day) => {
                              const isChecked = formData.availableDays.includes(day);
                              return (
                                <button
                                  type="button"
                                  key={day}
                                  className={`btn-day-toggle ${isChecked ? 'active' : ''}`}
                                  onClick={() => handleDayToggle(day)}
                                >
                                  <FaCalendarCheck className="day-icon" /> {day}
                                </button>
                              );
                            })}
                          </div>
                        </Form.Group>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Form>
      </Container>
    </div>
  );
}
