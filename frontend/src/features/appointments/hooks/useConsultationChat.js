import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'medeasy_chats';

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Messages for one appointment (localStorage-backed, polled every second so
 * the patient and doctor tabs see each other's messages).
 */
export default function useConsultationChat(appointmentId) {
  const [messages, setMessages] = useState([]);

  const load = useCallback(() => {
    if (appointmentId == null) return;
    setMessages(readAll().filter((m) => m.appointmentId === appointmentId));
  }, [appointmentId]);

  useEffect(() => {
    if (appointmentId == null) return undefined;
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [appointmentId, load]);

  const send = useCallback(
    (message) => {
      const all = readAll();
      const msg = { id: `msg-${Date.now()}`, appointmentId, time: Date.now(), ...message };
      all.push(msg);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    [appointmentId]
  );

  return { messages, send };
}
