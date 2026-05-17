import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';

export default function NotFound() {
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center text-center py-5 min-vh-50">
      <div className="not-found-emoji display-1 mb-3">🔍</div>
      <h2 className="display-5 fw-bold text-primary mb-3">404 – Page Not Found</h2>
      <p className="text-muted fs-5 mb-4 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary px-4 py-2 fw-semibold">
        ← Back to Home
      </Link>
    </Container>
  );
}
