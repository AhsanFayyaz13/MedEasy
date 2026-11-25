import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';
import { cx } from '../../lib/cx';

/**
 * Button — the one button for the whole app.
 *
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'|'link'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {string} [to]   Render as a router <Link>.
 * @param {string} [href] Render as an <a>.
 * @param {boolean} [loading] Shows a spinner and disables the button.
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    to,
    href,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref
) {
  const classes = cx(
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block && 'ui-btn--block',
    loading && 'is-loading',
    className
  );

  const content = (
    <>
      {loading ? <Spinner size="sm" className="ui-btn__spinner" label="" /> : leftIcon}
      {children && <span className="ui-btn__label">{children}</span>}
      {!loading && rightIcon}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} aria-disabled={disabled || undefined} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
