import { Suspense } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import AppNavbar from '../components/layout/Navbar/Navbar';
import AppFooter from '../components/layout/Footer/Footer';
import ScrollToTop from '../components/layout/ScrollToTop';
import ErrorBoundary from '../components/feedback/ErrorBoundary';
import { PageLoader } from '../components/ui';
import LoginRequiredModal from '../features/auth/components/LoginRequiredModal';
import { useAuthModal } from '../context/AuthModalContext';
import Providers from './Providers';
import AppRoutes from './routes';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../index.css';

function Shell() {
  const { showLoginModal, closeLoginModal } = useAuthModal();
  const { pathname } = useLocation();

  return (
    <div className="app-wrapper">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AppNavbar />

      {/* key on pathname re-triggers the subtle page-enter animation per route */}
      <main id="main-content" className="main-content" tabIndex={-1}>
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </main>

      <AppFooter />
      <LoginRequiredModal show={showLoginModal} onHide={closeLoginModal} />
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <ScrollToTop />
        <Shell />
      </BrowserRouter>
    </Providers>
  );
}
