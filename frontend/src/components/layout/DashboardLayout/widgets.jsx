import { FiArrowRight } from 'react-icons/fi';
import { StatCard } from '../../ui';
import { cx } from '../../../lib/cx';
import './widgets.css';

/** Greeting banner at the top of an overview tab. */
export function WelcomeBanner({ title, text, children }) {
  return (
    <section className="dw-welcome">
      <div>
        <h2 className="dw-welcome__title">{title}</h2>
        {text && <p className="dw-welcome__text">{text}</p>}
      </div>
      {children && <div className="dw-welcome__actions">{children}</div>}
    </section>
  );
}

/**
 * Responsive KPI grid.
 * stats: [{ label, value, icon, tone?, hint? }]
 */
export function StatGrid({ stats, loading = false }) {
  return (
    <div className="dw-stats">
      {stats.map((s) => (
        <StatCard key={s.label} label={s.label} value={loading ? '…' : s.value} icon={s.icon} tone={s.tone} hint={s.hint} />
      ))}
    </div>
  );
}

/**
 * Quick-action tiles that jump to another dashboard section.
 * items: [{ key, label, desc, icon, tone?, onClick }]
 */
export function ShortcutGrid({ title = 'Quick actions', items }) {
  return (
    <section className="dw-section" aria-label={title}>
      <h2 className="dw-section__title">{title}</h2>
      <div className="dw-shortcuts">
        {items.map((it) => (
          <button key={it.key || it.label} type="button" className={cx('dw-shortcut', `dw-tone--${it.tone || 'primary'}`)} onClick={it.onClick}>
            <span className="dw-shortcut__icon" aria-hidden="true">{it.icon}</span>
            <span className="dw-shortcut__text">
              <span className="dw-shortcut__label">{it.label}</span>
              {it.desc && <span className="dw-shortcut__desc">{it.desc}</span>}
            </span>
            <FiArrowRight className="dw-shortcut__arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

/** Titled surface for tables, charts and lists inside dashboard tabs. */
export function Panel({ title, icon, actions, children, className, flush = false }) {
  return (
    <section className={cx('dw-panel', flush && 'dw-panel--flush', className)}>
      {(title || actions) && (
        <header className="dw-panel__head">
          {title && (
            <h2 className="dw-panel__title">
              {icon && <span aria-hidden="true">{icon}</span>}
              {title}
            </h2>
          )}
          {actions && <div className="dw-panel__actions">{actions}</div>}
        </header>
      )}
      <div className="dw-panel__body">{children}</div>
    </section>
  );
}

/** Small toolbar row (search + filters) above tables. */
export function Toolbar({ children }) {
  return <div className="dw-toolbar">{children}</div>;
}
