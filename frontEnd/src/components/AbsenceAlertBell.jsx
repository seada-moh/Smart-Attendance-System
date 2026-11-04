/**
 * AbsenceAlertBell — Admin notification for employee absence acknowledgements
 */
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, CheckCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import api from '../services/api';

const RESPONSE_LABELS = {
  noted:          { label: '✅ Noted',          color: '#4ade80' },
  warning_issued: { label: '⚠️ Warning Issued', color: '#fbbf24' },
  excused:        { label: '🟢 Excused',         color: '#60a5fa' },
};

export default function AbsenceAlertBell() {
  const [alerts,    setAlerts]    = useState([]);
  const [open,      setOpen]      = useState(false);
  const [count,     setCount]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [responding, setResponding] = useState(null); // alertId
  const [noteMap,   setNoteMap]   = useState({});
  const panelRef = useRef(null);

  const fetchCount = async () => {
    try {
      const r = await api.get('/absence-alerts/pending-count');
      setCount(r.data.data.count);
    } catch {}
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const r = await api.get('/absence-alerts?status=acknowledged');
      setAlerts(r.data.data.alerts || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) fetchAlerts();
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const respond = async (alertId, adminResponse) => {
    setResponding(alertId);
    try {
      await api.patch(`/absence-alerts/${alertId}/respond`, {
        adminResponse,
        adminNote: noteMap[alertId] || '',
      });
      fetchAlerts();
      fetchCount();
    } catch {}
    finally { setResponding(null); }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Employee absence acknowledgements"
        style={{
          position: 'relative', width: '36px', height: '36px', borderRadius: '50%',
          background: open ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${open ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: count > 0 ? '#60a5fa' : '#64748b',
          transition: 'all 0.15s', flexShrink: 0,
        }}
      >
        <MessageSquare size={15}/>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-3px',
            minWidth: '17px', height: '17px', borderRadius: '999px',
            background: '#2563eb', color: '#fff', fontSize: '0.6rem',
            fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '2px solid #080f1e',
          }}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '380px', maxHeight: '520px',
          background: '#0d1b3e', border: '1px solid rgba(99,162,255,0.15)',
          borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid rgba(99,162,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={14} color="#60a5fa"/>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>
                Absence Acknowledgements
              </span>
              {count > 0 && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '999px',
                  background: 'rgba(37,99,235,0.2)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.3)',
                }}>
                  {count} pending
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px',
            }}>
              <X size={14}/>
            </button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>Loading…</div>
            )}
            {!loading && alerts.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <CheckCheck size={24} color="#4ade80"/>
                <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>
                  All caught up!
                </p>
                <p style={{ color: '#334155', fontSize: '0.75rem', margin: 0 }}>
                  No pending acknowledgements
                </p>
              </div>
            )}

            {alerts.map(alert => (
              <div key={alert._id} style={{
                padding: '14px 18px', borderBottom: '1px solid rgba(99,162,255,0.07)',
              }}>
                {/* Employee info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: alert.level === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle size={14} color={alert.level === 'critical' ? '#f87171' : '#fbbf24'}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#e2e8f0', fontSize: '0.82rem' }}>
                      {alert.fullName}
                      <span style={{
                        marginLeft: '6px', fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px',
                        borderRadius: '999px',
                        background: alert.level === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        color: alert.level === 'critical' ? '#fca5a5' : '#fcd34d',
                      }}>
                        {alert.level.toUpperCase()}
                      </span>
                    </p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>
                      {alert.employeeId} · {alert.department}
                    </p>
                  </div>
                </div>

                {/* Alert details */}
                <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: alert.level === 'critical' ? '#fca5a5' : '#fcd34d' }}>
                  {alert.streak >= 3 ? `🗓 ${alert.streak} consecutive days absent` : `📋 ${alert.totalAbsent} absent days`}
                </p>

                {/* Employee note */}
                {alert.employeeNote && (
                  <div style={{
                    margin: '6px 0', padding: '8px 10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      💬 Employee: "{alert.employeeNote}"
                    </p>
                  </div>
                )}

                <p style={{ margin: '4px 0 10px', fontSize: '0.68rem', color: '#334155' }}>
                  Acknowledged: {fmtDate(alert.acknowledgedAt)} at {fmtTime(alert.acknowledgedAt)}
                </p>

                {/* Already responded */}
                {alert.adminResponded ? (
                  <div style={{
                    padding: '7px 10px', borderRadius: '8px', background: 'rgba(21,128,61,0.15)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <CheckCheck size={13} color="#4ade80"/>
                    <span style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600 }}>
                      {RESPONSE_LABELS[alert.adminResponse]?.label || 'Responded'}
                    </span>
                    {alert.adminNote && (
                      <span style={{ fontSize: '0.7rem', color: '#475569' }}>— {alert.adminNote}</span>
                    )}
                  </div>
                ) : (
                  /* Response form */
                  <div>
                    {responding === alert._id ? (
                      <p style={{ color: '#475569', fontSize: '0.78rem' }}>Processing…</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          value={noteMap[alert._id] || ''}
                          onChange={e => setNoteMap(p => ({ ...p, [alert._id]: e.target.value }))}
                          placeholder="Optional note to employee…"
                          style={{
                            padding: '6px 10px', background: '#1e293b', border: '1px solid #334155',
                            borderRadius: '8px', color: '#f1f5f9', fontSize: '0.78rem',
                            outline: 'none', fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => respond(alert._id, 'noted')} style={{
                            flex: 1, padding: '7px 0', borderRadius: '8px', cursor: 'pointer', border: 'none',
                            background: 'rgba(21,128,61,0.2)', color: '#4ade80', fontWeight: 600, fontSize: '0.75rem',
                          }}>✅ Noted</button>
                          <button onClick={() => respond(alert._id, 'warning_issued')} style={{
                            flex: 1, padding: '7px 0', borderRadius: '8px', cursor: 'pointer', border: 'none',
                            background: 'rgba(180,83,9,0.2)', color: '#fbbf24', fontWeight: 600, fontSize: '0.75rem',
                          }}>⚠️ Warning</button>
                          <button onClick={() => respond(alert._id, 'excused')} style={{
                            flex: 1, padding: '7px 0', borderRadius: '8px', cursor: 'pointer', border: 'none',
                            background: 'rgba(37,99,235,0.2)', color: '#93c5fd', fontWeight: 600, fontSize: '0.75rem',
                          }}>🟢 Excused</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
