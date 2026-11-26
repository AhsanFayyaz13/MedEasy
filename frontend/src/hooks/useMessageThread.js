import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotifications } from '../context/NotificationsContext';

/** How often an open conversation checks for new messages (only while the tab is visible). */
const POLL_MS = 5000;

/**
 * Messages of one conversation, from the API. While it is open it checks for new messages every
 * few seconds, asking only for ones newer than the last it has.
 *
 * @param {string|null} id  what the conversation is about (null: closed)
 * @param {(id, after?) => Promise<{ messages, canSend }>} fetchFn
 * @param {(id, text) => Promise<object>} sendFn
 */
export default function useMessageThread(id, fetchFn, sendFn) {
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
    if (id == null) return undefined;
    let cancelled = false;
    lastAt.current = null;

    const load = async (first) => {
      try {
        const data = await fetchFn(id, first ? undefined : lastAt.current);
        if (cancelled) return;
        if (first) {
          setMessages(data.messages);
          lastAt.current = data.messages[data.messages.length - 1]?.createdAt || null;
          refreshNotifications(); // opening the conversation cleared its alert
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
  }, [id, fetchFn, merge, refreshNotifications]);

  /** Send a message; resolves to true when it was delivered. */
  const send = useCallback(
    async (text) => {
      try {
        const msg = await sendFn(id, text);
        merge([msg]);
        setError('');
        return true;
      } catch (e) {
        if (e.response?.data?.error?.code === 'CHAT_CLOSED') setCanSend(false);
        setError(e.response?.data?.message || 'Your message wasn’t sent. Check your connection and try again.');
        return false;
      }
    },
    [id, sendFn, merge]
  );

  return { messages, send, canSend, loading, error };
}
