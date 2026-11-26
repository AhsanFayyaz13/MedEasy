import { useCallback, useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { FiCheck, FiInbox, FiSlash } from 'react-icons/fi';
import api from '../../../services/api/client';
import { fetchFeedback, feedbackError, resolveFeedback } from '../../../services/api/feedbackService';
import { useToast } from '../../../context/ToastContext';
import { Badge, Button, Card, EmptyState, ErrorState, Modal, Skeleton, Tabs } from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { REPORT_TYPES } from '../../orders/lib/orderFeedback';
import { shortId } from './adminShared';

const issueLabel = (v) => REPORT_TYPES.find((t) => t.value === v)?.label || v;
const tidy = (v) => String(v || '').replace(/-/g, ' ');

function Item({ title, meta, badge, children, actions }) {
  return (
    <li>
      <Card as="article" className="adm-audit">
        <header>
          <div>
            <strong>{title}</strong>
            <span>{meta}</span>
          </div>
          {badge}
        </header>
        {children}
        {actions && <div className="adm-actions adm-actions--start">{actions}</div>}
      </Card>
    </li>
  );
}

/** Patient feedback, complaints about doctors and orders, and pharmacy ratings (stored on the server). */
export default function AuditsTab({ users = [], setUsers }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('doctors');
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });
  const [suspending, setSuspending] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      setItems(await fetchFeedback());
      setState({ loading: false, error: null });
    } catch (e) {
      setState({ loading: false, error: feedbackError(e, 'Couldn’t load the audit queues.') });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  /** Record the outcome on the server, then update the list. Resolves to true on success. */
  const settle = async (item, action, message) => {
    setBusy(item.id);
    try {
      const res = await resolveFeedback(item.id, action);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...res } : x)));
      if (message) toast.success(message);
      return true;
    } catch (e) {
      toast.error(feedbackError(e, 'Couldn’t update this item.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  /** Really suspends the doctor's account via the API, then records the outcome. */
  const confirmSuspend = async () => {
    const report = suspending;
    const doctor = users.find((u) => String(u.id) === String(report.doctor?.id));
    setBusy(report.id);
    try {
      if (doctor && doctor.status !== 'suspended') {
        const { data: res } = await api.put(`/admin/users/${doctor.id}/status`);
        setUsers?.((prev) => prev.map((u) => (u.id === doctor.id ? { ...u, status: res.user.status } : u)));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not suspend the account.');
      setBusy(null);
      return;
    }
    if (await settle(report, 'sanction', `${report.doctor?.name || 'The doctor'} has been suspended.`)) setSuspending(null);
  };

  const of = (kind, { hideDone = false } = {}) => items.filter((x) => x.kind === kind && (!hideDone || x.status !== 'resolved'));
  const doctors = of('doctor');
  const orders = of('order');
  const ratings = of('rating', { hideDone: true });
  const feedback = of('site', { hideDone: true });
  const openCount = (list) => list.filter((x) => x.status !== 'resolved').length || null;

  const tabs = [
    { id: 'doctors', label: 'Doctor complaints', badge: openCount(doctors) },
    { id: 'pharmacies', label: 'Order complaints', badge: openCount(orders) },
    { id: 'ratings', label: 'Pharmacy ratings', badge: ratings.length || null },
    { id: 'feedback', label: 'Site feedback', badge: feedback.length || null },
  ];

  const statusBadge = (x) =>
    x.action === 'sanction' ? <Badge tone="error">Doctor suspended</Badge> : x.status === 'resolved' ? <Badge tone="success">Resolved</Badge> : <Badge tone="warning">Open</Badge>;
  const replyTo = (x) => x.author.email && <p className="adm-muted">Reply to <a href={`mailto:${x.author.email}`}>{x.author.email}</a></p>;
  const resolveButton = (x) => (
    <Button size="sm" loading={busy === x.id} leftIcon={<FiCheck aria-hidden="true" />} onClick={() => settle(x, 'resolved', 'Marked as resolved. The patient has been told.')}>
      Resolve
    </Button>
  );

  let body;
  if (tab === 'doctors') {
    body = doctors.map((r) => (
      <Item
        key={r.id}
        title={`${r.author.name} about ${r.doctor?.name || 'a doctor'}`}
        meta={`${r.doctor?.specialty ? `${r.doctor.specialty} · ` : ''}appointment #APT-${shortId(r.appointmentId)} · ${formatDate(r.createdAt)}`}
        badge={statusBadge(r)}
        actions={
          r.status !== 'resolved' && (
            <>
              {resolveButton(r)}
              {r.doctor?.id && (
                <Button size="sm" variant="ghost" className="adm-danger" leftIcon={<FiSlash aria-hidden="true" />} onClick={() => setSuspending(r)}>
                  Suspend doctor
                </Button>
              )}
            </>
          )
        }
      >
        {r.category && <p className="adm-audit__tag">{tidy(r.category)}</p>}
        <p>{r.text}</p>
        {replyTo(r)}
      </Item>
    ));
  } else if (tab === 'pharmacies') {
    body = orders.map((r) => (
      <Item
        key={r.id}
        title={`${r.author.name} — ${issueLabel(r.category)}`}
        meta={`Order ${r.order?.ref || r.subject} · ${r.order?.pharmacyName || ''} · ${formatDate(r.createdAt)}`}
        badge={statusBadge(r)}
        actions={r.status !== 'resolved' && resolveButton(r)}
      >
        <p>{r.text}</p>
        {replyTo(r)}
      </Item>
    ));
  } else if (tab === 'ratings') {
    body = ratings.map((r) => (
      <Item
        key={r.id}
        title={`${r.author.name} rated ${r.order?.pharmacyName || 'the pharmacy'}`}
        meta={`Order ${r.order?.ref || r.subject} · ${formatDate(r.createdAt)}`}
        badge={<span className="adm-stars" aria-label={`${r.rating} out of 5`}>{Array.from({ length: r.rating }, (_, i) => <FaStar key={i} aria-hidden="true" />)}</span>}
        actions={<Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => settle(r, 'archived')}>Archive</Button>}
      >
        {r.text && <p>{r.text}</p>}
      </Item>
    ));
  } else {
    body = feedback.map((f) => (
      <Item
        key={f.id}
        title={f.subject || 'Feedback'}
        meta={`${f.author.name}${f.author.email ? ` · ${f.author.email}` : ''}${f.rating ? ` · ${f.rating}/5` : ''} · ${formatDate(f.createdAt)}`}
        badge={<Badge tone={f.category === 'bug' ? 'error' : f.category === 'compliment' ? 'success' : 'info'}>{f.category}</Badge>}
        actions={<Button size="sm" variant="ghost" loading={busy === f.id} leftIcon={<FiCheck aria-hidden="true" />} onClick={() => settle(f, 'archived')}>Mark reviewed</Button>}
      >
        <p>{f.text}</p>
      </Item>
    ));
  }

  let content;
  if (state.loading) content = <Card><Skeleton lines={6} /></Card>;
  else if (state.error) content = <ErrorState message={state.error} onRetry={load} />;
  else if (body.length) content = <ul className="adm-audit-list">{body}</ul>;
  else content = <EmptyState icon={<FiInbox />} title="Nothing here" description="New submissions will appear here." />;

  return (
    <div className="adm-section">
      <Tabs tabs={tabs} active={tab} onChange={setTab} label="Audit queues" />
      {content}

      <Modal
        show={!!suspending}
        onClose={() => setSuspending(null)}
        title={`Suspend ${suspending?.doctor?.name || 'this doctor'}?`}
        description="They won’t be able to sign in until you reactivate them in Users. The complaint is marked resolved."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspending(null)}>Cancel</Button>
            <Button variant="danger" loading={busy === suspending?.id} onClick={confirmSuspend}>Suspend account</Button>
          </>
        }
      />
    </div>
  );
}
