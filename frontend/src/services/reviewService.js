import api from './api';

/**
 * reviewService.js
 * Simple wrapper for fetching and posting reviews.
 */
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

export default { fetchReviews, postReview };
