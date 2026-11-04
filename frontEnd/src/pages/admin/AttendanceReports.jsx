/**
 * AttendanceReports  —  /admin/reports
 *
 * Three main tabs:
 *  1. Weekly   — Mon–Sun week picker, daily bar chart, KPIs, table
 *  2. Monthly  — month+year picker, daily trend + dept breakdown, KPIs, table
 *  3. Yearly   — year picker, monthly trend chart, totals, dept summary
 *  4. Daily Log — raw paginated records (existing functionality preserved)
 *  5. Analytics — per-employee period summaries (existing functionality preserved)
 *
 * All data from real backend via attendanceService.getAnalytics() and
 * attendanceService.getCompany(). No mock data.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from 'recharts';
import { attendanceService } from '../../services/attendanceService';
import Spinner from '../../components/Spinner';
import {
  Filter, ChevronLeft, ChevronRight,
  AlertTriangle, ShieldAlert, CheckCircle2,
  BarChart2, List, Download, Calendar,
  TrendingUp, Users, Clock, Printer,
} from 'lucide-react';

/* ─── Date helpers ──────────────────────────────────────────────────────── */
const TODAY = new Date().toISOString().split('T')[0];
const iso   = d => d.toISOString().split('T')[0];

const getMonday = (d = new Date()) => {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  return copy;
};
const getSunday = (monday) => {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
};

const startOfWeek  = () => iso(getMonday());
const endOfWeek    = () => iso(getSunday(getMonday()));
const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
const endOfMonth   = () => { const d = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0); return iso(d); };
const startOfYear  = () => `${new Date().getFullYear()}-01-01`;
const endOfYear    = () => `${new Date().getFullYear()}-12-31`;

const fmtDate = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtMonth = (str) => {
  if (!str) return '';
  const [y, m] = str.split('-');
  return new Date(+y, +m-1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

/* ─── CSV export helpers ──────────────────────────────────────────────── */
function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportAnalytics(data, label) {
  if (!data?.employees?.length) return;
  const rows = data.employees.map(e => ({
    'Employee ID':     e.employeeId,
    'Name':            e.fullName,
    'Department':      e.department,
    'Present Days':    e.presentDays,
    'Late Days':       e.lateDays,
    'Absent Days':     e.absentDays,
    'Attendance %':    e.attendancePct + '%',
    'Total Late Time': e.lateTotalLabel,
    'Health Flag':     e.healthFlag,
  }));
  downloadCSV(rows, `attendance_${label}_${TODAY}.csv`);
}

function exportDailyLog(records) {
  if (!records.length) return;
  const fmt = dt => dt ? new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  const rows = records.map(r => ({
    'Employee ID':     r.employeeId,
    'Name':            r.fullName,
    'Department':      r.department || 'Unassigned',
    'Date':            r.date,
    'Check-In':        fmt(r.checkInTime),
    'Lunch Out':       fmt(r.checkOutTime),
    'After-Lunch In':  fmt(r.afterLunchCheckIn),
    'Check-Out':       fmt(r.afterLunchCheckOut),
    'Status':          r.status,
    'Late Minutes':    r.lateMinutes || 0,
    'Confidence':      r.matchConfidence != null ? r.matchConfidence.toFixed(3) : '',
  }));
  downloadCSV(rows, `daily_log_${TODAY}.csv`);
}

/* ─── Shared styles ──────────────────────────────────────────────────── */
const CARD = {
  background:   '#0f172a',
  border:       '1px solid #1e293b',
  borderRadius: '14px',
  padding:      '22px',
};
const OLD_CARD   = { background:'#0f172a', border:'1px solid #1e293b', borderRadius:'14px' };
const TABLE_CARD = { background:'#0f172a', border:'1px solid #1e293b', borderRadius:'14px', overflow:'hidden' };
const CELL_PAD = '12px 16px';

const S = {
  label: {
    display:'block', fontSize:'0.6rem', fontWeight:700, color:'#475569',
    textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px',
  },
  input: {
    width:'100%', padding:'9px 12px',
    background:'#1e293b', border:'1.5px solid #334155', borderRadius:'9px',
    color:'#e2e8f0', fontSize:'0.875rem', outline:'none',
    boxSizing:'border-box', transition:'border-color 0.15s',
    colorScheme:'dark',
    WebkitBoxShadow:'0 0 0 1000px #1e293b inset',
    WebkitTextFillColor:'#e2e8f0',
  },
  textInput: {
    width:'100%', padding:'9px 12px',
    background:'#1e293b', border:'1.5px solid #334155', borderRadius:'9px',
    color:'#e2e8f0', fontSize:'0.875rem', outline:'none',
    boxSizing:'border-box', transition:'border-color 0.15s',
    caretColor:'#e2e8f0', WebkitTextFillColor:'#e2e8f0',
  },
  th: {
    textAlign:'left', padding:CELL_PAD,
    fontSize:'0.6rem', fontWeight:700, color:'#475569',
    textTransform:'uppercase', letterSpacing:'0.08em',
    whiteSpace:'nowrap', background:'rgba(15,23,42,0.9)',
    borderBottom:'1px solid rgba(99,162,255,0.08)',
  },
  td: (hov, last) => ({
    padding: CELL_PAD, whiteSpace:'nowrap', fontSize:'0.8rem',
    borderBottom: last ? 'none' : '1px solid rgba(15,23,42,0.8)',
    background: hov ? 'rgba(37,99,235,0.04)' : 'transparent',
    transition:'background 0.1s',
  }),
};

/* ─── Custom chart tooltip ─────────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#0d1b3e', border:'1px solid rgba(99,162,255,0.2)',
      borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      <p style={{ color:'#64748b', margin:'0 0 6px', fontWeight:600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color:p.color, margin:'2px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function AttendanceReports() {
  const [tab, setTab] = useState('weekly');

  const TABS = [
    { key: 'weekly',    label: 'Weekly',    icon: <Calendar size={13}/> },
    { key: 'monthly',   label: 'Monthly',   icon: <TrendingUp size={13}/> },
    { key: 'yearly',    label: 'Yearly',    icon: <BarChart2 size={13}/> },
    { key: 'log',       label: 'Daily Log', icon: <List size={13}/> },
    { key: 'analytics', label: 'Analytics', icon: <Users size={13}/> },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px',
      fontFamily:"'Inter', system-ui, sans-serif" }}>

      {/* header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between',
        flexWrap:'wrap', gap:'12px' }}>
        <div style={{ borderLeft:'3px solid #3b82f6', paddingLeft:'14px' }}>
          <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#f1f5f9',
            margin:'0 0 3px', letterSpacing:'-0.025em' }}>
            Attendance Reports
          </h1>
          <p style={{ fontSize:'0.8125rem', color:'#475569', margin:0 }}>
            Weekly, monthly, and yearly attendance analytics
          </p>
        </div>
      </div>

      {/* tab bar */}
      <div style={{ display:'flex', gap:'4px', background:'#0f172a',
        border:'1px solid #1e293b', borderRadius:'14px', padding:'5px',
        flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              padding:'8px 16px', borderRadius:'10px', border:'none',
              cursor:'pointer', fontSize:'0.8125rem', fontWeight:600,
              fontFamily:'inherit', transition:'all 0.15s',
              background: tab===t.key ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : 'transparent',
              color: tab===t.key ? '#fff' : '#475569',
              boxShadow: tab===t.key ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab==='weekly'    && <WeeklyTab />}
      {tab==='monthly'   && <MonthlyTab />}
      {tab==='yearly'    && <YearlyTab />}
      {tab==='log'       && <DailyLogTab />}
      {tab==='analytics' && <AnalyticsTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WEEKLY REPORT TAB
═══════════════════════════════════════════════════════════════════ */
function WeeklyTab() {
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  const monday = new Date(weekStart + 'T00:00:00');
  const sunday = getSunday(monday);
  const wEnd   = iso(sunday) > TODAY ? TODAY : iso(sunday);

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await attendanceService.getAnalytics({ startDate: weekStart, endDate: wEnd });
      setData(d);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [weekStart, wEnd]);

  useEffect(() => { fetch(); }, [fetch]);

  const prevWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(iso(d));
  };
  const nextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    const next = iso(d);
    if (next <= TODAY) setWeekStart(next);
  };

  /* build daily chart data from aggregated records */
  const buildDailyChart = () => {
    if (!data?.employees?.length) return [];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const dateStr = iso(d);
      if (dateStr > TODAY) break;
      days.push({ date: dateStr, label: d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) });
    }
    return days;
  };
  const dailyDays = buildDailyChart();

  const totals = data?.totals;
  const totalEmployees = data?.employees?.length ?? 0;
  const pct = data?.totalWorkingDays > 0 && totalEmployees > 0
    ? Math.round(((totals?.presentDays ?? 0) + (totals?.lateDays ?? 0)) /
        (data.totalWorkingDays * totalEmployees) * 100)
    : 0;

  return (
    <>
      {/* week navigator */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={prevWeek} style={navBtnStyle()}>
            <ChevronLeft size={16}/>
          </button>
          <div style={{ textAlign:'center' }}>
            <p style={{ margin:0, fontSize:'1rem', fontWeight:700, color:'#f1f5f9' }}>
              {new Date(weekStart+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'})}
              {' — '}
              {new Date(wEnd+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
            </p>
            <p style={{ margin:0, fontSize:'0.72rem', color:'#475569' }}>
              Week of {new Date(weekStart+'T00:00:00').toLocaleDateString('en-US',{weekday:'long'})}
            </p>
          </div>
          <button onClick={nextWeek}
            style={navBtnStyle()}>
            <ChevronRight size={16}/>
          </button>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <ActionBtn icon={<Download size={14}/>} onClick={() => exportAnalytics(data, `week_${weekStart}`)}>
            Export CSV
          </ActionBtn>
          <ActionBtn icon={<Printer size={14}/>} onClick={() => window.print()}>
            Print
          </ActionBtn>
        </div>
      </div>

      {error && <ErrBox msg={error}/>}
      {loading ? <Spinner/> : (
        <>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'12px' }}>
            <ReportKpi label="Employees"    value={totalEmployees}         color="#60a5fa" icon={<Users size={15} color="#60a5fa"/>}      selected={selectedCard==='employees'} onClick={()=>setSelectedCard(s=>s==='employees'?null:'employees')}/>
            <ReportKpi label="Present Days" value={totals?.presentDays??0} color="#4ade80" icon={<CheckCircle2 size={15} color="#4ade80"/>} selected={selectedCard==='present'}   onClick={()=>setSelectedCard(s=>s==='present'?null:'present')}/>
            <ReportKpi label="Late Days"    value={totals?.lateDays??0}    color="#fbbf24" icon={<Clock size={15} color="#fbbf24"/>}        selected={selectedCard==='late'}      onClick={()=>setSelectedCard(s=>s==='late'?null:'late')}/>
            <ReportKpi label="Absent Days"  value={totals?.absentDays??0}  color="#f87171"                                                 selected={selectedCard==='absent'}    onClick={()=>setSelectedCard(s=>s==='absent'?null:'absent')}/>
            <ReportKpi label="Working Days" value={data?.totalWorkingDays??0} color="#94a3b8"                                              selected={selectedCard==='working'}   onClick={()=>setSelectedCard(s=>s==='working'?null:'working')}/>
            <ReportKpi label="Attendance %" value={`${pct}%`}             color={pct>=85?'#4ade80':pct>=70?'#fbbf24':'#f87171'}/>
          </div>

          {selectedCard && (
            <CardDetailPanel key={selectedCard+weekStart} cardKey={selectedCard} data={data} startDate={weekStart} endDate={wEnd}/>
          )}

          {/* Daily breakdown chart — fetch actual daily data */}
          <WeeklyDailyChart weekStart={weekStart} wEnd={wEnd} days={dailyDays}/>

          {/* Employee table */}
          <AnalyticsTable data={data} label={`week_${weekStart}`}/>
        </>
      )}
    </>
  );
}

/* Fetches daily counts for the week using getCompany endpoint */
function WeeklyDailyChart({ weekStart, wEnd, days }) {
  const [chartData, setChartData] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!days.length) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        // fetch all records for the week and aggregate client-side
        const d = await attendanceService.getCompany({ startDate:weekStart, endDate:wEnd, limit:500 });
        const records = d?.records ?? [];
        const map = {};
        records.forEach(r => {
          if (!map[r.date]) map[r.date] = { present:0, late:0, absent:0, permission:0 };
          if (r.status==='Present')         map[r.date].present++;
          else if (r.status==='Late')       map[r.date].late++;
          else if (r.status==='Absent')     map[r.date].absent++;
          else if (r.status==='Permission') map[r.date].permission++;
        });
        setChartData(days.map(d => ({
          label:      d.label,
          Present:    map[d.date]?.present    ?? 0,
          Late:       map[d.date]?.late       ?? 0,
          Absent:     map[d.date]?.absent     ?? 0,
          Permission: map[d.date]?.permission ?? 0,
        })));
      } catch { setChartData([]); }
      finally { setLoading(false); }
    })();
  }, [weekStart, wEnd]);

  if (loading) return null;
  if (!chartData.length) return null;

  return (
    <div style={CARD}>
      <p style={{ margin:'0 0 16px', fontSize:'0.875rem', fontWeight:700, color:'#e2e8f0',
        display:'flex', alignItems:'center', gap:'8px' }}>
        <BarChart2 size={14} color="#3b82f6"/> Daily Attendance This Week
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,162,255,0.06)"/>
          <XAxis dataKey="label" tick={{ fontSize:10, fill:'#475569' }} tickLine={false}
            axisLine={{ stroke:'rgba(99,162,255,0.1)' }}/>
          <YAxis tick={{ fontSize:10, fill:'#475569' }} tickLine={false} axisLine={false} allowDecimals={false}/>
          <Tooltip content={<ChartTip/>} cursor={{ fill:'rgba(99,162,255,0.05)' }}/>
          <Legend wrapperStyle={{ fontSize:11, color:'#64748b', paddingTop:8 }}/>
          <Bar dataKey="Present"    fill="#22c55e" radius={[4,4,0,0]} maxBarSize={32}/>
          <Bar dataKey="Late"       fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={32}/>
          <Bar dataKey="Absent"     fill="#ef4444" radius={[4,4,0,0]} maxBarSize={32}/>
          <Bar dataKey="Permission" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={32}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MONTHLY REPORT TAB
═══════════════════════════════════════════════════════════════════ */
function MonthlyTab() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  const mStart = `${year}-${String(month).padStart(2,'0')}-01`;
  const mEnd   = (() => {
    const d = new Date(year, month, 0);
    const e = iso(d);
    return e > TODAY ? TODAY : e;
  })();

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await attendanceService.getAnalytics({ startDate: mStart, endDate: mEnd });
      setData(d);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [mStart, mEnd]);

  useEffect(() => { fetch(); }, [fetch]);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => {
    const nextY = month===12 ? year+1 : year;
    const nextM = month===12 ? 1 : month+1;
    if (nextY > now.getFullYear() || (nextY===now.getFullYear() && nextM > now.getMonth()+1)) return;
    setMonth(nextM); if (month===12) setYear(y=>y+1);
  };

  const totals = data?.totals;
  const total  = data?.employees?.length ?? 0;
  const pct    = data?.totalWorkingDays > 0 && total > 0
    ? Math.round(((totals?.presentDays??0)+(totals?.lateDays??0)) / (data.totalWorkingDays * total) * 100)
    : 0;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <>
      {/* month navigator */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={prevMonth} style={navBtnStyle()}><ChevronLeft size={16}/></button>
          <div style={{ textAlign:'center' }}>
            <p style={{ margin:0, fontSize:'1.1rem', fontWeight:700, color:'#f1f5f9' }}>
              {MONTHS[month-1]} {year}
            </p>
            <p style={{ margin:0, fontSize:'0.72rem', color:'#475569' }}>
              {mStart} → {mEnd}
            </p>
          </div>
          <button onClick={nextMonth} style={navBtnStyle()}><ChevronRight size={16}/></button>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <ActionBtn icon={<Download size={14}/>} onClick={() => exportAnalytics(data, `month_${year}_${String(month).padStart(2,'0')}`)}>
            Export CSV
          </ActionBtn>
          <ActionBtn icon={<Printer size={14}/>} onClick={() => window.print()}>Print</ActionBtn>
        </div>
      </div>

      {error && <ErrBox msg={error}/>}
      {loading ? <Spinner/> : (
        <>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'12px' }}>
            <ReportKpi label="Employees"      value={total}                  color="#60a5fa" icon={<Users size={15} color="#60a5fa"/>}       selected={selectedCard==='employees'} onClick={()=>setSelectedCard(s=>s==='employees'?null:'employees')}/>
            <ReportKpi label="Present Days"   value={totals?.presentDays??0} color="#4ade80" icon={<CheckCircle2 size={15} color="#4ade80"/>}  selected={selectedCard==='present'}   onClick={()=>setSelectedCard(s=>s==='present'?null:'present')}/>
            <ReportKpi label="Late Days"      value={totals?.lateDays??0}    color="#fbbf24" icon={<Clock size={15} color="#fbbf24"/>}          selected={selectedCard==='late'}      onClick={()=>setSelectedCard(s=>s==='late'?null:'late')}/>
            <ReportKpi label="Absent Days"    value={totals?.absentDays??0}  color="#f87171"                                                    selected={selectedCard==='absent'}    onClick={()=>setSelectedCard(s=>s==='absent'?null:'absent')}/>
            <ReportKpi label="Working Days"   value={data?.totalWorkingDays??0} color="#94a3b8"                                                 selected={selectedCard==='working'}   onClick={()=>setSelectedCard(s=>s==='working'?null:'working')}/>
            <ReportKpi label="Attendance %"   value={`${pct}%`}             color={pct>=85?'#4ade80':pct>=70?'#fbbf24':'#f87171'}/>
            <ReportKpi label="Warnings"       value={totals?.warningCount??0}   color="#fbbf24" icon={<AlertTriangle size={15} color="#fbbf24"/>}/>
            <ReportKpi label="At Risk"        value={totals?.riskCount??0}      color="#f87171" icon={<ShieldAlert size={15} color="#f87171"/>}/>
          </div>

          {selectedCard && (
            <CardDetailPanel key={selectedCard+mStart} cardKey={selectedCard} data={data} startDate={mStart} endDate={mEnd}/>
          )}

          {/* daily trend chart for the month */}
          <MonthlyDailyChart mStart={mStart} mEnd={mEnd}/>

          {/* department breakdown */}
          <MonthlyDeptChart mStart={mStart} mEnd={mEnd}/>

          {/* Employee table */}
          <AnalyticsTable data={data} label={`month_${year}_${String(month).padStart(2,'0')}`}/>
        </>
      )}
    </>
  );
}

function MonthlyDailyChart({ mStart, mEnd }) {
  const [chartData, setChartData] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await attendanceService.getCompany({ startDate:mStart, endDate:mEnd, limit:1000 });
        const records = d?.records ?? [];
        const map = {};
        records.forEach(r => {
          if (!map[r.date]) map[r.date] = { present:0, late:0 };
          if (r.status==='Present')         map[r.date].present++;
          else if (r.status==='Late')       map[r.date].late++;
          else if (r.status==='Permission') {
            if (!map[r.date].permission) map[r.date].permission = 0;
            map[r.date].permission++;
          }
        });
        const days = Object.keys(map).sort();
        setChartData(days.map(dt => ({
          label:      fmtDate(dt),
          Present:    map[dt].present    ?? 0,
          Late:       map[dt].late       ?? 0,
          Permission: map[dt].permission ?? 0,
        })));
      } catch { setChartData([]); }
      finally { setLoading(false); }
    })();
  }, [mStart, mEnd]);

  if (loading || !chartData.length) return null;

  return (
    <div style={CARD}>
      <p style={{ margin:'0 0 16px', fontSize:'0.875rem', fontWeight:700, color:'#e2e8f0',
        display:'flex', alignItems:'center', gap:'8px' }}>
        <TrendingUp size={14} color="#3b82f6"/> Daily Attendance Trend
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,162,255,0.06)"/>
          <XAxis dataKey="label" tick={{ fontSize:9, fill:'#475569' }} tickLine={false}
            axisLine={{ stroke:'rgba(99,162,255,0.1)' }} interval="preserveStartEnd"/>
          <YAxis tick={{ fontSize:10, fill:'#475569' }} tickLine={false} axisLine={false} allowDecimals={false}/>
          <Tooltip content={<ChartTip/>}/>
          <Legend wrapperStyle={{ fontSize:11, color:'#64748b', paddingTop:8 }}/>
          <Line type="monotone" dataKey="Present"    stroke="#22c55e" strokeWidth={2} dot={false}/>
          <Line type="monotone" dataKey="Late"       stroke="#f59e0b" strokeWidth={2} dot={false}/>
          <Line type="monotone" dataKey="Permission" stroke="#6366f1" strokeWidth={2} dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyDeptChart({ mStart, mEnd }) {
  const [chartData, setChartData] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await attendanceService.getCompany({ startDate:mStart, endDate:mEnd, limit:1000 });
        const records = d?.records ?? [];
        const map = {};
        records.forEach(r => {
          const dept = r.department || 'Unassigned';
          if (!map[dept]) map[dept] = 0;
          map[dept]++;
        });
        setChartData(Object.entries(map).map(([dept, count]) => ({ dept, count }))
          .sort((a,b) => b.count - a.count).slice(0, 8));
      } catch { setChartData([]); }
      finally { setLoading(false); }
    })();
  }, [mStart, mEnd]);

  if (loading || !chartData.length) return null;

  const DEPT_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16'];

  return (
    <div style={CARD}>
      <p style={{ margin:'0 0 16px', fontSize:'0.875rem', fontWeight:700, color:'#e2e8f0',
        display:'flex', alignItems:'center', gap:'8px' }}>
        <BarChart2 size={14} color="#3b82f6"/> Department Breakdown
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ top:0, right:8, left:8, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,162,255,0.06)" horizontal={false}/>
          <XAxis type="number" tick={{ fontSize:10, fill:'#475569' }} tickLine={false}
            axisLine={{ stroke:'rgba(99,162,255,0.1)' }} allowDecimals={false}/>
          <YAxis dataKey="dept" type="category" tick={{ fontSize:10, fill:'#64748b' }}
            tickLine={false} axisLine={false} width={100}/>
          <Tooltip content={<ChartTip/>} cursor={{ fill:'rgba(99,162,255,0.05)' }}/>
          <Bar dataKey="count" name="Check-ins" radius={[0,4,4,0]} maxBarSize={16}>
            {chartData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i%DEPT_COLORS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   YEARLY REPORT TAB
═══════════════════════════════════════════════════════════════════ */
function YearlyTab() {
  const [year,    setYear]    = useState(new Date().getFullYear());
  const [data,    setData]    = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  const yStart = `${year}-01-01`;
  const yEnd   = `${year}-12-31` > TODAY ? TODAY : `${year}-12-31`;

  const fetch = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [analytics, records] = await Promise.all([
        attendanceService.getAnalytics({ startDate:yStart, endDate:yEnd }),
        attendanceService.getCompany({ startDate:yStart, endDate:yEnd, limit:5000 }),
      ]);
      setData(analytics);

      // build monthly aggregation client-side
      const map = {};
      (records?.records ?? []).forEach(r => {
        const [y, m] = r.date.split('-');
        const key = `${y}-${m}`;
        if (!map[key]) map[key] = { present:0, late:0, absent:0, permission:0, total:0 };
        map[key].total++;
        if (r.status==='Present')         map[key].present++;
        else if (r.status==='Late')       map[key].late++;
        else if (r.status==='Absent')     map[key].absent++;
        else if (r.status==='Permission') map[key].permission++;
      });
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthArr = [];
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2,'0')}`;
        const mDate = `${year}-${String(m).padStart(2,'0')}-01`;
        if (mDate > TODAY) break;
        monthArr.push({
          label:      MONTHS[m-1],
          Present:    map[key]?.present    ?? 0,
          Late:       map[key]?.late       ?? 0,
          Absent:     map[key]?.absent     ?? 0,
          Permission: map[key]?.permission ?? 0,
        });
      }
      setMonthly(monthArr);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [yStart, yEnd]);

  useEffect(() => { fetch(); }, [fetch]);

  const totals = data?.totals;
  const total  = data?.employees?.length ?? 0;
  const pct    = data?.totalWorkingDays > 0 && total > 0
    ? Math.round(((totals?.presentDays??0)+(totals?.lateDays??0)) / (data.totalWorkingDays * total) * 100)
    : 0;

  return (
    <>
      {/* year navigator */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => setYear(y=>y-1)} style={navBtnStyle()}><ChevronLeft size={16}/></button>
          <div style={{ textAlign:'center' }}>
            <p style={{ margin:0, fontSize:'1.3rem', fontWeight:800, color:'#f1f5f9' }}>{year}</p>
            <p style={{ margin:0, fontSize:'0.72rem', color:'#475569' }}>Annual Report</p>
          </div>
          <button onClick={() => setYear(y => y+1 <= new Date().getFullYear() ? y+1 : y)} style={navBtnStyle()}>
            <ChevronRight size={16}/>
          </button>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <ActionBtn icon={<Download size={14}/>} onClick={() => exportAnalytics(data, `year_${year}`)}>
            Export CSV
          </ActionBtn>
          <ActionBtn icon={<Printer size={14}/>} onClick={() => window.print()}>Print</ActionBtn>
        </div>
      </div>

      {error && <ErrBox msg={error}/>}
      {loading ? <Spinner/> : (
        <>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'12px' }}>
            <ReportKpi label="Employees"     value={total}                  color="#60a5fa" icon={<Users size={15} color="#60a5fa"/>}      selected={selectedCard==='employees'} onClick={()=>setSelectedCard(s=>s==='employees'?null:'employees')}/>
            <ReportKpi label="Present Total" value={totals?.presentDays??0} color="#4ade80" icon={<CheckCircle2 size={15} color="#4ade80"/>} selected={selectedCard==='present'}   onClick={()=>setSelectedCard(s=>s==='present'?null:'present')}/>
            <ReportKpi label="Late Total"    value={totals?.lateDays??0}    color="#fbbf24" icon={<Clock size={15} color="#fbbf24"/>}        selected={selectedCard==='late'}      onClick={()=>setSelectedCard(s=>s==='late'?null:'late')}/>
            <ReportKpi label="Absent Total"  value={totals?.absentDays??0}  color="#f87171"                                                  selected={selectedCard==='absent'}    onClick={()=>setSelectedCard(s=>s==='absent'?null:'absent')}/>
            <ReportKpi label="Working Days"  value={data?.totalWorkingDays??0} color="#94a3b8"                                               selected={selectedCard==='working'}   onClick={()=>setSelectedCard(s=>s==='working'?null:'working')}/>
            <ReportKpi label="Avg Attend %"  value={`${pct}%`}             color={pct>=85?'#4ade80':pct>=70?'#fbbf24':'#f87171'}/>
          </div>

          {selectedCard && (
            <CardDetailPanel key={selectedCard+yStart} cardKey={selectedCard} data={data} startDate={yStart} endDate={yEnd}/>
          )}

          {/* monthly trend chart */}
          {monthly.length > 0 && (
            <div style={CARD}>
              <p style={{ margin:'0 0 16px', fontSize:'0.875rem', fontWeight:700, color:'#e2e8f0',
                display:'flex', alignItems:'center', gap:'8px' }}>
                <TrendingUp size={14} color="#3b82f6"/> Monthly Attendance Trend — {year}
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} margin={{ top:4, right:4, left:-20, bottom:0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,162,255,0.06)"/>
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:'#475569' }} tickLine={false}
                    axisLine={{ stroke:'rgba(99,162,255,0.1)' }}/>
                  <YAxis tick={{ fontSize:10, fill:'#475569' }} tickLine={false} axisLine={false} allowDecimals={false}/>
                  <Tooltip content={<ChartTip/>} cursor={{ fill:'rgba(99,162,255,0.05)' }}/>
                  <Legend wrapperStyle={{ fontSize:11, color:'#64748b', paddingTop:8 }}/>
                  <Bar dataKey="Present"    fill="#22c55e" radius={[4,4,0,0]} maxBarSize={28}/>
                  <Bar dataKey="Late"       fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={28}/>
                  <Bar dataKey="Absent"     fill="#ef4444" radius={[4,4,0,0]} maxBarSize={28}/>
                  <Bar dataKey="Permission" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={28}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* monthly % table */}
          {monthly.length > 0 && (
            <div style={{ ...OLD_CARD, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(99,162,255,0.08)' }}>
                <p style={{ margin:0, fontSize:'0.875rem', fontWeight:700, color:'#e2e8f0' }}>
                  Monthly Summary
                </p>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', minWidth:'600px', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                  <thead>
                    <tr>
                      {['Month','Present','Late','Absent','Permission','Total','Attend %'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m, i) => {
                      const tot = m.Present + m.Late + m.Absent + (m.Permission ?? 0);
                      const ap  = tot > 0 ? Math.round((m.Present + m.Late + (m.Permission ?? 0)) / tot * 100) : 0;
                      return (
                        <tr key={i}>
                          <td style={{ ...S.td(false, i===monthly.length-1), fontWeight:700, color:'#e2e8f0' }}>{m.label}</td>
                          <td style={{ ...S.td(false, i===monthly.length-1), color:'#4ade80' }}>{m.Present}</td>
                          <td style={{ ...S.td(false, i===monthly.length-1), color:'#fbbf24' }}>{m.Late}</td>
                          <td style={{ ...S.td(false, i===monthly.length-1), color:'#f87171' }}>{m.Absent}</td>
                          <td style={{ ...S.td(false, i===monthly.length-1), color:'#a5b4fc' }}>{m.Permission ?? 0}</td>
                          <td style={{ ...S.td(false, i===monthly.length-1), color:'#94a3b8' }}>{tot}</td>
                          <td style={{ ...S.td(false, i===monthly.length-1) }}>
                            <span style={{ fontWeight:700, color:ap>=85?'#4ade80':ap>=70?'#fbbf24':'#f87171' }}>
                              {ap}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Employee table */}
          <AnalyticsTable data={data} label={`year_${year}`}/>
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED: AnalyticsTable
═══════════════════════════════════════════════════════════════════ */
function AnalyticsTable({ data, label }) {
  if (!data?.employees?.length) return (
    <div style={{ ...CARD, textAlign:'center', padding:'40px' }}>
      <p style={{ color:'#334155', margin:0 }}>No employee data for this period.</p>
    </div>
  );

  const COLS = [
    { h:'Employee',     w:'200px' },
    { h:'Department',   w:'140px' },
    { h:'Present',      w:'80px'  },
    { h:'Late',         w:'70px'  },
    { h:'Absent',       w:'80px'  },
    { h:'Attend %',     w:'100px' },
    { h:'Late Time',    w:'110px' },
    { h:'Flag',         w:'160px' },
  ];

  return (
    <div style={{ ...OLD_CARD, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 20px', borderBottom:'1px solid rgba(99,162,255,0.08)', flexWrap:'wrap', gap:'8px' }}>
        <p style={{ margin:0, fontSize:'0.875rem', fontWeight:700, color:'#e2e8f0' }}>
          Employee Breakdown
          <span style={{ marginLeft:'8px', fontSize:'0.72rem', color:'#475569', fontWeight:400 }}>
            ({data.employees.length} employees · {data.totalWorkingDays} working days)
          </span>
        </p>
        <ActionBtn icon={<Download size={13}/>} onClick={() => exportAnalytics(data, label)}>
          CSV
        </ActionBtn>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', minWidth:'900px', borderCollapse:'collapse', fontSize:'0.8rem',
          background:'transparent' }}>
          <colgroup>{COLS.map(c=><col key={c.h} style={{width:c.w}}/>)}</colgroup>
          <thead>
            <tr>{COLS.map(c=><th key={c.h} style={S.th}>{c.h}</th>)}</tr>
          </thead>
          <tbody>
            {data.employees.map((emp, i) => (
              <EmpRow key={emp.employeeId} emp={emp} isLast={i===data.employees.length-1}/>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmpRow({ emp, isLast }) {
  const [hov, setHov] = useState(false);
  const td = x => ({ ...S.td(hov, isLast), ...x });
  const pc = emp.attendancePct;
  const pc_color = pc>=90?'#4ade80':pc>=75?'#fbbf24':'#f87171';

  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <td style={td()}>
        <div style={{ fontWeight:600, color:'#f1f5f9' }}>{emp.fullName}</div>
        <div style={{ fontSize:'0.65rem', color:'#475569', fontFamily:'monospace', marginTop:'1px' }}>
          {emp.employeeId}
        </div>
      </td>
      <td style={td({ color:'#94a3b8' })}>{emp.department}</td>
      <td style={td({ textAlign:'center', fontWeight:700, color:'#4ade80' })}>{emp.presentDays}</td>
      <td style={td({ textAlign:'center', fontWeight:700, color:emp.lateDays>0?'#fbbf24':'#475569' })}>{emp.lateDays}</td>
      <td style={td({ textAlign:'center', fontWeight:700, color:emp.absentDays>0?'#f87171':'#475569' })}>{emp.absentDays}</td>
      <td style={td()}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:'44px', height:'4px', background:'#1e293b', borderRadius:'999px', overflow:'hidden' }}>
            <div style={{ width:`${pc}%`, height:'100%', background:pc_color, borderRadius:'999px' }}/>
          </div>
          <span style={{ fontWeight:700, color:pc_color, fontSize:'0.75rem' }}>{pc}%</span>
        </div>
      </td>
      <td style={td()}>
        {emp.totalLateMinutes>0
          ? <span style={{ padding:'2px 8px', borderRadius:'999px', background:'rgba(180,83,9,0.2)',
              color:'#fbbf24', fontSize:'0.7rem', fontWeight:700 }}>{emp.lateTotalLabel}</span>
          : <span style={{ color:'#334155' }}>—</span>}
      </td>
      <td style={td()}><HealthBadge flag={emp.healthFlag}/></td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 4 — DAILY LOG (existing, preserved)
═══════════════════════════════════════════════════════════════════ */
const placeholderDept = d => { const v=(d==null?'':String(d)).trim(); return(!v||/^general$/i.test(v))?'Unassigned':v; };
const LOG_MIN = '1530px';

function DailyLogTab() {
  const [records,    setRecords]    = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, totalPages:1 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters, setFilters] = useState({
    date:TODAY, startDate:'', endDate:'', department:'', status:'', search:'',
  });

  const fetchData = useCallback(async (page=1) => {
    setLoading(true); setError('');
    try {
      const params = { page, limit:50 };
      Object.entries(filters).forEach(([k,v])=>{ if(v) params[k]=v; });
      const d = await attendanceService.getCompany(params);
      setRecords(d.records); setPagination(d.pagination);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const setF   = e => setFilters(p=>({...p,[e.target.name]:e.target.value}));
  const clearF = () => setFilters({ date:'', startDate:'', endDate:'', department:'', status:'', search:'' });

  const COLS = [
    { label:'Employee ID',    w:'140px' },{ label:'Name',           w:'180px' },
    { label:'Department',     w:'140px' },{ label:'Date',           w:'120px' },
    { label:'Check-In',       w:'110px' },{ label:'Lateness',       w:'140px' },
    { label:'Lunch Out',      w:'120px' },{ label:'After-Lunch In', w:'140px' },
    { label:'Check-Out',      w:'120px' },{ label:'Status',         w:'110px' },
    { label:'Confidence',     w:'130px' },
  ];

  const handleExport = async () => {
    try {
      const d = await attendanceService.getCompany({ ...filters, limit:2000 });
      exportDailyLog(d.records);
    } catch {}
  };

  return (
    <>
      <div style={{ ...OLD_CARD, padding:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
          <Filter size={13} color="#475569"/>
          <span style={{ fontSize:'0.6rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Filters
          </span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'16px' }}>
          <FilterField label="Date"       name="date"       type="date" value={filters.date}       onChange={setF}/>
          <FilterField label="Start Date" name="startDate"  type="date" value={filters.startDate}  onChange={setF}/>
          <FilterField label="End Date"   name="endDate"    type="date" value={filters.endDate}    onChange={setF}/>
          <FilterField label="Department" name="department" type="text" value={filters.department} onChange={setF}/>
          <div>
            <label style={S.label}>Status</label>
            <select name="status" value={filters.status} onChange={setF} style={S.input}
              onFocus={e=>{e.target.style.borderColor='#3b82f6';}}
              onBlur={e=>{e.target.style.borderColor='#334155';}}>
              <option value="">All</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Permission">Permission</option>
            </select>
          </div>
          <FilterField label="Search" name="search" type="text" value={filters.search} onChange={setF}/>
        </div>
        <div style={{ display:'flex', gap:'8px', paddingTop:'12px', borderTop:'1px solid rgba(99,162,255,0.08)' }}>
          <Btn primary onClick={()=>fetchData(1)}>Apply</Btn>
          <Btn onClick={clearF}>Clear</Btn>
          <ActionBtn icon={<Download size={13}/>} onClick={handleExport}>Export CSV</ActionBtn>
          <ActionBtn icon={<Printer size={13}/>} onClick={()=>window.print()}>Print</ActionBtn>
        </div>
      </div>

      <p style={{ fontSize:'0.8rem', color:'#475569', margin:'-8px 0 0' }}>
        {pagination.total} records found
      </p>

      {error && <ErrBox msg={error}/>}

      {loading ? <Spinner/> : (
        <div style={TABLE_CARD}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            <table style={{ width:LOG_MIN, minWidth:LOG_MIN, borderCollapse:'collapse', tableLayout:'fixed' }}>
              <colgroup>{COLS.map(c=><col key={c.label} style={{width:c.w}}/>)}</colgroup>
              <thead><tr>{COLS.map(c=><th key={c.label} style={{...S.th,minWidth:c.w}}>{c.label}</th>)}</tr></thead>
              <tbody>
                {records.length===0 && (
                  <tr><td colSpan={COLS.length} style={{ padding:'40px', textAlign:'center', color:'#475569' }}>
                    No records match these filters.
                  </td></tr>
                )}
                {records.map((r,i)=>(
                  <LogRow key={r._id} r={r} isLast={i===records.length-1}/>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages>1 && (
            <PaginationBar page={pagination.page} totalPages={pagination.totalPages}
              total={pagination.total} label="records"
              onPrev={()=>fetchData(pagination.page-1)}
              onNext={()=>fetchData(pagination.page+1)}/>
          )}
        </div>
      )}
    </>
  );
}

function LogRow({ r, isLast }) {
  const [hov, setHov] = useState(false);
  const td = x => ({ ...S.td(hov,isLast), ...x });
  const fmt = dt => dt ? new Date(dt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : null;

  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <td style={td()}>
        <code style={{ fontSize:'0.7rem', background:'#1e293b', border:'1px solid #334155',
          padding:'2px 6px', borderRadius:'5px', color:'#94a3b8', fontFamily:'monospace' }}>
          {r.employeeId}
        </code>
      </td>
      <td style={td({ fontWeight:600, color:'#f1f5f9' })}>{r.fullName}</td>
      <td style={td({ color:'#94a3b8' })}>{placeholderDept(r.department)}</td>
      <td style={td({ fontFamily:'monospace', color:'#64748b' })}>{r.date}</td>
      <td style={td({ fontFamily:'monospace', color:'#cbd5e1' })}>{fmt(r.checkInTime) ?? <Dash/>}</td>
      <td style={td()}>
        {r.status==='Late'&&r.lateMinutes
          ? <span style={{ padding:'2px 8px', borderRadius:'999px', background:'rgba(180,83,9,0.2)',
              color:'#fbbf24', fontSize:'0.7rem', fontWeight:700 }}>
              +{r.lateMinutes >= 60
                ? `${Math.floor(r.lateMinutes/60)}h ${r.lateMinutes%60 > 0 ? r.lateMinutes%60+'m' : ''}`.trim()
                : r.lateMinutes+'m'} late
            </span>
          : <Dash/>}
      </td>
      <td style={td({ fontFamily:'monospace' })}>{fmt(r.checkOutTime) ? <span style={{color:'#fbbf24'}}>{fmt(r.checkOutTime)}</span> : <Dash/>}</td>
      <td style={td({ fontFamily:'monospace' })}>{fmt(r.afterLunchCheckIn) ? <span style={{color:'#60a5fa'}}>{fmt(r.afterLunchCheckIn)}</span> : <Dash/>}</td>
      <td style={td({ fontFamily:'monospace' })}>{fmt(r.afterLunchCheckOut) ? <span style={{color:'#c084fc'}}>{fmt(r.afterLunchCheckOut)}</span> : <Dash/>}</td>
      <td style={td()}><StatusBadge status={r.status}/></td>
      <td style={td()}>{r.matchConfidence!=null ? <ConfBar value={r.matchConfidence}/> : <Dash/>}</td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 5 — ANALYTICS (existing, preserved)
═══════════════════════════════════════════════════════════════════ */
const ANALYTICS_MIN = '1130px';
const QUICK_RANGES = [
  { key:'week',  label:'Weekly',  start: startOfWeek,  end: endOfWeek  },
  { key:'month', label:'Monthly', start: startOfMonth, end: endOfMonth  },
  { key:'year',  label:'Yearly',  start: startOfYear,  end: endOfYear   },
];

function AnalyticsTab() {
  const [data,   setData]   = useState(null);
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState('');
  const [period, setPeriod] = useState('month');
  const [filters,setFilters]= useState({ startDate:startOfMonth(), endDate:TODAY, department:'', search:'' });

  const fetchAnalytics = useCallback(async () => {
    if (!filters.startDate||!filters.endDate) return;
    setLoading(true); setError('');
    try {
      const d = await attendanceService.getAnalytics({
        startDate:  filters.startDate,
        endDate:    filters.endDate,
        department: filters.department||undefined,
        search:     filters.search||undefined,
      });
      setData(d);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const setF = e => setFilters(p=>({...p,[e.target.name]:e.target.value}));
  const applyPeriod = (key) => {
    const r = QUICK_RANGES.find(r=>r.key===key)||QUICK_RANGES[1];
    setPeriod(r.key);
    setFilters(p=>({...p, startDate:r.start(), endDate:r.end()}));
  };

  const totals = data?.totals||null;
  const counts = data ? {
    total:    data.employees.length,
    present:  totals?.presentDays ?? data.employees.reduce((s,e)=>s+(e.presentDays||0),0),
    absent:   totals?.absentDays  ?? data.employees.reduce((s,e)=>s+(e.absentDays||0),0),
    lateLabel:totals?.lateTotalLabel||'0m',
    warning:  totals?.warningCount ?? data.employees.filter(e=>e.healthFlag==='warning').length,
    risk:     totals?.riskCount    ?? data.employees.filter(e=>e.healthFlag==='termination_risk').length,
  } : null;

  const A_COLS = [
    {h:'Employee',w:'200px'},{h:'Department',w:'140px'},{h:'Present',w:'90px'},
    {h:'Late',w:'80px'},{h:'Absent',w:'90px'},{h:'Attendance %',w:'120px'},
    {h:'Late Count',w:'100px'},{h:'Late Time',w:'140px'},{h:'Flag',w:'170px'},
  ];

  return (
    <>
      <div style={{ ...OLD_CARD, padding:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:'10px', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <Filter size={13} color="#475569"/>
            <span style={{ fontSize:'0.6rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Period & Filters
            </span>
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            {QUICK_RANGES.map(r=>(
              <button key={r.key} onClick={()=>applyPeriod(r.key)}
                style={{ padding:'5px 12px', borderRadius:'7px', cursor:'pointer',
                  border: period===r.key?'1px solid #2563eb':'1px solid #334155',
                  background: period===r.key?'#2563eb':'#1e293b',
                  color: period===r.key?'#fff':'#94a3b8',
                  fontSize:'0.75rem', fontWeight:600, fontFamily:'inherit', transition:'all 0.15s' }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'14px' }}>
          <FilterField label="Start Date" name="startDate"  type="date" value={filters.startDate} onChange={setF}/>
          <FilterField label="End Date"   name="endDate"    type="date" value={filters.endDate}   onChange={setF}/>
          <FilterField label="Department" name="department" type="text" value={filters.department} onChange={setF}/>
          <FilterField label="Search"     name="search"     type="text" value={filters.search}    onChange={setF}/>
        </div>
        <div style={{ display:'flex', gap:'8px', paddingTop:'12px', borderTop:'1px solid rgba(99,162,255,0.08)' }}>
          <Btn primary onClick={fetchAnalytics}>Generate</Btn>
          <Btn onClick={()=>{ setPeriod('month'); setFilters({startDate:startOfMonth(),endDate:TODAY,department:'',search:''}); }}>Reset</Btn>
          <ActionBtn icon={<Download size={13}/>} onClick={()=>exportAnalytics(data, `analytics_${filters.startDate}_${filters.endDate}`)}>Export CSV</ActionBtn>
          <ActionBtn icon={<Printer size={13}/>} onClick={()=>window.print()}>Print</ActionBtn>
        </div>
      </div>

      {error && <ErrBox msg={error}/>}
      {loading && <Spinner/>}

      {!loading && data && counts && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'12px' }}>
            <ReportKpi label="Days Present"         value={counts.present}   color="#4ade80" icon={<CheckCircle2 size={15} color="#4ade80"/>}/>
            <ReportKpi label="Days Absent"          value={counts.absent}    color="#f87171"/>
            <ReportKpi label="Accumulated Lateness" value={counts.lateLabel} color="#fbbf24"/>
            <ReportKpi label="Warnings"             value={counts.warning}   color="#fbbf24" icon={<AlertTriangle size={15} color="#fbbf24"/>}/>
            <ReportKpi label="Termination Risk"     value={counts.risk}      color="#f87171" icon={<ShieldAlert size={15} color="#f87171"/>}/>
            <ReportKpi label="Working Days"         value={data.totalWorkingDays} color="#94a3b8"/>
          </div>

          <p style={{ fontSize:'0.8rem', color:'#475569', margin:'-4px 0 0' }}>
            Period: <strong style={{color:'#94a3b8'}}>{data.periodStart}</strong>
            {' → '}
            <strong style={{color:'#94a3b8'}}>{data.periodEnd}</strong>
            {' · '}{data.employees.length} employees
          </p>

          <div style={TABLE_CARD}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:ANALYTICS_MIN, minWidth:ANALYTICS_MIN, borderCollapse:'collapse', tableLayout:'fixed' }}>
                <colgroup>{A_COLS.map(c=><col key={c.h} style={{width:c.w}}/>)}</colgroup>
                <thead><tr>{A_COLS.map(c=><th key={c.h} style={S.th}>{c.h}</th>)}</tr></thead>
                <tbody>
                  {data.employees.length===0 && (
                    <tr><td colSpan={A_COLS.length} style={{ padding:'40px', textAlign:'center', color:'#475569' }}>
                      No employees found.
                    </td></tr>
                  )}
                  {data.employees.map((emp,i)=>(
                    <AnalyticsRowOld key={emp.employeeId} emp={emp} isLast={i===data.employees.length-1}/>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...OLD_CARD, padding:'16px 20px' }}>
            <p style={{ fontSize:'0.6rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 12px' }}>
              Escalation Rules
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'20px' }}>
              <LegendItem color="#fbbf24" icon={<AlertTriangle size={13}/>} title="Warning Issued"
                desc="> 3 late arrivals OR attendance < 85%"/>
              <LegendItem color="#f87171" icon={<ShieldAlert size={13}/>} title="Termination Risk"
                desc="> 5 absent days OR total late time > 5 hours"/>
              <LegendItem color="#4ade80" icon={<CheckCircle2 size={13}/>} title="Normal"
                desc="All thresholds within acceptable range"/>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function AnalyticsRowOld({ emp, isLast }) {
  const [hov,setHov] = useState(false);
  const td = x => ({ ...S.td(hov,isLast), ...x });
  const pc = emp.attendancePct;
  const pc_color = pc>=90?'#4ade80':pc>=75?'#fbbf24':'#f87171';

  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <td style={td()}>
        <div style={{fontWeight:600,color:'#f1f5f9'}}>{emp.fullName}</div>
        <div style={{fontSize:'0.65rem',color:'#475569',fontFamily:'monospace',marginTop:'1px'}}>{emp.employeeId}</div>
      </td>
      <td style={td({color:'#94a3b8'})}>{placeholderDept(emp.department)}</td>
      <td style={td({textAlign:'center',fontWeight:700,color:'#4ade80'})}>{emp.presentDays}</td>
      <td style={td({textAlign:'center',fontWeight:700,color:emp.lateDays>0?'#fbbf24':'#475569'})}>{emp.lateDays}</td>
      <td style={td({textAlign:'center',fontWeight:700,color:emp.absentDays>0?'#f87171':'#475569'})}>{emp.absentDays}</td>
      <td style={td()}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'44px',height:'4px',background:'#1e293b',borderRadius:'999px',overflow:'hidden'}}>
            <div style={{width:`${pc}%`,height:'100%',background:pc_color,borderRadius:'999px'}}/>
          </div>
          <span style={{fontWeight:700,color:pc_color,fontSize:'0.75rem'}}>{pc}%</span>
        </div>
      </td>
      <td style={td({textAlign:'center'})}>
        {emp.lateOccurrences>0
          ? <span style={{fontWeight:700,color:'#fbbf24'}}>{emp.lateOccurrences}×</span>
          : <span style={{color:'#334155'}}>—</span>}
      </td>
      <td style={td()}>
        {emp.totalLateMinutes>0
          ? <span style={{padding:'2px 8px',borderRadius:'999px',background:'rgba(180,83,9,0.2)',color:'#fbbf24',fontSize:'0.7rem',fontWeight:700}}>{emp.lateTotalLabel}</span>
          : <span style={{color:'#334155'}}>—</span>}
      </td>
      <td style={td()}><HealthBadge flag={emp.healthFlag}/></td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
═══════════════════════════════════════════════════════════════════ */
function ReportKpi({ label, value, color, icon, selected, onClick }) {
  const [hov, setHov] = useState(false);
  const active = selected;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active
          ? `linear-gradient(135deg, rgba(37,99,235,0.18), rgba(79,70,229,0.12))`
          : hov ? '#1e293b' : '#0f172a',
        border: active ? '1.5px solid #3b82f6' : `1px solid ${hov ? '#334155' : '#1e293b'}`,
        borderRadius:'14px', padding:'18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transform: hov && onClick ? 'translateY(-3px)' : 'none',
        boxShadow: active
          ? '0 0 0 1px rgba(59,130,246,0.3), 0 8px 24px rgba(37,99,235,0.18)'
          : hov && onClick ? '0 8px 24px rgba(0,0,0,0.25)' : 'none',
        transition: 'all 0.18s ease',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {active && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:'2px',
          background:'linear-gradient(90deg,#3b82f6,#8b5cf6)',
        }}/>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <span style={{ fontSize:'0.6rem', fontWeight:700,
          color: active ? '#93c5fd' : '#64748b',
          textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>
        <div style={{
          width:30, height:30, borderRadius:'8px',
          background: active ? 'rgba(59,130,246,0.15)' : 'rgba(30,41,59,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {icon || <div style={{ width:6, height:6, borderRadius:'50%', background:color }}/>}
        </div>
      </div>
      <p style={{
        fontSize: typeof value==='string'&&value.length>4 ? '1.4rem' : '2rem',
        fontWeight:900, color, margin:0, lineHeight:1, whiteSpace:'nowrap',
        fontVariantNumeric:'tabular-nums',
      }}>{value}</p>
      {onClick && (
        <p style={{ margin:'6px 0 0', fontSize:'0.6rem', color: active ? '#60a5fa' : '#334155',
          fontWeight:600 }}>
          {active ? '▲ Hide details' : '▼ View details'}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CARD DETAIL PANEL — shown when a KPI card is clicked
═══════════════════════════════════════════════════════════════════ */
function CardDetailPanel({ cardKey, data, startDate, endDate }) {
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [total,    setTotal]    = useState(0);
  const PER_PAGE = 15;

  useEffect(() => {
    setPage(1);
    setSearch('');
  }, [cardKey, startDate, endDate]);

  useEffect(() => {
    if (!cardKey || !startDate || !endDate) return;
    if (cardKey === 'employees') { loadEmployees(); return; }
    if (cardKey === 'working')   { buildWorkingDays(); return; }
    loadAttendance();
  }, [cardKey, startDate, endDate, page]);

  const loadEmployees = async () => {
    setLoading(true); setError('');
    try {
      const d = await attendanceService.getAnalytics({ startDate, endDate });
      setRecords(d.employees || []);
      setTotal((d.employees || []).length);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadAttendance = async () => {
    setLoading(true); setError('');
    try {
      const statusMap = { present:'Present', late:'Late', absent:'Absent' };
      const params = { startDate, endDate, limit: PER_PAGE, page };
      if (cardKey !== 'absent' && statusMap[cardKey]) params.status = statusMap[cardKey];
      const d = await attendanceService.getCompany(params);
      setRecords(d.records || []);
      setTotal(d.pagination?.total || 0);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const buildWorkingDays = () => {
    const days = [];
    const cur  = new Date(startDate + 'T00:00:00');
    const end  = new Date(endDate   + 'T00:00:00');
    const todayStr = new Date().toISOString().split('T')[0];
    while (cur <= end) {
      const dow = cur.getDay();
      const ds  = cur.toISOString().split('T')[0];
      if (dow !== 0 && dow !== 6 && ds <= todayStr) {
        days.push({
          date:    ds,
          weekday: cur.toLocaleDateString('en-US', { weekday:'long' }),
          label:   cur.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    setRecords(days);
    setTotal(days.length);
    setLoading(false);
  };

  // client-side search filter
  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    const hay = [
      r.fullName, r.employeeId, r.department,
      r.date, r.weekday, r.label,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });

  const totalPages = cardKey === 'working' || cardKey === 'employees'
    ? Math.ceil(filtered.length / PER_PAGE)
    : Math.ceil(total / PER_PAGE);

  const displayed = cardKey === 'working' || cardKey === 'employees'
    ? filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
    : filtered;

  const fmt = dt => dt
    ? new Date(dt).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
    : '—';

  const TITLES = {
    employees: 'All Employees',
    present:   'Present Days — Employee Records',
    late:      'Late Days — Employee Records',
    absent:    'Absent Days — Employee Records',
    working:   'Working Days in Period',
  };

  const COLS = {
    employees: ['Employee ID','Full Name','Department','Position'],
    present:   ['Employee','Department','Date','Check-In','Check-Out'],
    late:      ['Employee','Department','Date','Check-In','Late By'],
    absent:    ['Employee','Department','Date','Status'],
    working:   ['#','Date','Weekday'],
  };

  return (
    <div style={{
      background:'#0f172a', border:'1.5px solid #1e3a8a',
      borderRadius:'14px', overflow:'hidden',
      animation:'slideDown 0.2s ease-out',
    }}>
      <style>{`
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #1e293b',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
        <p style={{ margin:0, fontSize:'0.9rem', fontWeight:700, color:'#e2e8f0',
          display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ width:3, height:16, background:'#3b82f6', borderRadius:2, display:'inline-block' }}/>
          {TITLES[cardKey]}
          <span style={{ fontSize:'0.72rem', color:'#475569', fontWeight:400, marginLeft:4 }}>
            ({total} total)
          </span>
        </p>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search…"
          style={{
            padding:'6px 12px', borderRadius:'8px', border:'1px solid #334155',
            background:'#1e293b', color:'#e2e8f0', fontSize:'0.8rem',
            outline:'none', width:'180px',
            WebkitTextFillColor:'#e2e8f0',
          }}
          onFocus={e => e.target.style.borderColor='#3b82f6'}
          onBlur={e  => e.target.style.borderColor='#334155'}
        />
      </div>

      {/* table */}
      {loading ? (
        <div style={{ padding:'32px', textAlign:'center', color:'#475569' }}>
          Loading…
        </div>
      ) : error ? (
        <div style={{ padding:'16px 20px', color:'#fca5a5', fontSize:'0.8rem' }}>{error}</div>
      ) : displayed.length === 0 ? (
        <div style={{ padding:'32px', textAlign:'center', color:'#334155', fontSize:'0.8rem' }}>
          No records found.
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', minWidth:'500px', borderCollapse:'collapse', fontSize:'0.8rem' }}>
            <thead>
              <tr>
                {COLS[cardKey].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((r, i) => {
                const isLast = i === displayed.length - 1;
                if (cardKey === 'employees') return (
                  <tr key={r.employeeId||i}>
                    <td style={S.td(false,isLast)}>
                      <code style={{ fontSize:'0.7rem', background:'#1e293b', border:'1px solid #334155',
                        padding:'2px 6px', borderRadius:'4px', color:'#94a3b8' }}>
                        {r.employeeId}
                      </code>
                    </td>
                    <td style={{ ...S.td(false,isLast), fontWeight:600, color:'#f1f5f9' }}>{r.fullName}</td>
                    <td style={{ ...S.td(false,isLast), color:'#94a3b8' }}>{r.department}</td>
                    <td style={{ ...S.td(false,isLast), color:'#64748b' }}>{r.position||'—'}</td>
                  </tr>
                );
                if (cardKey === 'working') return (
                  <tr key={r.date}>
                    <td style={{ ...S.td(false,isLast), color:'#475569' }}>{(page-1)*PER_PAGE+i+1}</td>
                    <td style={{ ...S.td(false,isLast), fontFamily:'monospace', color:'#94a3b8' }}>{r.date}</td>
                    <td style={{ ...S.td(false,isLast), color:'#e2e8f0' }}>{r.weekday}</td>
                  </tr>
                );
                if (cardKey === 'present') return (
                  <tr key={r._id||i}>
                    <td style={{ ...S.td(false,isLast), fontWeight:600, color:'#f1f5f9' }}>
                      <div>{r.fullName}</div>
                      <div style={{ fontSize:'0.65rem', color:'#475569', fontFamily:'monospace' }}>{r.employeeId}</div>
                    </td>
                    <td style={{ ...S.td(false,isLast), color:'#94a3b8' }}>{r.department||'—'}</td>
                    <td style={{ ...S.td(false,isLast), fontFamily:'monospace', color:'#64748b' }}>{r.date}</td>
                    <td style={{ ...S.td(false,isLast), fontFamily:'monospace', color:'#4ade80' }}>{fmt(r.checkInTime)}</td>
                    <td style={{ ...S.td(false,isLast), fontFamily:'monospace', color:'#c084fc' }}>
                      {fmt(r.afterLunchCheckOut || r.checkOutTime)}
                    </td>
                  </tr>
                );
                if (cardKey === 'late') return (
                  <tr key={r._id||i}>
                    <td style={{ ...S.td(false,isLast), fontWeight:600, color:'#f1f5f9' }}>
                      <div>{r.fullName}</div>
                      <div style={{ fontSize:'0.65rem', color:'#475569', fontFamily:'monospace' }}>{r.employeeId}</div>
                    </td>
                    <td style={{ ...S.td(false,isLast), color:'#94a3b8' }}>{r.department||'—'}</td>
                    <td style={{ ...S.td(false,isLast), fontFamily:'monospace', color:'#64748b' }}>{r.date}</td>
                    <td style={{ ...S.td(false,isLast), fontFamily:'monospace', color:'#fbbf24' }}>{fmt(r.checkInTime)}</td>
                    <td style={S.td(false,isLast)}>
                      {r.lateMinutes > 0
                        ? <span style={{ padding:'2px 8px', borderRadius:'999px',
                            background:'rgba(180,83,9,0.2)', color:'#fbbf24',
                            fontSize:'0.7rem', fontWeight:700 }}>
                            +{r.lateMinutes>=60
                              ? `${Math.floor(r.lateMinutes/60)}h ${r.lateMinutes%60>0?r.lateMinutes%60+'m':''}`.trim()
                              : r.lateMinutes+'m'} late
                          </span>
                        : <span style={{ color:'#334155' }}>—</span>}
                    </td>
                  </tr>
                );
                // absent
                return (
                  <tr key={r._id||i}>
                    <td style={{ ...S.td(false,isLast), fontWeight:600, color:'#f1f5f9' }}>
                      <div>{r.fullName}</div>
                      <div style={{ fontSize:'0.65rem', color:'#475569', fontFamily:'monospace' }}>{r.employeeId}</div>
                    </td>
                    <td style={{ ...S.td(false,isLast), color:'#94a3b8' }}>{r.department||'—'}</td>
                    <td style={{ ...S.td(false,isLast), fontFamily:'monospace', color:'#64748b' }}>{r.date}</td>
                    <td style={S.td(false,isLast)}><StatusBadge status={r.status}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 20px', borderTop:'1px solid #1e293b' }}>
          <span style={{ fontSize:'0.75rem', color:'#475569' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page<=1}
              style={{ ...navBtnStyle(), opacity:page<=1?0.4:1 }}>
              <ChevronLeft size={13}/>
            </button>
            <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
              style={{ ...navBtnStyle(), opacity:page>=totalPages?0.4:1 }}>
              <ChevronRight size={13}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthBadge({ flag }) {
  const map = {
    normal:           { bg:'rgba(21,128,61,0.2)',  color:'#4ade80', border:'rgba(21,128,61,0.4)',  icon:<CheckCircle2 size={11}/>, label:'Normal' },
    warning:          { bg:'rgba(180,83,9,0.25)',  color:'#fbbf24', border:'rgba(180,83,9,0.45)',  icon:<AlertTriangle size={11}/>, label:'Warning' },
    termination_risk: { bg:'rgba(185,28,28,0.25)', color:'#f87171', border:'rgba(185,28,28,0.45)', icon:<ShieldAlert size={11}/>,   label:'At Risk' },
  };
  const s = map[flag]??map.normal;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'4px',
      padding:'3px 9px', borderRadius:'999px',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
      fontSize:'0.65rem', fontWeight:700, whiteSpace:'nowrap' }}>
      {s.icon}{s.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    Present:    { bg:'rgba(21,128,61,0.2)',  color:'#86efac', border:'rgba(21,128,61,0.35)' },
    Late:       { bg:'rgba(180,83,9,0.2)',   color:'#fcd34d', border:'rgba(180,83,9,0.35)'  },
    Absent:     { bg:'rgba(185,28,28,0.2)',  color:'#fca5a5', border:'rgba(185,28,28,0.35)' },
    Permission: { bg:'rgba(99,102,241,0.2)', color:'#a5b4fc', border:'rgba(99,102,241,0.35)' },
  };
  const s = map[status]??{ bg:'rgba(30,41,59,0.5)', color:'#94a3b8', border:'#334155' };
  return (
    <span style={{ display:'inline-block', fontSize:'0.65rem', fontWeight:700,
      padding:'2px 8px', borderRadius:'999px',
      background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

function ConfBar({ value }) {
  const pct = Math.max(0,Math.round((1-value/0.6)*100));
  const col = pct>=70?'#22c55e':pct>=40?'#f59e0b':'#ef4444';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <div style={{ width:'44px', height:'4px', background:'#1e293b', borderRadius:'999px', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:'999px' }}/>
      </div>
      <span style={{ fontSize:'0.65rem', color:'#475569', fontFamily:'monospace' }}>{value.toFixed(3)}</span>
    </div>
  );
}

function FilterField({ label, name, value, onChange, type }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input type={type} name={name} value={value} onChange={onChange}
        autoComplete="off" spellCheck={false}
        style={type==='text'?S.textInput:S.input}
        onFocus={e=>{e.target.style.borderColor='#3b82f6';}}
        onBlur={e=>{e.target.style.borderColor='#334155';}}/>
    </div>
  );
}

function Btn({ primary, onClick, children }) {
  const [hov,setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:'9px 18px', borderRadius:'10px', border: primary?'none':'1px solid #334155',
        background: primary?(hov?'#3b82f6':'#2563eb'):(hov?'#334155':'#1e293b'),
        color: primary?'#fff':'#94a3b8', cursor:'pointer', fontSize:'0.8125rem',
        fontWeight:600, fontFamily:'inherit', transition:'all 0.15s' }}>
      {children}
    </button>
  );
}

function ActionBtn({ icon, onClick, children }) {
  const [hov,setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:'5px',
        padding:'7px 14px', borderRadius:'9px',
        border:'1px solid rgba(99,162,255,0.15)',
        background: hov?'rgba(37,99,235,0.12)':'rgba(37,99,235,0.06)',
        color: hov?'#60a5fa':'#475569',
        cursor:'pointer', fontSize:'0.75rem', fontWeight:600,
        fontFamily:'inherit', transition:'all 0.15s' }}>
      {icon}{children}
    </button>
  );
}

function LegendItem({ color, icon, title, desc }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', minWidth:'200px' }}>
      <span style={{ color, marginTop:'1px', flexShrink:0 }}>{icon}</span>
      <div>
        <p style={{ fontSize:'0.8rem', fontWeight:700, color, margin:'0 0 2px' }}>{title}</p>
        <p style={{ fontSize:'0.72rem', color:'#475569', margin:0 }}>{desc}</p>
      </div>
    </div>
  );
}

function Dash() { return <span style={{ color:'#334155' }}>—</span>; }

function ErrBox({ msg }) {
  return (
    <div style={{ padding:'14px 16px', borderRadius:'12px',
      background:'rgba(127,29,29,0.25)', border:'1px solid rgba(185,28,28,0.4)',
      color:'#fca5a5', fontSize:'0.875rem' }}>{msg}</div>
  );
}

function navBtnStyle() {
  return {
    width:34, height:34, borderRadius:'50%',
    background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', color:'#60a5fa', transition:'all 0.15s',
  };
}

function PaginationBar({ page, totalPages, total, label, onPrev, onNext }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'12px 20px', borderTop:'1px solid rgba(99,162,255,0.08)' }}>
      <span style={{ fontSize:'0.8rem', color:'#475569' }}>
        Page {page} of {totalPages} · {total} {label}
      </span>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={onPrev} disabled={page<=1}
          style={{ ...navBtnStyle(), opacity:page<=1?0.4:1 }}>
          <ChevronLeft size={14}/>
        </button>
        <button onClick={onNext} disabled={page>=totalPages}
          style={{ ...navBtnStyle(), opacity:page>=totalPages?0.4:1 }}>
          <ChevronRight size={14}/>
        </button>
      </div>
    </div>
  );
}
