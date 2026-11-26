import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api/notificationService';

/**
 * The signed-in user's notifications, from the API. Checked every 30 seconds while the tab is
 * visible, and straight away when the user comes back to it (no paid push service needed).
 *
 *   const { notifications, unreadCount, markAsRead, markAllRead, refresh, hasUnreadChat } = useNotifications();
 */

const POLL_MS = 30_000;
const NotificationsContext = createContext(null);

// Older versions kept notifications and chats in this browser only; they are on the server now.
function removeLegacyStorage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k === 'medeasy_chats' || k.startsWith('medeasy_notifications_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}

const toItem = (n) => ({ id: n.id, type: n.type, text: n.text, link: n.link, thread: n.thread, time: n.createdAt, unread: !n.read });

export function NotificationsProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?._id || user?.id;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await fetchNotifications();
      setNotifications(data.items.map(toItem));
      setUnreadCount(data.unread);
    } catch {
      /* offline or the server is waking up: try again on the next tick */
    } finally {
      inFlight.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    removeLegacyStorage();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const clear = setTimeout(() => {
        setNotifications([]);
        setUnreadCount(0);
      }, 0);
      return () => clearTimeout(clear);
    }
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, userId, refresh]);

  const markAsRead = useCallback(
    (id) => {
      if (!notifications.some((n) => n.id === id && n.unread)) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(id).catch(() => {});
    },
    [notifications]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {});
  }, []);

  /** Whether there's an unread message in an appointment's chat (for the "Chat" button). */
  const hasUnreadChat = useCallback(
    (appointmentId) => notifications.some((n) => n.unread && n.thread === `chat:${appointmentId}`),
    [notifications]
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, markAsRead, markAllRead, refresh, hasUnreadChat }),
    [notifications, unreadCount, markAsRead, markAllRead, refresh, hasUnreadChat]
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
