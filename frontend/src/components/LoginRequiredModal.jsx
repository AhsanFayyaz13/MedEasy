import { Modal, Button, Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import './LoginRequiredModal.css';

/**
 * LoginRequiredModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays when an unauthenticated user tries to add an item to cart.
 * Prompts them to either login or create an account.
 */
export default function LoginRequiredModal({ show, onHide }) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      className="login-required-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FaShoppingCart className="me-2" style={{ color: '#0d1b2a' }} />
          Login Required
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Container className="py-3">
          <div className="text-center mb-4">
            <h5 className="text-muted">
              To add items to your cart and complete your purchase, please login or create an account.
            </h5>
          </div>

          <Row className="g-3">
            {/* Login Option */}
            <Col md={6}>
              <div className="auth-option login-option p-4 rounded border text-center">
                <div className="auth-icon mb-3">
                  <FaSignInAlt size={32} style={{ color: '#0284c7' }} />
                </div>
                <h6 className="mb-3">Already a Member?</h6>
                <p className="text-muted small mb-3">
                  Sign in with your email and password
                </p>
                <Link to="/login" onClick={onHide}>
                  <Button variant="primary" className="w-100">
                    <FaSignInAlt className="me-2" />
                    Login
                  </Button>
                </Link>
              </div>
            </Col>

            {/* Register Option */}
            <Col md={6}>
              <div className="auth-option register-option p-4 rounded border text-center">
                <div className="auth-icon mb-3">
                  <FaUserPlus size={32} style={{ color: '#059669' }} />
                </div>
                <h6 className="mb-3">New Here?</h6>
                <p className="text-muted small mb-3">
                  Create an account in just a few steps
                </p>
                <Link to="/register" onClick={onHide}>
                  <Button variant="success" className="w-100">
                    <FaUserPlus className="me-2" />
                    Create Account
                  </Button>
                </Link>
              </div>
            </Col>
          </Row>

          <div className="mt-4 p-3 bg-light rounded text-center">
            <small className="text-muted">
              💡 Your shopping cart will be saved while you login or register.
            </small>
          </div>
        </Container>
      </Modal.Body>
    </Modal>
  );
}
