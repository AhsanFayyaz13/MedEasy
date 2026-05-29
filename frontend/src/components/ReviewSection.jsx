import { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaStar, FaRegStar, FaUserCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { fetchMyAppointments } from '../services/appointmentService';
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

  // Verified checkup credential checking
  const [hasCompletedCheckup, setHasCompletedCheckup] = useState(false);
  const [checkingCredential, setCheckingCredential] = useState(true);

  useEffect(() => {
    if (targetType !== 'doctor' || !isAuthenticated) {
      setHasCompletedCheckup(true);
      setCheckingCredential(false);
      return;
    }

    const checkCredential = async () => {
      try {
        const appointments = await fetchMyAppointments();
        const found = appointments.some(
          a => String(a.doctorId) === String(targetId) && a.status === 'completed'
        );
        setHasCompletedCheckup(found);
      } catch (err) {
        console.error("Error verifying doctor checkup credential:", err);
        // Fallback to true in case of service error so user isn't locked out entirely
        setHasCompletedCheckup(true);
      } finally {
        setCheckingCredential(false);
      }
    };

    checkCredential();
  }, [targetType, targetId, isAuthenticated]);

  // Fetch reviews (simulated or real)
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        if (USE_MOCK) {
          // Simulate network delay
          await new Promise((r) => setTimeout(r, 500));
          // Provide some dummy reviews if reviews state is empty
          setReviews((prevReviews) => {
            if (prevReviews.length === 0) {
              return [
                { id: 1, user_name: 'John Doe', rating: 4, comment: 'Great experience!', date: '2026-05-10' },
                { id: 2, user_name: 'Aisha K.', rating: 5, comment: 'Highly recommended.', date: '2026-05-12' }
              ];
            }
            return prevReviews;
          });
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
  }, [targetType, targetId]);

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
      {!isAuthenticated ? (
        <Alert variant="info" className="mb-5">
          Please log in to leave a review.
        </Alert>
      ) : !canReview ? (
        <Alert variant="info" className="mb-5">
          Your account role does not permit leaving reviews for this item.
        </Alert>
      ) : checkingCredential ? (
        <div className="text-center py-3 mb-5">
          <Spinner animation="border" variant="primary" size="sm" />
          <span className="ms-2 text-muted small">Verifying credentials...</span>
        </div>
      ) : !hasCompletedCheckup ? (
        <Alert variant="warning" className="mb-5 border-0 shadow-sm p-4 rounded-4" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
          <h6 className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: '#b45309', fontSize: '1rem' }}>
            🔒 Verified Consultation Required
          </h6>
          <p className="mb-0 text-muted small" style={{ lineHeight: '1.5' }}>
            You can only leave reviews for doctors you have had a completed consultation appointment with. This ensures all doctor ratings and reviews are authentic and verified for our patients.
          </p>
        </Alert>
      ) : (
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
