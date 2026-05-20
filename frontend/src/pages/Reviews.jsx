import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FaStar, FaRegStar } from 'react-icons/fa';
import './Reviews.css';
import { fetchReviews, postReview } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function StarDisplay({ rating }) {
  return (
    <div className="star-display">
      {Array.from({ length: 5 }, (_, i) =>
        i < rating ? <FaStar key={i} className="filled" /> : <FaRegStar key={i} />
      )}
    </div>
  );
}

export default function Reviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchReviews({ limit: 50 });
        if (mounted) setReviews(list);
      } catch (e) {
        toast.error('Failed to load reviews');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Please log in to submit a review.');
      return;
    }

    if (!comment.trim()) {
      setError('Please add a comment before submitting.');
      return;
    }

    try {
      await postReview({ rating, comment });
      toast.success('Review submitted');
      setComment('');
      setRating(5);
      const list = await fetchReviews({ limit: 50 });
      setReviews(list);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit review');
    }
  };

  return (
    <div className="reviews-page">
      <Container className="py-5">
        <h1 className="page-title">Customer Reviews</h1>

        <Row className="gy-4 mb-5">
          {loading && <p className="text-muted">Loading reviews…</p>}
          {!loading && reviews.length === 0 && (
            <Col>
              <p className="text-muted">No reviews yet. Be the first to share your experience.</p>
            </Col>
          )}
          {!loading && reviews.map((r) => (
            <Col md={4} key={r._id}>
              <Card className="review-card h-100">
                <Card.Body>
                  <StarDisplay rating={r.rating} />
                  <p className="review-text mt-2">"{r.comment || r.text}"</p>
                  <div className="review-author d-flex justify-content-between align-items-center">
                    <strong>{r.user?.name || 'Anonymous'}</strong>
                    <span className="review-date text-muted">{r.createdAt?.slice(0, 10)}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Card className="review-form-card mx-auto">
          <Card.Body className="p-4">
            <h5 className="section-heading">Leave a Review</h5>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="reviewRating">
                <Form.Label>Rating</Form.Label>
                <Form.Select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3" controlId="reviewComment">
                <Form.Label>Your Review</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Share your experience with MedEasy…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </Form.Group>
              <Button type="submit" className="btn-primary-custom w-100">Submit Review</Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
