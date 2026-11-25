import { FiAlertTriangle, FiInbox, FiRefreshCw } from 'react-icons/fi';
import Button from './Button';
import { cx } from '../../lib/cx';

/**
 * Badge / status pill.
 * @param {'neutral'|'primary'|'success'|'warning'|'error'|'info'|'violet'} tone
 */
export function Badge({ tone = 'neutral', solid = false, icon, className, children }) {
  return (
    <span className={cx('ui-badge', `ui-badge--${tone}`, solid && 'ui-badge--solid', className)}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

/** Shimmering placeholder. variant: 'text' | 'rect' | 'circle' */
export function Skeleton({ variant = 'text', width, height, lines = 1, className, style }) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={cx('ui-skeleton-stack', className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="ui-skeleton ui-skeleton--text" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
        ))}
      </div>
    );
  }
  return (
    <span
      className={cx('ui-skeleton', `ui-skeleton--${variant}`, className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

/** Card-shaped skeleton for grids (medicine cards, dashboard tiles). */
export function SkeletonCard({ media = true }) {
  return (
    <div className="ui-card ui-card--padded ui-skeleton-card" aria-hidden="true">
      {media && <Skeleton variant="rect" height={140} />}
      <Skeleton width="70%" />
      <Skeleton lines={2} />
      <Skeleton variant="rect" height={36} />
    </div>
  );
}

/** Grid of skeleton cards with a single screen-reader announcement. */
export function SkeletonGrid({ count = 6, media = true, className }) {
  return (
    <div className={cx('ui-skeleton-grid', className)} role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} media={media} />
      ))}
    </div>
  );
}

/**
 * Friendly empty state. `titleAs` sets the heading level so the outline never skips a level:
 * 'h1' when the empty state is the whole page (empty cart, 404), 'h2' (default) under a page title.
 */
export function EmptyState({ icon = <FiInbox />, title = 'Nothing here yet', description, action, className, titleAs: Title = 'h2' }) {
  return (
    <div className={cx('ui-state', className)}>
      <div className="ui-state__icon" aria-hidden="true">{icon}</div>
      <Title className="ui-state__title">{title}</Title>
      {description && <p className="ui-state__text">{description}</p>}
      {action && <div className="ui-state__action">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn’t load this content. Please check your connection and try again.',
  onRetry,
  className,
  titleAs: Title = 'h2',
}) {
  return (
    <div className={cx('ui-state ui-state--error', className)} role="alert">
      <div className="ui-state__icon" aria-hidden="true"><FiAlertTriangle /></div>
      <Title className="ui-state__title">{title}</Title>
      {message && <p className="ui-state__text">{message}</p>}
      {onRetry && (
        <div className="ui-state__action">
          <Button variant="secondary" leftIcon={<FiRefreshCw aria-hidden="true" />} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

/** Inline alert banner. tone: info | success | warning | error */
export function Alert({ tone = 'info', title, children, onClose, className }) {
  return (
    <div className={cx('ui-alert', `ui-alert--${tone}`, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="ui-alert__body">
        {title && <strong className="ui-alert__title">{title}</strong>}
        {children}
      </div>
      {onClose && (
        <button type="button" className="ui-icon-btn ui-icon-btn--sm" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
