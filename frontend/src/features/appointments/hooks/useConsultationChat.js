import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMessages, sendMessage } from '../../../services/api/notificationService';
import { useNotifications } from '../../../context/NotificationsContext';

/** How often an open chat checks for new messages (only while the tab is visible). */
const POLL_MS = 5000;

/**
 * Messages of one appointment's chat, from the API. While the chat is open it checks for new
 * messages every few seconds, asking only for ones newer than the last it has.
 */
export default function useConsultationChat(appointmentId) {
  const [messages, setMessages] = useState([]);
  const [canSend, setCanSend] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastAt = useRef(null);
  const { refresh: refreshNotifications } = useNotifications();

  const merge = useCallback((incoming) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      lastAt.current = next[next.length - 1]?.createdAt || lastAt.current;
      return next;
    });
  }, []);

  useEffect(() => {
    if (appointmentId == null) return undefined;
    let cancelled = false;
    lastAt.current = null;

    const load = async (first) => {
      try {
        const data = await fetchMessages(appointmentId, first ? undefined : lastAt.current);
        if (cancelled) return;
        if (first) {
          setMessages(data.messages);
          lastAt.current = data.messages[data.messages.length - 1]?.createdAt || null;
          refreshNotifications(); // opening the chat cleared its alert
        } else {
          merge(data.messages);
        }
        setCanSend(data.canSend);
        setError('');
      } catch (e) {
        if (!cancelled && first) setError(e.response?.data?.message || 'Couldn’t load the messages. Check your connection.');
      } finally {
        if (!cancelled && first) setLoading(false);
      }
    };

    const start = setTimeout(() => {
      setMessages([]);
      setLoading(true);
      load(true);
    }, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [appointmentId, merge, refreshNotifications]);

  /** Send a message; resolves to true when it was delivered. */
  const send = useCallback(
    async (text) => {
      try {
        const msg = await sendMessage(appointmentId, text);
        merge([msg]);
        setError('');
        return true;
      } catch (e) {
        const code = e.response?.data?.error?.code;
        if (code === 'CHAT_CLOSED') setCanSend(false);
        setError(e.response?.data?.message || 'Your message wasn’t sent. Check your connection and try again.');
        return false;
      }
    },
    [appointmentId, merge]
  );

  return { messages, send, canSend, loading, error };
}
