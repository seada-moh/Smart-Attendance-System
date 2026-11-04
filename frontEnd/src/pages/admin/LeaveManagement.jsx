/**
 * LeaveManagement — Admin leave request approval page
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CalendarCheck, CheckCircle2, XCircle, Clock,
  ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';

const STATUS_MAP = {
  pending:  { color: '#fbbf24', bg: 'rgba(180,83,9,0.15)',  border: 'rgba(245,158,11,0.25)', label: 'Pending'  },
  approved: { color: '#4ade80', bg: 'rgba(21,128,61,0.15)', border: 'rgba(34,197,94,0.25)',  label: 'Approved' },
  rejected: { color: '#f87171', bg: 'rgba(127,29,29,0.15)', border: 'rgba(239,68,68,0.25)',  label: 'Rejected' },
};
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const CARD = {
  background: '#0f172a', border: '1px solid #1e293b',
  borderRadius: '16px', overflow: 'hidden',
};

export default function LeaveManagement() {
  const [leaves,     setLeaves]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('pending');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [reviewing,  setReviewing]  = useState(null); // { leave, status }
  const [adminNote,  setAdminNote]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState(null);

  const load = (page = 1) => {
    setLoading(true);
    api.get(`/leave?status=${filter}&page=${page}&limit=20`)
      .then(r => { setLeaves(r.data.data.leaves); setPagination(r.data.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [filter]);

  const handleReview = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      await api.patch(`/leave/${reviewing.leave._id}`, { status: reviewing.status, adminNote });
      setMsg({ type: 'success', text: `Request ${reviewing.status} successfully. Attendance updated.` });
      setReviewing(null); setAdminNote('');
      load(pagination.page);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 3px' }}>
            Leave Requests
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Review and approve leave requests — Approved requests mark attendance as "Permission"
          </p>
        </div>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          {['pending','approved','rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              fontWeight: 600, fontSize: '0.78rem',
              background: filter === s ? STATUS_MAP[s].bg : 'transparent',
              color: filter === s ? STATUS_MAP[s].color : '#475569',
              transition: 'all 0.15s',
            }}>
              {STATUS_MAP[s].label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: '10px',
          background: msg.type === 'success' ? 'rgba(21,128,61,0.2)' : 'rgba(127,29,29,0.3)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {msg.type === 'success' ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>×</button>
        </div>
      )}

      {/* Table */}
      <div style={CARD}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#475569' }}>Loading…</div>
        ) : leaves.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#334155' }}>
            <CalendarCheck size={32} color="#1e293b" style={{ marginBottom: '10px' }}/>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>No {filter} leave requests</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(30,41,59,0.8)', borderBottom: '1px solid #1e293b' }}>
                  {['Employee','Leave Type','Period','Days','Reason','Status','Actions'].map(h => (
                    <th key={h} style={{
                      padding: '13px 16px', textAlign: 'left',
                      fontSize: '0.65rem', fontWeight: 700, color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((lv, i) => {
                  const s = STATUS_MAP[lv.status];
                  const days = Math.max(1, Math.round((new Date(lv.endDate) - new Date(lv.startDate)) / 86400000) + 1);
                  return (
                    <tr key={lv._id}
                      style={{ borderBottom: i < leaves.length-1 ? '1px solid #1e293b' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,41,59,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '0.875rem' }}>{lv.fullName}</p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>{lv.employeeId} · {lv.department}</p>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{lv.leaveType}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {fmtDate(lv.startDate)}<br/>
                        <span style={{ color: '#475569' }}>→ {fmtDate(lv.endDate)}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: 'rgba(37,99,235,0.15)', color: '#60a5fa',
                          border: '1px solid rgba(37,99,235,0.3)',
                          padding: '2px 10px', borderRadius: '999px',
                          fontSize: '0.78rem', fontWeight: 700,
                        }}>{days}d</span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', maxWidth: '200px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lv.reason}>
                          {lv.reason}
                        </span>
                        {lv.adminNote && <span style={{ display: 'block', fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>Note: {lv.adminNote}</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {lv.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => { setReviewing({ leave: lv, status: 'approved' }); setAdminNote(''); setMsg(null); }}
                              style={{
                                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                                background: 'rgba(21,128,61,0.2)', border: '1px solid rgba(34,197,94,0.3)',
                                color: '#4ade80', fontWeight: 600, fontSize: '0.75rem',
                                display: 'flex', alignItems: 'center', gap: '4px',
                              }}>
                              <CheckCircle2 size={12}/> Approve
                            </button>
                            <button
                              onClick={() => { setReviewing({ leave: lv, status: 'rejected' }); setAdminNote(''); setMsg(null); }}
                              style={{
                                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                                background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', fontWeight: 600, fontSize: '0.75rem',
                                display: 'flex', alignItems: 'center', gap: '4px',
                              }}>
                              <XCircle size={12}/> Reject
                            </button>
                          </div>
                        )}
                        {lv.status !== 'pending' && (
                          <span style={{ fontSize: '0.72rem', color: '#334155' }}>
                            {lv.reviewedAt ? fmtDate(lv.reviewedAt) : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid #1e293b', background: '#0f172a',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} requests
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <PaginBtn disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}><ChevronLeft size={14}/></PaginBtn>
              <PaginBtn disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}><ChevronRight size={14}/></PaginBtn>
            </div>
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid #334155',
            borderRadius: '18px', padding: '28px', maxWidth: '420px', width: '90%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              {reviewing.status === 'approved'
                ? <CheckCircle2 size={20} color="#4ade80"/>
                : <XCircle      size={20} color="#f87171"/>
              }
              <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem', margin: 0 }}>
                {reviewing.status === 'approved' ? 'Approve' : 'Reject'} Leave Request
              </h3>
            </div>

            <div style={{
              background: '#1e293b', borderRadius: '10px', padding: '14px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#f1f5f9' }}>
                {reviewing.leave.fullName}
              </p>
              <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#64748b' }}>
                {reviewing.leave.leaveType} · {fmtDate(reviewing.leave.startDate)} → {fmtDate(reviewing.leave.endDate)}
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                "{reviewing.leave.reason}"
              </p>
            </div>

            {reviewing.status === 'approved' && (
              <div style={{
                background: 'rgba(21,128,61,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '10px', padding: '12px', marginBottom: '16px',
                display: 'flex', alignItems: 'flex-start', gap: '8px',
              }}>
                <CalendarCheck size={15} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }}/>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#86efac', lineHeight: 1.5 }}>
                  Approving will mark attendance as <strong>"Permission"</strong> for these days instead of "Absent".
                </p>
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Note (optional)
              </label>
              <textarea
                value={adminNote} onChange={e => setAdminNote(e.target.value)}
                rows={3} placeholder="Add a note to the employee…"
                style={{
                  width: '100%', padding: '10px', background: '#1e293b',
                  border: '1px solid #334155', borderRadius: '10px',
                  color: '#f1f5f9', fontSize: '0.82rem', outline: 'none',
                  resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setReviewing(null)} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                background: '#1e293b', border: '1px solid #334155',
                color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
              }}>Cancel</button>
              <button onClick={handleReview} disabled={saving} style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: reviewing.status === 'approved' ? '#16a34a' : '#b91c1c',
                color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem', opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Processing…' : reviewing.status === 'approved' ? '✅ Approve & Mark Permission' : '❌ Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaginBtn({ disabled, onClick, children }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: '6px 8px', borderRadius: '8px', background: '#1e293b',
      border: '1px solid #334155', color: '#94a3b8',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
      display: 'flex', alignItems: 'center',
    }}>{children}</button>
  );
}
