/** In-app notifications and the patient–doctor chat. */
import api from './client';

export async function fetchNotifications() {
  const { data } = await api.get('/notifications');
  return data; // { items: [{ id, type, text, link, thread, read, createdAt }], unread }
}

export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

/** Messages of an appointment's chat; with `after`, only newer ones. */
export async function fetchMessages(appointmentId, after) {
  const { data } = await api.get(`/appointments/${appointmentId}/messages`, { params: after ? { after } : undefined });
  return data; // { messages: [{ id, senderRole, text, createdAt, readAt }], canSend, closesAt }
}

export async function sendMessage(appointmentId, text) {
  const { data } = await api.post(`/appointments/${appointmentId}/messages`, { text });
  return data;
}
