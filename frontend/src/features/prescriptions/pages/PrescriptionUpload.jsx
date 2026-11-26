import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiExternalLink, FiFileText, FiMessageCircle, FiShield, FiTrash2, FiUpload, FiXCircle } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { uploadPrescription, fetchPrescriptions, deletePrescription } from '../../../services/api/prescriptionService';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, FileDropzone, Modal, PageHeader, SkeletonCard, Textarea } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { formatDate } from '../../../lib/format';
import { assetUrl } from '../../../lib/media';
import { MAX_FILE_MB, validateFile } from '../../cart/components/checkoutShared';
import OfferCard from '../components/OfferCard';
import PrescriptionChat from '../components/PrescriptionChat';
import { useNotifications } from '../../../context/NotificationsContext';
import './PrescriptionUpload.css';

const STATUS = {
  pending: { label: 'Awaiting review', tone: 'warning', icon: <FiClock /> },
  verified: { label: 'Verified', tone: 'success', icon: <FiCheckCircle /> },
  rejected: { label: 'Declined', tone: 'error', icon: <FiXCircle /> },
};

const GUIDELINES = [
  'Issued within the last 30 days',
  'Shows the doctor’s stamp and signature',
  'Patient name matches your profile',
  'Clear, well-lit and readable',
];

const shortRxId = (id) => String(id || '').slice(-6).toUpperCase();
const when = (iso) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function PrescriptionItem({ rx, onDelete, onChanged, onMessage, highlighted }) {
  const cfg = STATUS[rx.status] || STATUS.pending;
  const href = rx.fileUrl ? assetUrl(rx.fileUrl) : null;
  const isImage = href && rx.fileType !== 'application/pdf';
  const fromDoctor = rx.source === 'consultation';
  const hasOffer = Boolean(rx.offer?.sentAt);
  const canMessage = rx.status !== 'rejected' && new Date(rx.expiresAt) > new Date();
  const unread = useNotifications().hasUnreadChat(`rx:${rx.id}`);

  return (
    <li className={`rxu-item${highlighted ? ' is-highlighted' : ''}`} id={`rx-${rx.id}`}>
      <div className="rxu-item__thumb">
        {isImage ? <img src={href} alt="" loading="lazy" /> : <FiFileText aria-hidden="true" />}
      </div>
      <div className="rxu-item__body">
        <div className="rxu-item__top">
          <div>
            <h3>{fromDoctor ? 'Doctor’s prescription' : 'Prescription'} #{shortRxId(rx.id)}</h3>
            <p className="rxu-item__meta">{fromDoctor ? 'From your MedEasy consultation · sent' : 'Uploaded'} {when(rx.uploadedAt)}</p>
          </div>
          <Badge tone={cfg.tone} icon={cfg.icon}>{cfg.label}</Badge>
        </div>
        {fromDoctor && rx.doctorText && <pre className="rxu-item__doctor">{rx.doctorText}</pre>}
        {rx.notes && <p className="rxu-item__note">“{rx.notes}”</p>}
        {rx.status === 'rejected' && (
          <p className="rxu-item__hint">
            {rx.rejectionReason ? <>Pharmacist’s note: “{rx.rejectionReason}”. </> : 'The pharmacist couldn’t accept this one. '}
            Please upload a clearer or newer prescription.
          </p>
        )}
        {rx.orders?.length > 0 && (
          <p className="rxu-item__meta">
            Used for {rx.orders.map((o, i) => (
              <span key={o.id}>{i > 0 && ', '}<Link to={`/orders/${o.id}`}>order {o.orderNumber}</Link></span>
            ))}
          </p>
        )}
        {rx.status === 'pending' && !rx.orders?.length && (
          <p className="rxu-item__hint is-info">
            A pharmacist is checking it and will send you what they can supply, with the price. You can then accept it here.
            {!fromDoctor && ' You can also choose it at checkout if you’ve already added the medicines to your cart.'}
          </p>
        )}
        {rx.status === 'verified' && !hasOffer && rx.usable && (
          <p className="rxu-item__hint is-ok">
            {`Approved${rx.refillable ? ' for repeat orders' : ''}. Choose it at checkout to order these medicines, until ${formatDate(rx.expiresAt)}.`}
          </p>
        )}
        {/* "Used for order …" already explains a used one; this covers expiry. */}
        {rx.status !== 'rejected' && !rx.usable && !rx.orders?.length && rx.unusableReason && <p className="rxu-item__meta">{rx.unusableReason}</p>}
        {hasOffer && <OfferCard key={rx.offer.version} rx={rx} onChanged={onChanged} onMessage={canMessage ? () => onMessage(rx) : undefined} />}
        <div className="rxu-item__actions">
          {href && (
            <Button size="sm" variant="secondary" href={href} target="_blank" rel="noreferrer" rightIcon={<FiExternalLink aria-hidden="true" />}>
              View file
            </Button>
          )}
          {canMessage && !hasOffer && (
            <Button
              size="sm"
              variant="secondary"
              className={unread ? 'chat-unread' : undefined}
              leftIcon={<FiMessageCircle aria-hidden="true" />}
              onClick={() => onMessage(rx)}
            >
              Message the pharmacy
            </Button>
          )}
          {rx.status === 'pending' && !rx.orders?.length && (
            <Button size="sm" variant="ghost" className="rxu-item__delete" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={() => onDelete(rx)}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PrescriptionUpload() {
  const { toast } = useToast();
  const requiredFor = useLocation().state?.requiredForMedicine;
  const focusId = useSearchParams()[0].get('rx');
  const [chatting, setChatting] = useState(null);

  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState(requiredFor ? `Prescription for: ${requiredFor}` : '');
  const [fileError, setFileError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchPrescriptions());
    } catch (e) {
      setError(e.response?.data?.message || 'We couldn’t load your prescriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Opened from a notification: bring that prescription into view.
  useEffect(() => {
    if (!focusId || loading) return;
    document.getElementById(`rx-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusId, loading]);

  /** After an offer changes: use the updated prescription if we have it, otherwise reload. */
  const changed = (updated) => {
    if (updated?.id) setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    else load();
  };

  const pick = (f) => {
    setFile(f);
    setFileError(f ? validateFile(f, true) : null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validateFile(file, true);
    if (err) return setFileError(err === 'A prescription is required for Rx items.' ? 'Choose a photo or PDF of your prescription.' : err);
    setUploading(true);
    try {
      await uploadPrescription(file, notes.trim());
      toast.success('Prescription sent. A pharmacist will tell you what they can supply.');
      setFile(null);
      setNotes('');
      load();
    } catch (e2) {
      toast.error(e2.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    setBusyDelete(true);
    try {
      await deletePrescription(deleting.id);
      setItems((prev) => prev.filter((p) => p.id !== deleting.id));
      toast.success('Prescription deleted.');
      setDeleting(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not delete the prescription.');
    } finally {
      setBusyDelete(false);
    }
  };

  const counts = items.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {});

  let history;
  if (loading) history = <div className="rxu-list">{[0, 1].map((i) => <SkeletonCard key={i} media={false} />)}</div>;
  else if (error) history = <ErrorState title="Couldn’t load your prescriptions" message={error} onRetry={load} />;
  else if (!items.length) history = <EmptyState icon={<FiFileText />} title="No prescriptions yet" description="Prescriptions you upload will appear here with their review status." />;
  else {
    history = (
      <ul className="rxu-list">
        {items.map((rx) => (
          <PrescriptionItem key={rx.id} rx={rx} onDelete={setDeleting} onChanged={changed} onMessage={setChatting} highlighted={rx.id === focusId} />
        ))}
      </ul>
    );
  }

  return (
    <div className="rxu-page">
      <PageMeta title="Upload prescription" noindex />
      <div className="container">
        <PageHeader
          eyebrow="Prescriptions"
          title="Send a prescription"
          subtitle="Send a photo of your prescription. A licensed pharmacist checks it and tells you what they can supply and the price, then you accept it with one click."
        />

        <div className="rxu-layout">
          <Card as="section" aria-labelledby="rxu-new">
            <h2 id="rxu-new" className="rxu-title"><FiUpload aria-hidden="true" /> New prescription</h2>
            {requiredFor && (
              <Alert tone="warning">
                <strong>{requiredFor}</strong> needs a prescription. Upload it here, then add the medicine to your cart once it’s verified.
              </Alert>
            )}
            <form onSubmit={submit} noValidate className="rxu-form">
              <FileDropzone
                file={file}
                onFile={pick}
                error={fileError}
                label="Drag & drop your prescription"
                hint={`JPG, PNG, WebP or PDF · max ${MAX_FILE_MB} MB`}
              />
              <Textarea
                label="Note for the pharmacist (optional)"
                rows={3}
                maxLength={500}
                placeholder="Medicine names, dosage or anything we should know"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button type="submit" block size="lg" loading={uploading} leftIcon={<FiUpload aria-hidden="true" />} id="upload-prescription-btn">
                Submit prescription
              </Button>
            </form>

            <div className="rxu-guide">
              <p><FiShield aria-hidden="true" /> A valid prescription is:</p>
              <ul>
                {GUIDELINES.map((g) => <li key={g}><FiCheckCircle aria-hidden="true" /> {g}</li>)}
              </ul>
            </div>
          </Card>

          <section aria-labelledby="rxu-history">
            <div className="rxu-history-head">
              <h2 id="rxu-history" className="rxu-title">Your prescriptions</h2>
              <div className="rxu-counts">
                {Object.entries(STATUS).map(([key, cfg]) =>
                  counts[key] ? <Badge key={key} tone={cfg.tone}>{counts[key]} {cfg.label.toLowerCase()}</Badge> : null
                )}
              </div>
            </div>
            {history}
          </section>
        </div>
      </div>

      <PrescriptionChat rx={chatting} role="patient" onClose={() => setChatting(null)} />

      <Modal
        show={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this prescription?"
        description="It hasn’t been reviewed yet. You can upload it again later."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="danger" loading={busyDelete} onClick={confirmDelete}>Delete</Button>
          </>
        }
      />
    </div>
  );
}
