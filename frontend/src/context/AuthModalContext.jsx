import { createContext, useContext, useState, useCallback } from 'react';

/**
 * AuthModalContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the visibility of the login-required modal that appears when
 * unauthenticated users try to add items to cart.
 *
 * Exposed values:
 *   showLoginModal   – boolean indicating if modal is visible
 *   openLoginModal() – show the modal
 *   closeLoginModal()– hide the modal
 */

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const openLoginModal = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const value = {
    showLoginModal,
    openLoginModal,
    closeLoginModal,
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used inside <AuthModalProvider>');
  }
  return ctx;
}
