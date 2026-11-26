import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Toaster from '../components/feedback/Toaster';

/**
 * App-wide toasts: brief confirmations of actions that have no other visible result
 * (e.g. "Order ME-… confirmed" in a table). Don't use them to repeat what the page
 * already shows — prefer inline messages for form errors and page states.
 *
 *   toast.success('Saved.')
 *   toast.cart('Panadol added to cart', { action: { label: 'View cart', onClick: () => navigate('/cart') } })
 *   toast.error('Could not save.')            // stays longer, announced assertively
 */

const ToastContext = createContext(null);

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = { success: 4000, info: 4000, cart: 4000, warning: 6000, error: 7000 };
let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback(
    (id, ms) => {
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => dismiss(id), ms);
    },
    [dismiss]
  );

  const show = useCallback(
    (variant, message, { duration, action } = {}) => {
      const id = ++nextId;
      const ms = duration ?? DEFAULT_DURATION[variant];
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, variant, message, action, duration: ms }]);
      schedule(id, ms);
      return id;
    },
    [schedule]
  );

  // Hovering or focusing a toast pauses it, so people have time to read or use the action.
  const pause = useCallback((id) => clearTimeout(timers.current[id]), []);
  const resume = useCallback((id) => schedule(id, 2500), [schedule]);

  const toast = useMemo(
    () => ({
      success: (msg, opts) => show('success', msg, opts),
      error: (msg, opts) => show('error', msg, opts),
      warning: (msg, opts) => show('warning', msg, opts),
      info: (msg, opts) => show('info', msg, opts),
      cart: (msg, opts) => show('cart', msg, opts),
    }),
    [show]
  );

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} onPause={pause} onResume={resume} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export default ToastContext;
