import { cx } from '../../lib/cx';

/**
 * Card surface. `interactive` adds hover lift; `padded={false}` for media cards.
 * Use as="article" / as="section" for semantics.
 */
export default function Card({ as: Tag = 'div', interactive = false, padded = true, className, children, ...rest }) {
  return (
    <Tag className={cx('ui-card', interactive && 'ui-card--interactive', padded && 'ui-card--padded', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, actions, className, children }) {
  return (
    <div className={cx('ui-card__header', className)}>
      <div>
        {title && <h3 className="ui-card__title">{title}</h3>}
        {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="ui-card__actions">{actions}</div>}
    </div>
  );
}
