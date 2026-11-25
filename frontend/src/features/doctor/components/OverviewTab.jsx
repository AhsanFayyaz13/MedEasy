import { FiCalendar, FiCheckCircle, FiChevronRight, FiClock, FiEdit3, FiUser } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { Avatar, Badge, Button, EmptyState, Skeleton } from '../../../components/ui';
import { Panel, StatGrid, WelcomeBanner } from '../../../components/layout/DashboardLayout/widgets';
import { APPOINTMENT_TONE } from '../../appointments/lib/appointmentUtils';
import { fmtDate } from './doctorShared';

const dayOf = (d) => String(d || '').slice(0, 10);

/** Doctor landing tab: today’s numbers, next patient and today’s list. */
export default function OverviewTab({ apts, loading, setActive, openComplete }) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const todayList = apts.filter((a) => dayOf(a.date) === today);
  const pending = apts.filter((a) => a.status === 'scheduled');
  const completed = apts.filter((a) => a.status === 'completed');

  const next = pending
    .filter((a) => dayOf(a.date) >= today)
    .sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)) || String(a.time).localeCompare(String(b.time)))[0];

  const firstName = (user?.name || 'Doctor').replace(/^Dr\.?\s*/i, '').split(' ')[0];

  return (
    <>
      <WelcomeBanner title={`Good to see you, Dr. ${firstName}`} text="Your consultations, prescriptions and patients in one place.">
        <Button size="sm" variant="secondary" onClick={() => setActive('schedule')}>
          Open schedule
        </Button>
      </WelcomeBanner>

      <StatGrid
        loading={loading}
        stats={[
          { label: 'Today’s appointments', value: todayList.length, icon: <FiCalendar />, tone: 'primary' },
          { label: 'Pending consultations', value: pending.length, icon: <FiClock />, tone: 'violet' },
          { label: 'Completed cases', value: completed.length, icon: <FiCheckCircle />, tone: 'success' },
        ]}
      />

      <div className="row g-4">
        <div className="col-lg-6">
          <Panel title="Next appointment" icon={<FiUser />}>
            {loading ? (
              <Skeleton lines={4} />
            ) : next ? (
              <div className="doc-next">
                <div className="doc-next__who">
                  <Avatar name={next.patientName || 'Patient'} size={48} />
                  <div>
                    <strong>{next.patientName}</strong>
                    <span>{next.patientEmail}</span>
                  </div>
                </div>
                <dl className="doc-next__meta">
                  <div>
                    <dt>When</dt>
                    <dd>{fmtDate(next.date)} at {next.time}</dd>
                  </div>
                  <div>
                    <dt>Reason</dt>
                    <dd>{next.reason || 'General consultation'}</dd>
                  </div>
                </dl>
                <Button block leftIcon={<FiEdit3 aria-hidden="true" />} onClick={() => openComplete(next)}>
                  Start consultation
                </Button>
              </div>
            ) : (
              <EmptyState icon={<FiCheckCircle />} title="All caught up" description="No upcoming appointments scheduled." />
            )}
          </Panel>
        </div>

        <div className="col-lg-6">
          <Panel
            title="Today’s consultations"
            icon={<FiCalendar />}
            flush
            actions={<Button variant="link" size="sm" onClick={() => setActive('schedule')}>Full schedule</Button>}
          >
            {loading ? (
              <div className="p-4"><Skeleton lines={4} /></div>
            ) : todayList.length === 0 ? (
              <EmptyState title="Nothing scheduled today" description="Enjoy the breathing room." />
            ) : (
              <ul className="dw-list">
                {todayList.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{a.patientName}</strong>
                      <span>{a.time}</span>
                    </div>
                    <div className="dw-list__end">
                      <Badge tone={APPOINTMENT_TONE[a.status] || 'neutral'}>{a.status}</Badge>
                      {a.status === 'scheduled' && (
                        <Button size="sm" variant="outline" rightIcon={<FiChevronRight aria-hidden="true" />} onClick={() => openComplete(a)}>
                          Consult
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
