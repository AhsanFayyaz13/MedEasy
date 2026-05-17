import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="d-flex flex-column align-items-center justify-content-center text-center py-5 mt-5">
          <FaExclamationTriangle size={64} className="text-danger mb-4" />
          <h1 className="fw-bold mb-3">Oops! Something went wrong.</h1>
          <p className="text-muted mb-4 max-w-md mx-auto">
            We encountered an unexpected error while loading this page. 
            Our technical team has been notified.
          </p>
          <div className="d-flex gap-3">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="outline-secondary" onClick={() => window.location.href = '/'}>
              Go to Homepage
            </Button>
          </div>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <div className="mt-5 p-3 bg-light rounded text-start w-100 overflow-auto" style={{ maxHeight: '200px' }}>
              <code>{this.state.error.toString()}</code>
            </div>
          )}
        </Container>
      );
    }

    return this.props.children;
  }
}
