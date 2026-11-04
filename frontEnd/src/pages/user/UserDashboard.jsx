import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import api from '../../services/api';
import Spinner from '../../components/Spinner';
import {
  CheckCircle2, Clock, XCircle, TrendingUp,
  Calendar, Camera, ChevronLeft, ChevronRight,
  AlertTriangle, AlertCircle, X, Send,
} from 'lucide-react';

/* ── Shared style tokens ─────────────────────────────────────────────────── */
const CARD = {
  background:   '#0f172a',
  border:       '1px solid #1e293b',
  borderRadius: '16px',
};

const TABLE_CARD = {
  ...CARD,
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
};

export default function UserDashboard() {
  const { user } = useAuth();

  const [stats,        setStats]        = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsErr,     setStatsErr]     = useState('');

  const [records,    setRecords]    = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loadingRec, setLoadingRec] = useState(true);
  const [recErr,     setRecErr]     = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');

  useEffect(() => {
    attendanceService.getMyStats()
      .then(setStats)
      .catch(e => setStatsErr(e.message))
      .finally(() => setLoadingStats(false));
  }, []);

  const fetchRecords = useCallback(async (page = 1) => {
    setLoadingRec(true); setRecErr('');
    try {
      const params = { page, limit: 10 };
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const d = await attendanceService.getMine(params);
      setRecords(d.records);
      setPagination(d.pagination);
    } catch (e) {
      setRecErr(e.message);
    } finally {
      setLoadingRec(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchRecords(1); }, [fetchRecords]);

  const today       = new Date().toISOString().split('T')[0];
  const todayRecord = stats?.recentActivity?.find(r => r.date === today);
  const warning     = stats?.absenceWarning ?? null;
  const [warnDismissed,  setWarnDismissed]  = useState(false);
  const [ackNote,        setAckNote]        = useState('');
  const [ackLoading,     setAckLoading]     = useState(false);
  const [ackDone,        setAckDone]        = useState(false);
  const [showAckForm,    setShowAckForm]    = useState(false);

  const handleAcknowledge = async () => {
    setAckLoading(true);
    try {
      await api.post('/absence-alerts/acknowledge', {
        employeeNote: ackNote,
        level:        warning?.level,
        streak:       warning?.streak,
        totalAbsent:  warning?.totalAbsent,
        message:      warning?.message,
      });
      setAckDone(true);
      setShowAckForm(false);
    } catch { /* silent */ }
    finally { setAckLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ══════════════════════════════════════════════════════
          ABSENCE WARNING BANNER
      ══════════════════════════════════════════════════════ */}
      {warning && !warnDismissed && (
        <div style={{
          position: 'relative',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          background: warning.level === 'critical'
            ? 'linear-gradient(135deg, rgba(127,29,29,0.6), rgba(185,28,28,0.3))'
            : 'linear-gradient(135deg, rgba(120,53,15,0.6), rgba(180,83,9,0.3))',
          border: `1.5px solid ${warning.level === 'critical' ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)'}`,
          boxShadow: warning.level === 'critical'
            ? '0 0 24px rgba(239,68,68,0.2)'
            : '0 0 24px rgba(245,158,11,0.15)',
          animation: 'warnPulse 2.5s ease-in-out infinite',
        }}>
          {/* pulse keyframe */}
          <style>{`
            @keyframes warnPulse {
              0%,100% { box-shadow: ${warning.level === 'critical'
                ? '0 0 14px rgba(239,68,68,0.2)'
                : '0 0 14px rgba(245,158,11,0.15)'}; }
              50%     { box-shadow: ${warning.level === 'critical'
                ? '0 0 32px rgba(239,68,68,0.45)'
                : '0 0 32px rgba(245,158,11,0.35)'}; }
            }
          `}</style>

          {/* Icon */}
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
            background: warning.level === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {warning.level === 'critical'
              ? <AlertCircle  size={22} color="#f87171"/>
              : <AlertTriangle size={22} color="#fbbf24"/>
            }
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <p style={{
              margin: '0 0 4px',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: warning.level === 'critical' ? '#fca5a5' : '#fde68a',
              letterSpacing: '-0.01em',
            }}>
              {warning.level === 'critical' ? '🚨 Critical Absence Alert' : '⚠️ Absence Warning'}
            </p>
            <p style={{
              margin: '0 0 10px',
              fontSize: '0.875rem',
              color: warning.level === 'critical' ? '#fecaca' : '#fef3c7',
              lineHeight: 1.5,
            }}>
              {warning.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
              {warning.streak >= 3 && (
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                  background: 'rgba(0,0,0,0.25)',
                  color: warning.level === 'critical' ? '#fca5a5' : '#fde68a',
                  border: `1px solid ${warning.level === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
                }}>
                  🗓 {warning.streak} consecutive days absent
                </span>
              )}
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                background: 'rgba(0,0,0,0.25)',
                color: warning.level === 'critical' ? '#fca5a5' : '#fde68a',
                border: `1px solid ${warning.level === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
              }}>
                📋 {warning.totalAbsent} absent days in last 30 days
              </span>
            </div>

            {/* Acknowledge section */}
            {!ackDone ? (
              <div style={{ marginTop: '14px' }}>
                {!showAckForm ? (
                  <button
                    onClick={() => setShowAckForm(true)}
                    style={{
                      padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', border: 'none',
                      background: warning.level === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.25)',
                      color: warning.level === 'critical' ? '#fca5a5' : '#fde68a',
                      fontWeight: 700, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      border: `1px solid ${warning.level === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
                    }}
                  >
                    ✅ I Understand — Acknowledge Alert
                  </button>
                ) : (
                  <div style={{
                    background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    <textarea
                      value={ackNote}
                      onChange={e => setAckNote(e.target.value)}
                      placeholder="Optional: explain your absence reason…"
                      rows={2}
                      style={{
                        width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px', padding: '8px 12px', color: '#f1f5f9',
                        fontSize: '0.82rem', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setShowAckForm(false)}
                        style={{ padding: '7px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Cancel
                      </button>
                      <button onClick={handleAcknowledge} disabled={ackLoading}
                        style={{
                          padding: '7px 20px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                          background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                          display: 'flex', alignItems: 'center', gap: '6px', opacity: ackLoading ? 0.6 : 1,
                        }}>
                        <Send size={13}/> {ackLoading ? 'Sending…' : 'Send to Admin'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '10px', background: 'rgba(21,128,61,0.2)',
                border: '1px solid rgba(34,197,94,0.3)' }}>
                <CheckCircle2 size={14} color="#4ade80"/>
                <span style={{ fontSize: '0.8rem', color: '#86efac', fontWeight: 600 }}>
                  Acknowledged & sent to admin. They will respond shortly.
                </span>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setWarnDismissed(true)}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: warning.level === 'critical' ? '#fca5a5' : '#fde68a',
              opacity: 0.6, padding: '4px', borderRadius: '6px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            title="Dismiss"
          >
            <X size={16}/>
          </button>
        </div>
      )}

      {/* ══ WELCOME BANNER ══ */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f2070 0%, #0f172a 100%)',
        border: '1px solid rgba(37,99,235,0.3)',
        borderRadius: '16px', padding: '28px 32px',
      }}>
        {/* Subtle decorative circle */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'rgba(37,99,235,0.08)', pointerEvents: 'none',
        }} />
        <div>
          <p style={{ fontSize: '0.875rem', color: '#60a5fa', fontWeight: 500, margin: '0 0 6px' }}>
            Welcome back
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
            {user.fullName}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
            {user.position} · {user.department}
          </p>
        </div>
        <div style={{ position: 'absolute', top: '24px', right: '28px', textAlign: 'right' }}>
          <p style={{ fontSize: '0.6875rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
            Employee ID
          </p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'monospace', color: '#60a5fa', margin: 0 }}>
            {user.employeeId}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TODAY STATUS  +  KIOSK CTA
      ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Today status card */}
        <div style={{ ...CARD, padding: '20px' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 14px' }}>
            Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>

          {todayRecord ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                padding: '10px', borderRadius: '12px', flexShrink: 0,
                background: todayRecord.status === 'Present'
                  ? 'rgba(21,128,61,0.2)'
                  : 'rgba(180,83,9,0.25)',
              }}>
                {todayRecord.status === 'Present'
                  ? <CheckCircle2 size={22} color="#4ade80" />
                  : <Clock        size={22} color="#fbbf24" />
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>
                  {todayRecord.status === 'Present' ? 'On Time ✅' : 'Arrived Late ⏰'}
                </p>

                {/* Date */}
                <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  📅 {new Date(todayRecord.checkInTime).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>

                {/* Time */}
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                  🕐 Check-in: {new Date(todayRecord.checkInTime).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </p>

                {/* Late warning */}
                {todayRecord.status === 'Late' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '7px 12px',
                    borderRadius: '9px',
                    background: 'rgba(180,83,9,0.2)',
                    border: '1px solid rgba(245,158,11,0.35)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Clock size={13} color="#fbbf24"/>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fcd34d' }}>
                      {todayRecord.lateMinutes > 0
                        ? `${todayRecord.lateMinutes >= 60
                            ? `${Math.floor(todayRecord.lateMinutes / 60)}h ${todayRecord.lateMinutes % 60 > 0 ? todayRecord.lateMinutes % 60 + 'min' : ''}`
                            : `${todayRecord.lateMinutes} min`} late`
                        : 'Marked as late'}
                    </span>
                  </div>
                )}
              </div>
              <StatusBadge status={todayRecord.status} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(30,41,59,0.6)' }}>
                <XCircle size={22} color="#475569" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>Not checked in yet</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#334155' }}>Use the kiosk to check in</p>
              </div>
            </div>
          )}
        </div>

        {/* Kiosk CTA */}
        <KioskCTA />
      </div>

      {/* ══════════════════════════════════════════════════════
          STATS CARDS
      ══════════════════════════════════════════════════════ */}
      {loadingStats ? (
        <Spinner />
      ) : statsErr ? (
        <ErrBox msg={statsErr} />
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Annual attendance rate */}
          <div style={{ ...CARD, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingUp size={14} color="#64748b" />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Annual Rate
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '14px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
                {stats.year.rate}%
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', paddingBottom: '4px' }}>
                attendance this year
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                width: `${stats.year.rate}%`,
                background: stats.year.rate >= 90 ? '#22c55e' : stats.year.rate >= 70 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.7s ease',
              }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <MiniChip label="Present" value={stats.year.present} color="green" />
              <MiniChip label="Late"    value={stats.year.late}    color="amber" />
              <MiniChip label="Absent"  value={stats.year.absent}  color="red"   />
            </div>
          </div>

          {/* This month */}
          <div style={{ ...CARD, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Calendar size={14} color="#64748b" />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                This Month
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '24px' }}>
              <StatChip label="Present" value={stats.month.present} color="green" icon={CheckCircle2} />
              <StatChip label="Late"    value={stats.month.late}    color="amber" icon={Clock}        />
              <StatChip label="Absent"  value={stats.month.absent}  color="red"   icon={XCircle}      />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ATTENDANCE HISTORY TABLE
          • overflow:hidden on the outer card clips thead
          • overflow-x:auto on the inner div → horizontal scroll
          • px-5 py-4 on all cells
          • mb-16 via parent paddingBottom in Layout
      ══════════════════════════════════════════════════════ */}
      <div style={TABLE_CARD}>

        {/* Table header row with date filters */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
          justifyContent: 'space-between', gap: '12px',
          padding: '20px 24px',
          borderBottom: '1px solid #1e293b',
          background: '#0f172a',
        }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            Attendance History
          </h3>

          {/* Date range filters — no placeholders */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
            <DateFilter label="From" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <DateFilter label="To"   value={endDate}   onChange={e => setEndDate(e.target.value)}   />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', color: '#64748b', padding: '2px 4px',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table body */}
        {loadingRec ? (
          <div style={{ background: '#0f172a' }}><Spinner /></div>
        ) : recErr ? (
          <ErrBox msg={recErr} />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', background: '#0f172a' }}>
                <thead>
                  <tr style={{ background: 'rgba(30,41,59,0.7)', borderBottom: '1px solid #1e293b' }}>
                    {[
                      { label: 'Date',          minWidth: '120px' },
                      { label: 'Day',           minWidth: '120px' },
                      { label: 'Check-in Time', minWidth: '130px' },
                      { label: 'Status',        minWidth: '100px' },
                    ].map(col => (
                      <th key={col.label} style={{
                        textAlign: 'left', padding: '14px 20px',
                        fontSize: '0.6875rem', fontWeight: 700,
                        color: '#64748b', textTransform: 'uppercase',
                        letterSpacing: '0.07em', whiteSpace: 'nowrap',
                        minWidth: col.minWidth,
                      }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '56px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                  {records.map(r => (
                    <HistoryRow key={r._id} r={r} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 24px', borderTop: '1px solid #1e293b', background: '#0f172a',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <PaginationBtn disabled={pagination.page <= 1} onClick={() => fetchRecords(pagination.page - 1)}>
                    <ChevronLeft size={14} />
                  </PaginationBtn>
                  <PaginationBtn disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRecords(pagination.page + 1)}>
                    <ChevronRight size={14} />
                  </PaginationBtn>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function KioskCTA() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/kiosk"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '14px', textDecoration: 'none',
        background: hovered ? 'rgba(29,78,216,0.25)' : 'rgba(29,78,216,0.12)',
        border: '1px solid rgba(37,99,235,0.35)',
        borderRadius: '16px', padding: '24px',
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px',
        background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.15s',
        boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
      }}>
        <Camera size={24} color="#ffffff" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#93c5fd' }}>
          Check In with Face
        </p>
        <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#475569' }}>
          Go to attendance kiosk →
        </p>
      </div>
    </a>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={onChange}
        style={{
          padding: '7px 10px', borderRadius: '8px',
          background: '#1e293b', border: '1.5px solid #334155',
          color: '#e2e8f0', fontSize: '0.75rem', outline: 'none',
          transition: 'border-color 0.12s',
        }}
        onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
        onBlur={e  => { e.target.style.borderColor = '#334155'; }}
      />
    </div>
  );
}

function HistoryRow({ r }) {
  const [hovered, setHovered] = useState(false);
  const cell = {
    padding: '16px 20px', fontSize: '0.875rem',
    borderBottom: '1px solid #1e293b',
    background: hovered ? 'rgba(30,41,59,0.5)' : 'transparent',
    transition: 'background 0.1s',
  };
  return (
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <td style={{ ...cell, fontFamily: 'monospace', color: '#cbd5e1', fontSize: '0.8125rem' }}>{r.date}</td>
      <td style={{ ...cell, color: '#94a3b8', fontSize: '0.8125rem' }}>
        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
      </td>
      <td style={{ ...cell, fontFamily: 'monospace', color: '#cbd5e1', fontSize: '0.8125rem' }}>
        {new Date(r.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </td>
      <td style={cell}><StatusBadge status={r.status} /></td>
    </tr>
  );
}

function PaginationBtn({ disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '6px 8px', borderRadius: '8px',
        background: '#1e293b', border: '1px solid #334155',
        color: '#94a3b8', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1, display: 'flex', alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

const chipColors = {
  green: { bg: 'rgba(21,128,61,0.18)',  border: 'rgba(21,128,61,0.4)',  text: '#4ade80' },
  amber: { bg: 'rgba(180,83,9,0.18)',   border: 'rgba(180,83,9,0.4)',   text: '#fbbf24' },
  red:   { bg: 'rgba(185,28,28,0.18)',  border: 'rgba(185,28,28,0.4)',  text: '#f87171' },
};

function StatChip({ label, value, color, icon: Icon }) {
  const c = chipColors[color];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: '12px', padding: '12px 8px', textAlign: 'center',
    }}>
      <Icon size={15} color={c.text} style={{ display: 'block', margin: '0 auto 6px' }} />
      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: c.text, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '4px 0 0', fontSize: '0.6875rem', color: '#64748b' }}>{label}</p>
    </div>
  );
}

function MiniChip({ label, value, color }) {
  const c = chipColors[color];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: '8px', padding: '8px 6px', textAlign: 'center',
    }}>
      <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: c.text }}>{value}</p>
      <p style={{ margin: '2px 0 0', fontSize: '0.6875rem', color: '#64748b' }}>{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Present: { bg: 'rgba(21,128,61,0.25)',  color: '#86efac', border: 'rgba(21,128,61,0.4)'  },
    Late:    { bg: 'rgba(180,83,9,0.25)',   color: '#fcd34d', border: 'rgba(180,83,9,0.4)'   },
    Absent:  { bg: 'rgba(185,28,28,0.25)',  color: '#fca5a5', border: 'rgba(185,28,28,0.4)'  },
  };
  const s = map[status] ?? { bg: 'rgba(30,41,59,0.5)', color: '#94a3b8', border: '#334155' };
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.6875rem', fontWeight: 700,
      padding: '3px 10px', borderRadius: '999px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

function ErrBox({ msg }) {
  return (
    <div style={{
      margin: '16px', padding: '14px 16px', borderRadius: '12px',
      background: 'rgba(127,29,29,0.3)', border: '1px solid #991b1b',
      color: '#fca5a5', fontSize: '0.875rem',
    }}>
      {msg}
    </div>
  );
}
