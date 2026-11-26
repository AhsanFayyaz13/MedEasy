import { Badge, Modal } from '../../../components/ui';
import ChatThread from '../../../components/chat/ChatThread';
import { fmtDate } from '../lib/appointmentUtils';
import useConsultationChat from '../hooks/useConsultationChat';

/**
 * Chat dialog shared by patients (booking page) and doctors (dashboard). Messages are stored on
 * the server with the appointment; the other side gets a notification (and one email while unread).
 *
 * @param {object|null} appointment  open when set
 * @param {'patient'|'doctor'} role  the current user's side of the conversation
 * @param {string} counterpart       name shown in the title
 * @param {ReactNode} [toolbar]  extra controls under the header (doctor: suggest rescheduling)
 */
export default function ConsultationChat({ appointment, role, counterpart, onClose, toolbar, draft, setDraft }) {
  const thread = useConsultationChat(appointment?.id ?? null);
  const otherName = role === 'doctor' ? counterpart || 'Patient' : counterpart || 'Doctor';

  return (
    <Modal
      show={!!appointment}
      onClose={onClose}
      title={`Chat with ${counterpart || 'your contact'}`}
      description={appointment ? `Appointment #APT-${String(appointment.id).slice(-6)} · ${fmtDate(appointment.date)} at ${appointment.time}` : undefined}
      className="chat-modal"
    >
      {toolbar && thread.canSend && <div className="chat__toolbar">{toolbar}</div>}

      <ChatThread
        thread={thread}
        role={role}
        otherName={otherName}
        draft={draft}
        setDraft={setDraft}
        emptyText={role === 'doctor' ? 'Send a message to start the consultation.' : 'Ask your doctor a question about this appointment.'}
        closedText={appointment?.status === 'cancelled'
          ? 'This appointment was cancelled, so the chat is closed.'
          : 'This chat has closed (3 days after the appointment). Book a new appointment to talk again.'}
      />

      {appointment?.status && (
        <div className="chat__status">
          <Badge tone={appointment.status === 'scheduled' ? 'primary' : 'neutral'}>{appointment.status}</Badge>
        </div>
      )}
    </Modal>
  );
}
