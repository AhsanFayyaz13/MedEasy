import { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * ToastContext
 * ─────────────────────────────────────────────────────────────────
 * Lightweight app-wide toast notification system.
 * Keeps an array of toast objects; each auto-removes after `duration` ms.
 *
 * Each toast: { id, message, variant, icon, duration }
 * Variants: 'success' | 'danger' | 'warning' | 'info' | 'cart'
 */

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  /**
   * Show a toast.
   * @param {string} message
   * @param {object} [opts]
   * @param {'success'|'danger'|'warning'|'info'|'cart'} [opts.variant='success']
   * @param {string}  [opts.icon]       Emoji or text prefix
   * @param {number}  [opts.duration]   Auto-dismiss delay in ms (default 3200)
   */
  const showToast = useCallback(({ message, variant = 'success', icon = '', duration = 3200 }) => {
    const id = ++_id;
    setToasts((prev) => [...prev.slice(-4), { id, message, variant, icon, duration }]);

    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience helpers
  const toast = {
    success: (msg, opts) => showToast({ message: msg, variant: 'success', icon: '✅', ...opts }),
    error:   (msg, opts) => showToast({ message: msg, variant: 'danger',  icon: '❌', ...opts }),
    warning: (msg, opts) => showToast({ message: msg, variant: 'warning', icon: '⚠️', ...opts }),
    info:    (msg, opts) => showToast({ message: msg, variant: 'info',    icon: 'ℹ️', ...opts }),
    cart:    (msg, opts) => showToast({ message: msg, variant: 'cart',    icon: '🛒', ...opts }),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Toast Container (renders toasts fixed bottom-right) ──────────────────────
const VARIANT_STYLES = {
  success: { bg: '#059669', text: '#fff' },
  danger:  { bg: '#dc2626', text: '#fff' },
  warning: { bg: '#d97706', text: '#fff' },
  info:    { bg: '#0284c7', text: '#fff' },
  cart:    { bg: '#0d1b2a', text: '#fff' },
};

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position:  'fixed',
        bottom:    '1.5rem',
        right:     '1.5rem',
        zIndex:    9999,
        display:   'flex',
        flexDirection: 'column',
        gap:       '0.6rem',
        maxWidth:  '340px',
        width:     'calc(100vw - 2rem)',
      }}
    >
      {toasts.map((t) => {
        const style = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
        return (
          <div key={t.id} className="medeasy-toast" style={{ background: style.bg, color: style.text }}>
            <span className="toast-body-content">
              {t.icon && <span className="toast-icon">{t.icon}</span>}
              {t.message}
            </span>
            <button
              className="toast-close"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              style={{ color: style.text }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContext;
