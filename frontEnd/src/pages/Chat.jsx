/**
 * Chat — Telegram-like real-time messaging with permission request system
 * Admin ↔ Employee via Socket.IO
 * Employee must request permission before chatting with admin
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Send, Search, MessageCircle, CheckCheck, Check, Loader2,
  ShieldCheck, X, Clock, CheckCircle2, XCircle, Bell,
} from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString())     return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const CSS = `
  .chat-root {
    display: flex; height: calc(100vh - 130px); min-height: 480px;
    background: #17212b; border-radius: 10px; overflow: hidden;
    font-family: -apple-system,'Segoe UI',Roboto,system-ui,sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .chat-sidebar {
    width: 300px; flex-shrink: 0; border-right: 1px solid #0d1117;
    display: flex; flex-direction: column; background: #0e1621;
  }
  .chat-sidebar-header {
    padding: 12px 14px 10px; background: #17212b;
    border-bottom: 1px solid #0d1117; display: flex; flex-direction: column; gap: 9px;
  }
  .chat-sidebar-title { font-size: 1rem; font-weight: 700; color: #e8eaed; }
  .chat-search { position: relative; }
  .chat-search input {
    width: 100%; padding: 8px 12px 8px 36px; background: #242f3d;
    border: none; border-radius: 20px; color: #c8d0d9; font-size: 0.82rem;
    outline: none; box-sizing: border-box; transition: background 0.15s;
  }
  .chat-search input::placeholder { color: #6c7883; }
  .chat-search input:focus { background: #2b3a4e; }
  .chat-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #6c7883; pointer-events: none; }
  .chat-contacts { flex: 1; overflow-y: auto; }
  .chat-contacts::-webkit-scrollbar { width: 3px; }
  .chat-contacts::-webkit-scrollbar-thumb { background: #1c2b3a; border-radius: 3px; }
  .chat-contact {
    display: flex; align-items: center; gap: 11px; padding: 10px 14px;
    cursor: pointer; transition: background 0.1s;
    border-bottom: 1px solid rgba(255,255,255,0.025);
  }
  .chat-contact:hover  { background: #1c2b3a; }
  .chat-contact.active { background: #2b5278; }
  .chat-avatar {
    width: 46px; height: 46px; border-radius: 50%;
    background: linear-gradient(135deg,#2b5278 0%,#4a86bf 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; font-weight: 700; color: #fff;
    flex-shrink: 0; position: relative; overflow: hidden;
  }
  .chat-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .chat-online-dot {
    position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px;
    border-radius: 50%; background: #4fce5d; border: 2px solid #0e1621;
  }
  .chat-contact.active .chat-online-dot { border-color: #2b5278; }
  .chat-contact-info { flex: 1; min-width: 0; }
  .chat-contact-name { font-size: 0.875rem; font-weight: 600; color: #e8eaed; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chat-contact-preview { font-size: 0.78rem; color: #6c7883; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chat-contact.active .chat-contact-preview { color: #a8c7e8; }
  .chat-contact-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
  .chat-contact-time { font-size: 0.68rem; color: #6c7883; }
  .chat-contact.active .chat-contact-time { color: #a8c7e8; }
  .chat-unread-badge {
    min-width: 20px; height: 20px; border-radius: 999px; background: #5288c1; color: #fff;
    font-size: 0.65rem; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 5px;
  }
  .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #17212b; }
  .chat-header {
    display: flex; align-items: center; gap: 12px; padding: 10px 18px;
    background: #17212b; border-bottom: 1px solid #0d1117; flex-shrink: 0; min-height: 58px;
  }
  .chat-header-name { font-size: 0.9rem; font-weight: 700; color: #e8eaed; line-height: 1.2; }
  .chat-header-status { font-size: 0.7rem; line-height: 1; }
  .chat-messages {
    flex: 1; overflow-y: auto; padding: 10px 16px 6px;
    display: flex; flex-direction: column; gap: 1px; background: #17212b;
  }
  .chat-messages::-webkit-scrollbar { width: 4px; }
  .chat-messages::-webkit-scrollbar-thumb { background: #242f3d; border-radius: 4px; }
  .chat-date-divider { display: flex; align-items: center; justify-content: center; margin: 10px 0 8px; }
  .chat-date-divider-label { background: rgba(36,47,61,0.9); color: #adb5bd; font-size: 0.72rem; font-weight: 500; padding: 4px 14px; border-radius: 10px; }
  .chat-bubble-row { display: flex; margin-bottom: 2px; }
  .chat-bubble-row.mine   { justify-content: flex-end; }
  .chat-bubble-row.theirs { justify-content: flex-start; }
  .chat-bubble { max-width: 64%; padding: 7px 12px 5px; font-size: 0.875rem; line-height: 1.45; word-break: break-word; }
  .chat-bubble.mine   { background: #2b5278; color: #e8eaed; border-radius: 12px 12px 3px 12px; }
  .chat-bubble.theirs { background: #182533; color: #c8d0d9; border-radius: 12px 12px 12px 3px; }
  .chat-bubble-footer { display: flex; align-items: center; justify-content: flex-end; gap: 3px; margin-top: 2px; }
  .chat-bubble-time { font-size: 0.65rem; }
  .chat-bubble.mine   .chat-bubble-time { color: #7ba7d0; }
  .chat-bubble.theirs .chat-bubble-time { color: #5a6a7a; }
  .chat-typing-bubble { background: #182533; border-radius: 12px 12px 12px 3px; padding: 10px 14px; display: flex; align-items: center; gap: 4px; }
  .chat-typing-dot { width: 7px; height: 7px; border-radius: 50%; background: #5a6a7a; }
  .chat-input-area { display: flex; align-items: flex-end; gap: 10px; padding: 10px 14px; background: #17212b; border-top: 1px solid #0d1117; flex-shrink: 0; }
  .chat-input-wrap { flex: 1; background: #242f3d; border-radius: 22px; padding: 9px 16px; transition: background 0.15s; }
  .chat-input-wrap:focus-within { background: #2b3a4e; }
  .chat-textarea { width: 100%; background: none; border: none; outline: none; color: #c8d0d9; font-size: 0.875rem; font-family: inherit; resize: none; max-height: 120px; line-height: 1.45; }
  .chat-textarea::placeholder { color: #6c7883; }
  .chat-send-btn { width: 44px; height: 44px; border-radius: 50%; background: #5288c1; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; transition: background 0.15s, transform 0.12s; }
  .chat-send-btn:hover:not(:disabled) { background: #6ba3d6; transform: scale(1.06); }
  .chat-send-btn:disabled { background: #1c2b3a; opacity: 0.45; cursor: not-allowed; }
  .chat-empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .chat-empty-icon { width: 72px; height: 72px; border-radius: 50%; background: #1c2b3a; display: flex; align-items: center; justify-content: center; }

  /* Permission / Request styles */
  .chat-permission-box {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 18px; padding: 32px;
  }
  .chat-req-card {
    background: #1c2b3a; border: 1px solid #2b3a4e;
    border-radius: 16px; padding: 24px 28px; max-width: 340px; width: 100%;
    text-align: center;
  }

  /* Admin request list */
  .chat-req-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.1s;
  }
  .chat-req-item:hover { background: rgba(82,136,193,0.06); }

  /* Toast notification */
  .chat-toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: #1c2b3a; border: 1px solid #2b5278;
    border-radius: 12px; padding: 14px 18px;
    display: flex; align-items: center; gap: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    animation: toastIn 0.3s ease-out;
    max-width: 320px;
  }
  @keyframes toastIn { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }

  @keyframes tgTyping { 0%,60%,100% { transform:translateY(0); opacity:.4; } 30% { transform:translateY(-5px); opacity:1; } }
  @keyframes tgSpin { to { transform: rotate(360deg); } }
`;

export default function Chat() {
  const { user, token } = useAuth();

  const [contacts,      setContacts]      = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState('');
  const [search,        setSearch]        = useState('');
  const [onlineUsers,   setOnlineUsers]   = useState(new Set());
  const [typingFrom,    setTypingFrom]    = useState(null);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);

  // Permission system
  const [reqStatus,     setReqStatus]     = useState('none');   // 'none'|'pending'|'approved'|'rejected'
  const [reqLoading,    setReqLoading]    = useState(false);
  const [reqMessage,    setReqMessage]    = useState('');
  const [pendingReqs,   setPendingReqs]   = useState([]);       // admin: incoming requests
  const [showReqPanel,  setShowReqPanel]  = useState(false);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [toast,         setToast]         = useState(null);     // { text, type }

  const socketRef      = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);
  const activeRef      = useRef(null);
  useEffect(() => { activeRef.current = activeContact; }, [activeContact]);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Socket.IO ── */
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('online_users', (users) => setOnlineUsers(new Set(users)));
    socket.on('user_online',  ({ userId }) => setOnlineUsers(p => new Set([...p, userId])));
    socket.on('user_offline', ({ userId }) => setOnlineUsers(p => { const s = new Set(p); s.delete(userId); return s; }));

    socket.on('new_message', (msg) => {
      if (activeRef.current?._id === msg.sender._id) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { senderId: msg.sender._id });
      }
      setContacts(prev => prev.map(c =>
        c._id === msg.sender._id
          ? { ...c, lastMessage: { text: msg.text, createdAt: msg.createdAt, isMine: false },
              unread: activeRef.current?._id === msg.sender._id ? 0 : c.unread + 1 }
          : c
      ).sort((a,b) => new Date(b.lastMessage?.createdAt||0) - new Date(a.lastMessage?.createdAt||0)));
    });

    socket.on('message_sent', (msg) => {
      setMessages(prev => [...prev, msg]);
      setContacts(prev => prev.map(c =>
        c._id === msg.receiver
          ? { ...c, lastMessage: { text: msg.text, createdAt: msg.createdAt, isMine: true } }
          : c
      ));
    });

    socket.on('typing', ({ senderId, isTyping }) => {
      if (activeRef.current?._id === senderId) setTypingFrom(isTyping ? senderId : null);
    });

    // Employee: chat request approved/rejected by admin
    socket.on('chat_request_update', ({ status }) => {
      setReqStatus(status);
      if (status === 'approved') {
        showToast('✅ Your chat request was approved! You can now send messages.', 'success');
      } else if (status === 'rejected') {
        showToast('❌ Your chat request was declined by admin.', 'error');
      }
    });

    // Admin: incoming chat request
    socket.on('incoming_chat_request', ({ requester }) => {
      showToast(`💬 ${requester?.fullName} wants to chat with you.`, 'info');
      setPendingCount(p => p + 1);
      loadPendingRequests();
    });

    return () => socket.disconnect();
  }, [token]);

  /* ── Load contacts ── */
  useEffect(() => {
    api.get('/chat/contacts').then(r => setContacts(r.data.data.contacts)).catch(() => {});
  }, []);

  /* ── Admin: load pending requests count ── */
  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.get('/chat/pending-requests-count')
      .then(r => setPendingCount(r.data.data.count))
      .catch(() => {});
  }, [user]);

  const loadPendingRequests = () => {
    if (user?.role !== 'admin') return;
    api.get('/chat/requests')
      .then(r => { setPendingReqs(r.data.data.requests); setPendingCount(r.data.data.requests.length); })
      .catch(() => {});
  };

  useEffect(() => { if (showReqPanel) loadPendingRequests(); }, [showReqPanel]);

  /* ── Check permission only when employee contacts ADMIN ── */
  useEffect(() => {
    if (!activeContact) return;
    // Employee → Admin: needs permission
    if (user?.role !== 'admin' && activeContact.role === 'admin') {
      setReqStatus('checking');
      api.get(`/chat/request-status/${activeContact._id}`)
        .then(r => setReqStatus(r.data.data.status))
        .catch(() => setReqStatus('none'));
    } else {
      // Employee → Employee OR Admin → anyone: no permission needed
      setReqStatus('approved');
    }
  }, [activeContact, user]);

  /* ── Load messages ── */
  useEffect(() => {
    if (!activeContact) return;
    if (user?.role !== 'admin' && reqStatus !== 'approved') return;
    setLoadingMsgs(true); setMessages([]); setTypingFrom(null);
    api.get(`/chat/messages/${activeContact._id}`)
      .then(r => setMessages(r.data.data.messages))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
    setContacts(prev => prev.map(c => c._id === activeContact._id ? { ...c, unread: 0 } : c));
    socketRef.current?.emit('mark_read', { senderId: activeContact._id });
  }, [activeContact, reqStatus]);

  /* ── Auto scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingFrom]);

  /* ── Send ── */
  const sendMessage = useCallback(() => {
    if (!text.trim() || !activeContact || !socketRef.current) return;
    socketRef.current.emit('send_message', { receiverId: activeContact._id, text: text.trim() });
    setText('');
  }, [text, activeContact]);

  const handleChange = (e) => {
    setText(e.target.value);
    if (!activeContact || !socketRef.current) return;
    socketRef.current.emit('typing', { receiverId: activeContact._id, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() =>
      socketRef.current?.emit('typing', { receiverId: activeContact._id, isTyping: false }), 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── Send permission request ── */
  const sendPermissionRequest = async () => {
    if (!activeContact) return;
    setReqLoading(true);
    try {
      await api.post('/chat/request', {
        toId:    activeContact._id,
        message: reqMessage || 'I would like to chat with you.',
      });
      setReqStatus('pending');
      setReqMessage('');
      // Notify admin via socket
      socketRef.current?.emit('new_chat_request', {
        adminId:   activeContact._id,
        requester: { fullName: user.fullName, employeeId: user.employeeId },
      });
      showToast('Request sent! Waiting for admin approval.', 'info');
    } catch (err) {
      if (err.response?.data?.alreadyApproved) setReqStatus('approved');
      else showToast(err.response?.data?.message || 'Failed to send request.', 'error');
    } finally {
      setReqLoading(false);
    }
  };

  /* ── Admin: respond to request ── */
  const respondToRequest = async (reqId, status, fromId) => {
    try {
      await api.patch(`/chat/request/${reqId}`, { status });
      loadPendingRequests();
      // Notify employee via socket
      socketRef.current?.emit('chat_request_response', {
        requesterId: fromId,
        status,
        requestId: reqId,
      });
      showToast(status === 'approved' ? '✅ Request approved.' : '❌ Request declined.', status === 'approved' ? 'success' : 'error');
    } catch {}
  };

  /* ── Group by date ── */
  const grouped = [];
  let lastDate = null;
  for (const msg of messages) {
    const d = fmtDate(msg.createdAt);
    if (d !== lastDate) { grouped.push({ type: 'divider', label: d }); lastDate = d; }
    grouped.push({ type: 'msg', msg });
  }

  const filtered = contacts.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  const isOnline = (id) => onlineUsers.has(id?.toString());
  const canChat  = user?.role === 'admin' || reqStatus === 'approved';

  return (
    <>
      <style>{CSS}</style>

      {/* Page header */}
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#e8eaed', margin: '0 0 2px' }}>Messages</h1>
          <p style={{ fontSize: '0.78rem', color: '#6c7883', margin: 0 }}>
            {user?.role === 'admin' ? 'Chat with your employees' : 'Chat with admin'}
          </p>
        </div>
        {/* Admin: pending requests bell */}
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowReqPanel(s => !s)}
            style={{
              position: 'relative', width: '40px', height: '40px', borderRadius: '50%',
              background: showReqPanel ? '#2b5278' : '#1c2b3a',
              border: '1px solid #2b3a4e', cursor: 'pointer', color: '#c8d0d9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <Bell size={17}/>
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-3px',
                minWidth: '18px', height: '18px', borderRadius: '999px',
                background: '#ef4444', color: '#fff', fontSize: '0.6rem',
                fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', border: '2px solid #17212b',
              }}>{pendingCount}</span>
            )}
          </button>
        )}
      </div>

      {/* Admin: pending requests panel */}
      {showReqPanel && user?.role === 'admin' && (
        <div style={{
          background: '#0e1621', border: '1px solid #1c2b3a',
          borderRadius: '12px', marginBottom: '14px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', background: '#17212b',
            borderBottom: '1px solid #1c2b3a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, color: '#e8eaed', fontSize: '0.875rem' }}>
              Pending Chat Requests {pendingCount > 0 && `(${pendingCount})`}
            </span>
            <button onClick={() => setShowReqPanel(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c7883', padding: '2px' }}>
              <X size={15}/>
            </button>
          </div>
          {pendingReqs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#3a4a5a', fontSize: '0.82rem' }}>
              No pending requests
            </div>
          ) : (
            pendingReqs.map(req => (
              <div key={req._id} className="chat-req-item">
                <div className="chat-avatar" style={{ width: '40px', height: '40px', fontSize: '0.9rem', flexShrink: 0 }}>
                  {req.from?.avatar ? <img src={req.from.avatar} alt={req.from.fullName}/> : req.from?.fullName?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#e8eaed', fontSize: '0.875rem' }}>
                    {req.from?.fullName}
                  </p>
                  <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: '#6c7883' }}>
                    {req.from?.employeeId} · {req.from?.department}
                  </p>
                  <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#a8c7e8', fontStyle: 'italic' }}>
                    "{req.message}"
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => respondToRequest(req._id, 'approved', req.from._id)}
                      style={{
                        padding: '5px 14px', borderRadius: '8px', cursor: 'pointer',
                        background: '#2b5278', border: '1px solid #5288c1',
                        color: '#a8c7e8', fontWeight: 600, fontSize: '0.78rem',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      <CheckCircle2 size={13}/> Approve
                    </button>
                    <button
                      onClick={() => respondToRequest(req._id, 'rejected', req.from._id)}
                      style={{
                        padding: '5px 14px', borderRadius: '8px', cursor: 'pointer',
                        background: '#1c2b3a', border: '1px solid #3a4a5a',
                        color: '#6c7883', fontWeight: 600, fontSize: '0.78rem',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      <XCircle size={13}/> Decline
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="chat-root">
        {/* ══ SIDEBAR ══ */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span className="chat-sidebar-title">
              Contacts
            </span>
            <div className="chat-search">
              <Search size={13} className="chat-search-icon"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"/>
            </div>
          </div>
          <div className="chat-contacts">
            {filtered.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#3a4a5a', fontSize: '0.8rem' }}>No contacts</div>
            )}
            {filtered.map(c => (
              <div key={c._id}
                className={`chat-contact${activeContact?._id === c._id ? ' active' : ''}`}
                onClick={() => setActiveContact(c)}
              >
                <div className="chat-avatar">
                  {c.avatar ? <img src={c.avatar} alt={c.fullName}/> : c.fullName.charAt(0).toUpperCase()}
                  {isOnline(c._id) && <span className="chat-online-dot"/>}
                </div>
                <div className="chat-contact-info">
                  <div className="chat-contact-name">{c.fullName}</div>
                  <div className="chat-contact-preview">
                    {c.lastMessage ? `${c.lastMessage.isMine ? 'You: ' : ''}${c.lastMessage.text}` : c.department || c.role}
                  </div>
                </div>
                <div className="chat-contact-meta">
                  {c.lastMessage && <span className="chat-contact-time">{fmtTime(c.lastMessage.createdAt)}</span>}
                  {c.unread > 0 && <span className="chat-unread-badge">{c.unread > 99 ? '99+' : c.unread}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ MAIN ══ */}
        <div className="chat-main">
          {!activeContact ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon"><MessageCircle size={32} color="#5288c1"/></div>
              <p style={{ color: '#4a5a6a', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>Select a conversation</p>
              <p style={{ color: '#3a4a5a', fontSize: '0.78rem', margin: 0 }}>Choose a contact to start messaging</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="chat-header">
                <div className="chat-avatar" style={{ width: '38px', height: '38px', fontSize: '0.85rem' }}>
                  {activeContact.avatar ? <img src={activeContact.avatar} alt={activeContact.fullName}/> : activeContact.fullName.charAt(0).toUpperCase()}
                  {isOnline(activeContact._id) && <span className="chat-online-dot"/>}
                </div>
                <div>
                  <div className="chat-header-name">{activeContact.fullName}</div>
                  <div className="chat-header-status" style={{ color: isOnline(activeContact._id) ? '#4fce5d' : '#6c7883' }}>
                    {isOnline(activeContact._id) ? 'online' : 'offline'}
                    {activeContact.department && ` · ${activeContact.department}`}
                  </div>
                </div>
              </div>

              {/* ── Permission gate (employee only) ── */}
              {user?.role !== 'admin' && !canChat ? (
                <div className="chat-permission-box">
                  <div className="chat-req-card">
                    {reqStatus === 'checking' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Loader2 size={28} color="#5288c1" style={{ animation: 'tgSpin 1s linear infinite' }}/>
                        <p style={{ color: '#6c7883', fontSize: '0.85rem', margin: 0 }}>Checking permission…</p>
                      </div>
                    ) : reqStatus === 'pending' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(82,136,193,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={26} color="#5288c1"/>
                        </div>
                        <p style={{ color: '#e8eaed', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Request Sent</p>
                        <p style={{ color: '#6c7883', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                          Your request is pending admin approval. Please wait.
                        </p>
                      </div>
                    ) : reqStatus === 'rejected' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <XCircle size={26} color="#f87171"/>
                        </div>
                        <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Request Declined</p>
                        <p style={{ color: '#6c7883', fontSize: '0.82rem', margin: 0 }}>
                          Your request was declined. You may send a new request.
                        </p>
                        <button
                          onClick={() => { setReqStatus('none'); }}
                          style={{ padding: '8px 20px', borderRadius: '20px', background: '#2b5278', border: 'none', color: '#a8c7e8', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                        >
                          Send New Request
                        </button>
                      </div>
                    ) : (
                      /* none — show request form */
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(82,136,193,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShieldCheck size={26} color="#5288c1"/>
                        </div>
                        <p style={{ color: '#e8eaed', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Permission Required</p>
                        <p style={{ color: '#6c7883', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                          You need admin approval to start a conversation with <strong style={{ color: '#a8c7e8' }}>{activeContact.fullName}</strong>.
                        </p>
                        <textarea
                          value={reqMessage}
                          onChange={e => setReqMessage(e.target.value)}
                          placeholder="Optional message to admin…"
                          rows={3}
                          style={{
                            width: '100%', background: '#242f3d', border: '1px solid #2b3a4e',
                            borderRadius: '10px', padding: '10px 12px', color: '#c8d0d9',
                            fontSize: '0.82rem', outline: 'none', resize: 'none',
                            fontFamily: 'inherit', boxSizing: 'border-box',
                          }}
                        />
                        <button
                          onClick={sendPermissionRequest}
                          disabled={reqLoading}
                          style={{
                            width: '100%', padding: '10px', borderRadius: '20px',
                            background: reqLoading ? '#1c2b3a' : '#5288c1',
                            border: 'none', color: '#fff', cursor: reqLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: '0.875rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                            transition: 'background 0.15s',
                          }}
                        >
                          {reqLoading
                            ? <><Loader2 size={15} style={{ animation: 'tgSpin 1s linear infinite' }}/> Sending…</>
                            : <><ShieldCheck size={15}/> Request Permission</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Chat messages ── */
                <>
                  <div className="chat-messages">
                    {loadingMsgs && (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                        <Loader2 size={20} color="#5288c1" style={{ animation: 'tgSpin 1s linear infinite' }}/>
                      </div>
                    )}
                    {!loadingMsgs && messages.length === 0 && (
                      <div className="chat-empty-state" style={{ gap: '8px' }}>
                        <p style={{ color: '#3a4a5a', fontSize: '0.82rem', margin: 0 }}>No messages yet. Say hello! 👋</p>
                      </div>
                    )}
                    {grouped.map((item, idx) =>
                      item.type === 'divider' ? (
                        <div key={`d${idx}`} className="chat-date-divider">
                          <span className="chat-date-divider-label">{item.label}</span>
                        </div>
                      ) : (
                        <Bubble
                          key={item.msg._id || idx}
                          msg={item.msg}
                          isMine={item.msg.sender?._id === user._id || item.msg.sender === user._id}
                        />
                      )
                    )}
                    {typingFrom && (
                      <div className="chat-bubble-row theirs">
                        <div className="chat-typing-bubble">
                          {[0,1,2].map(i => (
                            <span key={i} className="chat-typing-dot" style={{ animation: `tgTyping 1.2s ${i*0.2}s ease-in-out infinite` }}/>
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef}/>
                  </div>
                  <div className="chat-input-area">
                    <div className="chat-input-wrap">
                      <textarea
                        className="chat-textarea"
                        value={text}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Message…"
                        rows={1}
                      />
                    </div>
                    <button className="chat-send-btn" onClick={sendMessage} disabled={!text.trim()}>
                      <Send size={17}/>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="chat-toast">
          <span style={{ fontSize: '0.875rem', color: toast.type === 'success' ? '#4fce5d' : toast.type === 'error' ? '#f87171' : '#a8c7e8', flex: 1 }}>
            {toast.text}
          </span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c7883', padding: '2px' }}>
            <X size={14}/>
          </button>
        </div>
      )}
    </>
  );
}

function Bubble({ msg, isMine }) {
  return (
    <div className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
      <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
        {msg.text}
        <div className="chat-bubble-footer">
          <span className="chat-bubble-time">{fmtTime(msg.createdAt)}</span>
          {isMine && (
            msg.read
              ? <CheckCheck size={13} style={{ color: '#7ba7d0' }}/>
              : <Check      size={13} style={{ color: '#7ba7d0', opacity: 0.5 }}/>
          )}
        </div>
      </div>
    </div>
  );
}
