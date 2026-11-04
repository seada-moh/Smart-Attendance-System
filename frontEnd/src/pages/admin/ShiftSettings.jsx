import { useState, useEffect } from 'react';
import { shiftService } from '../../services/shiftService';
import { Clock, Save, Info, CheckCircle2, Loader2, AlertTriangle, UtensilsCrossed } from 'lucide-react';

/* ── helpers ── */
const pad    = (n) => String(n).padStart(2, '0');
const fmt12  = (h, m) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${pad(m)} ${ampm}`;
};
const addMins = (h, m, mins) => {
  const total = h * 60 + m + mins;
  return { h: Math.floor(total / 60) % 24, m: total % 60 };
};

// "HH:MM" string → { h, m }
const parseTime = (str) => {
  if (!str) return { h: 0, m: 0 };
  const [h, m] = str.split(':').map(Number);
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
};
// { h, m } → "HH:MM"
const toTimeStr = (h, m) => `${pad(h)}:${pad(m)}`;

const INIT = {
  startHour: 8,  startMinute: 30,
  gracePeriod: 0,
  endHour: 17,   endMinute: 0,
  lunchEnabled: false,
  lunchStartHour: 12, lunchStartMinute: 0,
  lunchDuration: 60,
};

export default function ShiftSettings() {
  const [form,    setForm]    = useState(INIT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    shiftService.getSettings()
      .then(d => setForm({
        startHour:        d.startHour        ?? 8,
        startMinute:      d.startMinute      ?? 30,
        gracePeriod:      d.gracePeriod      ?? 0,
        endHour:          d.endHour          ?? 17,
        endMinute:        d.endMinute        ?? 0,
        lunchEnabled:     d.lunchEnabled     ?? false,
        lunchStartHour:   d.lunchStartHour   ?? 12,
        lunchStartMinute: d.lunchStartMinute ?? 0,
        lunchDuration:    d.lunchDuration    ?? 60,
      }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* set time from HH:MM string */
  const setTime = (hourField, minuteField, val) => {
    const { h, m } = parseTime(val);
    setForm(p => ({ ...p, [hourField]: h, [minuteField]: m }));
    setSuccess('');
  };

  const set    = (field, val) => { setForm(p => ({ ...p, [field]: Number(val) })); setSuccess(''); };
  const toggle = ()           => { setForm(p => ({ ...p, lunchEnabled: !p.lunchEnabled })); setSuccess(''); };

  const handleSave = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      // Auto-calculate afterLunchStart from lunchStart + duration
      const afterLunch = addMins(form.lunchStartHour, form.lunchStartMinute, form.lunchDuration);
      await shiftService.updateSettings({
        ...form,
        afterLunchStartHour:   afterLunch.h,
        afterLunchStartMinute: afterLunch.m,
      });
      setSuccess('Shift settings saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived values ── */
  const deadlineMins  = form.startHour * 60 + form.startMinute + form.gracePeriod;
  const deadline      = { h: Math.floor(deadlineMins / 60) % 24, m: deadlineMins % 60 };
  const lunchEnd      = addMins(form.lunchStartHour, form.lunchStartMinute, form.lunchDuration);

  const startLabel    = fmt12(form.startHour,       form.startMinute);
  const deadlineLabel = fmt12(deadline.h,            deadline.m);
  const endLabel      = fmt12(form.endHour,          form.endMinute);
  const lunchStartLbl = fmt12(form.lunchStartHour,   form.lunchStartMinute);
  const lunchEndLbl   = fmt12(lunchEnd.h,            lunchEnd.m);

  const grossMins = (form.endHour * 60 + form.endMinute) - (form.startHour * 60 + form.startMinute);
  const netMins   = form.lunchEnabled ? grossMins - form.lunchDuration : grossMins;
  const netLabel  = netMins > 0
    ? `${Math.floor(netMins / 60)}h ${netMins % 60 > 0 ? netMins % 60 + 'm' : ''}`.trim()
    : '—';

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#94a3b8', gap:10 }}>
      <Loader2 size={20} style={{ animation:'spin 1s linear infinite' }} /> Loading settings…
    </div>
  );

  return (
    <div style={{ maxWidth:620, margin:'0 auto', padding:'32px 16px', display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:20, fontWeight:700, color:'#f1f5f9', margin:0 }}>Shift Settings</h1>
        <p style={{ fontSize:13, color:'#64748b', marginTop:4 }}>
          Configure work hours, grace period, lunch break and late-arrival rules.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div style={card}>

          {/* ── START TIME ── */}
          <Section title="Start Time" icon={<Clock size={15}/>}>
            <p style={hint}>Official check-in time. Employees must arrive by start + grace period.</p>
            <TimeField
              label="Start Time"
              value={toTimeStr(form.startHour, form.startMinute)}
              onChange={v => setTime('startHour', 'startMinute', v)}
            />
          </Section>

          <Divider />

          {/* ── GRACE PERIOD ── */}
          <Section title="Grace Period" icon={<Info size={15}/>}>
            <p style={hint}>Extra minutes allowed after start time before marking <em>Late</em>. Set 0 to disable.</p>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <NumField
                label="Minutes (0–60)"
                value={form.gracePeriod} min={0} max={60}
                onChange={v => set('gracePeriod', v)}
              />
              {form.gracePeriod > 0 && (
                <div style={{ paddingTop:18 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Late deadline: </span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#fbbf24' }}>{deadlineLabel}</span>
                </div>
              )}
            </div>
          </Section>

          <Divider />

          {/* ── END TIME ── */}
          <Section title="End Time" icon={<Clock size={15}/>}>
            <p style={hint}>Official end-of-day / check-out reference time.</p>
            <TimeField
              label="End Time"
              value={toTimeStr(form.endHour, form.endMinute)}
              onChange={v => setTime('endHour', 'endMinute', v)}
            />
          </Section>

          <Divider />

          {/* ── LUNCH BREAK ── */}
          <Section title="Lunch Break" icon={<UtensilsCrossed size={15}/>}>
            <p style={hint}>
              When enabled, kiosk scans during lunch are blocked. Duration is subtracted from net working hours.
            </p>

            {/* Toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button
                type="button" onClick={toggle}
                style={{
                  position:'relative', width:44, height:24, borderRadius:12,
                  border:'none', cursor:'pointer',
                  background: form.lunchEnabled ? '#2563eb' : '#334155',
                  transition:'background 0.2s', flexShrink:0,
                }}
              >
                <span style={{
                  position:'absolute', top:3,
                  left: form.lunchEnabled ? 22 : 3,
                  width:18, height:18, borderRadius:'50%', background:'#fff',
                  transition:'left 0.2s',
                }}/>
              </button>
              <span style={{ fontSize:13, color: form.lunchEnabled ? '#f1f5f9' : '#64748b', fontWeight:600 }}>
                {form.lunchEnabled ? 'Lunch break enabled' : 'Lunch break disabled'}
              </span>
            </div>

            {form.lunchEnabled && (
              <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:4,
                padding:'16px', borderRadius:10, background:'#0f172a', border:'1px solid #1e293b' }}>

                {/* Lunch Start */}
                <div>
                  <p style={sectionLabel}>Lunch Start Time</p>
                  <TimeField
                    label="Lunch Start"
                    value={toTimeStr(form.lunchStartHour, form.lunchStartMinute)}
                    onChange={v => setTime('lunchStartHour', 'lunchStartMinute', v)}
                  />
                </div>

                {/* Lunch Duration */}
                <div>
                  <p style={sectionLabel}>Lunch Duration</p>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <NumField
                      label="Duration (minutes, 0–180)"
                      value={form.lunchDuration} min={0} max={180}
                      onChange={v => set('lunchDuration', v)}
                    />
                  </div>
                </div>

                {/* After Lunch — auto-calculated */}
                <div style={{
                  padding:'12px 14px', borderRadius:10,
                  background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#60a5fa', textTransform:'uppercase',
                      letterSpacing:'0.05em', margin:'0 0 4px' }}>
                      After Lunch Check-In Opens
                    </p>
                    <p style={{ fontSize:22, fontWeight:800, color:'#ffffff', margin:0 }}>
                      {lunchEndLbl}
                    </p>
                    <p style={{ fontSize:11, color:'#475569', margin:'3px 0 0' }}>
                      Auto-calculated: {lunchStartLbl} + {form.lunchDuration} min
                    </p>
                  </div>
                  <Clock size={22} color="#3b82f6"/>
                </div>
              </div>
            )}
          </Section>

          <Divider />

          {error   && <Alert type="error"   text={error}/>}
          {success && <Alert type="success" text={success}/>}

          <button
            type="submit" disabled={saving}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              width:'100%', padding:'11px 0', borderRadius:12,
              background:'#2563eb', color:'#fff', fontWeight:700, fontSize:14,
              border:'none', cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1, transition:'opacity 0.15s',
            }}
          >
            {saving
              ? <><Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/> Saving…</>
              : <><Save size={15}/> Save Settings</>}
          </button>
        </div>
      </form>

      {/* ── LIVE PREVIEW ── */}
      <div style={card}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', margin:'0 0 16px',
          display:'flex', alignItems:'center', gap:8 }}>
          <Info size={15} style={{ color:'#60a5fa' }}/> Live Preview
        </h3>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <PreviewRow color="#22c55e" label="Present"
            desc={`Arrived by ${deadlineLabel} (Start ${startLabel}${form.gracePeriod > 0 ? ` + ${form.gracePeriod} min grace` : ''})`}/>
          <PreviewRow color="#eab308" label="Late"
            desc={`Arrived after ${deadlineLabel} — minutes late are recorded`}/>
          {form.lunchEnabled && (
            <PreviewRow color="#60a5fa" label="Lunch Break"
              desc={`${lunchStartLbl} – ${lunchEndLbl} (${form.lunchDuration} min)`}/>
          )}
          <PreviewRow color="#94a3b8" label="End of Day"
            desc={`Check-out reference: ${endLabel}`}/>
        </div>

        <div style={{ marginTop:16, padding:'14px 16px', borderRadius:10, background:'#0f172a', border:'1px solid #1e293b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:12, color:'#64748b' }}>Gross work hours</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#94a3b8' }}>
              {Math.floor(grossMins/60)}h {grossMins%60 > 0 ? grossMins%60+'m' : ''}
            </span>
          </div>
          {form.lunchEnabled && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:12, color:'#64748b' }}>− Lunch break</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#60a5fa' }}>− {form.lunchDuration} min</span>
            </div>
          )}
          <div style={{ borderTop:'1px solid #1e293b', paddingTop:8,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>Net working hours</span>
            <span style={{ fontSize:15, fontWeight:800, color:'#22c55e' }}>{netLabel}</span>
          </div>
        </div>

        <p style={{ fontSize:11, color:'#475569', marginTop:8, lineHeight:1.6 }}>
          <strong style={{ color:'#64748b' }}>Example:</strong> Start {startLabel}, grace {form.gracePeriod} min → deadline {deadlineLabel}.
          {form.lunchEnabled ? ` Lunch ${lunchStartLbl}–${lunchEndLbl}. Net: ${netLabel}.` : ''}
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TimeField({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'#64748b',
        textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width:160, padding:'9px 12px', borderRadius:10,
          background:'#0f172a', border:'1px solid #334155',
          color:'#f1f5f9', fontSize:15, fontWeight:600,
          outline:'none', boxSizing:'border-box',
          colorScheme:'dark',
          cursor:'pointer',
        }}
        onFocus={e  => e.target.style.borderColor = '#3b82f6'}
        onBlur={e   => e.target.style.borderColor = '#334155'}
      />
    </div>
  );
}

function NumField({ label, value, min, max, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'#64748b',
        textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width:120, padding:'9px 12px', borderRadius:10,
          background:'#0f172a', border:'1px solid #334155',
          color:'#f1f5f9', fontSize:15, fontWeight:600,
          outline:'none', boxSizing:'border-box',
        }}
        onFocus={e => e.target.style.borderColor = '#3b82f6'}
        onBlur={e  => e.target.style.borderColor = '#334155'}
      />
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ color:'#60a5fa' }}>{icon}</span>
        <span style={{ fontSize:13, fontWeight:700, color:'#cbd5e1',
          textTransform:'uppercase', letterSpacing:'0.05em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PreviewRow({ color, label, desc }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
      <span style={{ width:10, height:10, borderRadius:'50%', background:color, marginTop:3, flexShrink:0 }}/>
      <div>
        <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{label}</span>
        <span style={{ fontSize:12, color:'#64748b', marginLeft:8 }}>{desc}</span>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop:'1px solid #1e293b', margin:'4px 0' }}/>;
}

function Alert({ type, text }) {
  const isErr = type === 'error';
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, padding:'11px 14px', borderRadius:10,
      background: isErr ? 'rgba(127,29,29,0.4)' : 'rgba(20,83,45,0.4)',
      border:`1px solid ${isErr ? '#991b1b' : '#166534'}`,
      color: isErr ? '#fca5a5' : '#86efac', fontSize:13,
    }}>
      {isErr ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>}
      {text}
    </div>
  );
}

const card        = { background:'#0f172a', border:'1px solid #1e293b', borderRadius:16, padding:'24px', display:'flex', flexDirection:'column', gap:20 };
const hint        = { fontSize:12, color:'#64748b', margin:0, lineHeight:1.5 };
const sectionLabel = { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 10px' };
