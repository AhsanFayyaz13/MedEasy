import { cx } from '../../lib/cx';

/** Accessible loading spinner. Pass label="" when a parent already announces loading. */
export default function Spinner({ size = 'md', label = 'Loading…', className }) {
  return (
    <span className={cx('ui-spinner', `ui-spinner--${size}`, className)} role={label ? 'status' : undefined}>
      <span className="ui-spinner__ring" aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Full-area loader used as the Suspense fallback for lazy routes. */
export function PageLoader({ label = 'Loading page…' }) {
  return (
    <div className="ui-page-loader">
      <Spinner size="lg" label={label} />
    </div>
  );
}
