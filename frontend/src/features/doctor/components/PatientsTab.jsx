import { useMemo, useState } from 'react';
import { FiFileText, FiMail, FiPhone, FiUsers } from 'react-icons/fi';
import { Avatar, Badge, Card, EmptyState, SearchInput } from '../../../components/ui';
import { APPOINTMENT_TONE } from '../../appointments/lib/appointmentUtils';
import { fmtDate } from './doctorShared';
import { formatPhone, phoneHref } from '../../../lib/format';

const keyOf = (a) => String(a.patientId || a.patientEmail || a.patientName);

/** Patients the doctor has seen, with each patient's consultation history. */
export default function PatientsTab({ apts }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const patients = useMemo(() => {
    const map = new Map();
    apts.forEach((a) => {
      const k = keyOf(a);
      const p = map.get(k) || { key: k, name: a.patientName, email: a.patientEmail, phone: a.patientPhone, visits: [] };
      p.visits.push(a);
      map.set(k, p);
    });
    return [...map.values()]
      .map((p) => ({ ...p, visits: p.visits.sort((x, y) => String(y.date).localeCompare(String(x.date))) }))
      .sort((x, y) => String(y.visits[0].date).localeCompare(String(x.visits[0].date)));
  }, [apts]);

  const q = search.trim().toLowerCase();
  const visible = patients.filter((p) => !q || `${p.name} ${p.email || ''} ${p.phone || ''}`.toLowerCase().includes(q));
  const active = patients.find((p) => p.key === selected) || visible[0];

  if (!patients.length) {
    return <EmptyState icon={<FiUsers />} title="No patients yet" description="Patients appear here once they book a consultation with you." />;
  }

  return (
    <div className="doc-patients">
      <Card padded={false} className="doc-patients__list">
        <div className="doc-patients__search">
          <SearchInput label="Search patients" placeholder="Name, email or phone" value={search} onChange={setSearch} />
        </div>
        {visible.length === 0 ? (
          <p className="doc-muted">No patients match “{search}”.</p>
        ) : (
          <ul>
            {visible.map((p) => (
              <li key={p.key}>
                <button type="button" className={p.key === active?.key ? 'is-active' : undefined} aria-current={p.key === active?.key ? 'true' : undefined} onClick={() => setSelected(p.key)}>
                  <Avatar name={p.name} size={36} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.visits.length} visit{p.visits.length > 1 ? 's' : ''} · last {fmtDate(p.visits[0].date)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {active && (
        <Card as="section" aria-label={`${active.name}’s record`} className="doc-record">
          <header className="doc-record__head">
            <Avatar name={active.name} size={56} />
            <div>
              <h2>{active.name}</h2>
              <p>
                {active.phone && <span><FiPhone aria-hidden="true" /> <a href={`tel:${phoneHref(active.phone)}`}>{formatPhone(active.phone)}</a></span>}
                {active.email && <span><FiMail aria-hidden="true" /> <a href={`mailto:${active.email}`}>{active.email}</a></span>}
              </p>
            </div>
          </header>

          <h3 className="doc-record__title">Consultation history</h3>
          <ol className="doc-visits">
            {active.visits.map((v) => (
              <li key={v.id}>
                <div className="doc-visits__top">
                  <strong>{fmtDate(v.date)} · {v.time}</strong>
                  <Badge tone={APPOINTMENT_TONE[v.status] || 'neutral'}>{v.status}</Badge>
                </div>
                {v.reason && <p><span>Reason:</span> {v.reason}</p>}
                {v.notes && <p><span>Notes:</span> {v.notes}</p>}
                {v.prescription && (
                  <div className="doc-visits__rx">
                    <span><FiFileText aria-hidden="true" /> Prescription</span>
                    <pre>{v.prescription}</pre>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
