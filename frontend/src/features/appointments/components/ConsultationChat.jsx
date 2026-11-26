import { useEffect, useRef, useState } from 'react';
import { FiLock, FiSend } from 'react-icons/fi';
import { Badge, EmptyState, Modal, Spinner } from '../../../components/ui';
import { fmtDate, safeFmtTime } from '../lib/appointmentUtils';
import useConsultationChat from '../hooks/useConsultationChat';
import './ConsultationChat.css';

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
  const { messages, send, canSend, loading, error } = useConsultationChat(appointment?.id ?? null);
  const [localDraft, setLocalDraft] = useState('');
  const [sending, setSending] = useState(false);
  const text = draft ?? localDraft;
  const setText = setDraft ?? setLocalDraft;
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !appointment || sending) return;
    setSending(true);
    const ok = await send(value);
    setSending(false);
    if (ok) setText('');
  };

  const otherName = role === 'doctor' ? counterpart || 'Patient' : counterpart || 'Doctor';

  return (
    <Modal
      show={!!appointment}
      onClose={onClose}
      title={`Chat with ${counterpart || 'your contact'}`}
      description={appointment ? `Appointment #APT-${String(appointment.id).slice(-6)} · ${fmtDate(appointment.date)} at ${appointment.time}` : undefined}
      className="chat-modal"
    >
      {toolbar && canSend && <div className="chat__toolbar">{toolbar}</div>}

      <div className="chat__log" role="log" aria-live="polite" aria-label="Messages" aria-busy={loading}>
        {loading ? (
          <div className="chat__loading"><Spinner label="Loading messages" /></div>
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description={role === 'doctor' ? 'Send a message to start the consultation.' : 'Ask your doctor a question about this appointment.'}
          />
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === role;
            return (
              <div key={m.id} className={`chat__msg${mine ? ' is-mine' : ''}`}>
                <div className="chat__meta">
                  <span>{mine ? 'You' : otherName}</span>
                  <time dateTime={m.createdAt}>{safeFmtTime(m.createdAt)}</time>
                  {mine && m.readAt && <span className="chat__seen">Seen</span>}
                </div>
                <p className="chat__bubble">{m.text}</p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="chat__error" role="alert">{error}</p>}

      {canSend ? (
        <form className="chat__composer" onSubmit={submit}>
          <label htmlFor="chat-input" className="sr-only">Message</label>
          <input
            id="chat-input"
            className="ui-control"
            placeholder="Type your message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            autoComplete="off"
          />
          <button type="submit" className="chat__send" disabled={!text.trim() || sending} aria-label="Send message">
            <FiSend aria-hidden="true" />
          </button>
        </form>
      ) : (
        !loading && (
          <p className="chat__closed">
            <FiLock aria-hidden="true" />
            {appointment?.status === 'cancelled'
              ? 'This appointment was cancelled, so the chat is closed.'
              : 'This chat has closed (3 days after the appointment). Book a new appointment to talk again.'}
          </p>
        )
      )}

      {appointment?.status && (
        <div className="chat__status">
          <Badge tone={appointment.status === 'scheduled' ? 'primary' : 'neutral'}>{appointment.status}</Badge>
        </div>
      )}
    </Modal>
  );
}
