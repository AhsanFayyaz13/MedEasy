import { useState } from 'react';
import { FiCheck, FiCheckCircle, FiEye, FiX } from 'react-icons/fi';
import api from '../../../services/api/client';
import { useToast } from '../../../context/ToastContext';
import { Avatar, Badge, Button, Card, EmptyState, Modal, SearchInput, Tabs, Textarea } from '../../../components/ui';
import { assetUrl } from '../../../lib/media';
import { formatDate, formatPrice } from '../../../lib/format';
import { sendNotification } from '../../../lib/notifications';

/** A doctor awaiting review, or a pharmacy whose pharmacist is awaiting review. */
const isPending = (u) =>
  (u.role === 'doctor' && !u.isVerifiedProfile && !u.verificationDeclinedAt) || (u.role === 'pharmacy' && u.pharmacistDetails?.status === 'pending');
const isDeclined = (u) => (u.role === 'doctor' && !u.isVerifiedProfile && u.verificationDeclinedAt) || (u.role === 'pharmacy' && u.pharmacistDetails?.status === 'declined');

const DECLINE_PRESETS = ['Registration number could not be verified', 'Degree details incomplete', 'Photo unclear or missing', 'Details don’t match official records'];

/** Credentials to check for each kind of applicant. */
function facts(u) {
  if (u.role === 'doctor') {
    return [
      ['Specialty', u.specialty],
      ['PMC/PMDC no.', u.pmcRegistration],
      ['Degree', u.degree],
      ['Experience', u.experience !== undefined && `${u.experience} years`],
      ['Consultation fee', u.consultationFee !== undefined && formatPrice(u.consultationFee)],
      ['Available', u.availableDays?.join(', ')],
      ['Clinic', u.clinicAddress],
    ];
  }
  const p = u.pharmacistDetails || {};
  return [
    ['Pharmacist', p.name],
    ['Pharmacy Council no.', p.licenseNumber],
    ['Degree', p.degreeName],
    ['University', p.degreePlace],
    ['Age', p.age && `${p.age} years`],
    ['Login email', p.email],
    ['Store', u.pharmacyName || u.name],
    ['Location', u.pharmacyLocation || u.address],
  ];
}

function Facts({ user }) {
  return (
    <dl className="adm-facts">
      {facts(user)
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
    </dl>
  );
}

/** Review queue for doctor profiles and pharmacy pharmacists. */
export default function VerificationsTab({ users, setUsers }) {
  const { toast } = useToast();
  const [view, setView] = useState('pending');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(null);

  const q = search.trim().toLowerCase();
  const pending = users.filter(isPending);
  const declined = users.filter(isDeclined);
  const list = (view === 'pending' ? pending : declined).filter((u) => !q || `${u.name} ${u.email || ''} ${u.pharmacistDetails?.name || ''}`.toLowerCase().includes(q));

  const notify = (u, text, emoji) => sendNotification(u.role === 'pharmacy' ? 'pharmacist' : 'doctor', u.id, { text, emoji, link: u.role === 'pharmacy' ? '/pharmacist?tab=pharmacist-rep' : '/profile' });

  const approve = async (u) => {
    setBusy(`${u.id}:approve`);
    try {
      const { data } = await api.put(`/admin/users/${u.id}/approve`);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...data.user, id: x.id } : x)));
      toast.success(`${u.role === 'pharmacy' ? u.pharmacistDetails?.name : u.name} approved.`);
      notify(u, u.role === 'pharmacy' ? `Pharmacist verified: ${u.pharmacistDetails?.name} can now sign in for your store.` : 'Your doctor profile has been verified. Patients can now book you.', 'welcome');
      setViewing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not approve.');
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    const u = declining;
    setBusy(`${u.id}:decline`);
    try {
      const { data } = await api.put(`/admin/users/${u.id}/decline`, { reason: reason.trim() });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...data.user, id: x.id } : x)));
      toast.success('Declined. The applicant has been told why.');
      notify(u, `Verification declined: ${reason.trim()}. Please update your details and resubmit.`, 'cancel');
      setDeclining(null);
      setViewing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not decline.');
    } finally {
      setBusy(null);
    }
  };

  const openDecline = (u) => {
    setReason('');
    setDeclining(u);
  };

  return (
    <div className="adm-section">
      <div className="adm-toolbar">
        <Tabs
          tabs={[
            { id: 'pending', label: 'Waiting for review', badge: pending.length || null },
            { id: 'declined', label: 'Declined', badge: declined.length || null },
          ]}
          active={view}
          onChange={setView}
          label="Verification queue"
        />
        <SearchInput label="Search applicants" placeholder="Name or email" value={search} onChange={setSearch} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<FiCheckCircle />} title={view === 'pending' ? 'All caught up' : 'No declined applications'} description={view === 'pending' ? 'No doctors or pharmacists are waiting for verification.' : undefined} />
      ) : (
        <ul className="adm-verify-grid">
          {list.map((u) => {
            const p = u.pharmacistDetails || {};
            const name = u.role === 'pharmacy' ? p.name : u.name;
            return (
              <li key={u.id}>
                <Card as="article" className="adm-verify">
                  <header>
                    <Avatar src={u.role === 'pharmacy' && p.photo ? assetUrl(p.photo) : undefined} name={name || ''} size={48} />
                    <div>
                      <strong>{name}</strong>
                      <span>{u.role === 'pharmacy' ? `Pharmacist for ${u.pharmacyName || u.name}` : u.specialty || 'Doctor'}</span>
                    </div>
                    <Badge tone={u.role === 'doctor' ? 'violet' : 'success'}>{u.role === 'doctor' ? 'Doctor' : 'Pharmacist'}</Badge>
                  </header>
                  <Facts user={u} />
                  {view === 'declined' && (
                    <p className="adm-verify__reason">
                      Declined{u.verificationDeclinedAt ? ` ${formatDate(u.verificationDeclinedAt)}` : ''}: {u.verificationDeclineReason || p.declineReason || '—'}
                    </p>
                  )}
                  <div className="adm-actions adm-actions--start">
                    <Button size="sm" loading={busy === `${u.id}:approve`} leftIcon={<FiCheck aria-hidden="true" />} onClick={() => approve(u)}>Approve</Button>
                    {view === 'pending' && (
                      <Button size="sm" variant="ghost" className="adm-danger" leftIcon={<FiX aria-hidden="true" />} onClick={() => openDecline(u)}>Decline</Button>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<FiEye aria-hidden="true" />} onClick={() => setViewing(u)}>Details</Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        show={!!viewing}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing ? (viewing.role === 'pharmacy' ? viewing.pharmacistDetails?.name : viewing.name) : ''}
        description={viewing ? `${viewing.email || ''}${viewing.phone ? ` · ${viewing.phone}` : ''} · registered ${formatDate(viewing.createdAt)}` : undefined}
        footer={
          viewing && (
            <>
              {isPending(viewing) && <Button variant="ghost" className="adm-danger" onClick={() => openDecline(viewing)}>Decline</Button>}
              <Button loading={busy === `${viewing.id}:approve`} onClick={() => approve(viewing)}>Approve</Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="adm-verify-detail">
            {viewing.role === 'pharmacy' && viewing.pharmacistDetails?.photo && (
              <img src={assetUrl(viewing.pharmacistDetails.photo)} alt={`${viewing.pharmacistDetails.name}`} />
            )}
            {viewing.role === 'pharmacy' && viewing.pharmacyOutsidePicture && (
              <img src={assetUrl(viewing.pharmacyOutsidePicture)} alt="Storefront" />
            )}
            <Facts user={viewing} />
          </div>
        )}
      </Modal>

      <Modal
        show={!!declining}
        onClose={() => setDeclining(null)}
        title="Decline verification"
        description="The applicant sees this reason and can correct their details."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeclining(null)}>Cancel</Button>
            <Button variant="danger" disabled={!reason.trim()} loading={busy === `${declining?.id}:decline`} onClick={decline}>Decline</Button>
          </>
        }
      >
        <div className="adm-presets">
          {DECLINE_PRESETS.map((r) => (
            <button key={r} type="button" className={reason === r ? 'is-active' : undefined} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <Textarea label="Reason" required rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </div>
  );
}
