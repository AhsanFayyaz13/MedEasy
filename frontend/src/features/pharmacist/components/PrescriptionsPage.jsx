import { useCallback, useEffect, useState } from 'react';
import { FiCheck, FiCheckCircle, FiExternalLink, FiFileText, FiMail, FiMapPin, FiPhone, FiX } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { fetchPendingPrescriptions, verifyPrescription } from '../../../services/api/pharmacistService';
import { Badge, Button, Card, EmptyState, ErrorState, Modal, SkeletonCard, Textarea } from '../../../components/ui';
import { assetUrl } from '../../../lib/media';
import { sendNotification } from '../../../lib/notifications';
import { fmtDate } from './pharmacistShared';
import { formatPhone, phoneHref } from '../../../lib/format';

const shortRx = (id) => String(id || '').slice(-6).toUpperCase();
const REJECT_PRESETS = ['Signature or stamp missing', 'Prescription is older than 30 days', 'Image is unclear', 'Name doesn’t match the account'];

function Field({ icon, value, href }) {
  if (!value) return null;
  return (
    <li>
      {icon}
      {href ? <a href={href}>{value}</a> : <span>{value}</span>}
    </li>
  );
}

/** Queue of uploaded prescriptions waiting for a pharmacist's decision. */
export default function PrescriptionsPage() {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchPendingPrescriptions());
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load prescriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (rx, status, why = '') => {
    setActing(`${rx.id}:${status}`);
    try {
      await verifyPrescription(rx.id, status, why);
      setList((prev) => prev.filter((p) => p.id !== rx.id));
      const patientId = rx.userId?._id || rx.userId;
      if (status === 'verified') {
        toast.success(`Prescription #${shortRx(rx.id)} verified.`);
        sendNotification('patient', patientId, { text: `Prescription verified: #RX-${shortRx(rx.id)} was approved by our pharmacist. You can now order those medicines.`, emoji: 'booking', link: '/prescriptions/upload' });
      } else {
        toast.success(`Prescription #${shortRx(rx.id)} declined.`);
        sendNotification('patient', patientId, { text: `Prescription declined: #RX-${shortRx(rx.id)}. Reason: ${why}`, emoji: 'cancel', link: '/prescriptions/upload' });
      }
      setRejecting(null);
      setViewing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the decision.');
    } finally {
      setActing(null);
    }
  };

  const openReject = (rx) => {
    setReason('');
    setRejecting(rx);
  };

  if (loading) {
    return <div className="ph-rx-grid">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>;
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!list.length) {
    return <EmptyState icon={<FiCheckCircle />} title="All caught up" description="There are no prescriptions waiting for review." />;
  }

  return (
    <>
      <p className="ph-lead">{list.length} prescription{list.length > 1 ? 's' : ''} waiting · oldest first</p>
      <ul className="ph-rx-grid">
        {list.map((rx) => {
          const href = assetUrl(rx.fileUrl);
          const isImage = href && rx.fileType !== 'application/pdf';
          const p = rx.userId && typeof rx.userId === 'object' ? rx.userId : {};
          return (
            <li key={rx.id}>
              <Card padded={false} as="article" className="ph-rx" aria-label={`Prescription ${shortRx(rx.id)}`}>
                <button type="button" className="ph-rx__preview" onClick={() => setViewing(rx)} aria-label={`View prescription ${shortRx(rx.id)}`}>
                  {isImage ? <img src={href} alt="" loading="lazy" /> : <FiFileText aria-hidden="true" />}
                </button>
                <div className="ph-rx__body">
                  <div className="ph-rx__top">
                    <strong>#{shortRx(rx.id)}</strong>
                    <Badge tone="warning">Pending</Badge>
                  </div>
                  <p className="ph-rx__date">Uploaded {fmtDate(rx.uploadedAt)}</p>
                  {rx.notes && <p className="ph-rx__note">“{rx.notes}”</p>}
                  <div className="ph-rx__patient">
                    <strong>{p.name || 'Patient'}</strong>
                    <ul>
                      <Field icon={<FiPhone aria-hidden="true" />} value={formatPhone(p.phone)} href={p.phone && `tel:${phoneHref(p.phone)}`} />
                      <Field icon={<FiMail aria-hidden="true" />} value={p.email} href={p.email && `mailto:${p.email}`} />
                      <Field icon={<FiMapPin aria-hidden="true" />} value={p.address} />
                    </ul>
                  </div>
                  <div className="ph-rx__actions">
                    <Button size="sm" leftIcon={<FiCheck aria-hidden="true" />} loading={acting === `${rx.id}:verified`} disabled={!!acting} onClick={() => decide(rx, 'verified')}>
                      Verify
                    </Button>
                    <Button size="sm" variant="ghost" className="ph-danger" leftIcon={<FiX aria-hidden="true" />} disabled={!!acting} onClick={() => openReject(rx)}>
                      Decline
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Modal
        show={!!viewing}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing ? `Prescription #${shortRx(viewing.id)}` : ''}
        description={viewing ? `${viewing.userId?.name || 'Patient'} · uploaded ${fmtDate(viewing.uploadedAt)}` : undefined}
        footer={
          viewing && (
            <>
              <Button variant="secondary" href={assetUrl(viewing.fileUrl)} target="_blank" rel="noreferrer" rightIcon={<FiExternalLink aria-hidden="true" />}>Open original</Button>
              <Button variant="ghost" className="ph-danger" onClick={() => openReject(viewing)}>Decline</Button>
              <Button loading={acting === `${viewing.id}:verified`} onClick={() => decide(viewing, 'verified')}>Verify</Button>
            </>
          )
        }
      >
        {viewing && viewing.fileType !== 'application/pdf' && assetUrl(viewing.fileUrl) ? (
          <img src={assetUrl(viewing.fileUrl)} alt={`Prescription ${shortRx(viewing.id)}`} className="ph-rx__full" />
        ) : (
          <p className="ph-muted">This is a PDF. Use “Open original” to read it.</p>
        )}
      </Modal>

      <Modal
        show={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Decline prescription"
        description="The patient sees this reason and can upload a new one."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" disabled={!reason.trim()} loading={acting === `${rejecting?.id}:rejected`} onClick={() => decide(rejecting, 'rejected', reason.trim())}>
              Decline
            </Button>
          </>
        }
      >
        <div className="ph-presets">
          {REJECT_PRESETS.map((r) => (
            <button key={r} type="button" className={reason === r ? 'is-active' : undefined} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <Textarea label="Reason" required rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </>
  );
}
