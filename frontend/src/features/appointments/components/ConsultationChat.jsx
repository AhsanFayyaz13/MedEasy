import { useEffect, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { Badge, EmptyState, Modal } from '../../../components/ui';
import { fmtDate, safeFmtTime } from '../lib/appointmentUtils';
import useConsultationChat from '../hooks/useConsultationChat';
import './ConsultationChat.css';

/**
 * Chat dialog shared by patients (booking page) and doctors (dashboard).
 *
 * @param {object|null} appointment  open when set
 * @param {'patient'|'doctor'} role  the current user's side of the conversation
 * @param {string} counterpart       name shown in the title
 * @param {(text:string)=>object} buildMessage  returns sender fields for a new message
 * @param {(msg:object)=>void} [onSent]  e.g. notify the other party
 * @param {ReactNode} [toolbar]  extra controls under the header (doctor: suggest reschedule)
 */
export default function ConsultationChat({ appointment, role, counterpart, buildMessage, onSent, onClose, toolbar, draft, setDraft }) {
  const { messages, send } = useConsultationChat(appointment?.id ?? null);
  const [localDraft, setLocalDraft] = useState('');
  const text = draft ?? localDraft;
  const setText = setDraft ?? setLocalDraft;
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !appointment) return;
    const msg = send({ ...buildMessage(value), text: value });
    setText('');
    onSent?.(msg);
  };

  return (
    <Modal
      show={!!appointment}
      onClose={onClose}
      title={`Chat with ${counterpart || 'your contact'}`}
      description={appointment ? `Appointment #APT-${String(appointment.id).slice(-6)} · ${fmtDate(appointment.date)} at ${appointment.time}` : undefined}
      className="chat-modal"
    >
      {toolbar && <div className="chat__toolbar">{toolbar}</div>}

      <div className="chat__log" role="log" aria-live="polite" aria-label="Messages">
        {messages.length === 0 ? (
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
                  <span>{mine ? 'You' : m.senderName}</span>
                  <time>{safeFmtTime(m.time)}</time>
                </div>
                <p className="chat__bubble">{m.text}</p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

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
        <button type="submit" className="chat__send" disabled={!text.trim()} aria-label="Send message">
          <FiSend aria-hidden="true" />
        </button>
      </form>
      {appointment?.status && (
        <div className="chat__status">
          <Badge tone={appointment.status === 'scheduled' ? 'primary' : 'neutral'}>{appointment.status}</Badge>
        </div>
      )}
    </Modal>
  );
}
