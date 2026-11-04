import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ClipboardList, UserPlus,
  LogOut, Camera, ChevronRight, Settings, UserCircle, MessageCircle, CalendarCheck, CalendarDays,
} from 'lucide-react';
import askLogo from '../assets/ask-digital.jpg';
import AbsentWarningBell from './AbsentWarningBell';
import AbsenceAlertBell  from './AbsenceAlertBell';
import { useState, useEffect } from 'react';
import api from '../services/api';

const adminNav = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard'         },
  { to: '/admin/users',     icon: Users,           label: 'Employees'         },
  { to: '/admin/reports',   icon: ClipboardList,   label: 'Reports'           },
  { to: '/admin/register',  icon: UserPlus,        label: 'Register Employee' },
  { to: '/admin/leave',     icon: CalendarCheck,   label: 'Leave Requests'    },
  { to: '/admin/holidays',  icon: CalendarDays,    label: 'Holiday Calendar'  },
  { to: '/admin/settings',  icon: Settings,        label: 'Shift Settings'    },
  { to: '/admin/chat',      icon: MessageCircle,   label: 'Messages'          },
];

const employeeNav = [
  { to: '/me',           icon: LayoutDashboard, label: 'My Dashboard'     },
  { to: '/me/profile',   icon: UserCircle,      label: 'My Profile'       },
  { to: '/me/leave',     icon: CalendarCheck,   label: 'Leave Request'    },
  { to: '/me/holidays',  icon: CalendarDays,    label: 'Holiday Calendar' },
  { to: '/me/chat',      icon: MessageCircle,   label: 'Messages'         },
];

/* ── Inline CSS injected once ── */
const LAYOUT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  .ly-root * { box-sizing: border-box; }

  .ly-root {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #020617;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* ══ SIDEBAR ══ */
  .ly-sidebar {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: #080f1e;
    border-right: 1px solid rgba(99,162,255,0.1);
    overflow: hidden;
  }

  /* brand area */
  .ly-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 16px;
    border-bottom: 1px solid rgba(99,162,255,0.08);
    cursor: pointer;
    transition: background 0.15s;
    background: transparent;
    border-top: none; border-left: none; border-right: none;
    width: 100%; text-align: left;
  }
  .ly-brand:hover { background: rgba(37,99,235,0.06); }

  .ly-brand-logo {
    width: 40px; height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(99,162,255,0.35);
    overflow: hidden; flex-shrink: 0;
    background: #0d1b4b;
    display: flex; align-items: center; justify-content: center;
  }
  .ly-brand-logo img { width: 100%; height: 100%; object-fit: cover; }

  .ly-brand-texts {}
  .ly-brand-name {
    font-size: 0.8rem; font-weight: 800;
    color: #60a5fa; letter-spacing: -0.2px;
    line-height: 1.2; display: block;
  }
  .ly-brand-sub {
    font-size: 0.6rem; color: #3b82f6;
    font-style: italic; font-weight: 600;
    opacity: 0.8;
  }

  /* nav */
  .ly-nav {
    flex: 1;
    padding: 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .ly-nav-link {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 10px;
    text-decoration: none;
    font-size: 0.8125rem; font-weight: 500;
    color: #475569;
    transition: background 0.12s, color 0.12s;
    position: relative;
  }
  .ly-nav-link:hover {
    background: rgba(37,99,235,0.08);
    color: #93c5fd;
  }
  .ly-nav-link.active {
    background: linear-gradient(135deg, rgba(37,99,235,0.25), rgba(79,70,229,0.15));
    color: #60a5fa;
    border: 1px solid rgba(37,99,235,0.2);
  }

  .ly-nav-divider {
    height: 1px;
    background: rgba(99,162,255,0.08);
    margin: 8px 4px;
  }

  /* user footer */
  .ly-user {
    padding: 14px 14px 12px;
    border-top: 1px solid rgba(99,162,255,0.08);
  }

  .ly-user-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 10px;
  }

  .ly-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1e3a8a, #2563eb);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 800;
    color: #fff; flex-shrink: 0;
    border: 1.5px solid rgba(99,162,255,0.25);
    overflow: hidden;
  }
  .ly-avatar img { width: 100%; height: 100%; object-fit: cover; }

  .ly-user-name {
    font-size: 0.75rem; font-weight: 700;
    color: #e2e8f0; margin: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .ly-user-dept {
    font-size: 0.65rem; color: #475569;
    margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .ly-signout {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 7px 10px; border-radius: 8px;
    background: none; border: none; cursor: pointer;
    font-size: 0.75rem; font-weight: 500; color: #475569;
    font-family: inherit;
    transition: background 0.12s, color 0.12s;
  }
  .ly-signout:hover { background: rgba(239,68,68,0.1); color: #f87171; }
  .ly-signout:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

  /* ══ MAIN ══ */
  .ly-main {
    flex: 1; display: flex; flex-direction: column; overflow: hidden;
  }

  /* top bar */
  .ly-topbar {
    height: 52px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px;
    background: #080f1e;
    border-bottom: 1px solid rgba(99,162,255,0.08);
  }

  .ly-topbar-date {
    display: flex; align-items: center; gap: 7px;
    font-size: 0.8125rem; color: #64748b; font-weight: 500;
  }

  .ly-topbar-right { display: flex; align-items: center; gap: 8px; }

  .ly-badge {
    font-size: 0.7rem; padding: 3px 10px;
    border-radius: 999px; font-weight: 600;
    text-transform: capitalize;
  }

  .ly-badge--role {
    background: rgba(30,41,59,0.8);
    color: #94a3b8;
    border: 1px solid rgba(99,162,255,0.1);
  }

  .ly-badge--id {
    background: rgba(37,99,235,0.15);
    color: #60a5fa;
    border: 1px solid rgba(37,99,235,0.25);
  }

  /* content scroll area */
  .ly-content {
    flex: 1; overflow-y: auto;
    padding: 32px 32px 80px;
    position: relative;
    background-color: #020617;
    background-image: url('/ask-digital-bg.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    background-repeat: no-repeat;
  }

  /* dark overlay so content stays readable — scoped to content only */
  .ly-content::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(2, 6, 23, 0.82);
    z-index: 0;
    pointer-events: none;
  }

  .ly-content > * {
    position: relative;
    z-index: 1;
  }

  /* ASK Digital watermark — fixed inside content area */
  .ly-watermark {
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 0;
    pointer-events: none;
    text-align: right;
    opacity: 0.12;
    user-select: none;
    line-height: 1;
  }
  .ly-watermark-main {
    font-size: 3rem;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: -0.03em;
    font-family: 'Inter', system-ui, sans-serif;
    display: block;
  }
  .ly-watermark-sub {
    font-size: 0.85rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    display: block;
    margin-top: 4px;
  }
  /* responsive */
  @media (max-width: 768px) {
    .ly-sidebar { width: 64px; }
    .ly-brand-texts, .ly-nav-link span, .ly-user-row > div, .ly-signout span { display: none; }
    .ly-nav-link { justify-content: center; padding: 10px; }
    .ly-user { padding: 10px 8px; }
    .ly-avatar { margin: 0 auto; }
    .ly-content { padding: 20px 16px 60px; }
    .ly-topbar { padding: 0 16px; }
  }
`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === 'admin' ? adminNav : employeeNav;

  // Unread message count for sidebar badge
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  useEffect(() => {
    const fetch = () => api.get('/chat/unread-count')
      .then(r => setUnreadMsgs(r.data.data.count))
      .catch(() => {});
    fetch();
    const t = setInterval(fetch, 15000);
    return () => clearInterval(t);
  }, []);

  // Leave pending count for admin sidebar badge
  const [leavePending, setLeavePending] = useState(0);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const fetch = () => api.get('/leave/pending-count')
      .then(r => setLeavePending(r.data.data.count))
      .catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, [user]);

  const handleLogoClick = () => { logout(); navigate('/login', { replace: true }); };
  const handleLogout    = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <>
      <style>{LAYOUT_CSS}</style>
      <div className="ly-root">

        {/* ══ SIDEBAR ══ */}
        <aside className="ly-sidebar">

          {/* brand */}
          <button className="ly-brand" onClick={handleLogoClick} aria-label="Go to login">
            <div className="ly-brand-logo">
              <img src={askLogo} alt="ASK Digital Technologies" />
            </div>
            <div className="ly-brand-texts">
              <span className="ly-brand-name">ASK Digital Tech</span>
              <span className="ly-brand-sub">Technology matters!</span>
            </div>
          </button>

          {/* nav */}
          <nav className="ly-nav">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin' || to === '/me'}
                className={({ isActive }) => `ly-nav-link${isActive ? ' active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {label === 'Messages' && unreadMsgs > 0 && (
                      <span style={{
                        minWidth: '18px', height: '18px', borderRadius: '999px',
                        background: '#3b82f6', color: '#fff',
                        fontSize: '0.6rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                      }}>
                        {unreadMsgs > 99 ? '99+' : unreadMsgs}
                      </span>
                    )}
                    {label === 'Leave Requests' && leavePending > 0 && (
                      <span style={{
                        minWidth: '18px', height: '18px', borderRadius: '999px',
                        background: '#f59e0b', color: '#fff',
                        fontSize: '0.6rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                      }}>
                        {leavePending > 99 ? '99+' : leavePending}
                      </span>
                    )}
                    {isActive && label !== 'Messages' && <ChevronRight size={12} />}
                  </>
                )}
              </NavLink>
            ))}

            <div className="ly-nav-divider" aria-hidden="true" />

            <NavLink
              to="/kiosk"
              className="ly-nav-link"
            >
              <Camera size={15} />
              <span style={{ flex: 1 }}>Attendance Kiosk</span>
            </NavLink>
          </nav>

          {/* user footer */}
          <div className="ly-user">
            <div className="ly-user-row">
              <div className="ly-avatar">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.fullName}/>
                  : user?.fullName?.charAt(0).toUpperCase()
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="ly-user-name">{user?.fullName}</p>
                <p className="ly-user-dept">{user?.department}</p>
              </div>
            </div>
            <button className="ly-signout" onClick={handleLogout}>
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="ly-main">

          {/* top bar */}
          <header className="ly-topbar">
            <div className="ly-topbar-date">
              {/* calendar icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </div>
            <div className="ly-topbar-right">
              {user?.role === 'admin' && <AbsenceAlertBell />}
              {user?.role === 'admin' && <AbsentWarningBell />}
              <span className="ly-badge ly-badge--role">{user?.role}</span>
              <span className="ly-badge ly-badge--id">{user?.employeeId}</span>
            </div>
          </header>

          {/* content */}
          <div className="ly-content">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
