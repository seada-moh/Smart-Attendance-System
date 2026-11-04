/**
 * LeaveRequest — Employee leave request page
 * Admin approval marks attendance as "Permission"
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CalendarCheck, Send, Clock, CheckCircle2, XCircle,
  Trash2, AlertTriangle, CalendarDays,
} from 'lucide-react';

const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Emergency', 'Personal', 'Other'];

const CARD = {
  background: 'rgba(10,18,42,0.75)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px', padding: '24px',
  backdropFilter: 'blur(8px)',
};
const LABEL = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase',
  letterSpacing: '0.07em', marginBottom: '6px',
};
const INPUT = {
  width: '100%', padding: '10px 14px',
  background: '#1e293b', border: '1.5px solid #334155',
  borderRadius: '10px', color: '#f1f5f9', fontSize: '0.875rem',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  fontFamily: 'inherit',
};

const STATUS_MAP = {
  pending:  { color: '#fbbf24', bg: 'rgba(180,83,9,0.2)',  border: 'rgba(245,158,11,0.3)', icon: Clock,         label: 'Pending'  },
  approved: { color: '#4ade80', bg: 'rgba(21,128,61,0.2)', border: 'rgba(34,197,94,0.3)',  icon: CheckCircle2,  label: 'Approved' },
  rejected: { color: '#f87171', bg: 'rgba(127,29,29,0.2)', border: 'rgba(239,68,68,0.3)',  icon: XCircle,       label: 'Rejected' },
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function LeaveRequest() {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    startDate: today, endDate: today, reason: '', leaveType: 'Personal',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState(null);

  const [myLeaves,    setMyLeaves]    = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [cancelId,    setCancelId]    = useState(null);
  const [cancelling,  setCancelling]  = useState(false);

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const loadLeaves = () => {
    setLoadingList(true);
    api.get('/leave/my').then(r => setMyLeaves(r.data.data.leaves)).catch(() => {}).finally(() => setLoadingList(false));
  };
  useEffect(loadLeaves, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setSubmitMsg(null);
    try {
      await api.post('/leave', form);
      setSubmitMsg({ type: 'success', text: 'Leave request submitted! Waiting for admin approval.' });
      setForm({ startDate: today, endDate: today, reason: '', leaveType: 'Personal' });
      loadLeaves();
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.message });
    } finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await api.delete(`/leave/${cancelId}`);
      setCancelId(null);
      loadLeaves();
    } catch (err) {
      alert(err.message);
    } finally { setCancelling(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '760px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 2px' }}>
          Leave / Permission Request
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
          Submit a leave request — Admin approval will mark attendance as "Permission"
        </p>
      </div>

      {/* ── Request Form ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <CalendarCheck size={16} color="#60a5fa"/>
          <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>New Leave Request</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Start Date */}
            <div>
              <label style={LABEL}>Start Date *</label>
              <input type="date" name="startDate" value={form.startDate} onChange={set}
                min={today} required
                style={{ ...INPUT, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor='#3b82f6'}
                onBlur={e  => e.target.style.borderColor='#334155'}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={LABEL}>End Date *</label>
              <input type="date" name="endDate" value={form.endDate} onChange={set}
                min={form.startDate} required
                style={{ ...INPUT, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor='#3b82f6'}
                onBlur={e  => e.target.style.borderColor='#334155'}
              />
            </div>

            {/* Leave Type */}
            <div>
              <label style={LABEL}>Leave Type *</label>
              <select name="leaveType" value={form.leaveType} onChange={set}
                style={INPUT}
                onFocus={e => e.target.style.borderColor='#3b82f6'}
                onBlur={e  => e.target.style.borderColor='#334155'}
              >
                {LEAVE_TYPES.map(t => (
                  <option key={t} value={t} style={{ background: '#1e293b' }}>{t}</option>
                ))}
              </select>
            </div>

            {/* Duration preview */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: '10px', padding: '10px 14px',
            }}>
              <CalendarDays size={18} color="#60a5fa"/>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>Duration</p>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>
                  {Math.max(1, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1)} day(s)
                </p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginTop: '16px' }}>
            <label style={LABEL}>Reason *</label>
            <textarea name="reason" value={form.reason} onChange={set} required rows={4}
              placeholder="Explain your reason for leave…"
              style={{
                ...INPUT, resize: 'vertical', minHeight: '100px',
              }}
              onFocus={e => e.target.style.borderColor='#3b82f6'}
              onBlur={e  => e.target.style.borderColor='#334155'}
            />
          </div>

          {submitMsg && (
            <div style={{
              marginTop: '14px', padding: '10px 14px', borderRadius: '10px',
              background: submitMsg.type === 'success' ? 'rgba(21,128,61,0.2)' : 'rgba(127,29,29,0.3)',
              border: `1px solid ${submitMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: submitMsg.type === 'success' ? '#86efac' : '#fca5a5',
              fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {submitMsg.type === 'success' ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
              {submitMsg.text}
            </div>
          )}

          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={submitting} style={{
              padding: '10px 24px', borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
              background: '#2563eb', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '7px',
              opacity: submitting ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}>
              <Send size={14}/> {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      {/* ── My Leave History ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <CalendarDays size={16} color="#60a5fa"/>
          <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>My Leave Requests</span>
        </div>

        {loadingList ? (
          <p style={{ color: '#475569', fontSize: '0.82rem' }}>Loading…</p>
        ) : myLeaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#334155' }}>
            <CalendarCheck size={32} color="#1e293b" style={{ marginBottom: '8px' }}/>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>No leave requests yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myLeaves.map(lv => {
              const s = STATUS_MAP[lv.status];
              const Icon = s.icon;
              return (
                <div key={lv._id} style={{
                  padding: '14px 16px', borderRadius: '12px',
                  background: s.bg, border: `1px solid ${s.border}`,
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color={s.color}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.875rem' }}>
                        {lv.leaveType}
                      </span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px', borderRadius: '999px',
                        background: 'rgba(0,0,0,0.25)', color: s.color,
                      }}>
                        {s.label.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 3px', fontSize: '0.78rem', color: '#94a3b8' }}>
                      📅 {fmtDate(lv.startDate)} → {fmtDate(lv.endDate)}
                    </p>
                    <p style={{ margin: '0 0 3px', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                      {lv.reason}
                    </p>
                    {lv.adminNote && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                        💬 Admin: {lv.adminNote}
                      </p>
                    )}
                  </div>
                  {lv.status === 'pending' && (
                    <button
                      onClick={() => setCancelId(lv._id)}
                      title="Cancel request"
                      style={{
                        padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                        background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', flexShrink: 0,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13}/>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel confirm modal */}
      {cancelId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid #334155',
            borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '90%',
          }}>
            <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem', margin: '0 0 10px' }}>
              Cancel Leave Request
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 20px' }}>
              Are you sure you want to cancel this leave request?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setCancelId(null)} style={{
                flex: 1, padding: '9px', borderRadius: '10px',
                background: '#1e293b', border: '1px solid #334155',
                color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
              }}>Keep</button>
              <button onClick={handleCancel} disabled={cancelling} style={{
                flex: 1, padding: '9px', borderRadius: '10px',
                background: '#b91c1c', border: 'none', color: '#fff',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
                opacity: cancelling ? 0.7 : 1,
              }}>{cancelling ? 'Cancelling…' : 'Cancel Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
