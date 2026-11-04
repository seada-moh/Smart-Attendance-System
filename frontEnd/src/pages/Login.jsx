import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, ArrowRight, Camera, Mail, Phone, MapPin, Globe } from 'lucide-react';
import askLogo  from '../assets/ask-digital.jpg';
import campusBg from '../assets/face-image.jpg';

/* ─── Typewriter hook ─────────────────────────────────────────────────────── */
const TYPE_SPEED  = 85;
const ERASE_SPEED = 42;
const PAUSE_FULL  = 2200;
const PAUSE_EMPTY = 500;

function useTypewriter(text, enabled, initialDelay = 0) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const [isErasing, setIsErasing] = useState(false);
  const timerRef   = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) { setDisplayed(text); return; }

    const tick = () => {
      setDisplayed(prev => {
        if (!isErasing) {
          if (prev.length < text.length) {
            timerRef.current = setTimeout(tick, TYPE_SPEED);
            return text.slice(0, prev.length + 1);
          }
          timerRef.current = setTimeout(() => setIsErasing(true), PAUSE_FULL);
          return prev;
        } else {
          if (prev.length > 0) {
            timerRef.current = setTimeout(tick, ERASE_SPEED);
            return prev.slice(0, -1);
          }
          timerRef.current = setTimeout(() => setIsErasing(false), PAUSE_EMPTY);
          return prev;
        }
      });
    };

    if (!startedRef.current) {
      startedRef.current = true;
      timerRef.current = setTimeout(tick, initialDelay || TYPE_SPEED);
    } else {
      timerRef.current = setTimeout(tick, TYPE_SPEED);
    }
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isErasing, enabled]);

  return displayed;
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lp-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', system-ui, sans-serif;
    overflow: hidden;
  }

  /* ══ BODY ══ */
  .lp-body {
    flex: 1;
    position: relative;
    display: flex;
    min-height: calc(100vh - 44px);
    overflow: hidden;
  }

  /* ── campus photo fills right side behind everything ── */
  .lp-campus-bg {
    position: absolute;
    inset: 0;
    left: 32%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: brightness(0.85);
  }

  /* ── gradient overlay fades photo leftward ── */
  .lp-campus-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      #dbeafe 0%,
      #dbeafe 30%,
      rgba(219,234,254,0.95) 40%,
      rgba(219,234,254,0.55) 55%,
      rgba(219,234,254,0.15) 75%,
      transparent 100%
    );
  }

  /* ── decorative blobs ── */
  .lp-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(55px);
    pointer-events: none;
  }
  .lp-blob--tl {
    top: -70px; left: -70px;
    width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(96,165,250,0.4) 0%, transparent 70%);
  }
  .lp-blob--br {
    bottom: -90px; right: -70px;
    width: 320px; height: 320px;
    background: radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 70%);
  }

  /* ── bottom wave ── */
  .lp-wave {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    pointer-events: none;
    z-index: 1;
  }

  /* ── floating camera corner icon ── */
  .lp-corner-cam {
    position: absolute;
    top: 14px; right: 14px;
    z-index: 3;
    width: 40px; height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: 1.5px solid rgba(37,99,235,0.3);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(6px);
    color: #1e3a8a;
    text-decoration: none;
    transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
    cursor: pointer;
  }
  .lp-corner-cam:hover {
    background: rgba(37,99,235,0.15);
    transform: scale(1.12);
    box-shadow: 0 4px 16px rgba(37,99,235,0.25);
  }
  .lp-corner-cam:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 3px;
  }

  /* ══ CONTENT ══ */
  .lp-content {
    position: relative;
    z-index: 2;
    width: 100%;
    display: flex;
    align-items: stretch;
  }

  /* ══════════════════════════
     LEFT PANEL — light blue
  ══════════════════════════ */
  .lp-left {
    width: 320px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 40px 28px 32px;
    background: linear-gradient(
      160deg,
      rgba(219,234,254,0.85) 0%,
      rgba(191,219,254,0.80) 55%,
      rgba(147,197,253,0.72) 100%
    );
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    position: relative;
    overflow: hidden;
  }

  /* top-right blob inside left panel */
  .lp-left::before {
    content: '';
    position: absolute;
    top: -50px; right: -50px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
    pointer-events: none;
  }

  /* bottom wave inside left panel */
  .lp-left-wave {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 110px;
    pointer-events: none;
  }

  .lp-left-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
  }

  /* logo */
  .lp-logo-wrap {
    width: 105px; height: 105px;
    border-radius: 50%;
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    padding: 6px;
    margin-bottom: 14px;
    box-shadow: 0 8px 28px rgba(37,99,235,0.22);
    overflow: hidden;
    flex-shrink: 0;
  }
  .lp-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }

  /* animated brand name */
  @keyframes lp-brand-slide {
    0%   { transform: translateX(0px); }
    100% { transform: translateX(22px); }
  }

  .lp-brand-name {
    font-size: 1.3rem;
    font-weight: 900;
    text-align: center;
    color: #1e3a8a;
    letter-spacing: -0.3px;
    line-height: 1.2;
    min-height: 1.7rem;
    white-space: nowrap;
    display: inline-block;
    animation: lp-brand-slide 6s ease-in-out infinite alternate;
  }

  @media (prefers-reduced-motion: reduce) {
    .lp-brand-name { animation: none; }
  }

  .lp-brand-motto {
    font-size: 0.82rem;
    font-style: italic;
    font-weight: 700;
    color: #1e40af;
    text-align: center;
    margin-top: 4px;
    margin-bottom: 22px;
    opacity: 0.85;
  }

  /* blinking cursor */
  .lp-cursor {
    display: inline-block;
    width: 2px; height: 0.85em;
    background: #1e40af;
    margin-left: 2px;
    border-radius: 1px;
    vertical-align: middle;
    position: relative; top: -0.05em;
  }
  @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .lp-cursor { animation: lp-blink 0.75s step-start infinite; }

  /* separator */
  .lp-sep {
    width: 100%;
    height: 1px;
    background: rgba(30,58,138,0.15);
    margin-bottom: 20px;
  }

  /* contacts */
  .lp-contacts {
    list-style: none;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: auto;
  }

  .lp-ci { display: flex; align-items: flex-start; gap: 10px; }

  .lp-ci-icon {
    width: 30px; height: 30px;
    border-radius: 50%;
    background: rgba(255,255,255,0.75);
    border: 1px solid rgba(37,99,235,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(37,99,235,0.12);
  }

  .lp-ci-icon-link {
    display: flex; flex-shrink: 0;
    border-radius: 50%;
    text-decoration: none;
    transition: transform 0.15s;
  }
  .lp-ci-icon-link:hover { transform: scale(1.1); }
  .lp-ci-icon-link:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

  .lp-ci-body { display: flex; flex-direction: column; justify-content: center; }

  .lp-ci-label {
    font-size: 0.58rem;
    font-weight: 700;
    color: #1e40af;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.7;
  }

  .lp-ci-val {
    font-size: 0.75rem;
    color: #1e3a8a;
    font-weight: 500;
    word-break: break-all;
    line-height: 1.35;
  }

  .lp-ci-link {
    font-size: 0.75rem;
    color: #2563eb;
    font-weight: 500;
    word-break: break-all;
    line-height: 1.35;
    text-decoration: none;
    transition: color 0.15s;
  }
  .lp-ci-link:hover { color: #1d4ed8; text-decoration: underline; }
  .lp-ci-link:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; border-radius: 2px; }

  /* tagline typewriter */
  .lp-tagline-tw {
    margin-top: 20px;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #1e40af;
    opacity: 0.8;
    min-height: 1.2em;
    white-space: nowrap;
    align-self: flex-start;
  }

  /* ══════════════════════════
     RIGHT PANEL — white card
  ══════════════════════════ */
  .lp-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 32px;
  }

  .lp-right-inner {
    width: 100%;
    max-width: 450px;
    display: flex;
    flex-direction: column;
  }

  /* heading row */
  .lp-heading-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .lp-chevrons {
    font-size: 1rem;
    font-weight: 700;
    color: #3b82f6;
    opacity: 0.75;
    letter-spacing: -2px;
    user-select: none;
  }

  @keyframes lp-title-slide {
    0%   { transform: translateX(0); }
    50%  { transform: translateX(8px); }
    100% { transform: translateX(0); }
  }

  .lp-main-title {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.3px;
    background: linear-gradient(135deg, #2563eb 0%, #7c3aed 55%, #3b82f6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: lp-title-slide 3.5s ease-in-out infinite;
    display: inline-block;
    white-space: nowrap;
  }

  .lp-main-sub {
    text-align: center;
    font-size: 0.76rem;
    color: #475569;
    font-weight: 500;
    margin-bottom: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    .lp-main-title { animation: none; }
    .lp-cursor     { animation: none; opacity: 1; }
  }

  /* white login card */
  .lp-card {
    width: 100%;
    background: rgba(255,255,255,0.97);
    border: 1px solid rgba(226,232,240,0.9);
    border-radius: 20px;
    padding: 28px 30px 30px;
    box-shadow: 0 16px 50px rgba(15,23,42,0.13);
    backdrop-filter: blur(10px);
    margin-bottom: 12px;
  }

  .lp-card-head { margin-bottom: 18px; }
  .lp-card-head h2 {
    font-size: 1.45rem; font-weight: 700;
    color: #0f172a; letter-spacing: -0.3px; margin-bottom: 3px;
  }
  .lp-card-head p { font-size: 0.8rem; color: #64748b; }

  .lp-card-div { height: 1px; background: #f1f5f9; margin-bottom: 18px; }

  .lp-field { margin-bottom: 14px; }

  .lp-label {
    display: block; font-size: 0.75rem; font-weight: 700;
    color: #1e293b; text-transform: uppercase;
    letter-spacing: 0.07em; margin-bottom: 6px;
  }
  .lp-label .req { color: #ef4444; margin-left: 2px; }

  .lp-input-wrap { position: relative; display: flex; align-items: center; }

  .lp-input-icon {
    position: absolute; left: 13px;
    color: #94a3b8; display: flex; align-items: center; pointer-events: none;
  }

  .lp-input {
    width: 100%; height: 48px; padding: 0 40px;
    font-size: 0.9rem; font-family: inherit;
    color: #0f172a; background: #f8fafc;
    border: 1.5px solid #e2e8f0; border-radius: 10px; outline: none;
    transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .lp-input::placeholder { color: #94a3b8; }
  .lp-input:hover:not(:disabled) { background: #fff; border-color: #cbd5e1; }
  .lp-input:focus { background: #fff; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.14); }
  .lp-input:disabled { opacity: .6; cursor: not-allowed; }

  .lp-pw-toggle {
    position: absolute; right: 11px;
    background: none; border: none; cursor: pointer;
    color: #94a3b8; display: flex; align-items: center;
    padding: 4px; border-radius: 6px; transition: color .15s;
  }
  .lp-pw-toggle:hover { color: #475569; }
  .lp-pw-toggle:focus-visible { outline: 2px solid #3b82f6; outline-offset: 1px; }

  .lp-error {
    display: flex; align-items: flex-start; gap: 9px;
    padding: 11px 13px; margin-bottom: 14px;
    background: #fef2f2;
    border: 1px solid rgba(239,68,68,.22);
    border-left: 3px solid #ef4444;
    border-radius: 9px;
    font-size: 0.8rem; color: #b91c1c; font-weight: 500; line-height: 1.5;
  }
  .lp-error-dot {
    flex-shrink: 0; width: 6px; height: 6px;
    border-radius: 50%; background: #f87171; margin-top: 4px;
  }

  .lp-btn {
    width: 100%; height: 50px;
    display: flex; align-items: center; justify-content: center; gap: 9px;
    font-size: 1rem; font-weight: 700; font-family: inherit; color: #fff;
    background: linear-gradient(135deg, #2563eb 0%, #7c3aed 60%, #4f46e5 100%);
    border: none; border-radius: 11px; cursor: pointer;
    box-shadow: 0 8px 22px rgba(37,99,235,.38);
    transition: transform .18s, box-shadow .18s, filter .18s;
  }
  .lp-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(37,99,235,.48);
    filter: brightness(1.07);
  }
  .lp-btn:active:not(:disabled) { transform: translateY(0); }
  .lp-btn:disabled { background: linear-gradient(135deg,#93c5fd,#a5b4fc); box-shadow: none; cursor: not-allowed; }
  .lp-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 3px; }

  /* kiosk */
  .lp-kiosk {
    width: 100%;
    display: flex; align-items: center; gap: 14px;
    padding: 14px 18px;
    background: rgba(255,255,255,0.9);
    border: 1.5px solid #bfdbfe;
    border-radius: 16px; text-decoration: none; cursor: pointer;
    box-shadow: 0 4px 16px rgba(59,130,246,.10);
    backdrop-filter: blur(6px);
    transition: transform .18s, box-shadow .18s, background .18s, border-color .18s;
  }
  .lp-kiosk:hover {
    background: rgba(219,234,254,0.97);
    border-color: #60a5fa;
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(59,130,246,.18);
  }
  .lp-kiosk:active { transform: translateY(0); }

  .lp-kiosk-icon {
    width: 44px; height: 44px; border-radius: 13px;
    background: linear-gradient(135deg,#2563eb,#3b82f6);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(37,99,235,.3);
    transition: transform .15s;
  }
  .lp-kiosk:hover .lp-kiosk-icon { transform: scale(1.07); }

  .lp-kiosk-body { flex: 1; }
  .lp-kiosk-title { font-size: 0.875rem; font-weight: 700; color: #1e3a8a; margin-bottom: 2px; }
  .lp-kiosk-sub   { font-size: 0.7rem;   color: #475569; }
  .lp-kiosk-arrow { color: #2563eb; flex-shrink: 0; transition: transform .15s; }
  .lp-kiosk:hover .lp-kiosk-arrow { transform: translateX(4px); }

  /* ══ FOOTER ══ */
  .lp-footer {
    position: relative;
    background: #0f172a;
    color: #94a3b8;
    text-align: right;
    padding: 12px 24px;
    font-size: 0.72rem; font-weight: 500;
    flex-shrink: 0;
  }
  .lp-footer::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg,#2563eb,#7c3aed,#3b82f6);
  }
  .lp-footer-accent { color: #60a5fa; font-weight: 600; }

  /* ══ CENTER ASK OVERLAY ══ */
  @keyframes lp-center-float {
    0%   { transform: translate(-50%, -50%) translateX(0px); }
    100% { transform: translate(-50%, -50%) translateX(24px); }
  }

  .lp-center-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    pointer-events: none;
    user-select: none;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    max-width: 90vw;
    animation: lp-center-float 6s ease-in-out infinite alternate;
  }

  .lp-center-text {
    display: block;
    font-size: clamp(1.8rem, 4.5vw, 4rem);
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 1.15;
    background: linear-gradient(135deg, #93c5fd 0%, #a78bfa 45%, #818cf8 75%, #60a5fa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: 0.55;
    filter: drop-shadow(0 0 24px rgba(99,102,241,0.45));
    min-height: 1.2em;
  }

  .lp-center-cursor {
    display: inline-block;
    width: 3px;
    height: 0.8em;
    background: linear-gradient(180deg, #93c5fd, #a78bfa);
    margin-left: 3px;
    border-radius: 2px;
    vertical-align: middle;
    position: relative;
    top: -0.05em;
    opacity: 0.55;
  }

  @keyframes lp-center-blink { 0%,100%{opacity:0.55} 50%{opacity:0} }
  .lp-center-cursor { animation: lp-center-blink 0.75s step-start infinite; }

  @media (prefers-reduced-motion: reduce) {
    .lp-center-overlay { animation: none; }
    .lp-center-cursor  { animation: none; opacity: 0.18; }
  }

  @media (max-width: 600px) {
    .lp-center-text { font-size: clamp(1.2rem, 6vw, 2rem); }
  }
  .lp-spin { animation: lp-spin .75s linear infinite; }

  /* autofill */
  .lp-input:-webkit-autofill,
  .lp-input:-webkit-autofill:hover,
  .lp-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
    -webkit-text-fill-color: #0f172a !important;
    caret-color: #0f172a;
    border-color: #e2e8f0 !important;
    transition: background-color 99999s ease-in-out 0s;
  }

  /* ══ RESPONSIVE ══ */
  @media (max-width: 860px) {
    .lp-campus-bg { left: 0; }
    .lp-campus-overlay {
      background: linear-gradient(180deg,
        rgba(219,234,254,0.96) 0%,
        rgba(219,234,254,0.85) 50%,
        rgba(219,234,254,0.65) 100%
      );
    }
    .lp-content { flex-direction: column; }
    .lp-left {
      width: 100%; padding: 24px 20px 20px;
      flex-direction: column; align-items: center;
    }
    .lp-left-inner { flex-direction: row; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
    .lp-logo-wrap { width: 72px; height: 72px; margin-bottom: 0; }
    .lp-brand-name { font-size: 1rem; white-space: normal; text-align: left; }
    .lp-contacts { flex-direction: row; flex-wrap: wrap; gap: 8px; }
    .lp-ci { width: calc(50% - 4px); }
    .lp-tagline-tw { display: none; }
    .lp-right { padding: 20px 16px 28px; }
    .lp-main-title { font-size: 1.2rem; white-space: normal; text-align: center; }
  }

  @media (max-width: 480px) {
    .lp-card { padding: 20px 16px 24px; }
    .lp-ci { width: 100%; }
    .lp-brand-name { font-size: 0.95rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lp-btn, .lp-kiosk, .lp-kiosk-icon, .lp-kiosk-arrow { transition: none; }
    .lp-brand-name  { animation: none; }
    .lp-main-title  { animation: none; }
    .lp-cursor      { animation: none; opacity: 1; }
  }
`;

/* ─── Data ────────────────────────────────────────────────────────────────── */
const CONTACTS = [
  { Icon: Mail,   label: 'Email',    value: 'svgaddisudessalew02@gmail.com', href: 'mailto:svgaddisudessalew02@gmail.com' },
  { Icon: Phone,  label: 'Phone',    value: '+251 955 225 420',              href: null },
  { Icon: MapPin, label: 'Location', value: 'Bahir Dar, Amhara Region, Ethiopia', href: 'https://www.google.com/maps/search/?api=1&query=Bahir+Dar%2C+Amhara+Region%2C+Ethiopia' },
  { Icon: Globe,  label: 'Website',  value: 'www.askdigitaltech.com',        href: 'http://www.askdigitaltech.com/' },
];

const BRAND_TEXT   = 'ASK Digital Technologies';
const TAGLINE_TEXT = 'KNOWLEDGE \u2022 CREATION \u2022 SERVICE';

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const typedBrand   = useTypewriter(BRAND_TEXT,   !prefersReduced, 400);
  const typedTagline = useTypewriter(TAGLINE_TEXT,  !prefersReduced, 2000);
  const typedCenter  = useTypewriter(BRAND_TEXT,    !prefersReduced, 1200);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(user.role === 'admin' ? '/admin' : '/me', { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err.message ||
        'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="lp-root">
        <div className="lp-body">

          {/* campus bg + overlay */}
          <div className="lp-campus-bg"
            style={{ backgroundImage: `url(${campusBg})` }}
            aria-hidden="true" />
          <div className="lp-campus-overlay" aria-hidden="true" />

          {/* blobs */}
          <div className="lp-blob lp-blob--tl" aria-hidden="true" />
          <div className="lp-blob lp-blob--br" aria-hidden="true" />

          {/* ── center ASK overlay (behind everything) ── */}
          <div className="lp-center-overlay" aria-hidden="true">
            <span className="lp-center-text">
              {typedCenter}
              <span className="lp-center-cursor" />
            </span>
          </div>

          {/* bottom wave */}
          <svg className="lp-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 40 C360 0, 720 80, 1080 40 S1440 0, 1440 40 L1440 80 L0 80 Z"
              fill="rgba(30,58,138,0.06)" />
            <path d="M0 55 C400 20, 800 75, 1200 45 S1440 20, 1440 55 L1440 80 L0 80 Z"
              fill="rgba(30,58,138,0.04)" />
          </svg>

          {/* floating camera icon — links to kiosk */}
          <a href="/kiosk" className="lp-corner-cam" aria-label="Go to face recognition attendance kiosk">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </a>

          <div className="lp-content">

            {/* ══ LEFT PANEL ══ */}
            <aside className="lp-left" aria-label="ASK Digital Technologies branding">
              <div className="lp-left-inner">

                <div className="lp-logo-wrap">
                  <img src={askLogo} alt="ASK Digital Technologies logo" />
                </div>

                <span className="lp-brand-name" aria-label="ASK Digital Technologies">
                  {typedBrand}<span className="lp-cursor" aria-hidden="true" />
                </span>

                <p className="lp-brand-motto">Technology matters!</p>

                <div className="lp-sep" aria-hidden="true" />

                <ul className="lp-contacts" aria-label="Contact information">
                  {CONTACTS.map(({ Icon, label, value, href }) => (
                    <li key={label} className="lp-ci">
                      {href ? (
                        <a href={href} className="lp-ci-icon-link"
                          target={href.startsWith('mailto') ? '_self' : '_blank'}
                          rel="noopener noreferrer" aria-label={`${label}: ${value}`}>
                          <div className="lp-ci-icon" aria-hidden="true">
                            <Icon size={14} color="#2563eb" strokeWidth={2} />
                          </div>
                        </a>
                      ) : (
                        <div className="lp-ci-icon" aria-hidden="true">
                          <Icon size={14} color="#2563eb" strokeWidth={2} />
                        </div>
                      )}
                      <div className="lp-ci-body">
                        <span className="lp-ci-label">{label}</span>
                        {href ? (
                          <a href={href} className="lp-ci-link"
                            target={href.startsWith('mailto') ? '_self' : '_blank'}
                            rel="noopener noreferrer">{value}</a>
                        ) : (
                          <span className="lp-ci-val">{value}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <span className="lp-tagline-tw" aria-label="Knowledge Creation Service">
                  {typedTagline}<span className="lp-cursor" aria-hidden="true" />
                </span>

              </div>

              <svg className="lp-left-wave" viewBox="0 0 320 110" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 55 C 60 15, 120 95, 180 55 S 280 10, 320 55 L320 110 L0 110 Z"
                  fill="rgba(30,58,138,0.07)" />
                <path d="M0 75 C 80 35, 160 105, 240 65 S 300 25, 320 75 L320 110 L0 110 Z"
                  fill="rgba(30,58,138,0.05)" />
              </svg>
            </aside>

            {/* ══ RIGHT PANEL ══ */}
            <main className="lp-right">
              <div className="lp-right-inner">

                <div className="lp-heading-row">
                  <span className="lp-chevrons" aria-hidden="true">&lt;&lt;</span>
                  <h2 className="lp-main-title">Smart Attendance System</h2>
                  <span className="lp-chevrons" aria-hidden="true">&gt;&gt;</span>
                </div>
                <p className="lp-main-sub">Corporate Workforce Management</p>

                <div className="lp-card">
                  <div className="lp-card-head">
                    <h2>Welcome back</h2>
                    <p>Sign in to access your dashboard</p>
                  </div>
                  <div className="lp-card-div" aria-hidden="true" />

                  <form onSubmit={handleSubmit} noValidate autoComplete="off">

                    <div className="lp-field">
                      <label htmlFor="lp-email" className="lp-label">
                        Email Address <span className="req" aria-hidden="true">*</span>
                      </label>
                      <div className="lp-input-wrap">
                        <span className="lp-input-icon"><Mail size={15} strokeWidth={2} /></span>
                        <input id="lp-email" name="lp-email" type="email"
                          autoComplete="username" required
                          placeholder="Enter your email address"
                          value={form.email}
                          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                          className="lp-input" disabled={loading} aria-required="true" />
                      </div>
                    </div>

                    <div className="lp-field" style={{ marginBottom: '20px' }}>
                      <label htmlFor="lp-password" className="lp-label">
                        Password <span className="req" aria-hidden="true">*</span>
                      </label>
                      <div className="lp-input-wrap">
                        <span className="lp-input-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </span>
                        <input id="lp-password" name="lp-password"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="new-password" required
                          placeholder="Enter your password"
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          className="lp-input" disabled={loading} aria-required="true" />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}
                          className="lp-pw-toggle">
                          {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div role="alert" className="lp-error">
                        <span className="lp-error-dot" aria-hidden="true" />
                        {error}
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="lp-btn">
                      {loading
                        ? <><Loader2 size={16} className="lp-spin" /> Signing in…</>
                        : <>Sign In <ArrowRight size={18} strokeWidth={2.5} /></>
                      }
                    </button>
                  </form>
                </div>

                <a href="/kiosk" className="lp-kiosk" aria-label="Face recognition attendance kiosk">
                  <div className="lp-kiosk-icon" aria-hidden="true">
                    <Camera size={20} color="#fff" strokeWidth={1.8} />
                  </div>
                  <div className="lp-kiosk-body">
                    <p className="lp-kiosk-title">Mark Attendance — Face Check-In</p>
                    <p className="lp-kiosk-sub">Use the camera to record your attendance</p>
                  </div>
                  <ArrowRight size={17} className="lp-kiosk-arrow" strokeWidth={2.2} />
                </a>

              </div>
            </main>

          </div>
        </div>

        <footer className="lp-footer">
          <span className="lp-footer-accent">Education for a better tomorrow.</span>
        </footer>

      </div>
    </>
  );
}
