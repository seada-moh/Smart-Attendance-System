/**
 * MarkAttendance — Face-recognition kiosk (/kiosk)
 * UI matches reference design: tech background, ASK brand navbar,
 * face-device panel on right, draggable brand text on bg.
 * All attendance logic preserved.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadModels, getDescriptor } from '../utils/faceApi';
import { attendanceService } from '../services/attendanceService';
import {
  Camera, CheckCircle2, XCircle, RefreshCw, Clock,
  LogIn, LogOut, Coffee, CalendarCheck, AlertCircle, User, RotateCcw,
} from 'lucide-react';
import askLogo from '../assets/ask-digital.jpg';

/* ── Phase enum ── */
const PHASE = {
  BOOT:'boot', IDLE:'idle', SCANNING:'scanning', SUCCESS:'success',
  CHECKOUT_OK:'checkout_ok', ALREADY:'already', MORNING_ACTIVE:'morning_active',
  IN_BREAK:'in_break', DAY_COMPLETE:'day_complete', TOO_EARLY:'too_early', ERROR:'error',
};

const STATUS_STYLE = {
  [PHASE.BOOT]:           { dot:'#475569', text:'#64748b' },
  [PHASE.IDLE]:           { dot:'#3b82f6', text:'#93c5fd' },
  [PHASE.SCANNING]:       { dot:'#3b82f6', text:'#93c5fd' },
  [PHASE.SUCCESS]:        { dot:'#22c55e', text:'#4ade80' },
  [PHASE.CHECKOUT_OK]:    { dot:'#f97316', text:'#fb923c' },
  [PHASE.ALREADY]:        { dot:'#f59e0b', text:'#fbbf24' },
  [PHASE.MORNING_ACTIVE]: { dot:'#f59e0b', text:'#fbbf24' },
  [PHASE.IN_BREAK]:       { dot:'#f59e0b', text:'#fbbf24' },
  [PHASE.DAY_COMPLETE]:   { dot:'#f59e0b', text:'#fbbf24' },
  [PHASE.TOO_EARLY]:      { dot:'#38bdf8', text:'#7dd3fc' },
  [PHASE.ERROR]:          { dot:'#ef4444', text:'#f87171' },
};

const OVERLAY_BG = {
  [PHASE.SUCCESS]:        'rgba(5,46,22,0.95)',
  [PHASE.CHECKOUT_OK]:    'rgba(67,20,7,0.95)',
  [PHASE.ALREADY]:        'rgba(69,26,3,0.95)',
  [PHASE.MORNING_ACTIVE]: 'rgba(69,26,3,0.95)',
  [PHASE.IN_BREAK]:       'rgba(28,25,5,0.95)',
  [PHASE.DAY_COMPLETE]:   'rgba(28,25,5,0.95)',
  [PHASE.TOO_EARLY]:      'rgba(8,47,73,0.95)',
  [PHASE.ERROR]:          'rgba(69,10,10,0.95)',
};

function resolvePhase(res, isCheckInMode) {
  if (res.tooEarly)      return PHASE.TOO_EARLY;
  if (res.inBreak)       return PHASE.IN_BREAK;
  if (res.morningActive) return PHASE.MORNING_ACTIVE;
  if (res.dayComplete)   return PHASE.DAY_COMPLETE;
  if (res.alreadyCheckedIn || res.alreadyCheckedOut) return PHASE.ALREADY;
  if (res.success) {
    const a = res.action ?? '';
    if (a==='afterlunch_checkout'||a==='auto_checkout'||!isCheckInMode) return PHASE.CHECKOUT_OK;
    return PHASE.SUCCESS;
  }
  return PHASE.ERROR;
}

function ResultIcon({ phase }) {
  const S = 52;
  switch(phase) {
    case PHASE.SUCCESS:        return <CheckCircle2  size={S} color="#4ade80"/>;
    case PHASE.CHECKOUT_OK:    return <LogOut        size={S} color="#fb923c"/>;
    case PHASE.ALREADY:        return <Clock         size={S} color="#fbbf24"/>;
    case PHASE.MORNING_ACTIVE: return <CheckCircle2  size={S} color="#fbbf24"/>;
    case PHASE.IN_BREAK:       return <Coffee        size={S} color="#fbbf24"/>;
    case PHASE.DAY_COMPLETE:   return <CalendarCheck size={S} color="#fbbf24"/>;
    case PHASE.TOO_EARLY:      return <AlertCircle   size={S} color="#7dd3fc"/>;
    default:                   return <XCircle       size={S} color="#f87171"/>;
  }
}

function resultHeadline(phase, name) {
  switch(phase) {
    case PHASE.SUCCESS:        return `Welcome, ${name}!`;
    case PHASE.CHECKOUT_OK:    return `Goodbye, ${name}!`;
    case PHASE.ALREADY:        return 'Already Marked Attendance';
    case PHASE.MORNING_ACTIVE: return 'Already Checked In';
    case PHASE.IN_BREAK:       return 'Enjoy Your Lunch Break!';
    case PHASE.DAY_COMPLETE:   return 'Attendance Completed for Today';
    case PHASE.TOO_EARLY:      return 'Check-In Not Open Yet';
    case PHASE.ERROR:          return 'Not Recognised';
    default:                   return 'Error';
  }
}

function statusBarText(phase, msg, isCheckIn) {
  switch(phase) {
    case PHASE.BOOT:           return 'Loading face recognition models…';
    case PHASE.IDLE:           return 'Ready — choose an action';
    case PHASE.SCANNING:       return 'Scanning — align your face with the frame';
    case PHASE.SUCCESS:        return 'Check-in recorded successfully';
    case PHASE.CHECKOUT_OK:    return 'Check-out recorded successfully';
    case PHASE.ALREADY:        return isCheckIn?'Already checked in for this shift':'Already checked out';
    case PHASE.MORNING_ACTIVE: return 'Already checked in — morning session active';
    case PHASE.IN_BREAK:       return 'Lunch break in progress';
    case PHASE.DAY_COMPLETE:   return 'Attendance already completed for today';
    case PHASE.TOO_EARLY:      return 'Outside check-in window — too early';
    case PHASE.ERROR:          return `Recognition failed${msg?': '+msg:''}`;
    default:                   return msg||'';
  }
}

/* ── CSS ── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  .mk-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', system-ui, sans-serif;
    position: relative;
    overflow: hidden;
    background: #050d1a;
  }

  /* ── tech background image ── */
  .mk-bg-img {
    position: absolute;
    inset: 0;
    background-image: url('/ask-digital-bg.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.28;
    pointer-events: none;
    z-index: 0;
  }

  /* ── dark overlay on top of bg ── */
  .mk-bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg,
      rgba(3,8,24,0.72) 0%,
      rgba(5,14,36,0.65) 40%,
      rgba(8,18,48,0.60) 70%,
      rgba(3,8,24,0.75) 100%
    );
    pointer-events: none;
    z-index: 0;
  }

  /* ── subtle dot grid ── */
  .mk-dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── neon glow blobs ── */
  .mk-glow-l {
    position: absolute;
    bottom: 10%; left: -60px;
    width: 350px; height: 350px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,120,255,0.22) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(24px);
    z-index: 0;
  }
  .mk-glow-r {
    position: absolute;
    top: 15%; right: -40px;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,180,255,0.18) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(20px);
    z-index: 0;
  }
  .mk-glow-b {
    position: absolute;
    bottom: 0; left: 50%;
    transform: translateX(-50%);
    width: 600px; height: 120px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(0,100,255,0.25) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(30px);
    z-index: 0;
  }

  /* ── bottom wave ── */
  .mk-wave {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* ══ NAVBAR ══ */
  .mk-navbar {
    position: relative;
    z-index: 2;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 10px 28px;
    border-bottom: 1px solid rgba(0,140,255,0.15);
    background: rgba(5,12,30,0.80);
    backdrop-filter: blur(14px);
    flex-shrink: 0;
    gap: 14px;
    min-height: 62px;
  }

  .mk-nav-logo {
    width: 38px; height: 38px;
    border-radius: 8px;
    border: 1.5px solid rgba(0,140,255,0.4);
    overflow: hidden;
    background: #0a1640;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 10px rgba(0,140,255,0.3);
  }
  .mk-nav-logo img { width: 100%; height: 100%; object-fit: cover; }

  .mk-nav-brand-col {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    flex-shrink: 0;
  }
  .mk-nav-brand-name {
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.2px;
    white-space: nowrap;
  }
  .mk-nav-brand-name .ask { color: #38bdf8; }
  .mk-nav-brand-name .rest { color: #ffffff; }
  .mk-nav-brand-motto {
    font-size: 0.65rem;
    color: #38bdf8;
    font-style: italic;
    font-weight: 600;
    opacity: 0.85;
  }

  .mk-nav-sep {
    width: 1px; height: 36px;
    background: rgba(255,255,255,0.1);
    flex-shrink: 0;
  }

  .mk-nav-sys {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }
  .mk-nav-sys-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #60a5fa;
    white-space: nowrap;
  }
  .mk-nav-sys-sub {
    font-size: 0.65rem;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mk-nav-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 18px;
    flex-shrink: 0;
  }

  .mk-nav-dt {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .mk-nav-date, .mk-nav-time {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .mk-nav-settings {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    color: #64748b;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    text-decoration: none;
  }
  .mk-nav-settings:hover { background: rgba(56,189,248,0.15); color: #38bdf8; }

  /* ══ BODY LAYOUT ══ */
  .mk-body {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    align-items: flex-start;
    padding: 16px 20px 16px;
    gap: 16px;
    overflow: hidden;
  }

  /* left info panel */
  .mk-left-panel {
    width: 160px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding-top: 0;
    position: relative;
    overflow: visible;
  }

  /* center content */
  .mk-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  /* right device panel */
  .mk-right-panel {
    width: 200px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  /* ── face device illustration ── */
  .mk-device {
    width: 110px;
    background: linear-gradient(160deg, #0d1f3c 0%, #060e20 100%);
    border: 1.5px solid rgba(0,140,255,0.35);
    border-radius: 18px;
    padding: 16px 12px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    box-shadow:
      0 0 30px rgba(0,100,255,0.2),
      inset 0 0 20px rgba(0,80,200,0.08);
    position: relative;
  }
  .mk-device::before {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 6px;
    background: linear-gradient(90deg, transparent, rgba(0,180,255,0.6), transparent);
    border-radius: 50%;
    filter: blur(3px);
  }

  .mk-device-screen {
    width: 78px; height: 88px;
    background: linear-gradient(160deg, #0a1628, #0d1f40);
    border: 1.5px solid rgba(0,140,255,0.3);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .mk-device-screen::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 40%, rgba(0,140,255,0.15), transparent 70%);
  }

  .mk-device-btn {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 1.5px solid rgba(0,140,255,0.4);
    background: rgba(0,80,200,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mk-device-btn-inner {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: rgba(0,140,255,0.5);
  }

  .mk-device-label {
    font-size: 0.68rem;
    font-weight: 700;
    color: #38bdf8;
    text-align: center;
    line-height: 1.4;
    margin-top: 4px;
  }

  /* neon vertical bar beside device */
  .mk-neon-bar {
    width: 3px;
    height: 140px;
    background: linear-gradient(180deg,
      transparent 0%,
      rgba(0,180,255,0.8) 30%,
      rgba(0,220,255,1) 50%,
      rgba(0,180,255,0.8) 70%,
      transparent 100%
    );
    border-radius: 2px;
    box-shadow: 0 0 12px rgba(0,200,255,0.7), 0 0 24px rgba(0,180,255,0.4);
  }

  /* ── mode buttons ── */
  .mk-modes {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .mk-mode-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1.5px solid transparent;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
    text-align: left;
  }
  .mk-mode-btn:hover { transform: translateY(-2px); filter: brightness(1.12); }
  .mk-mode-btn:active { transform: translateY(0); }

  .mk-mode-icon {
    width: 46px; height: 46px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .mk-mode-label { font-size: 1rem; font-weight: 800; display: block; line-height: 1.2; }
  .mk-mode-desc  { font-size: 0.7rem; font-weight: 500; opacity: 0.75; display: block; margin-top: 1px; }

  .mk-mode-btn--checkin {
    background: linear-gradient(135deg, rgba(5,46,22,0.7), rgba(21,128,61,0.3));
    border-color: #16a34a; color: #4ade80;
    box-shadow: 0 0 16px rgba(34,197,94,0.12);
  }
  .mk-mode-btn--checkin:hover { box-shadow: 0 6px 24px rgba(34,197,94,0.3); }
  .mk-mode-icon--checkin { background: linear-gradient(135deg,#15803d,#22c55e); box-shadow: 0 4px 14px rgba(34,197,94,0.4); }

  .mk-mode-btn--afterlunch {
    background: linear-gradient(135deg, rgba(8,47,73,0.7), rgba(2,132,199,0.3));
    border-color: #0284c7; color: #38bdf8;
    box-shadow: 0 0 16px rgba(56,189,248,0.12);
  }
  .mk-mode-btn--afterlunch:hover { box-shadow: 0 6px 24px rgba(56,189,248,0.3); }
  .mk-mode-icon--afterlunch { background: linear-gradient(135deg,#0369a1,#0ea5e9); box-shadow: 0 4px 14px rgba(14,165,233,0.4); }

  .mk-mode-btn--checkout {
    background: linear-gradient(135deg, rgba(67,20,7,0.7), rgba(194,65,12,0.3));
    border-color: #ea580c; color: #fb923c;
    box-shadow: 0 0 16px rgba(249,115,22,0.12);
  }
  .mk-mode-btn--checkout:hover { box-shadow: 0 6px 24px rgba(249,115,22,0.3); }
  .mk-mode-icon--checkout { background: linear-gradient(135deg,#c2410c,#f97316); box-shadow: 0 4px 14px rgba(249,115,22,0.4); }

  /* ── mode badge ── */
  .mk-badge {
    width: 100%;
    display: flex; align-items: center; gap: 8px;
    padding: 7px 16px; border-radius: 10px;
    font-size: 0.875rem; font-weight: 600;
  }
  .mk-badge--checkin  { background: rgba(5,46,22,0.5);  border: 1px solid #16a34a; color: #4ade80; }
  .mk-badge--checkout { background: rgba(67,20,7,0.5);  border: 1px solid #ea580c; color: #fb923c; }

  /* ── camera box ── */
  .mk-cam-outer {
    width: 100%;
    padding: 3px;
    border-radius: 20px;
    background: linear-gradient(135deg, #1d4ed8 0%, #6d28d9 50%, #1d4ed8 100%);
    box-shadow: 0 0 28px rgba(29,78,216,0.3), 0 0 56px rgba(109,40,217,0.15);
  }
  .mk-cam-inner {
    width: 100%;
    border-radius: 17px;
    overflow: hidden;
    background: linear-gradient(135deg, #060e20 0%, #0c1a38 50%, #060e20 100%);
    position: relative;
    aspect-ratio: 4/3;
    max-height: 300px;
  }

  @keyframes mk-border-glow {
    0%,100% { box-shadow: 0 0 28px rgba(29,78,216,0.4), 0 0 56px rgba(109,40,217,0.2); }
    50%      { box-shadow: 0 0 44px rgba(29,78,216,0.6), 0 0 80px rgba(109,40,217,0.3); }
  }
  .mk-cam-outer--scanning { animation: mk-border-glow 2s ease-in-out infinite; }
  .mk-cam-outer--success  { background: linear-gradient(135deg,#16a34a,#22c55e); box-shadow: 0 0 40px rgba(34,197,94,0.4); }
  .mk-cam-outer--error    { background: linear-gradient(135deg,#dc2626,#ef4444); box-shadow: 0 0 40px rgba(239,68,68,0.4); }
  .mk-cam-outer--warn     { background: linear-gradient(135deg,#d97706,#f59e0b); box-shadow: 0 0 40px rgba(245,158,11,0.35); }

  /* ── status bar ── */
  .mk-status {
    width: 100%;
    display: flex; align-items: center; gap: 10px;
    padding: 10px 18px;
    border-radius: 12px;
    background: rgba(5,12,30,0.85);
    border: 1px solid rgba(0,140,255,0.12);
    backdrop-filter: blur(10px);
  }
  .mk-status-dot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .mk-status-text { font-size: 0.8rem; font-weight: 500; }

  /* ── instructions ── */
  .mk-instruction {
    display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap; gap: 5px 16px;
    font-size: 0.7rem; color: #94a3b8; font-weight: 600;
  }
  .mk-instruction-item { display: flex; align-items: center; gap: 4px; color: #cbd5e1; }

  /* ── reset btn ── */
  .mk-reset {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 18px; border-radius: 10px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer; font-size: 0.85rem;
    font-weight: 600; color: #f1f5f9;
    font-family: inherit;
    transition: background 0.15s;
    margin-top: 8px;
  }
  .mk-reset:hover { background: rgba(255,255,255,0.14); }

  /* ── scan anim ── */
  @keyframes mk-pulse {
    0%   { box-shadow: 0 0 0 0   rgba(59,130,246,0.7); }
    70%  { box-shadow: 0 0 0 18px rgba(59,130,246,0); }
    100% { box-shadow: 0 0 0 0   rgba(59,130,246,0); }
  }
  .mk-scan-ring { animation: mk-pulse 1.6s ease-out infinite; }

  @keyframes mk-spin { to { transform: rotate(360deg); } }
  .mk-spin { animation: mk-spin 0.85s linear infinite; }

  @keyframes mk-fadein { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  .mk-fadein { animation: mk-fadein 0.25s ease-out; }

  .mk-corner { position:absolute; width:22px; height:22px; pointer-events:none; }
  .mk-corner--tl { top:12px; left:12px; border-top:3px solid #60a5fa; border-left:3px solid #60a5fa; border-radius:4px 0 0 0; }
  .mk-corner--tr { top:12px; right:12px; border-top:3px solid #60a5fa; border-right:3px solid #60a5fa; border-radius:0 4px 0 0; }
  .mk-corner--bl { bottom:12px; left:12px; border-bottom:3px solid #60a5fa; border-left:3px solid #60a5fa; border-radius:0 0 0 4px; }
  .mk-corner--br { bottom:12px; right:12px; border-bottom:3px solid #60a5fa; border-right:3px solid #60a5fa; border-radius:0 0 4px 0; }

  /* ── staff link ── */
  .mk-staff-link {
    font-size: 0.75rem; color: #3b82f6;
    text-decoration: none; font-weight: 600;
    padding: 3px 8px; border-radius: 6px;
    transition: color 0.15s, background 0.15s;
  }
  .mk-staff-link:hover { color: #60a5fa; background: rgba(59,130,246,0.08); }

  @media (max-width: 700px) {
    .mk-left-panel, .mk-right-panel { display: none; }
    .mk-body { padding: 14px 12px; }
    .mk-modes { grid-template-columns: 1fr 1fr 1fr; }
    .mk-mode-label { font-size: 0.85rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .mk-scan-ring, .mk-spin, .mk-cam-outer--scanning { animation: none; }
  }

  /* ── Kiosk closed overlay ── */
  .mk-closed {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 18px; padding: 40px; text-align: center;
  }
  .mk-closed-icon {
    width: 88px; height: 88px; border-radius: 50%;
    background: rgba(239,68,68,0.1);
    border: 2px solid rgba(239,68,68,0.3);
    display: flex; align-items: center; justify-content: center;
  }
`;

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function MarkAttendance() {
  const [phase,  setPhase]  = useState(PHASE.BOOT);
  const [mode,   setMode]   = useState(null);
  const [msg,    setMsg]    = useState('');
  const [result, setResult] = useState(null);
  const [tick,   setTick]   = useState(new Date());

  // Kiosk open/closed state
  const [kioskMode,  setKioskMode]  = useState(null); // null=loading, 'open', 'closed'
  const [shiftInfo,  setShiftInfo]  = useState(null);

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const scanRef   = useRef(null);
  const resetRef  = useRef(null);
  const modeRef   = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* ── draggable branding ── */
  const [brandX,  setBrandX]  = useState(0);
  const dragState = useRef({ dragging: false, startX: 0, startBrandX: 0 });
  const brandRef  = useRef(null);

  const clampX = useCallback((x) => {
    const container = brandRef.current?.parentElement;
    const brand     = brandRef.current;
    if (!container || !brand) return x;
    return Math.max(0, Math.min(x, container.offsetWidth - brand.offsetWidth));
  }, []);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragState.current = { dragging: true, startX: e.clientX, startBrandX: brandX };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  };
  const onMouseMove = useCallback((e) => {
    if (!dragState.current.dragging) return;
    setBrandX(clampX(dragState.current.startBrandX + (e.clientX - dragState.current.startX)));
  }, [clampX]);
  const onMouseUp = useCallback(() => {
    dragState.current.dragging = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup',   onMouseUp);
  }, [onMouseMove]);
  const onTouchStart = (e) => {
    dragState.current = { dragging: true, startX: e.touches[0].clientX, startBrandX: brandX };
  };
  const onTouchMove = (e) => {
    if (!dragState.current.dragging) return;
    setBrandX(clampX(dragState.current.startBrandX + (e.touches[0].clientX - dragState.current.startX)));
  };
  const onTouchEnd  = () => { dragState.current.dragging = false; };
  const resetBrandPos = () => setBrandX(0);

  /* ── clock ── */
  useEffect(() => {
    const t = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── kiosk open/closed check using PC LOCAL time vs shift settings ── */
  const checkKioskStatus = async () => {
    try {
      const d = await attendanceService.getKioskStatus();
      setShiftInfo(d);

      // Use PC LOCAL time
      const now     = new Date();
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const nowMins = now.getHours() * 60 + now.getMinutes();

      // Weekend → always closed
      if (isWeekend) { setKioskMode('weekend'); return; }

      // Holiday from backend
      if (d.isHoliday) { setKioskMode('holiday'); return; }

      // Check shift hours
      const openMins  = d.shift.startHour * 60 + d.shift.startMinute - 60;
      const closeMins = d.shift.endHour   * 60 + d.shift.endMinute   + 30;
      const isOpen    = nowMins >= openMins && nowMins <= closeMins;
      setKioskMode(isOpen ? 'open' : 'closed');

      console.log('[Kiosk] PC time:', now.toLocaleTimeString(), '| nowMins:', nowMins,
        '| open:', openMins, '| close:', closeMins, '| status:', isOpen ? 'OPEN' : 'CLOSED');
    } catch {
      setKioskMode('open');
    }
  };

  useEffect(() => {
    checkKioskStatus();
    // Re-check every minute so kiosk closes automatically when shift ends
    const t = setInterval(checkKioskStatus, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => () => {
    clearInterval(scanRef.current);
    clearTimeout(resetRef.current);
    stopCamera();
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  /* ── load models ── */
  useEffect(() => {
    loadModels()
      .then(() => setPhase(PHASE.IDLE))
      .catch(() => { setMsg('Failed to load face recognition models.'); setPhase(PHASE.ERROR); });
  }, []);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640, height: 480, facingMode: 'user',
          brightness: { ideal: 128 },
          contrast:   { ideal: 128 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      beginScanning();
    } catch {
      // Fallback: basic constraints if advanced not supported
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        beginScanning();
      } catch {
        setMsg('Camera access denied. Allow permissions and reload.');
        setPhase(PHASE.ERROR);
      }
    }
  };

  const [countdown, setCountdown] = useState(null); // 3,2,1 or null

  const selectMode = m => {
    if (kioskMode === 'closed' || kioskMode === 'weekend' || kioskMode === 'holiday') return;
    setMode(m); setMsg(''); setResult(null); openCamera();
  };

  const beginScanning = () => {
    setPhase(PHASE.SCANNING);
    let attempt = 0;
    const descriptors = []; // collect multiple frames

    const tick = async () => {
      if (!videoRef.current) return;
      attempt++;
      const remaining = Math.max(1, 4 - attempt);
      setCountdown(attempt <= 3 ? remaining : null);

      try {
        const descriptor = await getDescriptor(videoRef.current);
        if (descriptor) {
          descriptors.push(descriptor);
          // After 3 good frames, use the last one (best lighting)
          if (descriptors.length >= 3) {
            clearInterval(scanRef.current);
            setCountdown(null);
            stopCamera();
            await submitDescriptor(descriptors[descriptors.length - 1]);
            return;
          }
        }
        // If exceeded 10 attempts without 3 good frames, use what we have
        if (attempt >= 10 && descriptors.length > 0) {
          clearInterval(scanRef.current);
          setCountdown(null);
          stopCamera();
          await submitDescriptor(descriptors[descriptors.length - 1]);
        }
      } catch { /* keep scanning */ }
    };

    scanRef.current = setInterval(tick, 1000);
  };

  const submitDescriptor = async (descriptor) => {
    try {
      const isCheckIn = modeRef.current === 'checkin';
      const res = isCheckIn
        ? await attendanceService.mark(descriptor)
        : await attendanceService.checkout(descriptor);
      const p = resolvePhase(res, isCheckIn);
      setResult(res.data ?? null);
      setMsg(res.message ?? '');
      setPhase(p);
      // Auto-reset after 10s for success, 8s for others
      const delay = p === PHASE.SUCCESS || p === PHASE.CHECKOUT_OK ? 10000 : 8000;
      resetRef.current = setTimeout(resetKiosk, delay);
    } catch (err) {
      const s = err?.response?.data ?? {};
      const p = resolvePhase(s, modeRef.current === 'checkin');
      setResult(s.data ?? null);
      setMsg(s.message ?? err.message ?? 'Unknown error');
      setPhase(p);
      resetRef.current = setTimeout(resetKiosk, 8000);
    }
  };

  const resetKiosk = useCallback(() => {
    clearTimeout(resetRef.current); clearInterval(scanRef.current);
    stopCamera(); setResult(null); setMsg(''); setMode(null); setPhase(PHASE.IDLE); setCountdown(null);
  }, []);

  const isDone    = ![PHASE.BOOT, PHASE.IDLE, PHASE.SCANNING].includes(phase);
  const isCheckIn = mode === 'checkin';
  const ss        = STATUS_STYLE[phase] ?? STATUS_STYLE[PHASE.IDLE];
  const ovBg      = OVERLAY_BG[phase]   ?? OVERLAY_BG[PHASE.ERROR];
  const empName   = result?.employee?.fullName ?? '';

  const camOuterClass = () => {
    if (phase === PHASE.SCANNING)  return 'mk-cam-outer mk-cam-outer--scanning';
    if (phase === PHASE.SUCCESS)   return 'mk-cam-outer mk-cam-outer--success';
    if (phase === PHASE.ERROR)     return 'mk-cam-outer mk-cam-outer--error';
    if ([PHASE.ALREADY,PHASE.MORNING_ACTIVE,PHASE.IN_BREAK,PHASE.DAY_COMPLETE,PHASE.CHECKOUT_OK].includes(phase))
      return 'mk-cam-outer mk-cam-outer--warn';
    return 'mk-cam-outer';
  };

  const pad12 = (h, m) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`;
  };

  /* ── Kiosk closed: early return with simple screen ── */
  if (kioskMode === 'closed' || kioskMode === 'weekend' || kioskMode === 'holiday') {
    const isWeekend = kioskMode === 'weekend';
    const isHoliday = kioskMode === 'holiday';
    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
    return (
      <>
        <style>{CSS}</style>
        <div className="mk-root">
          <div className="mk-bg-img" aria-hidden="true"/>
          <div className="mk-bg-overlay" aria-hidden="true"/>
          <div className="mk-dots" aria-hidden="true"/>
          <nav className="mk-navbar">
            <div className="mk-nav-logo"><img src={askLogo} alt="ASK"/></div>
            <div className="mk-nav-brand-col">
              <div className="mk-nav-brand-name"><span className="ask">ASK </span><span className="rest">Digital Technologies</span></div>
              <div className="mk-nav-brand-motto">Technology matters!</div>
            </div>
            <div className="mk-nav-sep"/>
            <div className="mk-nav-sys"><div className="mk-nav-sys-title">Smart Attendance System</div></div>
            <div className="mk-nav-right">
              <div className="mk-nav-time">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{fontVariantNumeric:'tabular-nums'}}>
                  {tick.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                </span>
              </div>
            </div>
          </nav>
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
            <div className="mk-closed">
              <div className="mk-closed-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <p style={{fontSize:'1.2rem',fontWeight:800,color:'#f87171',margin:0}}>
                {isWeekend ? `${dayName} — Weekend` : isHoliday ? 'Public Holiday' : 'Kiosk Closed'}
              </p>
              <p style={{fontSize:'0.875rem',color:'#6c7883',margin:'0 0 4px',maxWidth:'320px',lineHeight:1.5}}>
                {isWeekend
                  ? 'The office is closed on weekends. See you on Monday!'
                  : isHoliday
                  ? 'Today is a public holiday. The kiosk is not available.'
                  : 'Outside working hours. Please come back during shift time.'}
              </p>
              {shiftInfo && (
                <div style={{background:'rgba(82,136,193,0.08)',border:'1px solid rgba(82,136,193,0.2)',borderRadius:'14px',padding:'14px 24px',textAlign:'center'}}>
                  <p style={{fontSize:'0.7rem',color:'#6c7883',margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.07em'}}>Working Hours</p>
                  <p style={{fontSize:'1.2rem',fontWeight:800,color:'#a8c7e8',margin:0}}>
                    {pad12(shiftInfo.shift.startHour, shiftInfo.shift.startMinute)}
                    {' – '}
                    {pad12(shiftInfo.shift.endHour, shiftInfo.shift.endMinute)}
                  </p>
                </div>
              )}
              <p style={{fontSize:'0.78rem',color:'#4a5a6a',margin:0,fontVariantNumeric:'tabular-nums'}}>
                {tick.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="mk-root">

        {/* bg layers */}
        <div className="mk-bg-img"     aria-hidden="true" />
        <div className="mk-bg-overlay" aria-hidden="true" />
        <div className="mk-dots"       aria-hidden="true" />
        <div className="mk-glow-l"     aria-hidden="true" />
        <div className="mk-glow-r"     aria-hidden="true" />
        <div className="mk-glow-b"     aria-hidden="true" />

        <svg className="mk-wave" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 50 C360 10, 720 90, 1080 50 S1440 10, 1440 50 L1440 100 L0 100 Z"
            fill="rgba(0,80,200,0.15)" />
        </svg>

        {/* ══ NAVBAR ══ */}
        <nav className="mk-navbar">
          {/* logo */}
          <div className="mk-nav-logo">
            <img src={askLogo} alt="ASK Digital Technologies" />
          </div>

          {/* brand text */}
          <div className="mk-nav-brand-col">
            <div className="mk-nav-brand-name">
              <span className="ask">ASK </span>
              <span className="rest">Digital Technologies</span>
            </div>
            <div className="mk-nav-brand-motto">Technology matters!</div>
          </div>

          <div className="mk-nav-sep" aria-hidden="true" />

          {/* system title */}
          <div className="mk-nav-sys">
            <div className="mk-nav-sys-title">Smart Attendance System</div>
            <div className="mk-nav-sys-sub">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Face Recognition Attendance
            </div>
          </div>

          {/* date + time + settings */}
          <div className="mk-nav-right">
            <div className="mk-nav-dt">
              <div className="mk-nav-date">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{tick.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span>
              </div>
              <div className="mk-nav-time">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{fontVariantNumeric:'tabular-nums'}}>
                  {tick.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                </span>
              </div>
            </div>
            <a href="/login" className="mk-nav-settings" aria-label="Staff login">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </a>
          </div>
        </nav>

        {/* ══ BODY ══ */}
        <div className="mk-body">

          {/* ── LEFT PANEL — draggable branding on bg, not blocking layout ── */}
          <div className="mk-left-panel" style={{ position: 'relative' }}>
            {/* draggable brand — absolute so it floats on bg */}
            <div
              ref={brandRef}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                position:    'absolute',
                top:         '0px',
                left:        `${brandX}px`,
                cursor:      'grab',
                userSelect:  'none',
                touchAction: 'none',
                display:     'flex',
                flexDirection:'column',
                lineHeight:  1.25,
                zIndex: 2,
              }}
            >
              <span style={{ fontSize:'1rem', fontWeight:800, whiteSpace:'nowrap' }}>
                <span style={{ color:'#38bdf8' }}>ASK </span>
                <strong style={{ color:'#ffffff' }}>Digital Technologies</strong>
              </span>
              <span style={{ fontSize:'0.65rem', color:'#38bdf8', fontStyle:'italic', fontWeight:600, opacity:0.85 }}>
                Technology matters!
              </span>
              <button
                onClick={e => { e.stopPropagation(); resetBrandPos(); }}
                style={{
                  marginTop:'4px', alignSelf:'flex-start',
                  background:'none', border:'none', cursor:'pointer',
                  color:'#334155', padding:0,
                  display:'flex', alignItems:'center', gap:'3px',
                  fontSize:'0.6rem', fontWeight:600,
                  transition:'color 0.15s',
                }}
                onMouseEnter={e=>e.currentTarget.style.color='#38bdf8'}
                onMouseLeave={e=>e.currentTarget.style.color='#334155'}
              >
                <RotateCcw size={9}/> reset
              </button>
            </div>
          </div>

          {/* ── CENTER ── */}
          <div className="mk-center">

            {/* mode buttons — idle only */}
            {phase === PHASE.IDLE && (
              <div className="mk-modes">
                <button className="mk-mode-btn mk-mode-btn--checkin" onClick={() => selectMode('checkin')}>
                  <div className="mk-mode-icon mk-mode-icon--checkin"><LogIn size={22} color="#fff"/></div>
                  <div className="mk-mode-texts">
                    <span className="mk-mode-label">Morning</span>
                    <span className="mk-mode-desc">Check In</span>
                  </div>
                </button>
                <button className="mk-mode-btn mk-mode-btn--afterlunch" onClick={() => selectMode('checkin')}>
                  <div className="mk-mode-icon mk-mode-icon--afterlunch"><Coffee size={22} color="#fff"/></div>
                  <div className="mk-mode-texts">
                    <span className="mk-mode-label">After Lunch</span>
                    <span className="mk-mode-desc">Check In</span>
                  </div>
                </button>
                <button className="mk-mode-btn mk-mode-btn--checkout" onClick={() => selectMode('checkout')}>
                  <div className="mk-mode-icon mk-mode-icon--checkout"><LogOut size={22} color="#fff"/></div>
                  <div className="mk-mode-texts">
                    <span className="mk-mode-label">Check Out</span>
                    <span className="mk-mode-desc">End your day</span>
                  </div>
                </button>
              </div>
            )}

            {/* mode badge */}
            {mode && phase !== PHASE.IDLE && (
              <div className={`mk-badge ${isCheckIn?'mk-badge--checkin':'mk-badge--checkout'}`}>
                {isCheckIn ? <LogIn size={14}/> : <LogOut size={14}/>}
                {isCheckIn ? 'Check-In Mode' : 'Check-Out Mode'}
              </div>
            )}

            {/* camera box */}
            <div className={camOuterClass()}>
              <div className="mk-cam-inner">
                <video ref={videoRef}
                  style={{
                    width:'100%', height:'100%', objectFit:'cover', display:'block',
                    filter: 'brightness(1.3) contrast(1.2)',
                  }}
                  muted playsInline />

                {/* scanning overlay */}
                {phase === PHASE.SCANNING && (
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                    <div className="mk-corner mk-corner--tl" aria-hidden="true"/>
                    <div className="mk-corner mk-corner--tr" aria-hidden="true"/>
                    <div className="mk-corner mk-corner--bl" aria-hidden="true"/>
                    <div className="mk-corner mk-corner--br" aria-hidden="true"/>
                    <div className="mk-scan-ring" style={{
                      width:'160px',height:'195px',
                      borderRadius:'50% 50% 46% 46% / 42% 42% 58% 58%',
                      border:'2.5px solid #60a5fa',
                    }}/>
                    {/* countdown */}
                    {countdown !== null ? (
                      <div style={{
                        marginTop:'16px',
                        width:'56px', height:'56px', borderRadius:'50%',
                        background:'rgba(29,78,216,0.35)',
                        border:'2px solid #60a5fa',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        animation:'mk-fadein 0.3s ease-out',
                      }}>
                        <span style={{
                          fontSize:'1.8rem', fontWeight:900, color:'#60a5fa',
                          textShadow:'0 0 12px rgba(96,165,250,0.8)',
                          fontVariantNumeric:'tabular-nums',
                        }}>
                          {countdown}
                        </span>
                      </div>
                    ) : (
                      <p style={{marginTop:'14px',fontSize:'0.8rem',fontWeight:600,
                        color:'#60a5fa',textShadow:'0 1px 6px rgba(0,0,0,0.9)'}}>
                        Scanning — align your face
                      </p>
                    )}
                  </div>
                )}

                {/* result overlay */}
                {isDone && (
                  <div className="mk-fadein" style={{position:'absolute',inset:0,display:'flex',
                    flexDirection:'column',alignItems:'center',justifyContent:'center',
                    background:ovBg,padding:'24px',textAlign:'center',color:'#f1f5f9'}}>
                    <div style={{marginBottom:'10px'}}><ResultIcon phase={phase}/></div>
                    <h2 style={{fontSize:'1.35rem',fontWeight:800,margin:'0 0 4px',letterSpacing:'-0.02em'}}>
                      {resultHeadline(phase, empName)}
                    </h2>
                    {result?.employee && (
                      <div style={{marginBottom:'8px'}}>
                        <p style={{fontSize:'0.85rem',opacity:0.75,margin:'2px 0',
                          display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                          <User size={12}/>{result.employee.department}
                        </p>
                        <p style={{fontSize:'0.7rem',fontFamily:'monospace',opacity:0.5,margin:'2px 0'}}>
                          {result.employee.employeeId}
                        </p>
                        {result.status && (
                          <span style={{display:'inline-block',marginTop:'8px',
                            fontSize:'0.78rem',fontWeight:700,padding:'3px 14px',borderRadius:'999px',
                            background:result.status==='Present'?'rgba(21,128,61,0.35)':result.status==='Late'?'rgba(180,83,9,0.35)':'rgba(30,41,59,0.5)',
                            color:result.status==='Present'?'#86efac':result.status==='Late'?'#fcd34d':'#94a3b8',
                          }}>{result.status}</span>
                        )}
                        {phase===PHASE.SUCCESS&&result.checkInTime&&(
                          <p style={{fontSize:'0.7rem',opacity:0.6,marginTop:'6px'}}>
                            Checked in at {new Date(result.checkInTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                          </p>
                        )}
                        {phase===PHASE.CHECKOUT_OK&&(result.afterLunchCheckOut||result.checkOutTime)&&(
                          <p style={{fontSize:'0.7rem',opacity:0.6,marginTop:'6px'}}>
                            Checked out at {new Date(result.afterLunchCheckOut??result.checkOutTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                          </p>
                        )}
                      </div>
                    )}
                    {msg&&phase!==PHASE.SUCCESS&&phase!==PHASE.CHECKOUT_OK&&(
                      <p style={{fontSize:'0.78rem',opacity:0.75,maxWidth:'280px',lineHeight:1.5,marginTop:'4px'}}>{msg}</p>
                    )}
                    <p style={{fontSize:'0.62rem',opacity:0.45,marginTop:'14px'}}>
                      Auto-resetting in {phase===PHASE.SUCCESS||phase===PHASE.CHECKOUT_OK ? '10' : '8'} sec…
                    </p>
                    <button className="mk-reset" onClick={resetKiosk}>
                      <RefreshCw size={12}/> New scan
                    </button>
                  </div>
                )}

                {/* boot overlay */}
                {phase === PHASE.BOOT && (
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',background:'rgba(5,13,26,0.9)'}}>
                    <div className="mk-spin" style={{width:'38px',height:'38px',borderRadius:'50%',
                      border:'4px solid #1e293b',borderTopColor:'#3b82f6',marginBottom:'12px'}}/>
                    <p style={{fontSize:'0.85rem',color:'#475569',fontWeight:500}}>Initialising models…</p>
                  </div>
                )}

                {/* idle overlay */}
                {phase === PHASE.IDLE && (
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',background:'rgba(5,13,26,0.82)'}}>
                    <div style={{width:60,height:60,borderRadius:'50%',
                      background:'rgba(29,78,216,0.15)',border:'1.5px solid rgba(29,78,216,0.35)',
                      display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'10px'}}>
                      <Camera size={24} color="#3b82f6"/>
                    </div>
                    <p style={{fontSize:'0.8rem',color:'#475569',fontWeight:500}}>
                      Select Check In or Check Out to start
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* status bar */}
            <div className="mk-status">
              <span className={`mk-status-dot${phase===PHASE.SCANNING?' mk-scan-ring':''}`}
                style={{background:ss.dot}}/>
              <span className="mk-status-text" style={{color:ss.text}}>
                {phase === PHASE.SCANNING && countdown !== null
                  ? `Scanning in ${countdown}… align your face`
                  : statusBarText(phase, msg, isCheckIn)}
              </span>
            </div>

            {/* instructions */}
            <div className="mk-instruction">
              <span className="mk-instruction-item"><User size={11} color="#60a5fa"/> Stand in front of the camera</span>
              <span style={{color:'#475569'}}>·</span>
              <span className="mk-instruction-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Look straight ahead
              </span>
              <span style={{color:'#475569'}}>·</span>
              <span className="mk-instruction-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                </svg>
                Ensure good lighting
              </span>
            </div>

            <a href="/login" className="mk-staff-link">Staff login →</a>
          </div>

          {/* ── RIGHT PANEL — face device illustration ── */}
          <div className="mk-right-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* neon bar */}
              <div className="mk-neon-bar" aria-hidden="true"/>

              {/* device */}
              <div className="mk-device">
                <div className="mk-device-screen">
                  {/* face outline SVG */}
                  <svg width="44" height="52" viewBox="0 0 44 52" fill="none"
                    style={{ position:'relative', zIndex:1 }}>
                    {/* face oval */}
                    <ellipse cx="22" cy="26" rx="16" ry="20"
                      stroke="rgba(56,189,248,0.7)" strokeWidth="1.5" fill="none"/>
                    {/* eyes */}
                    <circle cx="15" cy="22" r="2.5" stroke="rgba(56,189,248,0.8)" strokeWidth="1.2" fill="none"/>
                    <circle cx="29" cy="22" r="2.5" stroke="rgba(56,189,248,0.8)" strokeWidth="1.2" fill="none"/>
                    {/* nose */}
                    <path d="M22 25 L20 30 Q22 31.5 24 30 Z"
                      stroke="rgba(56,189,248,0.5)" strokeWidth="1" fill="none"/>
                    {/* smile */}
                    <path d="M16 34 Q22 38 28 34"
                      stroke="rgba(56,189,248,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    {/* scan line */}
                    <line x1="6" y1="26" x2="38" y2="26"
                      stroke="rgba(56,189,248,0.4)" strokeWidth="0.8" strokeDasharray="3,3"/>
                    {/* corner brackets */}
                    <path d="M4 10 L4 4 L10 4" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <path d="M34 4 L40 4 L40 10" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <path d="M4 42 L4 48 L10 48" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <path d="M40 42 L40 48 L34 48" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="mk-device-btn">
                  <div className="mk-device-btn-inner"/>
                </div>
                <div className="mk-device-label">
                  Face Recognition<br/>for a Smarter<br/>Workplace
                </div>
              </div>
            </div>
          </div>

        </div>{/* end mk-body */}
      </div>
    </>
  );
}
