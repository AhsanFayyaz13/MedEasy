import { useState } from 'react';
import { FiCalendar, FiClock, FiXCircle } from 'react-icons/fi';
import api from '../../../services/api/client';
import { useToast } from '../../../context/ToastContext';
import { Badge, Button, EmptyState, Input, Modal, SearchInput, Table, Tabs } from '../../../components/ui';
import { APPOINTMENT_TONE } from '../../appointments/lib/appointmentUtils';
import { fmtDate } from './adminShared';

const FILTERS = ['scheduled', 'completed', 'cancelled', 'all'];
const LABEL = { scheduled: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled', all: 'All' };

/** All appointments: admins can reschedule or cancel upcoming ones. */
export default function AppointmentsTab({ apts, setApts }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState('scheduled');
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [moving, setMoving] = useState(null);
  const [when, setWhen] = useState({ date: '', time: '' });
  const [busy, setBusy] = useState(false);

  const q = search.trim().toLowerCase();
  const visible = apts.filter((a) => (filter === 'all' || a.status === filter) && (!q || `${a.patientName} ${a.doctorName} ${a.reason || ''}`.toLowerCase().includes(q)));

  const save = async (a, body, after) => {
    setBusy(true);
    try {
      const { data } = await api.put(`/appointments/${a.id}`, body);
      setApts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: data.status, date: data.date, time: data.time } : x)));
      after(data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update the appointment.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () =>
    save(cancelling, { status: 'cancelled' }, () => {
      toast.success('Appointment cancelled.');
      setCancelling(null);
    });

  const openMove = (a) => {
    setWhen({ date: String(a.date).slice(0, 10), time: a.time || '' });
    setMoving(a);
  };

  const confirmMove = (e) => {
    e.preventDefault();
    if (!when.date || !when.time.trim()) return;
    save(moving, { date: when.date, time: when.time.trim() }, () => {
      toast.success('Appointment rescheduled.');
      setMoving(null);
    });
  };

  const columns = [
    { key: 'patient', header: 'Patient', render: (a) => <strong>{a.patientName}</strong> },
    { key: 'doctor', header: 'Doctor', render: (a) => <div className="adm-stack"><span className="adm-strong">{a.doctorName}</span><span>{a.doctorId?.specialty}</span></div> },
    { key: 'when', header: 'When', render: (a) => <div className="adm-stack"><span>{fmtDate(a.date)}</span><span>{a.time}</span></div> },
    { key: 'reason', header: 'Reason', render: (a) => <span className="adm-muted">{a.reason || '—'}</span> },
    { key: 'status', header: 'Status', render: (a) => <Badge tone={APPOINTMENT_TONE[a.status] || 'neutral'}>{a.status}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (a) =>
        a.status === 'scheduled' ? (
          <div className="adm-actions">
            <Button size="sm" variant="secondary" leftIcon={<FiClock aria-hidden="true" />} onClick={() => openMove(a)}>Reschedule</Button>
            <Button size="sm" variant="ghost" className="adm-danger" leftIcon={<FiXCircle aria-hidden="true" />} onClick={() => setCancelling(a)}>Cancel</Button>
          </div>
        ) : (
          <span className="adm-muted">—</span>
        ),
    },
  ];

  return (
    <div className="adm-section">
      <div className="adm-toolbar">
        <Tabs tabs={FILTERS.map((f) => ({ id: f, label: LABEL[f], badge: f === 'all' ? null : apts.filter((a) => a.status === f).length || null }))} active={filter} onChange={setFilter} label="Filter appointments" />
        <SearchInput label="Search appointments" placeholder="Patient, doctor or reason" value={search} onChange={setSearch} />
      </div>

      <Table columns={columns} data={visible} rowKey="id" caption="Appointments" empty={<EmptyState icon={<FiCalendar />} title={`No ${LABEL[filter].toLowerCase()} appointments`} />} />

      <Modal
        show={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this appointment?"
        description={cancelling ? `${cancelling.patientName} with ${cancelling.doctorName} on ${fmtDate(cancelling.date)} at ${cancelling.time}. Both will be notified.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(null)}>Keep</Button>
            <Button variant="danger" loading={busy} onClick={confirmCancel}>Cancel appointment</Button>
          </>
        }
      />

      <Modal
        show={!!moving}
        onClose={() => setMoving(null)}
        title="Reschedule appointment"
        description={moving ? `${moving.patientName} with ${moving.doctorName}. Both will be notified.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoving(null)}>Cancel</Button>
            <Button type="submit" form="reschedule-form" loading={busy}>Save</Button>
          </>
        }
      >
        <form id="reschedule-form" onSubmit={confirmMove} className="row g-3">
          <div className="col-sm-6"><Input label="Date" type="date" required min={new Date().toISOString().slice(0, 10)} value={when.date} onChange={(e) => setWhen((w) => ({ ...w, date: e.target.value }))} /></div>
          <div className="col-sm-6"><Input label="Time" required placeholder="10:30" value={when.time} onChange={(e) => setWhen((w) => ({ ...w, time: e.target.value }))} /></div>
        </form>
      </Modal>
    </div>
  );
}
