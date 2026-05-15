import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import { FaStar, FaRegStar } from 'react-icons/fa';
import './Reviews.css';

const SAMPLE_REVIEWS = [
  { id: 1, author: 'Sara K.', rating: 5, text: 'Excellent service! Medicines arrived within 2 hours.', date: '2026-05-10' },
  { id: 2, author: 'Ahmed R.', rating: 4, text: 'Good quality medicines and helpful pharmacists.', date: '2026-05-08' },
  { id: 3, author: 'Zara T.', rating: 5, text: 'Easy to upload prescriptions and very responsive team.', date: '2026-05-05' },
];

function StarDisplay({ rating }) {
  return (
    <div className="star-display">
      {Array.from({ length: 5 }, (_, i) =>
        i < rating ? <FaStar key={i} className="filled" /> : <FaRegStar key={i} />
      )}
    </div>
  );
}

/** Reviews page skeleton – submit logic in Phase 3. */
export default function Reviews() {
  return (
    <div className="reviews-page">
      <Container className="py-5">
        <h1 className="page-title">Customer Reviews</h1>

        {/* Existing reviews */}
        <Row className="gy-4 mb-5">
          {SAMPLE_REVIEWS.map((r) => (
            <Col md={4} key={r.id}>
              <Card className="review-card h-100">
                <Card.Body>
                  <StarDisplay rating={r.rating} />
                  <p className="review-text mt-2">"{r.text}"</p>
                  <div className="review-author">
                    <strong>{r.author}</strong>
                    <span className="review-date">{r.date}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Submit review */}
        <Card className="review-form-card mx-auto">
          <Card.Body className="p-4">
            <h5 className="section-heading">Leave a Review</h5>
            <Form>
              <Form.Group className="mb-3" controlId="reviewRating">
                <Form.Label>Rating</Form.Label>
                <Form.Select>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3" controlId="reviewText">
                <Form.Label>Your Review</Form.Label>
                <Form.Control as="textarea" rows={4} placeholder="Share your experience with MedEasy…" />
              </Form.Group>
              <Button type="submit" className="btn-primary-custom w-100">Submit Review</Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
