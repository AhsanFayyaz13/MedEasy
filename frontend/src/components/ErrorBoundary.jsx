import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Automatically clear the error state when the user navigates/clicks a navbar link (location changes)
    if (this.state.hasError && this.props.location?.pathname !== prevProps.location?.pathname) {
      this.setState({ hasError: false, error: null, showDetails: false });
    }
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
          <div className="d-flex gap-3 mb-4">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="outline-secondary" onClick={() => window.location.href = '/'}>
              Go to Homepage
            </Button>
          </div>
          {this.state.error && (
            <div className="text-start w-100 mt-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <button 
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6c757d',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {this.state.showDetails ? 'Hide Developer Logs' : 'Show Developer Logs'}
              </button>
              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-light border rounded overflow-auto text-start" style={{ maxHeight: '200px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#dc3545' }}>
                  <strong>Technical Stack Trace:</strong>
                  <pre className="mt-2 mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.72rem', color: '#dc3545' }}>
                    {this.state.error.stack || this.state.error.toString()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Container>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper component that injects location prop from React Router
 * into the class ErrorBoundaryClass, allowing it to auto-recover on route navigation.
 */
export default function ErrorBoundary({ children }) {
  const location = useLocation();
  return (
    <ErrorBoundaryClass location={location}>
      {children}
    </ErrorBoundaryClass>
  );
}
