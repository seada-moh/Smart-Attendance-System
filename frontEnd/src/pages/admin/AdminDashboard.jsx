import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { attendanceService } from '../../services/attendanceService';
import Spinner from '../../components/Spinner';
import {
  Users, UserCheck, UserX, Clock,
  TrendingUp, ChevronRight, Camera, User, ShieldCheck,
} from 'lucide-react';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

/* ── shared card style ── */
const CARD = {
  background:   'rgba(10,18,42,0.75)',
  border:       '1px solid rgba(255,255,255,0.12)',
  borderRadius: '16px',
  padding:      '22px',
  backdropFilter: 'blur(8px)',
};

/* ── custom tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0d1b3e', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#ffffff', margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong style={{ color: '#ffffff' }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

/* ── custom pie label ── */
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    attendanceService.getDashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ErrBox msg={error} />;

  const { summary, recentCheckIns, monthlyTrend, deptStats } = data;

  const pieData = [
    { name: 'Present', value: summary.presentToday },
    { name: 'Late',    value: summary.lateToday    },
    { name: 'Absent',  value: summary.absentToday  },
  ];

  const totalPie = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ position: 'relative', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh' }}>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Page heading ── */}
        <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '14px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 3px', letterSpacing: '-0.025em' }}>
            HR Dashboard
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', margin: 0 }}>
            Overview of your workforce and attendance
          </p>
        </div>

        {/* ── KPI row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
          <KpiCard label="TOTAL EMPLOYEES"   value={summary.totalEmployees}          icon={Users}       color="blue"       onClick={() => navigate('/admin/users')} />
          <KpiCard label="PRESENT TODAY"     value={summary.presentToday}            icon={UserCheck}   color="green"      onClick={() => navigate('/admin/reports')} />
          <KpiCard label="LATE TODAY"        value={summary.lateToday}               icon={Clock}       color="amber"      onClick={() => navigate('/admin/reports')} />
          <KpiCard label="PERMISSION TODAY"  value={summary.permissionToday ?? 0}    icon={ShieldCheck} color="indigo"     onClick={() => navigate('/admin/reports')} />
          <KpiCard label="ABSENT TODAY"      value={summary.absentToday}             icon={UserX}       color="red"        onClick={() => navigate('/admin/reports')} />
        </div>

        {/* Weekend / holiday notice */}
        {summary.isWorkingDay === false && (
          <div style={{
            padding: '12px 18px', borderRadius: '12px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ fontSize: '0.82rem', color: '#a5b4fc', fontWeight: 600 }}>
              Today is a weekend or public holiday — no attendance is expected.
            </span>
          </div>
        )}

        {/* ── Charts row top ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '14px' }}>

          {/* Monthly trend */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <TrendingUp size={15} color="#60a5fa" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Monthly Attendance Trend</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                barCategoryGap="35%">
                <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#cbd5e1' }}
                  tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fontSize: 10, fill: '#cbd5e1' }}
                  tickLine={false} axisLine={false}
                  allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40} />
                <Bar dataKey="late"    name="Late"    fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Today breakdown pie */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Camera size={15} color="#60a5fa" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Today's Breakdown</span>
            </div>

            {totalPie === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No attendance data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    dataKey="value" labelLine={false}
                    label={renderPieLabel} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(value, entry) => (
                      <span style={{ color: '#ffffff', fontSize: 11 }}>
                        {value} <span style={{ color: entry.color, fontWeight: 700 }}>{entry.payload.value}</span>
                      </span>
                    )}
                    wrapperStyle={{ paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Charts row bottom ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* Department bar */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Today by Department</span>
              </div>
              <button onClick={() => navigate('/admin/reports')}
                style={{ background:'none', border:'none', cursor:'pointer', display:'flex',
                  alignItems:'center', gap:'4px', fontSize:'0.72rem', color:'#93c5fd', fontFamily:'inherit' }}
                onMouseEnter={e=>e.currentTarget.style.color='#ffffff'}
                onMouseLeave={e=>e.currentTarget.style.color='#93c5fd'}>
                View all <ChevronRight size={12} />
              </button>
            </div>

            {!deptStats?.length ? (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>No department data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptStats} layout="vertical"
                  margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#cbd5e1' }}
                    tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} allowDecimals={false} />
                  <YAxis dataKey="_id" type="category" tick={{ fontSize: 10, fill: '#e2e8f0' }}
                    tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="count" name="Check-ins" fill="#3b82f6" radius={[0,4,4,0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent check-ins */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} color="#60a5fa" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Recent Check-ins</span>
              </div>
              <button onClick={() => navigate('/admin/reports')}
                style={{ background:'none', border:'none', cursor:'pointer', display:'flex',
                  alignItems:'center', gap:'4px', fontSize:'0.72rem', color:'#93c5fd', fontFamily:'inherit' }}
                onMouseEnter={e=>e.currentTarget.style.color='#ffffff'}
                onMouseLeave={e=>e.currentTarget.style.color='#93c5fd'}>
                View all <ChevronRight size={12} />
              </button>
            </div>

            {/* table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.2fr',
              padding: '6px 8px', marginBottom: '4px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              {['Employee','Department','Check-in Time','Status'].map(h => (
                <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700,
                  color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </span>
              ))}
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {recentCheckIns.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 0' }}>
                  <User size={22} color="#64748b" />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>No recent check-ins</p>
                </div>
              )}
              {recentCheckIns.map(r => (
                <div key={r._id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.2fr',
                  alignItems: 'center', padding: '9px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.fullName}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#cbd5e1',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.department}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(r.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── KPI card ── */
const kpiColors = {
  blue:   { bg:'rgba(37,99,235,0.15)',  border:'rgba(37,99,235,0.35)',  icon:'#60a5fa', val:'#ffffff', label:'#cbd5e1', iconBg:'rgba(37,99,235,0.2)'  },
  green:  { bg:'rgba(21,128,61,0.15)',  border:'rgba(21,128,61,0.35)',  icon:'#4ade80', val:'#ffffff', label:'#cbd5e1', iconBg:'rgba(21,128,61,0.2)'  },
  amber:  { bg:'rgba(180,83,9,0.15)',   border:'rgba(180,83,9,0.35)',   icon:'#fbbf24', val:'#ffffff', label:'#cbd5e1', iconBg:'rgba(180,83,9,0.2)'   },
  red:    { bg:'rgba(185,28,28,0.15)',  border:'rgba(185,28,28,0.35)',  icon:'#f87171', val:'#ffffff', label:'#cbd5e1', iconBg:'rgba(185,28,28,0.2)'  },
  indigo: { bg:'rgba(99,102,241,0.15)', border:'rgba(99,102,241,0.35)', icon:'#a5b4fc', val:'#ffffff', label:'#cbd5e1', iconBg:'rgba(99,102,241,0.2)' },
};

function KpiCard({ label, value, icon: Icon, color, onClick }) {
  const c = kpiColors[color];
  return (
    <div onClick={onClick} style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: '16px', padding: '20px 20px 18px',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${c.bg}`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: c.label,
          textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
          {label}
        </p>
        <div style={{ width: 34, height: 34, borderRadius: '10px',
          background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={c.icon} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '2.2rem', fontWeight: 900, color: c.val, margin: 0, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
        <div style={{ width: 28, height: 28, borderRadius: '50%',
          background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={13} color={c.icon} />
        </div>
      </div>
    </div>
  );
}

/* ── status badge ── */
function StatusBadge({ status }) {
  const map = {
    Present: { bg:'rgba(21,128,61,0.3)',  color:'#bbf7d0', border:'rgba(21,128,61,0.5)'  },
    Late:    { bg:'rgba(180,83,9,0.3)',   color:'#fde68a', border:'rgba(180,83,9,0.5)'   },
    Absent:  { bg:'rgba(185,28,28,0.3)',  color:'#fecaca', border:'rgba(185,28,28,0.5)'  },
  };
  const s = map[status] ?? { bg:'rgba(30,41,59,0.5)', color:'#e2e8f0', border:'rgba(255,255,255,0.1)' };
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.6rem', fontWeight: 700,
      padding: '2px 7px', borderRadius: '999px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

/* ── error box ── */
function ErrBox({ msg }) {
  return (
    <div style={{
      padding: '16px', borderRadius: '12px',
      background: 'rgba(127,29,29,0.3)', border: '1px solid #991b1b',
      color: '#fca5a5', fontSize: '0.875rem',
    }}>
      {msg}
    </div>
  );
}
