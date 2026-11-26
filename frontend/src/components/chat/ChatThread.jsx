import { useEffect, useId, useRef, useState } from 'react';
import { FiLock, FiSend } from 'react-icons/fi';
import { EmptyState, Spinner } from '../ui';
import { formatDate } from '../../lib/format';
import './ChatThread.css';

const timeOf = (iso) => formatDate(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * The message log and composer of a conversation (patient–doctor or patient–pharmacy).
 * Pass the state from useMessageThread.
 *
 * @param {string} role        the current user's side: messages with this senderRole are "You"
 * @param {string} otherName   how the other side is named
 * @param {string} emptyText   shown before anyone has written
 * @param {ReactNode} closedText  shown instead of the composer when writing is closed
 */
export default function ChatThread({ thread, role, otherName, emptyText, closedText, draft, setDraft }) {
  const { messages, send, canSend, loading, error } = thread;
  const [localDraft, setLocalDraft] = useState('');
  const [sending, setSending] = useState(false);
  const text = draft ?? localDraft;
  const setText = setDraft ?? setLocalDraft;
  const bottomRef = useRef(null);
  const inputId = useId();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const ok = await send(value);
    setSending(false);
    if (ok) setText('');
  };

  return (
    <>
      <div className="chat__log" role="log" aria-live="polite" aria-label="Messages" aria-busy={loading}>
        {loading ? (
          <div className="chat__loading"><Spinner label="Loading messages" /></div>
        ) : messages.length === 0 ? (
          <EmptyState title="No messages yet" description={emptyText} />
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === role;
            return (
              <div key={m.id} className={`chat__msg${mine ? ' is-mine' : ''}`}>
                <div className="chat__meta">
                  <span>{mine ? 'You' : otherName}</span>
                  <time dateTime={m.createdAt}>{timeOf(m.createdAt)}</time>
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
          <label htmlFor={inputId} className="sr-only">Message</label>
          <input
            id={inputId}
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
        !loading && <p className="chat__closed"><FiLock aria-hidden="true" />{closedText}</p>
      )}
    </>
  );
}
