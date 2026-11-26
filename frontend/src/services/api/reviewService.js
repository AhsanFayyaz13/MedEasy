/** Review API calls. */
import api from './client';

/** Reviews of the MedEasy service itself (the API's default target). */
export const SITE_REVIEW_TARGET = { targetType: 'pharmacy', targetId: '000000000000000000000000' };
export async function fetchReviews({ targetType, targetId, limit = 50 } = {}) {
  const params = { limit };
  if (targetType) params.targetType = targetType;
  if (targetId) params.targetId = targetId;

  const { data } = await api.get('/reviews', { params });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function postReview({ targetType, targetId, rating, comment }) {
  const body = { rating, comment };
  if (targetType) body.targetType = targetType;
  if (targetId) body.targetId = targetId;

  const { data } = await api.post('/reviews', body);
  return data;
}

/** Edit your own review. Returns the review with the author populated. */
export async function updateReview(id, { rating, comment }) {
  const { data } = await api.put(`/reviews/${id}`, { rating, comment });
  return data;
}

export async function deleteReview(id) {
  await api.delete(`/reviews/${id}`);
}

export default { fetchReviews, postReview, updateReview, deleteReview };
