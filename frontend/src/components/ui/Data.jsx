import { useId, useRef } from 'react';
import { cx } from '../../lib/cx';

/**
 * Responsive data table. Below 768px rows collapse into stacked cards
 * (each cell shows its column header via data-label).
 *
 * columns: [{ key, header, render?: (row) => node, align?: 'start'|'end'|'center', className? }]
 */
export function Table({ columns, data, rowKey = '_id', caption, empty, onRowClick, className }) {
  if (!data?.length && empty) return empty;
  return (
    <div className={cx('ui-table-wrap', className)}>
      <table className="ui-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx(c.align && `text-${c.align}`, c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={(typeof rowKey === 'function' ? rowKey(row) : row[rowKey]) ?? i}
              className={onRowClick ? 'is-clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} data-label={typeof c.header === 'string' ? c.header : ''} className={cx(c.align && `text-${c.align}`, c.className)}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Accessible tabs (WAI-ARIA tablist with arrow-key navigation).
 * tabs: [{ id, label, icon?, badge? }]
 */
export function Tabs({ tabs, active, onChange, label = 'Sections', className }) {
  const baseId = useId();
  const refs = useRef([]);

  const onKeyDown = (e, index) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    let next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + dir + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  return (
    <div className={cx('ui-tabs', className)} role="tablist" aria-label={label}>
      {tabs.map((t, i) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            id={`${baseId}-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cx('ui-tabs__tab', selected && 'is-active')}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.icon && <span aria-hidden="true">{t.icon}</span>}
            <span>{t.label}</span>
            {t.badge != null && <span className="ui-tabs__badge">{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** KPI / statistic tile. tone maps to a hue for the icon chip. */
export function StatCard({ label, value, icon, tone = 'primary', hint, trend, className }) {
  return (
    <div className={cx('ui-card ui-card--padded ui-stat', `ui-stat--${tone}`, className)}>
      <div className="ui-stat__top">
        <span className="ui-stat__label">{label}</span>
        {icon && <span className="ui-stat__icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="ui-stat__value">{value}</div>
      {(hint || trend) && (
        <div className="ui-stat__hint">
          {trend && <span className={cx('ui-stat__trend', trend.startsWith('-') ? 'is-down' : 'is-up')}>{trend}</span>}
          {hint}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <header className={cx('ui-page-header', className)}>
      <div>
        {eyebrow && <p className="ui-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Avatar({ src, name = '', size = 40, className }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className={cx('ui-avatar', className)} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {src ? <img src={src} alt={name ? `${name}'s photo` : ''} loading="lazy" decoding="async" /> : <span aria-hidden="true">{initials || '?'}</span>}
      {!src && name && <span className="sr-only">{name}</span>}
    </span>
  );
}
