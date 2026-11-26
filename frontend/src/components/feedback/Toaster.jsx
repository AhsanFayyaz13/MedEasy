import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiShoppingCart, FiX } from 'react-icons/fi';
import './Toaster.css';

const ICON = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
  cart: FiShoppingCart,
};

/**
 * Renders the toast stack: bottom-right on desktop, bottom of the screen on phones.
 * Errors are announced immediately (role="alert"); everything else politely (role="status").
 */
export default function Toaster({ toasts, onDismiss, onPause, onResume }) {
  return (
    <section className="app-toaster" aria-label="Notifications">
      {toasts.map((t) => {
        const Icon = ICON[t.variant] || FiInfo;
        return (
          <div
            key={t.id}
            className={`app-toast app-toast--${t.variant}`}
            role={t.variant === 'error' ? 'alert' : 'status'}
            onMouseEnter={() => onPause(t.id)}
            onMouseLeave={() => onResume(t.id)}
            onFocus={() => onPause(t.id)}
            onBlur={() => onResume(t.id)}
          >
            <Icon className="app-toast__icon" aria-hidden="true" />
            <p className="app-toast__message">{t.message}</p>
            {t.action && (
              <button
                type="button"
                className="app-toast__action"
                onClick={() => {
                  t.action.onClick();
                  onDismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="app-toast__close" onClick={() => onDismiss(t.id)} aria-label="Dismiss notification">
              <FiX aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
