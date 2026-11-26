import { useState } from 'react';
import { FiCheck, FiCheckCircle, FiEye, FiX } from 'react-icons/fi';
import api from '../../../services/api/client';
import { useToast } from '../../../context/ToastContext';
import { Avatar, Badge, Button, Card, EmptyState, Modal, SearchInput, Tabs, Textarea } from '../../../components/ui';
import { assetUrl } from '../../../lib/media';
import { formatDate, formatPhone, formatPrice } from '../../../lib/format';
import { sendNotification } from '../../../lib/notifications';
import { reviewItems } from './adminShared';

const KIND = {
  doctor: { label: 'Doctor', tone: 'violet' },
  pharmacy: { label: 'Pharmacy', tone: 'success' },
  pharmacist: { label: 'Pharmacist', tone: 'info' },
};

const DECLINE_PRESETS = ['Registration or licence number could not be verified', 'Details incomplete', 'Photo unclear or missing', 'Details don’t match official records'];

const agreementLine = (u) =>
  u.partnerAgreement?.acceptedAt ? `Accepted ${formatDate(u.partnerAgreement.acceptedAt)} (${Math.round(u.partnerAgreement.commissionRate * 100)}%)` : 'Not yet accepted';

/** Name and one-line description for an application card. */
function who(item) {
  const u = item.user;
  if (item.kind === 'pharmacist') return { name: u.pharmacistDetails?.name, sub: `Pharmacist for ${u.pharmacyName || u.name}`, photo: u.pharmacistDetails?.photo };
  if (item.kind === 'pharmacy') return { name: u.pharmacyName || u.name, sub: u.ownerName ? `Owner: ${u.ownerName}` : 'Pharmacy', photo: u.pharmacyOutsidePicture };
  return { name: u.name, sub: u.specialty || 'Doctor', photo: u.profileImage };
}

/** What the admin needs to check for each kind of application. */
function facts(item) {
  const u = item.user;
  if (item.kind === 'doctor') {
    return [
      ['Specialty', u.specialty],
      ['PMC/PMDC no.', u.pmcRegistration],
      ['Degree', u.degree],
      ['Experience', u.experience !== undefined && `${u.experience} years`],
      ['Consultation fee', u.consultationFee !== undefined && (u.consultationFee ? formatPrice(u.consultationFee) : 'Free')],
      ['Available', u.availableDays?.join(', ')],
      ['Clinic', u.clinicAddress],
      ['Partner Agreement', agreementLine(u)],
    ];
  }
  if (item.kind === 'pharmacy') {
    return [
      ['Store', u.pharmacyName || u.name],
      ['Owner', u.ownerName],
      ['Location', u.pharmacyLocation || u.address],
      ['Phone', formatPhone(u.phone)],
      ['Email', u.email],
      ['Partner Agreement', agreementLine(u)],
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
  ];
}

function Facts({ item }) {
  return (
    <dl className="adm-facts">
      {facts(item)
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
    </dl>
  );
}

/** Review queue for doctors, pharmacies and pharmacy pharmacists. */
export default function VerificationsTab({ users, setUsers }) {
  const { toast } = useToast();
  const [view, setView] = useState('pending');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(null);

  const { pending, declined } = reviewItems(users);
  const q = search.trim().toLowerCase();
  const list = (view === 'pending' ? pending : declined).filter((it) => {
    const u = it.user;
    return !q || `${u.name} ${u.email || ''} ${u.pharmacyName || ''} ${u.pharmacistDetails?.name || ''}`.toLowerCase().includes(q);
  });

  const update = (data) => setUsers((prev) => prev.map((x) => (x.id === data.user._id || x._id === data.user._id ? { ...x, ...data.user, id: x.id } : x)));

  const notify = (item, text, emoji) => {
    const u = item.user;
    const isStore = item.kind !== 'doctor';
    sendNotification(isStore ? 'pharmacist' : 'doctor', u.id, { text, emoji, link: item.kind === 'pharmacist' ? '/pharmacist?tab=pharmacist-rep' : isStore ? '/pharmacist' : '/profile' });
  };

  const APPROVED_TEXT = {
    doctor: 'Your doctor profile has been verified. Patients can now book you.',
    pharmacy: 'Your pharmacy has been verified. You can now receive orders.',
    pharmacist: 'Your pharmacist has been verified and can now sign in for your store.',
  };

  const approve = async (item) => {
    setBusy(`${item.key}:approve`);
    try {
      const { data } = await api.put(`/admin/users/${item.user.id}/approve`, { subject: item.subject });
      update(data);
      toast.success(`${who(item).name} approved.`);
      notify(item, APPROVED_TEXT[item.kind], 'welcome');
      setViewing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not approve.');
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    const item = declining;
    setBusy(`${item.key}:decline`);
    try {
      const { data } = await api.put(`/admin/users/${item.user.id}/decline`, { reason: reason.trim(), subject: item.subject });
      update(data);
      toast.success('Declined. The applicant has been emailed the reason.');
      notify(item, `Verification declined: ${reason.trim()}. Please update your details and resubmit.`, 'cancel');
      setDeclining(null);
      setViewing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not decline.');
    } finally {
      setBusy(null);
    }
  };

  const openDecline = (item) => {
    setReason('');
    setDeclining(item);
  };

  const isPendingItem = (item) => pending.some((p) => p.key === item.key);
  const viewingWho = viewing ? who(viewing) : null;

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
        <SearchInput label="Search applicants" placeholder="Name, store or email" value={search} onChange={setSearch} />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FiCheckCircle />}
          title={view === 'pending' ? 'All caught up' : 'No declined applications'}
          description={view === 'pending' ? 'No doctors, pharmacies or pharmacists are waiting for review.' : undefined}
        />
      ) : (
        <ul className="adm-verify-grid">
          {list.map((item) => {
            const w = who(item);
            const u = item.user;
            return (
              <li key={item.key}>
                <Card as="article" className="adm-verify">
                  <header>
                    <Avatar src={w.photo ? assetUrl(w.photo) : undefined} name={w.name || ''} size={48} />
                    <div>
                      <strong>{w.name}</strong>
                      <span>{w.sub}</span>
                    </div>
                    <Badge tone={KIND[item.kind].tone}>{KIND[item.kind].label}</Badge>
                  </header>
                  <Facts item={item} />
                  {view === 'declined' && (
                    <p className="adm-verify__reason">
                      Declined{u.verificationDeclinedAt && item.subject === 'account' ? ` ${formatDate(u.verificationDeclinedAt)}` : ''}:{' '}
                      {(item.subject === 'account' ? u.verificationDeclineReason : u.pharmacistDetails?.declineReason) || '—'}
                    </p>
                  )}
                  <div className="adm-actions adm-actions--start">
                    <Button size="sm" loading={busy === `${item.key}:approve`} leftIcon={<FiCheck aria-hidden="true" />} onClick={() => approve(item)}>Approve</Button>
                    {view === 'pending' && (
                      <Button size="sm" variant="ghost" className="adm-danger" leftIcon={<FiX aria-hidden="true" />} onClick={() => openDecline(item)}>Decline</Button>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<FiEye aria-hidden="true" />} onClick={() => setViewing(item)}>Details</Button>
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
        title={viewingWho?.name || ''}
        description={viewing ? `${viewing.user.email || ''}${viewing.user.phone ? ` · ${formatPhone(viewing.user.phone)}` : ''} · registered ${formatDate(viewing.user.createdAt)}` : undefined}
        footer={
          viewing && (
            <>
              {isPendingItem(viewing) && <Button variant="ghost" className="adm-danger" onClick={() => openDecline(viewing)}>Decline</Button>}
              <Button loading={busy === `${viewing.key}:approve`} onClick={() => approve(viewing)}>Approve</Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="adm-verify-detail">
            {viewing.kind === 'pharmacist' && viewing.user.pharmacistDetails?.photo && (
              <img src={assetUrl(viewing.user.pharmacistDetails.photo)} alt={viewing.user.pharmacistDetails.name || 'Pharmacist'} />
            )}
            {viewing.kind !== 'doctor' && viewing.user.pharmacyOutsidePicture && (
              <img src={assetUrl(viewing.user.pharmacyOutsidePicture)} alt="Storefront" />
            )}
            <Facts item={viewing} />
          </div>
        )}
      </Modal>

      <Modal
        show={!!declining}
        onClose={() => setDeclining(null)}
        title="Decline verification"
        description="The applicant is emailed this reason and can correct their details."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeclining(null)}>Cancel</Button>
            <Button variant="danger" disabled={!reason.trim()} loading={busy === `${declining?.key}:decline`} onClick={decline}>Decline</Button>
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
