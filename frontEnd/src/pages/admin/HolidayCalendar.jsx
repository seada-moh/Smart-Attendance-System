/**
 * HolidayCalendar — Admin views & manages Ethiopian public holidays
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, X,
} from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_COLORS = {
  national:  { bg: 'rgba(37,99,235,0.2)',  color: '#93c5fd', border: 'rgba(37,99,235,0.3)'  },
  religious: { bg: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: 'rgba(124,58,237,0.3)' },
  company:   { bg: 'rgba(21,128,61,0.2)',  color: '#86efac', border: 'rgba(21,128,61,0.3)'  },
  other:     { bg: 'rgba(100,116,139,0.2)',color: '#94a3b8', border: 'rgba(100,116,139,0.3)'},
};

const CARD = {
  background: '#0f172a', border: '1px solid #1e293b',
  borderRadius: '16px', overflow: 'hidden',
};

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
});

export default function HolidayCalendar() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const now  = new Date();
  const [year,     setYear]     = useState(now.getFullYear());
  const [month,    setMonth]    = useState(now.getMonth()); // 0-indexed
  const [holidays, setHolidays] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ date: '', name: '', description: '', type: 'national', recurring: false });
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [delId,    setDelId]    = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/holidays?year=${year}`)
      .then(r => setHolidays(r.data.data.holidays))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [year]);

  // Build calendar grid for current month
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells      = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const holidayMap = {};
  holidays.forEach(h => { holidayMap[h.date] = h; });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await api.post('/holidays', form);
      setMsg({ type: 'success', text: 'Holiday added!' });
      setForm({ date: '', name: '', description: '', type: 'national', recurring: false });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delId) return;
    try {
      await api.delete(`/holidays/${delId}`);
      setDelId(null); load();
    } catch {}
  };

  const monthHolidays = holidays.filter(h => {
    const d = new Date(h.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const INPUT = {
    width: '100%', padding: '9px 12px', background: '#1e293b',
    border: '1.5px solid #334155', borderRadius: '10px',
    color: '#f1f5f9', fontSize: '0.875rem', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.15s', colorScheme: 'dark',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 3px' }}>
            Holiday Calendar
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Ethiopian public holidays + custom company holidays
          </p>
        </div>
        {/* Only admin can add holidays */}
        {isAdmin && (
          <button onClick={() => { setShowForm(s => !s); setMsg(null); }} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 18px', borderRadius: '10px',
            background: showForm ? '#334155' : '#2563eb', border: 'none',
            color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
          }}>
            {showForm ? <X size={14}/> : <Plus size={14}/>}
            {showForm ? 'Cancel' : 'Add Holiday'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...CARD, padding: '22px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>
            Add Custom Holiday
          </h3>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} required style={INPUT}
                  onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#334155'}/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Holiday Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required
                  placeholder="e.g. Company Anniversary" style={INPUT}
                  onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#334155'}/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} style={INPUT}
                  onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#334155'}>
                  <option value="national"  style={{ background: '#1e293b' }}>National</option>
                  <option value="religious" style={{ background: '#1e293b' }}>Religious</option>
                  <option value="company"   style={{ background: '#1e293b' }}>Company</option>
                  <option value="other"     style={{ background: '#1e293b' }}>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                  placeholder="Optional" style={INPUT}
                  onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#334155'}/>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
              <button type="button" onClick={() => setForm(p => ({...p, recurring: !p.recurring}))}
                style={{ position:'relative', width:'40px', height:'22px', borderRadius:'11px', border:'none', cursor:'pointer',
                  background: form.recurring ? '#2563eb' : '#334155', transition:'background 0.2s', flexShrink:0 }}>
                <span style={{ position:'absolute', top:'2px', left: form.recurring ? '20px' : '2px',
                  width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
              </button>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Recurring yearly (repeat on same date every year)
              </span>
            </div>

            {msg && (
              <div style={{ marginTop: '12px', padding: '9px 14px', borderRadius: '9px',
                background: msg.type==='success' ? 'rgba(21,128,61,0.2)' : 'rgba(127,29,29,0.3)',
                color: msg.type==='success' ? '#86efac' : '#fca5a5', fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '7px' }}>
                {msg.type==='success' ? <CheckCircle2 size={13}/> : <AlertTriangle size={13}/>}
                {msg.text}
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} style={{
                padding: '9px 22px', borderRadius: '10px', background: '#2563eb',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Adding…' : 'Add Holiday'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

        {/* ── CALENDAR ── */}
        <div style={CARD}>
          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
            <button onClick={prevMonth} style={{ background: '#1e293b', border: '1px solid #334155',
              borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#94a3b8',
              display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16}/>
            </button>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                {MONTHS[month]} {year}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={() => setYear(y => y-1)} style={{ background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                {year-1}
              </button>
              <button onClick={() => setYear(y => y+1)} style={{ background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                {year+1}
              </button>
              <button onClick={nextMonth} style={{ background: '#1e293b', border: '1px solid #334155',
                borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #1e293b' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: '0.7rem',
                fontWeight: 700, color: d==='Sun'||d==='Sat' ? '#ef4444' : '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} style={{ padding: '10px', minHeight: '60px', borderRight: (i+1)%7!==0 ? '1px solid #1e293b' : 'none', borderBottom: '1px solid #1e293b' }}/>;

              const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const holiday  = holidayMap[dateStr];
              const isToday  = dateStr === new Date().toISOString().split('T')[0];
              const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const tc = holiday ? TYPE_COLORS[holiday.type] || TYPE_COLORS.other : null;

              return (
                <div key={dateStr} style={{
                  padding: '8px',
                  minHeight: '60px',
                  borderRight: (i+1)%7!==0 ? '1px solid #1e293b' : 'none',
                  borderBottom: '1px solid #1e293b',
                  background: holiday ? tc.bg : isWeekend ? 'rgba(239,68,68,0.04)' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', fontWeight: isToday ? 800 : 500,
                    background: isToday ? '#2563eb' : 'transparent',
                    color: isToday ? '#fff' : isWeekend ? '#f87171' : '#cbd5e1',
                    marginBottom: holiday ? '4px' : 0,
                  }}>
                    {day}
                  </div>
                  {holiday && (
                    <p style={{
                      fontSize: '0.6rem', fontWeight: 600, color: tc.color,
                      margin: 0, lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {holiday.name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── HOLIDAY LIST FOR MONTH ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...CARD, padding: '16px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 12px',
              display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={15} color="#60a5fa"/>
              {MONTHS[month]} Holidays
            </h3>
            {loading ? (
              <p style={{ color: '#475569', fontSize: '0.8rem' }}>Loading…</p>
            ) : monthHolidays.length === 0 ? (
              <p style={{ color: '#334155', fontSize: '0.8rem' }}>No holidays this month</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {monthHolidays.map(h => {
                  const tc = TYPE_COLORS[h.type] || TYPE_COLORS.other;
                  return (
                    <div key={h.date} style={{
                      padding: '10px 12px', borderRadius: '10px',
                      background: tc.bg, border: `1px solid ${tc.border}`,
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, color: tc.color, fontSize: '0.8rem' }}>
                          {h.name}
                          {h.builtin && <span style={{ fontSize: '0.6rem', marginLeft: '6px', opacity: 0.7 }}>★ built-in</span>}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                          {fmtDate(h.date)}
                          {h.recurring && <span style={{ marginLeft: '6px' }}>↻ yearly</span>}
                        </p>
                        {h.description && (
                          <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#475569' }}>{h.description}</p>
                        )}
                      </div>
                      {!h.builtin && isAdmin && (
                        <button onClick={() => setDelId(h._id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#475569', padding: '2px', flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color='#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color='#475569'}>
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ ...CARD, padding: '14px 16px' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Legend</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(TYPE_COLORS).map(([type, c]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: c.bg, border: `1px solid ${c.border}`, flexShrink: 0 }}/>
                  <span style={{ fontSize: '0.75rem', color: c.color, textTransform: 'capitalize' }}>{type}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', flexShrink: 0 }}/>
                <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Weekend</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {delId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px',
            padding: '28px', maxWidth: '360px', width: '90%' }}>
            <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem', margin: '0 0 10px' }}>
              Remove Holiday
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 20px' }}>
              Remove this custom holiday? Built-in Ethiopian holidays cannot be removed.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDelId(null)} style={{
                flex: 1, padding: '9px', borderRadius: '10px', background: '#1e293b',
                border: '1px solid #334155', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
              }}>Cancel</button>
              <button onClick={handleDelete} style={{
                flex: 1, padding: '9px', borderRadius: '10px', background: '#b91c1c',
                border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
              }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
