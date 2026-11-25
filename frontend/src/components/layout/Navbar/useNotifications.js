import { useCallback, useEffect, useState } from 'react';

const keyFor = (user) => 'medeasy_notifications_' + (user?._id || user?.id || user?.role || 'guest');

const DEFAULTS = () => [
  { id: 'n1', text: 'Welcome to MedEasy! Your health portal is active.', time: Date.now() - 3600000, emoji: 'welcome', unread: true },
  { id: 'n2', text: 'Your appointments and orders can be managed in real time.', time: Date.now() - 7200000, emoji: 'system', unread: false },
];

/**
 * In-browser notification feed (localStorage-backed, polled every 2s).
 * NOTE: this is a client-side stand-in; a server notification API is
 * recommended so notifications reach users on other devices.
 */
export default function useNotifications(user, enabled) {
  const [notifications, setNotifications] = useState([]);

  const load = useCallback(() => {
    if (!enabled) return;
    try {
      const primaryKey = keyFor(user);
      let items = JSON.parse(localStorage.getItem(primaryKey) || 'null');

      // Patients also receive the shared "broadcast" fallback feed.
      if (user?.role === 'patient' || (!user?.role && user?._id)) {
        const broadcastKey = 'medeasy_notifications_patient';
        const broadcastRaw = localStorage.getItem(broadcastKey);
        if (broadcastRaw) {
          const broadcastItems = JSON.parse(broadcastRaw);
          if (items) {
            const existingIds = new Set(items.map((n) => n.id));
            const newOnes = broadcastItems.filter((n) => !existingIds.has(n.id));
            if (newOnes.length > 0) items = [...newOnes, ...items].sort((a, b) => b.time - a.time);
          } else {
            items = broadcastItems;
          }
          localStorage.setItem(primaryKey, JSON.stringify(items));
          localStorage.removeItem(broadcastKey);
        }
      }

      if (!items) {
        items = DEFAULTS();
        localStorage.setItem(primaryKey, JSON.stringify(items));
      }
      setNotifications(items);
    } catch (e) {
      console.error(e);
    }
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled) return undefined;
    const first = setTimeout(load, 0);
    const interval = setInterval(load, 2000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [enabled, load]);

  const persist = useCallback(
    (updated) => {
      localStorage.setItem(keyFor(user), JSON.stringify(updated));
      setNotifications(updated);
    },
    [user]
  );

  const markAllRead = () => persist(notifications.map((n) => ({ ...n, unread: false })));
  const markAsRead = (id) => persist(notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)));

  return {
    notifications: enabled ? notifications : [],
    unreadCount: enabled ? notifications.filter((n) => n.unread).length : 0,
    markAllRead,
    markAsRead,
  };
}
