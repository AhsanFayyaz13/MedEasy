import { useCallback, useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { FiCheck, FiInbox, FiSlash } from 'react-icons/fi';
import api from '../../../services/api/client';
import { useToast } from '../../../context/ToastContext';
import { Badge, Button, Card, EmptyState, Modal, Tabs } from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { sendNotification } from '../../../lib/notifications';
import { REPORT_TYPES } from '../../orders/lib/orderFeedback';
import { shortId } from './adminShared';

/*
 * NOTE: feedback, complaints and pharmacy ratings are still stored in the browser
 * (localStorage) by the pages that collect them, so this tab only sees what was
 * submitted on this device. Moving them to the API is on the to-do list.
 */
const KEYS = {
  feedback: 'medeasy_feedbacks',
  doctors: 'medeasy_doctor_reports',
  pharmacies: 'medeasy_pharmacy_reports',
  ratings: 'medeasy_pharmacy_reviews',
};
const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]').sort((a, b) => (b.time || 0) - (a.time || 0));
  } catch {
    return [];
  }
};
const write = (key, list) => localStorage.setItem(key, JSON.stringify(list));
const issueLabel = (v) => REPORT_TYPES.find((t) => t.value === v)?.label || v;

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

/** Patient feedback, complaints about doctors and pharmacies, and pharmacy ratings. */
export default function AuditsTab({ users = [], setUsers }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('doctors');
  const [data, setData] = useState({ feedback: [], doctors: [], pharmacies: [], ratings: [] });
  const [suspending, setSuspending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => setData(Object.fromEntries(Object.entries(KEYS).map(([k, key]) => [k, read(key)]))), []);

  useEffect(() => {
    load();
    // Pick up submissions made in other tabs of this browser.
    const onStorage = (e) => Object.values(KEYS).includes(e.key) && load();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  const update = (kind, id, patch) => {
    const list = read(KEYS[kind]).map((x) => (x.id === id ? { ...x, ...patch } : x));
    write(KEYS[kind], list);
    setData((d) => ({ ...d, [kind]: list }));
  };
  const remove = (kind, id) => {
    const list = read(KEYS[kind]).filter((x) => x.id !== id);
    write(KEYS[kind], list);
    setData((d) => ({ ...d, [kind]: list }));
  };

  const resolve = (kind, item) => {
    update(kind, item.id, { status: 'resolved', resolutionAction: 'resolved' });
    toast.success('Marked as resolved.');
  };

  /** Really suspends the doctor's account via the API, then records the outcome. */
  const confirmSuspend = async () => {
    const report = suspending;
    const doctor = users.find((u) => String(u.id) === String(report.doctorId));
    setBusy(true);
    try {
      if (doctor && doctor.status !== 'suspended') {
        const { data: res } = await api.put(`/admin/users/${doctor.id}/status`);
        setUsers?.((prev) => prev.map((u) => (u.id === doctor.id ? { ...u, status: res.user.status } : u)));
      }
      update('doctors', report.id, { status: 'resolved', resolutionAction: 'sanction' });
      sendNotification('doctor', report.doctorId, {
        text: 'Your account has been suspended while we review a patient complaint. Please contact support.',
        emoji: 'complaint',
        link: '/contact',
      });
      toast.success(`${report.doctorName} has been suspended.`);
      setSuspending(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not suspend the account.');
    } finally {
      setBusy(false);
    }
  };

  const open = (list) => list.filter((x) => x.status !== 'resolved').length || null;
  const tabs = [
    { id: 'doctors', label: 'Doctor complaints', badge: open(data.doctors) },
    { id: 'pharmacies', label: 'Order complaints', badge: open(data.pharmacies) },
    { id: 'ratings', label: 'Pharmacy ratings', badge: data.ratings.length || null },
    { id: 'feedback', label: 'Site feedback', badge: data.feedback.length || null },
  ];

  const statusBadge = (x) =>
    x.resolutionAction === 'sanction' ? <Badge tone="error">Doctor suspended</Badge> : x.status === 'resolved' ? <Badge tone="success">Resolved</Badge> : <Badge tone="warning">Open</Badge>;

  let body;
  if (tab === 'doctors') {
    body = data.doctors.map((r) => (
      <Item
        key={r.id}
        title={`${r.patientName} about ${r.doctorName}`}
        meta={`${r.specialty ? `${r.specialty} · ` : ''}appointment #APT-${shortId(r.appointmentId)} · ${formatDate(r.time)}`}
        badge={statusBadge(r)}
        actions={
          r.status !== 'resolved' && (
            <>
              <Button size="sm" leftIcon={<FiCheck aria-hidden="true" />} onClick={() => resolve('doctors', r)}>Resolve</Button>
              {r.doctorId && <Button size="sm" variant="ghost" className="adm-danger" leftIcon={<FiSlash aria-hidden="true" />} onClick={() => setSuspending(r)}>Suspend doctor</Button>}
            </>
          )
        }
      >
        {r.issueType && <p className="adm-audit__tag">{r.issueType}</p>}
        <p>{r.details}</p>
      </Item>
    ));
  } else if (tab === 'pharmacies') {
    body = data.pharmacies.map((r) => (
      <Item
        key={r.id}
        title={`${r.patientName} — ${issueLabel(r.issueType)}`}
        meta={`Order #${shortId(r.orderId)} · ${r.pharmacyName} · ${formatDate(r.time)}`}
        badge={statusBadge(r)}
        actions={r.status !== 'resolved' && <Button size="sm" leftIcon={<FiCheck aria-hidden="true" />} onClick={() => resolve('pharmacies', r)}>Resolve</Button>}
      >
        <p>{r.details}</p>
        {r.patientEmail && <p className="adm-muted">Reply to <a href={`mailto:${r.patientEmail}`}>{r.patientEmail}</a></p>}
      </Item>
    ));
  } else if (tab === 'ratings') {
    body = data.ratings.map((r) => (
      <Item
        key={r.id}
        title={`${r.patientName} rated ${r.pharmacyName}`}
        meta={`Order #${shortId(r.orderId)} · ${formatDate(r.time)}`}
        badge={<span className="adm-stars" aria-label={`${r.rating} out of 5`}>{Array.from({ length: r.rating }, (_, i) => <FaStar key={i} aria-hidden="true" />)}</span>}
        actions={<Button size="sm" variant="ghost" onClick={() => remove('ratings', r.id)}>Archive</Button>}
      >
        <p>{r.comment}</p>
      </Item>
    ));
  } else {
    body = data.feedback.map((f) => (
      <Item
        key={f.id}
        title={f.subject || 'Feedback'}
        meta={`${f.patientName}${f.patientEmail ? ` · ${f.patientEmail}` : ''} · ${formatDate(f.time)}`}
        badge={<Badge tone={f.feedbackType === 'bug' ? 'error' : f.feedbackType === 'compliment' ? 'success' : 'info'}>{f.feedbackType}</Badge>}
        actions={<Button size="sm" variant="ghost" leftIcon={<FiCheck aria-hidden="true" />} onClick={() => remove('feedback', f.id)}>Mark reviewed</Button>}
      >
        <p>{f.message}</p>
      </Item>
    ));
  }

  return (
    <div className="adm-section">
      <Tabs tabs={tabs} active={tab} onChange={setTab} label="Audit queues" />
      <p className="adm-muted">Only submissions made in this browser appear here until feedback is stored on the server.</p>
      {body.length ? <ul className="adm-audit-list">{body}</ul> : <EmptyState icon={<FiInbox />} title="Nothing here" description="New submissions will appear here." />}

      <Modal
        show={!!suspending}
        onClose={() => setSuspending(null)}
        title={`Suspend ${suspending?.doctorName || 'this doctor'}?`}
        description="They won’t be able to sign in until you reactivate them in Users. The complaint is marked resolved."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspending(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={confirmSuspend}>Suspend account</Button>
          </>
        }
      />
    </div>
  );
}
