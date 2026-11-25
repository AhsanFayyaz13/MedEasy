import { FiAlertTriangle, FiCamera, FiCheckCircle, FiEdit2, FiLock } from 'react-icons/fi';
import { Alert, Avatar, Badge, Button, Spinner } from '../../../components/ui';
import { assetUrl } from '../../../lib/media';
import { formatDate, formatPhone, formatPrice } from '../../../lib/format';

const ROLE_LABEL = { patient: 'Patient', doctor: 'Doctor', pharmacist: 'Pharmacist', pharmacy: 'Pharmacy', admin: 'Administrator' };

/** Definition list of label → value rows; empty values show a muted placeholder. */
export function DetailList({ items }) {
  return (
    <dl className="profile-details">
      {items.map(({ label, value, mono, empty = 'Not provided' }, i) => (
        <div key={typeof label === 'string' ? label : i} className="profile-details__row">
          <dt>{label}</dt>
          <dd className={mono ? 'is-mono' : undefined}>
            {value === undefined || value === null || value === '' ? <span className="profile-details__empty">{empty}</span> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Left column: avatar (with upload), role, status and edit controls. */
export function ProfileSummary({ user, editing, saving, uploading, photoError, onPhoto, onEdit, onCancel }) {
  const isProfessional = ['doctor', 'pharmacist', 'pharmacy'].includes(user?.role);
  return (
    <aside className="profile-summary">
      <div className="profile-summary__avatar">
        <Avatar src={assetUrl(user?.profileImage)} name={user?.name} size={104} />
        <label className="profile-summary__photo" title="Change photo">
          {uploading ? <Spinner size="sm" label="Uploading photo" /> : <FiCamera aria-hidden="true" />}
          <span className="sr-only">Change profile photo</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} disabled={uploading} />
        </label>
      </div>
      {photoError && <p className="ui-field__error" role="alert">{photoError}</p>}

      <h2 className="profile-summary__name">{user?.name}</h2>
      <Badge tone="primary">{ROLE_LABEL[user?.role] || user?.role}</Badge>
      {user?.phone && <p className="profile-summary__meta">{formatPhone(user.phone)}</p>}
      {user?.createdAt && <p className="profile-summary__meta">Member since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</p>}

      {isProfessional && (
        <div className="profile-summary__status">
          {user.isVerifiedProfile ? (
            <Badge tone="success" icon={<FiCheckCircle />}>{user.role === 'pharmacy' ? 'Verified pharmacy' : 'Verified professional'}</Badge>
          ) : (
            <Badge tone="warning" icon={<FiAlertTriangle />}>Verification pending</Badge>
          )}
        </div>
      )}

      <div className="profile-summary__actions">
        {editing ? (
          <>
            <Button variant="secondary" block onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="profile-form" variant="success" block loading={saving}>
              Save changes
            </Button>
          </>
        ) : (
          <Button block leftIcon={<FiEdit2 aria-hidden="true" />} onClick={onEdit}>
            Edit profile
          </Button>
        )}
      </div>
    </aside>
  );
}

/** Read-only doctor credentials. */
export function DoctorDetails({ user }) {
  return (
    <>
      {!user.isVerifiedProfile && (
        <Alert tone="warning" title="Under review">
          Our team is reviewing your credentials. You’ll be able to take appointments once your profile is verified.
        </Alert>
      )}
      <DetailList
        items={[
          { label: 'Specialty', value: user.specialty },
          { label: 'PMC / PMDC registration', value: user.pmcRegistration, mono: true },
          { label: 'Degrees', value: user.degree },
          { label: 'Experience', value: user.experience !== undefined && user.experience !== null ? `${user.experience} years` : '' },
          { label: 'Clinic address', value: user.clinicAddress },
          { label: 'Consultation fee', value: user.consultationFee ? formatPrice(user.consultationFee) : 'Free' },
          {
            label: 'Available days',
            value: user.availableDays?.length ? (
              <span className="profile-days">
                {user.availableDays.map((d) => (
                  <Badge key={d} tone="info">{d.slice(0, 3)}</Badge>
                ))}
              </span>
            ) : '',
            empty: 'No days set',
          },
        ]}
      />
    </>
  );
}

/** Read-only credentials for a pharmacist representative (managed by the pharmacy). */
export function PharmacistDetails({ user }) {
  const d = user.pharmacistDetails || {};
  return (
    <>
      <Alert tone="info" title={<><FiLock aria-hidden="true" /> Managed by your pharmacy</>}>
        Your licence, degree and affiliation are set by the pharmacy that registered you. Contact the pharmacy owner to change
        them. If they remove you, your access is revoked.
      </Alert>
      <DetailList
        items={[
          { label: 'Pharmacy', value: user.pharmacyName, empty: 'Not assigned' },
          { label: 'Degree', value: d.degreeName, empty: 'Not set' },
          { label: 'Institution', value: d.degreePlace, empty: 'Not set' },
          { label: 'Council licence no.', value: d.licenseNumber, mono: true, empty: 'Not set' },
          { label: 'Login email', value: d.email || user.email, mono: true },
        ]}
      />
    </>
  );
}

/** Read-only store details for a pharmacy account. */
export function PharmacyDetails({ user }) {
  return (
    <>
      <DetailList
        items={[
          { label: 'Store name', value: user.pharmacyName || user.name },
          { label: 'Owner', value: user.ownerName },
          { label: 'Store location', value: user.pharmacyLocation || user.address },
        ]}
      />
      <p className="ui-field__hint mt-3 mb-0">To change your store’s registered details, contact our team so we can re-verify them.</p>
    </>
  );
}
