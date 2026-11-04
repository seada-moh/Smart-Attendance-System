/**
 * AbsentWarningBell — admin only notification bell
 * Shows absent warnings (3+ consecutive or 5+ total in 30 days)
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function AbsentWarningBell() {
  const [warnings,  setWarnings]  = useState([]);
  const [open,      setOpen]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Fetch warnings (every 5 minutes)
  const fetchWarnings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/absent-warnings');
      setWarnings(res.data.data.warnings || []);
      setLastFetch(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchWarnings();
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const critical = warnings.filter(w => w.level === 'critical').length;
  const total    = warnings.length;

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>

      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Absent warnings"
        style={{
          position:   'relative',
          width:      '36px',
          height:     '36px',
          borderRadius: '50%',
          background: open ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
          border:     `1px solid ${open ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor:     'pointer',
          color:      total > 0 ? '#fbbf24' : '#64748b',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.12)'}
        onMouseLeave={e => e.currentTarget.style.background = open ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)'}
      >
        <Bell size={16}/>
        {total > 0 && (
          <span style={{
            position:   'absolute',
            top:        '-3px',
            right:      '-3px',
            minWidth:   '17px',
            height:     '17px',
            borderRadius: '999px',
            background: critical > 0 ? '#ef4444' : '#f59e0b',
            color:      '#fff',
            fontSize:   '0.6rem',
            fontWeight: 800,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding:    '0 3px',
            border:     '2px solid #080f1e',
            lineHeight: 1,
          }}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:   'absolute',
          top:        'calc(100% + 10px)',
          right:      0,
          width:      '360px',
          maxHeight:  '480px',
          background: '#0d1b3e',
          border:     '1px solid rgba(99,162,255,0.15)',
          borderRadius: '16px',
          boxShadow:  '0 20px 60px rgba(0,0,0,0.6)',
          zIndex:     100,
          display:    'flex',
          flexDirection: 'column',
          overflow:   'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding:      '14px 18px',
            borderBottom: '1px solid rgba(99,162,255,0.1)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            flexShrink:   0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={14} color="#fbbf24"/>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>
                Absence Warnings
              </span>
              {total > 0 && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  padding: '1px 7px', borderRadius: '999px',
                  background: critical > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                  color: critical > 0 ? '#fca5a5' : '#fcd34d',
                  border: `1px solid ${critical > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                }}>
                  {total} employee{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={fetchWarnings}
                disabled={loading}
                title="Refresh"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#475569', fontSize: '0.65rem', padding: '2px 6px',
                  borderRadius: '6px', transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
              >
                {loading ? '…' : '↻ refresh'}
              </button>
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#475569', padding: '2px', display: 'flex',
              }}>
                <X size={14}/>
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && warnings.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>
                Loading…
              </div>
            )}

            {!loading && warnings.length === 0 && (
              <div style={{
                padding: '40px 20px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(34,197,94,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bell size={20} color="#4ade80"/>
                </div>
                <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>
                  All employees attending regularly
                </p>
                <p style={{ color: '#334155', fontSize: '0.75rem', margin: 0 }}>
                  No absence warnings in the last 30 days
                </p>
              </div>
            )}

            {warnings.map((w, i) => (
              <div
                key={w._id}
                style={{
                  padding:      '12px 18px',
                  borderBottom: i < warnings.length - 1 ? '1px solid rgba(99,162,255,0.07)' : 'none',
                  cursor:       'pointer',
                  transition:   'background 0.12s',
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          '12px',
                }}
                onClick={() => { navigate(`/admin/employees/${w._id}/profile`); setOpen(false); }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,162,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Icon */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: w.level === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '2px',
                }}>
                  {w.level === 'critical'
                    ? <AlertCircle  size={15} color="#f87171"/>
                    : <AlertTriangle size={15} color="#fbbf24"/>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.fullName}
                    </span>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px',
                      borderRadius: '999px', flexShrink: 0,
                      background: w.level === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: w.level === 'critical' ? '#fca5a5' : '#fcd34d',
                    }}>
                      {w.level === 'critical' ? 'CRITICAL' : 'WARNING'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 4px' }}>
                    {w.employeeId} · {w.department}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: w.level === 'critical' ? '#fca5a5' : '#fcd34d', margin: 0 }}>
                    {w.reason}
                  </p>
                </div>

                <ChevronRight size={13} color="#334155" style={{ flexShrink: 0, marginTop: '8px' }}/>
              </div>
            ))}
          </div>

          {/* Footer */}
          {lastFetch && (
            <div style={{
              padding:    '8px 18px',
              borderTop:  '1px solid rgba(99,162,255,0.08)',
              fontSize:   '0.62rem',
              color:      '#334155',
              flexShrink: 0,
            }}>
              Last updated: {lastFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              &nbsp;·&nbsp;Based on last 30 working days
            </div>
          )}
        </div>
      )}
    </div>
  );
}
