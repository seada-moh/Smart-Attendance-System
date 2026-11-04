import { NavLink } from 'react-router-dom';

const adminLinks = [
  { to: '/admin',           label: '📊 Dashboard' },
  { to: '/admin/users',     label: '👥 Employees' },
  { to: '/admin/reports',   label: '📋 Attendance Log' },
  { to: '/admin/settings',  label: '⚙️ Shift Settings' },
  { to: '/kiosk',           label: '📷 Kiosk View' },
];

const employeeLinks = [
  { to: '/me',             label: '🏠 My Dashboard' },
  { to: '/me/attendance',  label: '📅 My Attendance' },
];

export default function Sidebar({ role }) {
  const links = role === 'admin' ? adminLinks : employeeLinks;

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <span style={styles.brandIcon}>🎯</span>
        <span style={styles.brandText}>SmartAttend</span>
      </div>

      <nav style={styles.nav}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/me'}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.roleTag}>
        {role === 'admin' ? '🔑 Administrator' : '👤 Employee'}
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: '#1e293b',
    color: '#cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    padding: '0 0 16px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '24px 20px 20px',
    borderBottom: '1px solid #334155',
    marginBottom: 12,
  },
  brandIcon: { fontSize: 24 },
  brandText: {
    fontWeight: 700,
    fontSize: 17,
    color: '#f1f5f9',
    letterSpacing: '-0.3px',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '0 10px',
  },
  link: {
    display: 'block',
    padding: '10px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
  },
  linkActive: {
    background: '#3b82f6',
    color: '#fff',
  },
  roleTag: {
    margin: '12px 10px 0',
    padding: '8px 14px',
    background: '#0f172a',
    borderRadius: 8,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
};
