import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header style={styles.bar}>
      <div style={styles.greeting}>
        {getGreeting()}, <strong>{user?.fullName?.split(' ')[0] ?? 'User'}</strong>
      </div>

      <div style={styles.right}>
        <span style={styles.badge}>{user?.department}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sign out
        </button>
      </div>
    </header>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = {
  bar: {
    height: 60,
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
  },
  greeting: {
    fontSize: 15,
    color: '#475569',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    background: '#eff6ff',
    color: '#3b82f6',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '5px 14px',
    fontSize: 13,
    color: '#64748b',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
};
