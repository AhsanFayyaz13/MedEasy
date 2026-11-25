import { useState } from 'react';
import { FiCalendar, FiEdit3, FiFileText, FiMessageCircle, FiXCircle } from 'react-icons/fi';
import { Avatar, Badge, Button, EmptyState, Modal, SearchInput, Skeleton, Table, Tabs } from '../../../components/ui';
import { APPOINTMENT_TONE } from '../../appointments/lib/appointmentUtils';
import { fmtDate } from './doctorShared';

const FILTERS = ['all', 'scheduled', 'completed', 'cancelled'];
const LABEL = { all: 'All', scheduled: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' };

/** The doctor's appointment list with filters, search and per-row actions. */
export default function ScheduleTab({ apts, loading, openComplete, handleCancel, setViewRx, setChatApt }) {
  const [filter, setFilter] = useState('scheduled');
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  const q = search.trim().toLowerCase();
  const visible = apts.filter(
    (a) => (filter === 'all' || a.status === filter) && (!q || `${a.patientName} ${a.patientEmail} ${a.reason || ''}`.toLowerCase().includes(q))
  );
  const tabs = FILTERS.map((f) => ({ id: f, label: LABEL[f], badge: f === 'all' ? null : apts.filter((a) => a.status === f).length || null }));

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await handleCancel(cancelling.id);
      setCancelling(null);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'patient',
      header: 'Patient',
      render: (a) => (
        <div className="doc-person">
          <Avatar name={a.patientName} size={34} />
          <div>
            <strong>{a.patientName}</strong>
            {a.patientEmail && <span>{a.patientEmail}</span>}
          </div>
        </div>
      ),
    },
    { key: 'when', header: 'When', render: (a) => <span className="doc-when">{fmtDate(a.date)}<span>{a.time}</span></span> },
    { key: 'reason', header: 'Reason', render: (a) => <span className="doc-reason">{a.reason || '—'}</span> },
    { key: 'status', header: 'Status', render: (a) => <Badge tone={APPOINTMENT_TONE[a.status] || 'neutral'}>{a.status}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (a) => (
        <div className="doc-actions">
          {a.status === 'scheduled' && (
            <Button size="sm" leftIcon={<FiEdit3 aria-hidden="true" />} onClick={() => openComplete(a)}>Consult</Button>
          )}
          {a.status === 'completed' && a.prescription && (
            <Button size="sm" variant="secondary" leftIcon={<FiFileText aria-hidden="true" />} onClick={() => setViewRx(a)}>Prescription</Button>
          )}
          {a.status === 'completed' && (
            <Button size="sm" variant="ghost" onClick={() => openComplete(a)}>Edit notes</Button>
          )}
          {a.status !== 'cancelled' && (
            <Button size="sm" variant="ghost" leftIcon={<FiMessageCircle aria-hidden="true" />} onClick={() => setChatApt(a)} aria-label={`Chat with ${a.patientName}`}>
              Chat
            </Button>
          )}
          {a.status === 'scheduled' && (
            <Button size="sm" variant="ghost" className="doc-danger" leftIcon={<FiXCircle aria-hidden="true" />} onClick={() => setCancelling(a)}>Cancel</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="doc-section" aria-label="Schedule">
      <div className="doc-toolbar">
        <Tabs tabs={tabs} active={filter} onChange={setFilter} label="Filter appointments" />
        <SearchInput label="Search appointments" placeholder="Search patient or reason" value={search} onChange={setSearch} />
      </div>

      {loading ? (
        <Skeleton lines={6} />
      ) : (
        <Table
          columns={columns}
          data={visible}
          rowKey="id"
          caption="Appointments"
          empty={<EmptyState icon={<FiCalendar />} title={q ? 'No matching appointments' : `No ${LABEL[filter].toLowerCase()} appointments`} />}
        />
      )}

      <Modal
        show={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this appointment?"
        description={cancelling ? `${cancelling.patientName} · ${fmtDate(cancelling.date)} at ${cancelling.time}. The patient will be notified.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(null)}>Keep appointment</Button>
            <Button variant="danger" loading={busy} onClick={confirmCancel}>Cancel appointment</Button>
          </>
        }
      />
    </section>
  );
}
