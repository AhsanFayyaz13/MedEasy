import { AuthProvider } from '../context/AuthContext';
import { AuthModalProvider } from '../context/AuthModalContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import { DataProvider } from '../context/DataContext';
import { NotificationsProvider } from '../context/NotificationsContext';

/** Composes all global context providers in dependency order. */
export default function Providers({ children }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <AuthModalProvider>
          <CartProvider>
            <ToastProvider>
              <DataProvider>{children}</DataProvider>
            </ToastProvider>
          </CartProvider>
        </AuthModalProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
