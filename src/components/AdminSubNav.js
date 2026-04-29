import { Link, useLocation } from 'react-router-dom';

/**
 * AdminSubNav — small tab bar shown at the top of grouped admin pages.
 * Used to switch between sibling pages that share a parent nav item
 * (e.g. Moderation = Reports + Flagged, Training = Labeling + Logs).
 *
 * Props:
 *   eyebrow?: string  (e.g. "Admin › Moderation")
 *   tabs: Array<{ to: string, label: string, icon?: string }>
 */
function AdminSubNav({ eyebrow, tabs = [] }) {
  const location = useLocation();

  return (
    <div className="ss-dashboard-section" style={{ paddingBottom: 0 }}>
      <div className="container">
        {eyebrow && (
          <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.6rem' }}>
            {eyebrow}
          </p>
        )}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--ss-dashboard-border)',
            paddingBottom: '0.65rem',
            marginBottom: '0.25rem',
          }}
        >
          {tabs.map((t) => {
            const active = location.pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                role="tab"
                aria-selected={active}
                className={`ss-dashboard-btn ${active ? 'ss-dashboard-btn-primary' : 'ss-dashboard-btn-secondary'}`}
                style={{
                  minHeight: 38,
                  padding: '0 1rem',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                {t.icon && <i className={`fas ${t.icon}`} style={{ marginRight: '0.45rem' }}></i>}
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const MODERATION_TABS = [
  { to: '/admin/reports', label: 'User Reports', icon: 'fa-flag' },
  { to: '/admin/flagged', label: 'High-Risk Listings', icon: 'fa-triangle-exclamation' },
];

export const TRAINING_TABS = [
  { to: '/admin/training', label: 'Labeling Tool', icon: 'fa-tags' },
  { to: '/admin/logs', label: 'System Logs', icon: 'fa-list' },
];

export default AdminSubNav;
