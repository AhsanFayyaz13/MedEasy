import { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaStar, FaRegStar, FaUserCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import './ReviewSection.css';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';

// Helper to render stars
export function StarRating({ rating, interactive = false, onRating = () => {} }) {
  const [hoverRating, setHoverRating] = useState(0);

  const stars = Array.from({ length: 5 }, (_, i) => {
    const starValue = i + 1;
    const isFilled = starValue <= (interactive ? (hoverRating || rating) : rating);
    return (
      <span
        key={i}
        className={`star-icon ${interactive ? 'interactive' : ''} ${isFilled ? 'filled' : ''}`}
        onClick={() => interactive && onRating(starValue)}
        onMouseEnter={() => interactive && setHoverRating(starValue)}
        onMouseLeave={() => interactive && setHoverRating(0)}
      >
        {isFilled ? <FaStar /> : <FaRegStar />}
      </span>
    );
  });

  return <div className="star-rating">{stars}</div>;
}

export default function ReviewSection({ targetType, targetId, initialReviews = [] }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch reviews (simulated or real)
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        if (USE_MOCK) {
          // Simulate network delay
          await new Promise((r) => setTimeout(r, 500));
          // Provide some dummy reviews if initialReviews is empty
          if (initialReviews.length === 0) {
            setReviews([
              { id: 1, user_name: 'John Doe', rating: 4, comment: 'Great experience!', date: '2026-05-10' },
              { id: 2, user_name: 'Aisha K.', rating: 5, comment: 'Highly recommended.', date: '2026-05-12' }
            ]);
          } else {
            setReviews(initialReviews);
          }
        } else {
          const { data } = await api.get('/reviews', {
            params: { targetType, targetId }
          });
          setReviews(data);
        }
      } catch (err) {
        console.error('Failed to fetch reviews', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [targetType, targetId, initialReviews]);

  const avgRating = reviews.length > 0 
    ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
    : 0;

  const canReview = isAuthenticated && user && user.role !== 'pharmacist';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating.');
      return;
    }
    if (!comment.trim()) {
      setError('Please enter a comment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 600));
        const newReview = {
          id: Date.now(),
          user_name: user.name || 'Anonymous',
          rating,
          comment,
          date: new Date().toISOString().slice(0, 10),
        };
        setReviews([newReview, ...reviews]);
      } else {
        const { data } = await api.post('/reviews', {
          targetType,
          targetId,
          rating,
          comment
        });
        setReviews([data, ...reviews]);
      }
      toast.success('Review submitted successfully!');
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-section mt-5">
      <h3 className="mb-4">Reviews & Ratings</h3>
      
      {/* Average Summary */}
      <div className="review-summary d-flex align-items-center mb-4 p-3 bg-light rounded">
        <div className="me-4 text-center">
          <h2 className="display-4 mb-0 fw-bold">{avgRating.toFixed(1)}</h2>
          <StarRating rating={avgRating} />
          <small className="text-muted">{reviews.length} reviews</small>
        </div>
      </div>

      {/* Review Form */}
      {canReview ? (
        <div className="review-form-box mb-5 p-4 border rounded bg-white shadow-sm">
          <h5 className="mb-3">Write a Review</h5>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label d-block text-muted mb-1">Rating</label>
              <StarRating rating={rating} interactive={true} onRating={setRating} />
            </div>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? <><Spinner size="sm" className="me-2"/>Submitting...</> : 'Submit Review'}
            </Button>
          </Form>
        </div>
      ) : (
        <Alert variant="info" className="mb-5">
          {!isAuthenticated 
            ? 'Please log in to leave a review.' 
            : 'Your account role does not permit leaving reviews for this item.'}
        </Alert>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {loading ? (
          <div className="text-center py-4"><Spinner animation="border" variant="secondary" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-muted">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="review-card p-3 mb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center">
                  <FaUserCircle className="text-secondary me-2 fs-4" />
                  <strong>{r.user_name}</strong>
                </div>
                <small className="text-muted">{r.date}</small>
              </div>
              <div className="mb-2">
                <StarRating rating={r.rating} />
              </div>
              <p className="mb-0 review-comment">{r.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
