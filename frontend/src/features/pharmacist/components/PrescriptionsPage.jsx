import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiEdit3, FiExternalLink, FiFileText, FiMail, FiMapPin, FiMessageCircle, FiPackage, FiPhone, FiSend, FiX } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { useNotifications } from '../../../context/NotificationsContext';
import { fetchOfferPrescriptions, fetchPendingPrescriptions, fetchReviewedPrescriptions, verifyPrescription } from '../../../services/api/pharmacistService';
import PrescriptionChat from '../../prescriptions/components/PrescriptionChat';
import { offerTotals, timeLeft } from '../../prescriptions/lib/offer';
import { formatPrice } from '../../../lib/format';
import OfferBuilder from './OfferBuilder';
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Modal, SkeletonCard, Tabs, Textarea } from '../../../components/ui';
import { assetUrl } from '../../../lib/media';
import useRxFile from '../../prescriptions/lib/useRxFile';
import { fmtDate } from './pharmacistShared';
import { formatPhone, phoneHref } from '../../../lib/format';

const shortRx = (id) => String(id || '').slice(-6).toUpperCase();
const REJECT_PRESETS = ['Signature or stamp missing', 'Prescription is older than 30 days', 'Image is unclear', 'Name doesn’t match the account'];
const pendingOrders = (rx) => (rx.orders || []).filter((o) => o.status === 'pending');
const list = (xs) => xs.map((o) => o.orderNumber).join(', ');

function Field({ icon, value, href }) {
  if (!value) return null;
  return (
    <li>
      {icon}
      {href ? <a href={href}>{value}</a> : <span>{value}</span>}
    </li>
  );
}

/** What approving does, in the button's own words. */
const verifyLabel = (rx) => {
  const n = pendingOrders(rx).length;
  if (!n) return 'Verify';
  return n === 1 ? 'Verify & confirm order' : `Verify & confirm ${n} orders`;
};

const OFFER_STATE = {
  open: { tone: 'primary', label: 'Waiting for patient' },
  declined: { tone: 'neutral', label: 'Patient said no thanks' },
  expired: { tone: 'warning', label: 'Offer expired' },
  accepted: { tone: 'success', label: 'Accepted' },
  closed: { tone: 'neutral', label: 'Closed' },
};
const VIEWS = ['queue', 'offers', 'reviewed'];
const FETCH = { queue: fetchPendingPrescriptions, offers: fetchOfferPrescriptions, reviewed: fetchReviewedPrescriptions };

/** One-line summary of an offer for the card. */
function OfferSummary({ rx }) {
  const cfg = OFFER_STATE[rx.offerState] || OFFER_STATE.closed;
  const { total } = offerTotals(rx.offer.items);
  const left = rx.offerState === 'open' ? timeLeft(rx.offer.expiresAt) : null;
  const n = rx.offer.items.length;
  const missing = rx.offer.unavailable?.length;
  return (
    <div className="ph-rx__offer">
      <Badge tone={cfg.tone}>{cfg.label}</Badge>
      <span>{left ? `${left} left · ` : ''}{n} item{n > 1 ? 's' : ''} · {formatPrice(total)}{missing ? ` · ${missing} not available` : ''}</span>
    </div>
  );
}

/**
 * Pharmacist work on prescriptions: the waiting queue (prepare an offer, approve or decline),
 * offers waiting on patients, and the latest decisions. Each prescription has a conversation
 * with the patient.
 */
export default function PrescriptionsPage() {
  const { toast } = useToast();
  const { hasUnreadChat } = useNotifications();
  const [params] = useSearchParams();
  const [view, setView] = useState(() => (VIEWS.includes(params.get('view')) ? params.get('view') : 'queue'));
  const [building, setBuilding] = useState(null);
  const [chatting, setChatting] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(null);
  const [refill, setRefill] = useState({});
  const viewingFile = useRxFile(viewing);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await FETCH[view]());
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load prescriptions.');
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const decide = async (rx, status, why = '') => {
    setActing(`${rx.id}:${status}`);
    try {
      const res = await verifyPrescription(rx.id, status, {
        rejectionReason: why,
        refillable: status === 'verified' && Boolean(refill[rx.id]),
        // Approving is what the attached orders were waiting for, so confirm them in the same step.
        confirmOrders: status === 'verified',
      });
      setItems((prev) => prev.filter((p) => p.id !== rx.id));
      const confirmed = res.confirmedOrders || [];
      if (status === 'verified') {
        toast.success(`Prescription #${shortRx(rx.id)} verified${confirmed.length ? ` and order ${list(confirmed)} confirmed` : ''}.`);
      } else {
        toast.success(`Prescription #${shortRx(rx.id)} declined.${pendingOrders(rx).length ? ` Order ${list(pendingOrders(rx))} is still pending: cancel it in Orders if it can’t go ahead.` : ''}`);
      }
      setRejecting(null);
      setViewing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the decision.');
      if (e.response?.status === 409) load();
    } finally {
      setActing(null);
    }
  };

  const openReject = (rx) => {
    setReason('');
    setRejecting(rx);
  };

  const offerSent = (updated) => {
    setBuilding(null);
    // It leaves the waiting queue; elsewhere it is updated in place.
    setItems((prev) => (view === 'queue' ? prev.filter((p) => p.id !== updated.id) : prev.map((p) => (p.id === updated.id ? { ...p, ...updated, userId: p.userId } : p))));
  };

  const tabs = [
    { id: 'queue', label: 'Waiting' },
    { id: 'offers', label: 'Offers sent' },
    { id: 'reviewed', label: 'Reviewed' },
  ];

  let body;
  if (loading) {
    body = <div className="ph-rx-grid">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>;
  } else if (error) {
    body = <ErrorState message={error} onRetry={load} />;
  } else if (!items.length) {
    body = {
      queue: <EmptyState icon={<FiCheckCircle />} title="All caught up" description="There are no prescriptions waiting for review." />,
      offers: <EmptyState icon={<FiSend />} title="No offers waiting" description="Offers you send are listed here until the patient accepts them." />,
      reviewed: <EmptyState icon={<FiFileText />} title="Nothing reviewed yet" description="Prescriptions you approve or decline will be listed here." />,
    }[view];
  } else {
    body = (
      <>
        <p className="ph-lead">
          {{
            queue: `${items.length} prescription${items.length > 1 ? 's' : ''} waiting · oldest first`,
            offers: `${items.length} offer${items.length > 1 ? 's' : ''} · newest first`,
            reviewed: `Latest ${items.length} decision${items.length > 1 ? 's' : ''} · newest first`,
          }[view]}
        </p>
        <ul className="ph-rx-grid">
          {items.map((rx) => {
            const href = assetUrl(rx.fileUrl);
            const isImage = href && rx.fileType !== 'application/pdf';
            const p = rx.userId && typeof rx.userId === 'object' ? rx.userId : {};
            const waiting = pendingOrders(rx);
            const fromDoctor = rx.source === 'consultation';
            // An offer can be prepared until an order uses the prescription or the patient accepts one.
            const canOffer = rx.status !== 'rejected' && !rx.orders?.length && rx.offerState !== 'accepted' && new Date(rx.expiresAt) > new Date();
            const replied = rx.lastMessageFrom === 'patient' || hasUnreadChat(`rx:${rx.id}`);
            return (
              <li key={rx.id}>
                <Card padded={false} as="article" className="ph-rx" aria-label={`Prescription ${shortRx(rx.id)}`}>
                  <button type="button" className="ph-rx__preview" onClick={() => setViewing(rx)} aria-label={`View prescription ${shortRx(rx.id)}`}>
                    {isImage ? <img src={href} alt="" loading="lazy" /> : fromDoctor ? <span className="ph-rx__doctor-text">{rx.doctorText}</span> : <FiFileText aria-hidden="true" />}
                  </button>
                  <div className="ph-rx__body">
                    <div className="ph-rx__top">
                      <strong>#{shortRx(rx.id)}{fromDoctor ? ' · from a MedEasy doctor' : ''}</strong>
                      {rx.status === 'pending' && <Badge tone="warning">Pending</Badge>}
                      {rx.status === 'verified' && <Badge tone="success">{rx.refillable ? 'Verified · refillable' : 'Verified'}</Badge>}
                      {rx.status === 'rejected' && <Badge tone="error">Declined</Badge>}
                    </div>
                    <p className="ph-rx__date">
                      {fromDoctor ? 'Sent' : 'Uploaded'} {fmtDate(rx.uploadedAt)}
                      {rx.reviewedAt && <> · {rx.status === 'rejected' ? 'declined' : 'verified'} {fmtDate(rx.reviewedAt)}{rx.reviewedBy?.name ? ` by ${rx.reviewedBy.name}` : ''}</>}
                    </p>
                    {rx.notes && <p className="ph-rx__note">“{rx.notes}”</p>}
                    {rx.rejectionReason && <p className="ph-rx__note">Reason: {rx.rejectionReason}</p>}
                    {rx.offer?.sentAt && <OfferSummary rx={rx} />}
                    {rx.orders?.length > 0 && (
                      <p className="ph-rx__orders">
                        <FiPackage aria-hidden="true" /> {rx.orders.length === 1 ? 'Order' : 'Orders'} {rx.orders.map((o) => `${o.orderNumber} (${o.status})`).join(', ')}
                      </p>
                    )}
                    <div className="ph-rx__patient">
                      <strong>{p.name || 'Patient'}</strong>
                      <ul>
                        <Field icon={<FiPhone aria-hidden="true" />} value={formatPhone(p.phone)} href={p.phone && `tel:${phoneHref(p.phone)}`} />
                        <Field icon={<FiMail aria-hidden="true" />} value={p.email} href={p.email && `mailto:${p.email}`} />
                        <Field icon={<FiMapPin aria-hidden="true" />} value={p.address} />
                      </ul>
                    </div>
                    {rx.status === 'pending' && !waiting.length && (
                      <div className="ph-rx__actions">
                        <Button size="sm" leftIcon={<FiSend aria-hidden="true" />} disabled={!!acting} onClick={() => setBuilding(rx)}>
                          Prepare offer
                        </Button>
                        <Button size="sm" variant="secondary" leftIcon={<FiCheck aria-hidden="true" />} loading={acting === `${rx.id}:verified`} disabled={!!acting} onClick={() => decide(rx, 'verified')}>
                          Approve only
                        </Button>
                        <Button size="sm" variant="ghost" className="ph-danger" leftIcon={<FiX aria-hidden="true" />} disabled={!!acting} onClick={() => openReject(rx)}>
                          Decline
                        </Button>
                      </div>
                    )}
                    {rx.status === 'pending' && waiting.length > 0 && (
                      <>
                        <Checkbox
                          label="Allows repeat orders"
                          hint="Tick if the prescription permits refills. It can then be reused for 6 months."
                          checked={Boolean(refill[rx.id])}
                          onChange={(e) => setRefill((r) => ({ ...r, [rx.id]: e.target.checked }))}
                        />
                        <div className="ph-rx__actions">
                          <Button size="sm" leftIcon={<FiCheck aria-hidden="true" />} loading={acting === `${rx.id}:verified`} disabled={!!acting} onClick={() => decide(rx, 'verified')}>
                            {verifyLabel(rx)}
                          </Button>
                          <Button size="sm" variant="ghost" className="ph-danger" leftIcon={<FiX aria-hidden="true" />} disabled={!!acting} onClick={() => openReject(rx)}>
                            Decline
                          </Button>
                        </div>
                        <p className="ph-muted">Verifying also confirms {list(waiting)}.</p>
                      </>
                    )}
                    <div className="ph-rx__actions">
                      {rx.status !== 'pending' && canOffer && (
                        <Button size="sm" variant={rx.offer?.sentAt ? 'secondary' : 'primary'} leftIcon={<FiEdit3 aria-hidden="true" />} onClick={() => setBuilding(rx)}>
                          {rx.offer?.sentAt ? 'Revise offer' : 'Prepare offer'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={replied ? 'chat-unread' : undefined}
                        leftIcon={<FiMessageCircle aria-hidden="true" />}
                        onClick={() => setChatting(rx)}
                        aria-label={replied ? 'Message the patient, new reply' : 'Message the patient'}
                      >
                        {rx.lastMessageFrom === 'patient' ? 'Patient replied' : 'Message patient'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      <Tabs tabs={tabs} active={view} onChange={setView} label="Prescription lists" />
      {body}

      <Modal
        show={!!viewing}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing ? `Prescription #${shortRx(viewing.id)}` : ''}
        description={viewing ? `${viewing.userId?.name || 'Patient'} · uploaded ${fmtDate(viewing.uploadedAt)}` : undefined}
        footer={
          viewing && (
            <>
              {viewingFile.href && <Button variant="secondary" href={viewingFile.href} target="_blank" rel="noreferrer" rightIcon={<FiExternalLink aria-hidden="true" />}>Open original</Button>}
              {viewing.status === 'pending' && (
                <>
                  <Button variant="ghost" className="ph-danger" onClick={() => openReject(viewing)}>Decline</Button>
                  {pendingOrders(viewing).length ? (
                    <Button loading={acting === `${viewing.id}:verified`} onClick={() => decide(viewing, 'verified')}>{verifyLabel(viewing)}</Button>
                  ) : (
                    <>
                      <Button variant="secondary" loading={acting === `${viewing.id}:verified`} onClick={() => decide(viewing, 'verified')}>Approve only</Button>
                      <Button leftIcon={<FiSend aria-hidden="true" />} onClick={() => { setBuilding(viewing); setViewing(null); }}>Prepare offer</Button>
                    </>
                  )}
                </>
              )}
            </>
          )
        }
      >
        {viewing?.source === 'consultation' ? (
          <pre className="ph-rx__doctor-full">{viewing.doctorText}</pre>
        ) : viewingFile.loading ? (
          <p className="ph-muted">Loading the prescription…</p>
        ) : viewingFile.href && !viewingFile.isPdf ? (
          <img src={viewingFile.href} alt={`Prescription ${shortRx(viewing.id)}`} className="ph-rx__full" />
        ) : viewingFile.href ? (
          <p className="ph-muted">This is a PDF. Use “Open original” to read it.</p>
        ) : (
          <p className="ph-muted">The file for this prescription couldn’t be loaded.</p>
        )}
      </Modal>

      <OfferBuilder rx={building} onClose={() => setBuilding(null)} onSent={offerSent} />
      <PrescriptionChat rx={chatting} role="pharmacy" patientName={chatting?.userId?.name} onClose={() => setChatting(null)} />

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
