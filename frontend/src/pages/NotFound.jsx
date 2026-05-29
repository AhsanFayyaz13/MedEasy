import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function NotFound() {
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center text-center py-5 min-vh-50">
      <div className="auth-icon-badge-wrap mb-4 mx-auto" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
        <FaExclamationTriangle size={36} />
      </div>
      <h2 className="display-5 fw-bold text-primary mb-3">404 – Page Not Found</h2>
      <p className="text-muted fs-5 mb-4 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary px-4 py-2 fw-semibold" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1a3a5c 100%)', border: 'none', borderRadius: '10px' }}>
        ← Back to Home
      </Link>
    </Container>
  );
}
