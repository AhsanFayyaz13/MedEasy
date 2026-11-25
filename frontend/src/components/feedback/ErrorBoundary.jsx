import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import { FiAlertTriangle, FiHome, FiRefreshCw } from 'react-icons/fi';
import { Button } from '../ui';

/** Catches render errors in the page below it and recovers on the next navigation. */
class ErrorBoundaryClass extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error', error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && this.props.pathname !== prevProps.pathname) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="container">
        <div className="ui-state ui-state--error" role="alert" style={{ minHeight: '60vh', alignContent: 'center' }}>
          <div className="ui-state__icon" aria-hidden="true"><FiAlertTriangle /></div>
          <h1 className="ui-state__title">Something went wrong</h1>
          <p className="ui-state__text">This page hit an unexpected problem. Reloading usually fixes it.</p>
          <div className="ui-state__action" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Button leftIcon={<FiRefreshCw aria-hidden="true" />} onClick={() => window.location.reload()}>Reload page</Button>
            <Button variant="secondary" leftIcon={<FiHome aria-hidden="true" />} href="/">Go to home</Button>
          </div>
          {import.meta.env.DEV && (
            <details style={{ maxWidth: 640, marginTop: 'var(--space-6)', textAlign: 'left' }}>
              <summary>Error details (development only)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-xs)' }}>{error.stack || String(error)}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default function ErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundaryClass pathname={pathname}>{children}</ErrorBoundaryClass>;
}
