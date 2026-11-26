import api from './client';

/**
 * Feedback, complaints and ratings, sent to the MedEasy team (admin Audits tab).
 * kind: 'site' | 'doctor' | 'order' | 'rating'.
 */
export async function submitFeedback(payload) {
  const { data } = await api.post('/feedback', payload);
  return data;
}

/** Admin: everything that was sent, newest first. */
export async function fetchFeedback() {
  const { data } = await api.get('/feedback');
  return data.items;
}

/** Admin: action is 'resolved' (default), 'sanction' (doctor suspended) or 'archived'. */
export async function resolveFeedback(id, action = 'resolved') {
  const { data } = await api.put(`/feedback/${id}`, { action });
  return data;
}

/** The server's message for a failed request, or a fallback. */
export const feedbackError = (e, fallback = 'Something went wrong. Please try again.') => e?.response?.data?.message || fallback;
