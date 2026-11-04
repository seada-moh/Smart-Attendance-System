/**
 * UserProfile — Employee self-service page
 * • Edit basic info (name, department, position)
 * • Upload / change profile photo
 * • Change password
 */
import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  User, Camera, Lock, Save, Eye, EyeOff,
  CheckCircle2, AlertTriangle, ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POSITIONS = [
  'General Manager','IT Manager','HR Manager','Finance Manager','Project Manager',
  'Software Developer','Web Developer','System Administrator','IT Support Officer',
  'Accountant','HR Officer','Marketing Officer','Sales Officer',
  'Customer Service Representative','Administrative Assistant',
  'Security Officer','Receptionist','Driver','Intern','Other',
];

const DEPARTMENTS = [
  'Engineering','Human Resources','Finance','Information Technology',
  'Operations','Marketing','Sales','Legal','Administration',
];

/* ── shared styles ── */
const CARD = {
  background: 'rgba(10,18,42,0.75)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '28px',
  backdropFilter: 'blur(8px)',
};
const LABEL = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px',
};
const INPUT_BASE = {
  width: '100%', padding: '10px 14px',
  background: '#1e293b', border: '1.5px solid #334155',
  borderRadius: '10px', color: '#f1f5f9', fontSize: '0.875rem',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
};

function Field({ label, name, value, onChange, type = 'text', readOnly }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label style={LABEL}>{label}</label>
      <input
        name={name} type={type} value={value}
        onChange={onChange} readOnly={readOnly}
        style={{
          ...INPUT_BASE,
          borderColor: focus ? '#3b82f6' : '#334155',
          boxShadow: focus ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
          cursor: readOnly ? 'default' : 'text',
          color: readOnly ? '#64748b' : '#f1f5f9',
        }}
        onFocus={() => setFocus(true)}
        onBlur={()  => setFocus(false)}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label style={LABEL}>{label}</label>
      <select
        name={name} value={value} onChange={onChange}
        style={{
          ...INPUT_BASE,
          borderColor: focus ? '#3b82f6' : '#334155',
          boxShadow: focus ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
          color: value ? '#f1f5f9' : '#64748b',
        }}
        onFocus={() => setFocus(true)}
        onBlur={()  => setFocus(false)}
      >
        <option value="" disabled style={{ background: '#1e293b' }}>Select…</option>
        {options.map(o => (
          <option key={o} value={o} style={{ background: '#1e293b' }}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function PwField({ label, name, value, onChange }) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label style={LABEL}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          name={name} type={show ? 'text' : 'password'} value={value}
          onChange={onChange}
          style={{
            ...INPUT_BASE, paddingRight: '40px',
            borderColor: focus ? '#3b82f6' : '#334155',
            boxShadow: focus ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
          }}
          onFocus={() => setFocus(true)}
          onBlur={()  => setFocus(false)}
        />
        <button
          type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
          style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0,
          }}
        >
          {show ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  /* ── Info form ── */
  const [info, setInfo] = useState({
    fullName:   user?.fullName   || '',
    department: user?.department || '',
    position:   user?.position   || '',
  });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg,     setInfoMsg]     = useState(null); // { type:'success'|'error', text }

  /* ── Avatar ── */
  const [avatar,        setAvatar]        = useState(user?.avatar || '');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg,     setAvatarMsg]     = useState(null);
  const fileInputRef = useRef(null);

  /* ── Password form ── */
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg,     setPwMsg]     = useState(null);

  const setI = e => setInfo(p => ({ ...p, [e.target.name]: e.target.value }));
  const setP = e => setPw(p =>   ({ ...p, [e.target.name]: e.target.value }));

  /* ── Save info ── */
  const saveInfo = async e => {
    e.preventDefault();
    setInfoLoading(true); setInfoMsg(null);
    try {
      const res = await api.patch(`/users/${user._id}/profile`, {
        fullName:   info.fullName,
        department: info.department,
        position:   info.position,
      });
      if (setUser) setUser(prev => ({ ...prev, ...res.data.data.user }));
      setInfoMsg({ type: 'success', text: 'Profile info updated!' });
    } catch (err) {
      setInfoMsg({ type: 'error', text: err.message });
    } finally { setInfoLoading(false); }
  };

  /* ── Upload avatar ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'Image must be under 2 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setAvatarLoading(true); setAvatarMsg(null);
      try {
        const res = await api.patch(`/users/${user._id}/profile`, { avatar: dataUrl });
        setAvatar(dataUrl);
        if (setUser) setUser(prev => ({ ...prev, avatar: dataUrl, ...res.data.data.user }));
        setAvatarMsg({ type: 'success', text: 'Photo updated!' });
      } catch (err) {
        setAvatarMsg({ type: 'error', text: err.message });
      } finally { setAvatarLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    setAvatarLoading(true); setAvatarMsg(null);
    try {
      await api.patch(`/users/${user._id}/profile`, { avatar: '' });
      setAvatar('');
      if (setUser) setUser(prev => ({ ...prev, avatar: '' }));
      setAvatarMsg({ type: 'success', text: 'Photo removed.' });
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.message });
    } finally { setAvatarLoading(false); }
  };

  /* ── Change password ── */
  const savePassword = async e => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return;
    }
    if (pw.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return;
    }
    setPwLoading(true); setPwMsg(null);
    try {
      await api.patch(`/users/${user._id}/profile`, {
        currentPassword: pw.currentPassword,
        newPassword:     pw.newPassword,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    } finally { setPwLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{
          padding: '7px', borderRadius: '8px', background: '#1e293b',
          border: '1px solid #334155', cursor: 'pointer', color: '#94a3b8',
          display: 'flex', alignItems: 'center',
        }}>
          <ArrowLeft size={15}/>
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 2px' }}>My Profile</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Edit your personal information</p>
        </div>
      </div>

      {/* ── PHOTO CARD ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Camera size={15} color="#60a5fa"/>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Profile Photo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Avatar preview */}
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
            border: '2px solid rgba(99,162,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {avatar
              ? <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {user?.fullName?.charAt(0).toUpperCase()}
                </span>
            }
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="file" ref={fileInputRef} accept="image/*"
              style={{ display: 'none' }} onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              style={{
                padding: '8px 18px', borderRadius: '9px', cursor: 'pointer',
                background: '#2563eb', border: 'none', color: '#fff',
                fontWeight: 600, fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: avatarLoading ? 0.6 : 1,
              }}
            >
              <Camera size={13}/> {avatarLoading ? 'Uploading…' : 'Upload Photo'}
            </button>
            {avatar && (
              <button
                onClick={removeAvatar} disabled={avatarLoading}
                style={{
                  padding: '7px 18px', borderRadius: '9px', cursor: 'pointer',
                  background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
                  fontWeight: 600, fontSize: '0.8rem',
                }}
              >
                Remove Photo
              </button>
            )}
            <p style={{ fontSize: '0.7rem', color: '#475569', margin: 0 }}>
              JPG, PNG — max 2 MB
            </p>
          </div>
        </div>

        {avatarMsg && <MsgBanner msg={avatarMsg}/>}
      </div>

      {/* ── INFO CARD ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <User size={15} color="#60a5fa"/>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Personal Information</span>
        </div>

        <form onSubmit={saveInfo}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <Field label="Full Name" name="fullName" value={info.fullName} onChange={setI} required />
            <Field label="Employee ID" name="employeeId" value={user?.employeeId || ''} readOnly />
            <Field label="Email" name="email" value={user?.email || ''} readOnly />
            <Field label="Role" name="role" value={user?.role || ''} readOnly />

            {/* Department — admin can edit, employee sees read-only */}
            {user?.role === 'admin'
              ? <SelectField label="Department" name="department" value={info.department}
                  onChange={setI} options={DEPARTMENTS} />
              : <Field label="Department (Admin only)" name="department" value={info.department} readOnly />
            }

            {/* Position — admin can edit, employee sees read-only */}
            {user?.role === 'admin'
              ? <SelectField label="Position / Title" name="position" value={info.position}
                  onChange={setI} options={POSITIONS} />
              : <Field label="Position / Title (Admin only)" name="position" value={info.position} readOnly />
            }
          </div>

          {user?.role !== 'admin' && (
            <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Department and Position can only be changed by an Admin.
            </p>
          )}

          {infoMsg && <MsgBanner msg={infoMsg}/>}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={infoLoading} style={{
              padding: '9px 24px', borderRadius: '10px', cursor: 'pointer',
              background: '#2563eb', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '7px',
              opacity: infoLoading ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}>
              <Save size={14}/> {infoLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* ── PASSWORD CARD ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Lock size={15} color="#60a5fa"/>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Change Password</span>
        </div>

        <form onSubmit={savePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <PwField label="Current Password" name="currentPassword" value={pw.currentPassword} onChange={setP}/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <PwField label="New Password" name="newPassword" value={pw.newPassword} onChange={setP}/>
              <PwField label="Confirm New Password" name="confirmPassword" value={pw.confirmPassword} onChange={setP}/>
            </div>
          </div>

          {pwMsg && <MsgBanner msg={pwMsg}/>}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={pwLoading} style={{
              padding: '9px 24px', borderRadius: '10px', cursor: 'pointer',
              background: '#7c3aed', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '7px',
              opacity: pwLoading ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            }}>
              <Lock size={14}/> {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

function MsgBanner({ msg }) {
  const ok = msg.type === 'success';
  return (
    <div style={{
      marginTop: '16px', padding: '10px 14px', borderRadius: '10px',
      background: ok ? 'rgba(21,128,61,0.2)' : 'rgba(127,29,29,0.3)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
      color: ok ? '#86efac' : '#fca5a5',
      fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      {ok ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
      {msg.text}
    </div>
  );
}
