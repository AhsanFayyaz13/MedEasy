import { useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiEdit2, FiMail, FiTrash2, FiUserCheck, FiXCircle } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../services/api/client';
import { Alert, Avatar, Badge, Button, Card, FileDropzone, Input, Modal, Select } from '../../../components/ui';
import { assetUrl } from '../../../lib/media';
import { sendNotification } from '../../../lib/notifications';
import PasswordField from '../../auth/components/PasswordField';
import { MIN_PASSWORD } from '../../auth/lib/validation';

const DEGREES = [
  { value: 'Pharm.D', label: 'Pharm.D (Doctor of Pharmacy)' },
  { value: 'B.Pharm', label: 'B.Pharm (Bachelor of Pharmacy)' },
  { value: 'M.Phil Pharmacy', label: 'M.Phil Pharmacy' },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS = {
  pending: { tone: 'warning', label: 'Awaiting verification', icon: <FiClock /> },
  approved: { tone: 'success', label: 'Verified', icon: <FiCheckCircle /> },
  declined: { tone: 'error', label: 'Declined', icon: <FiXCircle /> },
};

function validate(f, isNew) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter the pharmacist’s full name.';
  if (!f.age || Number(f.age) < 18 || Number(f.age) > 100) e.age = 'Age must be between 18 and 100.';
  if (!f.licenseNumber.trim()) e.licenseNumber = 'Pharmacy Council registration number is required.';
  if (!f.degreeName) e.degreeName = 'Choose a degree.';
  if (!f.degreePlace.trim()) e.degreePlace = 'Where did they graduate?';
  if (!f.photo) e.photo = 'Upload a clear face photo.';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'A valid login email is required.';
  if (isNew && !f.password) e.password = 'Set a password for the pharmacist’s login.';
  else if (f.password && f.password.length < MIN_PASSWORD) e.password = `At least ${MIN_PASSWORD} characters.`;
  return e;
}

function RepForm({ details, onDone, onCancel }) {
  const { user, updatePharmacistDetails } = useAuth();
  const { toast } = useToast();
  const isNew = details.status === 'none';
  const [f, setF] = useState({
    name: details.name || '',
    age: details.age || '',
    licenseNumber: details.licenseNumber || '',
    degreeName: details.degreeName || '',
    degreePlace: details.degreePlace || '',
    photo: details.photo || '',
    email: details.email || '',
    password: '',
  });
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const errors = validate(f, isNew);
  // Keep a previously saved degree selectable even if it isn't one of the presets.
  const degrees = !f.degreeName || DEGREES.some((d) => d.value === f.degreeName) ? DEGREES : [{ value: f.degreeName, label: f.degreeName }, ...DEGREES];
  const field = (k) => ({
    name: k,
    value: f[k],
    onChange: (e) => setF((p) => ({ ...p, [k]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    error: touched[k] ? errors[k] : undefined,
  });

  const uploadPhoto = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('pharmacistPhoto', file);
    setUploading(true);
    try {
      const { data } = await api.post('/auth/upload-pharmacist-photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setF((p) => ({ ...p, photo: data.filePath }));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(f).map((k) => [k, true])));
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await updatePharmacistDetails({ ...f, name: f.name.trim(), email: f.email.trim(), age: Number(f.age), password: f.password || undefined });
      sendNotification('admin', null, { text: `Pharmacist to verify: ${user?.name || 'A pharmacy'} submitted ${f.name.trim()} as its pharmacist.`, emoji: 'prescription', link: '/admin?tab=verifications' });
      toast.success('Submitted. Our team will verify the pharmacist’s details.');
      onDone();
    } catch (err) {
      toast.error(err.message || 'Could not submit the details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="rep-form-title" className="ph-rep-form">
      <h2 id="rep-form-title" className="ph-title"><FiUserCheck aria-hidden="true" /> {isNew ? 'Add your pharmacist' : 'Update pharmacist details'}</h2>
      <p className="ph-muted">The licensed pharmacist responsible for your store. Once our team verifies them, they can sign in with the email and password below to process orders and prescriptions.</p>
      {!isNew && <Alert tone="info">Saving changes sends the details for verification again.</Alert>}

      <form onSubmit={submit} noValidate>
        <div className="ph-rep-form__photo">
          <Avatar src={f.photo ? assetUrl(f.photo) : undefined} name={f.name} size={88} />
          <FileDropzone file={null} onFile={uploadPhoto} accept=".jpg,.jpeg,.png,.webp" label={uploading ? 'Uploading…' : 'Upload a face photo'} hint="Passport-style, JPG or PNG · max 5 MB" disabled={uploading} error={touched.photo ? errors.photo : undefined} />
        </div>

        <div className="row g-3">
          <div className="col-md-8"><Input label="Full name" required placeholder="Zainab Fatima" autoComplete="off" {...field('name')} /></div>
          <div className="col-md-4"><Input label="Age" required type="number" min="18" max="100" {...field('age')} /></div>
          <div className="col-md-6"><Input label="Pharmacy Council registration no." required placeholder="PCP-77392-P" {...field('licenseNumber')} /></div>
          <div className="col-md-6"><Select label="Degree" required placeholder="Choose a degree" options={degrees} {...field('degreeName')} /></div>
          <div className="col-12"><Input label="University" required placeholder="Punjab University College of Pharmacy" {...field('degreePlace')} /></div>
        </div>

        <fieldset className="ph-rep-form__login">
          <legend>Pharmacist’s login</legend>
          <div className="row g-3">
            <div className="col-md-6"><Input label="Email" required type="email" leftIcon={<FiMail />} autoComplete="off" {...field('email')} /></div>
            <div className="col-md-6">
              <PasswordField
                label={isNew ? 'Password' : 'New password'}
                required={isNew}
                hint={isNew ? `At least ${MIN_PASSWORD} characters.` : 'Leave blank to keep the current password.'}
                autoComplete="new-password"
                showStrength
                {...field('password')}
              />
            </div>
          </div>
        </fieldset>

        <div className="ph-form-actions">
          {!isNew && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={saving} disabled={uploading}>Submit for verification</Button>
        </div>
      </form>
    </Card>
  );
}

/** Store owner's page for the pharmacist representative who signs in for the store. */
export default function PharmacistRepPage() {
  const { user, removePharmacistDetails } = useAuth();
  const { toast } = useToast();
  const details = user?.pharmacistDetails || { status: 'none' };
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);

  if (details.status === 'none' || editing) {
    return <RepForm details={details} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  }

  const cfg = STATUS[details.status] || STATUS.pending;
  const incomplete = !details.photo || !details.age || !details.degreeName || !details.degreePlace;

  const remove = async () => {
    setBusy(true);
    try {
      await removePharmacistDetails();
      toast.success('Pharmacist removed.');
      setRemoving(false);
    } catch (e) {
      toast.error(e.message || 'Could not remove the pharmacist.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ph-rep">
      <Card as="section" aria-label="Pharmacist representative" className="ph-rep__card">
        {incomplete && <Alert tone="warning">Some details are missing. Update them so our team can verify this pharmacist.</Alert>}
        <div className="ph-rep__head">
          <Avatar src={details.photo ? assetUrl(details.photo) : undefined} name={details.name || ''} size={96} />
          <div>
            <h2>{details.name}</h2>
            <p>{[details.degreeName, details.age && `${details.age} years`].filter(Boolean).join(' · ')}</p>
            <Badge tone={cfg.tone} icon={cfg.icon}>{cfg.label}</Badge>
          </div>
        </div>
        <dl className="ph-rep__facts">
          <div><dt>Pharmacy Council no.</dt><dd>{details.licenseNumber || '—'}</dd></div>
          <div><dt>University</dt><dd>{details.degreePlace || '—'}</dd></div>
          <div><dt>Login email</dt><dd>{details.email || '—'}</dd></div>
        </dl>
        <div className="ph-form-actions ph-form-actions--start">
          <Button variant="secondary" leftIcon={<FiEdit2 aria-hidden="true" />} onClick={() => setEditing(true)}>Update details</Button>
          <Button variant="ghost" className="ph-danger" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={() => setRemoving(true)}>Remove pharmacist</Button>
        </div>
      </Card>

      <Card as="aside" className={`ph-rep__status ph-rep__status--${details.status}`}>
        {details.status === 'pending' && (
          <>
            <h3><FiClock aria-hidden="true" /> Verification in progress</h3>
            <p>Our team is checking the Pharmacy Council registration and degree. You can keep processing orders meanwhile.</p>
          </>
        )}
        {details.status === 'approved' && (
          <>
            <h3><FiCheckCircle aria-hidden="true" /> Verified</h3>
            <p>{details.name} can now sign in with {details.email} to process orders and prescriptions for your store.</p>
          </>
        )}
        {details.status === 'declined' && (
          <>
            <h3><FiAlertTriangle aria-hidden="true" /> Not verified</h3>
            <p>{details.declineReason ? <>Reason: <strong>{details.declineReason}</strong></> : 'We couldn’t verify these details.'}</p>
            <Button size="sm" onClick={() => setEditing(true)}>Fix and resubmit</Button>
          </>
        )}
      </Card>

      <Modal
        show={removing}
        onClose={() => setRemoving(false)}
        title="Remove this pharmacist?"
        description="Their login stops working and you’ll need to add and verify a pharmacist again."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(false)}>Keep</Button>
            <Button variant="danger" loading={busy} onClick={remove}>Remove</Button>
          </>
        }
      />
    </div>
  );
}
