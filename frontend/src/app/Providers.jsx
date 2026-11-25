import { AuthProvider } from '../context/AuthContext';
import { AuthModalProvider } from '../context/AuthModalContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import { DataProvider } from '../context/DataContext';

/** Composes all global context providers in dependency order. */
export default function Providers({ children }) {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <CartProvider>
          <ToastProvider>
            <DataProvider>{children}</DataProvider>
          </ToastProvider>
        </CartProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}
