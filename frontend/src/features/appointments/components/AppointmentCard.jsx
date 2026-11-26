import { FiAlertTriangle, FiCalendar, FiClock, FiFileText, FiMessageCircle, FiXCircle } from 'react-icons/fi';
import { Badge, Button } from '../../../components/ui';
import { APPOINTMENT_TONE, fmtDate } from '../lib/appointmentUtils';
import { useNotifications } from '../../../context/NotificationsContext';

/** One of the patient's appointments with chat / cancel / report actions. */
export default function AppointmentCard({ appointment: a, cancelling, onChat, onCancel, onReport }) {
  const actionable = a.status === 'scheduled' || a.status === 'completed';
  const unread = useNotifications().hasUnreadChat(a.id);
  const chatButton = (
    <Button
      size="sm"
      variant="outline"
      className={unread ? 'chat-unread' : undefined}
      leftIcon={<FiMessageCircle aria-hidden="true" />}
      onClick={() => onChat(a)}
      aria-label={unread ? `Chat with ${a.doctorName}, new message` : `Chat with ${a.doctorName}`}
    >
      Chat
    </Button>
  );
  return (
    <article className={`appt-card appt-card--${a.status}`}>
      <header className="appt-card__head">
        <div>
          <h3 className="appt-card__doctor">{a.doctorName}</h3>
          <p className="appt-card__specialty">{a.specialty}</p>
        </div>
        <Badge tone={APPOINTMENT_TONE[a.status] || 'neutral'}>{a.status}</Badge>
      </header>

      <div className="appt-card__meta">
        <span><FiCalendar aria-hidden="true" /> {fmtDate(a.date)}</span>
        <span><FiClock aria-hidden="true" /> {a.time}</span>
      </div>

      {a.reason && <p className="appt-card__reason">“{a.reason}”</p>}
      {a.notes && (
        <div className="appt-card__note">
          <strong>Doctor’s notes</strong>
          <p>{a.notes}</p>
        </div>
      )}
      {a.prescription && (
        <div className="appt-card__rx">
          <FiFileText aria-hidden="true" />
          <div>
            <strong>Prescription issued</strong>
            <pre>{a.prescription}</pre>
          </div>
        </div>
      )}

      {actionable && (
        <div className="appt-card__actions">
          {a.status === 'scheduled' && (
            <>
              {chatButton}
              <Button
                size="sm"
                variant="secondary"
                loading={cancelling === a.id}
                leftIcon={<FiXCircle aria-hidden="true" />}
                onClick={() => onCancel(a.id)}
              >
                Cancel
              </Button>
            </>
          )}
          {a.status === 'completed' && chatButton}
          <Button size="sm" variant="ghost" leftIcon={<FiAlertTriangle aria-hidden="true" />} onClick={() => onReport(a)}>
            Report an issue
          </Button>
        </div>
      )}
    </article>
  );
}
