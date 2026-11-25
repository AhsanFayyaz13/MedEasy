import { useEffect, useState } from 'react';
import { FaClinicMedical, FaHospital, FaUserMd } from 'react-icons/fa';
import { FiMail, FiMapPin, FiPhone, FiUser } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { Alert, Card, Input, PageHeader, Textarea } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { DoctorFields } from '../../auth/components/ProfessionalFields';
import { EMAIL_RE } from '../../auth/lib/validation';
import { formatPhone } from '../../../lib/format';
import { DetailList, DoctorDetails, PharmacistDetails, PharmacyDetails, ProfileSummary } from '../components/ProfileSections';
import SecuritySection from '../components/SecuritySection';
import './Profile.css';

const fromUser = (u = {}) => ({
  name: u.name || '',
  email: u.email || '',
  phone: u.phone || '',
  address: u.address || '',
  specialty: u.specialty || '',
  pmcRegistration: u.pmcRegistration || '',
  degree: u.degree || '',
  experience: u.experience ?? '',
  clinicAddress: u.clinicAddress || '',
  availableDays: u.availableDays || [],
  consultationFee: u.consultationFee ?? '',
});

function validate(f, role) {
  const e = {};
  if (!f.name.trim()) e.name = 'Name is required.';
  if (f.email.trim() && !EMAIL_RE.test(f.email)) e.email = 'Please enter a valid email address.';
  if (role === 'doctor') {
    if (!f.specialty) e.specialty = 'Please select your specialty.';
    if (!String(f.pmcRegistration).trim()) e.pmcRegistration = 'PMC/PMDC number is required.';
    if (!String(f.degree).trim()) e.degree = 'Degree is required.';
    if (Number(f.experience) < 0) e.experience = 'Experience cannot be negative.';
    if (!String(f.clinicAddress).trim()) e.clinicAddress = 'Clinic address is required.';
    if (Number(f.consultationFee) < 0) e.consultationFee = 'Fee cannot be negative.';
  }
  return e;
}

const SUBTITLE = {
  patient: 'Your contact details, delivery address and sign-in security.',
  doctor: 'Your details, consultation credentials and sign-in security.',
  pharmacy: 'Your store details and sign-in security.',
  pharmacist: 'Your details and the credentials your pharmacy manages.',
  admin: 'Your account details and sign-in security.',
};

export default function Profile() {
  const { user, updateProfile, uploadProfilePhoto, loading, authError, clearAuthError } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => fromUser(user));
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => () => clearAuthError(), [clearAuthError]);

  const role = user?.role;
  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((x) => ({ ...x, [e.target.name]: undefined }));
  };

  const startEdit = () => {
    setForm(fromUser(user));
    setErrors({});
    setSuccess('');
    clearAuthError();
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setErrors({});
    clearAuthError();
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setPhotoError('');
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setPhotoError('Please choose a JPG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return setPhotoError('The image must be under 5 MB.');
    setUploading(true);
    try {
      await uploadProfilePhoto(file);
      setSuccess('Profile photo updated.');
    } catch {
      /* surfaced via authError */
    } finally {
      setUploading(false);
    }
    return undefined;
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = validate(form, role);
    setErrors(next);
    if (Object.keys(next).length) return;
    const pmcChanged = role === 'doctor' && form.pmcRegistration !== (user.pmcRegistration || '');
    try {
      await updateProfile(form);
      setSuccess(pmcChanged ? 'Profile saved. Your new PMC number will be re-verified by our team.' : 'Profile updated successfully.');
      setEditing(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      /* surfaced via authError */
    }
  };

  return (
    <div className="profile-page">
      <PageMeta title="My profile" noindex />
      <div className="container">
        <PageHeader eyebrow="Account" title="My profile" subtitle={SUBTITLE[role] || SUBTITLE.patient} />

        {success && <Alert tone="success" onClose={() => setSuccess('')}>{success}</Alert>}
        {authError && <Alert tone="error" title="Something went wrong" onClose={clearAuthError}>{authError}</Alert>}

        <div className="profile-layout">
          <Card>
            <ProfileSummary
              user={user}
              editing={editing}
              saving={loading && !uploading}
              uploading={uploading}
              photoError={photoError}
              onPhoto={onPhoto}
              onEdit={startEdit}
              onCancel={cancel}
            />
          </Card>

          <div className="profile-main">
            <form id="profile-form" onSubmit={submit} noValidate className="profile-main">
              <Card as="section" aria-labelledby="account-title">
                <h2 id="account-title" className="profile-section-title"><FiUser aria-hidden="true" /> Account information</h2>
                {editing ? (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <Input name="name" label={role === 'pharmacy' ? 'Pharmacy name' : 'Full name'} required value={form.name} onChange={onChange} error={errors.name} autoComplete="name" />
                    </div>
                    <div className="col-md-6">
                      <Input name="phone" label="Phone number" leftIcon={<FiPhone />} value={formatPhone(form.phone)} disabled hint="Your verified number can’t be changed." />
                    </div>
                    <div className="col-12">
                      <Input name="email" type="email" label="Email" leftIcon={<FiMail />} placeholder="you@example.com" value={form.email} onChange={onChange} error={errors.email} autoComplete="email" />
                    </div>
                    <div className="col-12">
                      <Textarea name="address" label="Address" rows={2} placeholder="House, street, sector, city" value={form.address} onChange={onChange} autoComplete="street-address" />
                    </div>
                  </div>
                ) : (
                  <DetailList
                    items={[
                      { label: role === 'pharmacy' ? 'Pharmacy name' : 'Full name', value: user?.name },
                      { label: 'Email', value: user?.email },
                      { label: 'Phone', value: formatPhone(user?.phone) },
                      { label: <><FiMapPin aria-hidden="true" /> Address</>, value: user?.address },
                    ]}
                  />
                )}
              </Card>

              {role === 'doctor' && (
                <Card as="section" aria-labelledby="doctor-title">
                  <h2 id="doctor-title" className="profile-section-title"><FaUserMd aria-hidden="true" /> Consultation credentials</h2>
                  {editing ? (
                    <>
                      <DoctorFields
                        fields={form}
                        errors={errors}
                        onChange={onChange}
                        onBlur={() => {}}
                        onDays={(days) => setForm((f) => ({ ...f, availableDays: days }))}
                      />
                      <p className="ui-field__hint">Changing your PMC/PMDC number sends your profile back for verification.</p>
                    </>
                  ) : (
                    <DoctorDetails user={user} />
                  )}
                </Card>
              )}

              {role === 'pharmacist' && (
                <Card as="section" aria-labelledby="pharmacist-title">
                  <h2 id="pharmacist-title" className="profile-section-title"><FaHospital aria-hidden="true" /> Professional credentials</h2>
                  <PharmacistDetails user={user} />
                </Card>
              )}

              {role === 'pharmacy' && (
                <Card as="section" aria-labelledby="pharmacy-title">
                  <h2 id="pharmacy-title" className="profile-section-title"><FaClinicMedical aria-hidden="true" /> Store details</h2>
                  <PharmacyDetails user={user} />
                </Card>
              )}
            </form>

            <SecuritySection managed={role === 'pharmacist'} />
          </div>
        </div>
      </div>
    </div>
  );
}
