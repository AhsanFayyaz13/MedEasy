import { cx } from '../../../lib/cx';
import './DashboardLayout.css';

/**
 * Shared shell for Admin / Pharmacy / Doctor dashboards.
 * Desktop: sticky sidebar. Mobile: horizontally scrollable section tabs.
 *
 * sections: [{ key, label, icon, badge? }]
 */
export default function DashboardLayout({
  sections,
  active,
  onSelect,
  identity, // { avatar, name, role }
  sidebarExtra, // optional node under the identity block (e.g. KPIs)
  sidebarFooter, // optional node at the bottom of the sidebar (e.g. refresh button)
  title,
  subtitle,
  actions,
  children,
}) {
  const current = sections.find((s) => s.key === active);

  return (
    <div className="dash">
      <aside className="dash__sidebar" aria-label="Dashboard">
        {identity && (
          <div className="dash__identity">
            <span className="dash__avatar" aria-hidden="true">{identity.avatar}</span>
            <div className="dash__identity-text">
              <span className="dash__name">{identity.name}</span>
              <span className="dash__role">{identity.role}</span>
            </div>
          </div>
        )}
        {sidebarExtra}

        <nav className="dash__nav" aria-label="Dashboard sections">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              className={cx('dash__nav-item', s.key === active && 'is-active')}
              aria-current={s.key === active ? 'page' : undefined}
              onClick={() => onSelect(s.key)}
            >
              <span className="dash__nav-icon" aria-hidden="true">{s.icon}</span>
              <span className="dash__nav-label">{s.label}</span>
              {s.badge ? <span className="dash__nav-badge">{s.badge}</span> : null}
            </button>
          ))}
        </nav>

        {sidebarFooter && <div className="dash__sidebar-foot">{sidebarFooter}</div>}
      </aside>

      <div className="dash__main">
        <header className="dash__header">
          <div>
            <h1 className="dash__title">
              <span className="dash__title-icon" aria-hidden="true">{current?.icon}</span>
              {title || current?.label}
            </h1>
            {subtitle && <p className="dash__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="dash__actions">{actions}</div>}
        </header>

        <div className="dash__content" key={active}>
          {children}
        </div>
      </div>
    </div>
  );
}
