import api from './api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const MOCK_REVIEWS = [
  { _id: 'rev-1', rating: 5, comment: 'Amazing service! Panadol was delivered within 30 minutes in Karachi.', user: { name: 'Ahsan Fayyaz' }, createdAt: '2026-05-20T10:00:00Z' },
  { _id: 'rev-2', rating: 4, comment: 'The doctor consultation chat is really helpful. Got my prescription verified instantly.', user: { name: 'Amna Bibi' }, createdAt: '2026-05-18T14:30:00Z' },
  { _id: 'rev-3', rating: 5, comment: 'Very easy to upload prescriptions. Reliable pharmacy logistics.', user: { name: 'Kamran Ali' }, createdAt: '2026-05-15T09:15:00Z' }
];

/**
 * reviewService.js
 * Simple wrapper for fetching and posting reviews.
 */
export async function fetchReviews({ targetType, targetId, limit = 50 } = {}) {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_REVIEWS;
  }
  const params = { limit };
  if (targetType) params.targetType = targetType;
  if (targetId) params.targetId = targetId;

  const { data } = await api.get('/reviews', { params });
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function postReview({ targetType, targetId, rating, comment }) {
  if (USE_MOCK) {
    await delay(400);
    const newRev = {
      _id: 'rev-' + Math.random().toString(36).slice(2, 8),
      rating,
      comment,
      user: { name: 'M. Ahsan Fayyaz' },
      createdAt: new Date().toISOString()
    };
    MOCK_REVIEWS.unshift(newRev);
    return newRev;
  }
  const body = { rating, comment };
  if (targetType) body.targetType = targetType;
  if (targetId) body.targetId = targetId;

  const { data } = await api.post('/reviews', body);
  return data;
}

export default { fetchReviews, postReview };
