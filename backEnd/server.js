const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const http       = require('http');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const connectDB  = require('./config/db');

dotenv.config();
connectDB();

// ── Scheduled jobs ──────────────────────────────────────────────────────────
const { scheduleAutoLunchCheckout } = require('./jobs/autoLunchCheckout');
scheduleAutoLunchCheckout();

const app    = express();
const server = http.createServer(app);

const CORS_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

// ── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: CORS_ORIGINS, credentials: true },
});

// Auth middleware for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.role   = decoded.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const Message = require('./models/Message');

// Track online users: userId → socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const uid = socket.userId;
  onlineUsers.set(uid, socket.id);

  // Notify others this user is online
  socket.broadcast.emit('user_online', { userId: uid });

  // Send current online list to newly connected user
  socket.emit('online_users', Array.from(onlineUsers.keys()));

  // ── Send message ──────────────────────────────────────────────────────────
  socket.on('send_message', async ({ receiverId, text }) => {
    if (!text?.trim() || !receiverId) return;

    try {
      const convId  = Message.makeConvId(uid, receiverId);
      const message = await Message.create({
        conversationId: convId,
        sender:         uid,
        receiver:       receiverId,
        text:           text.trim(),
      });

      await message.populate('sender', 'fullName avatar role');

      const payload = {
        _id:            message._id,
        conversationId: convId,
        sender:         message.sender,
        receiver:       receiverId,
        text:           message.text,
        read:           false,
        createdAt:      message.createdAt,
      };

      // Send to receiver if online
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('new_message', payload);
      }

      // Echo back to sender
      socket.emit('message_sent', payload);
    } catch (err) {
      socket.emit('message_error', { message: err.message });
    }
  });

  // ── Typing indicator ──────────────────────────────────────────────────────
  socket.on('typing', ({ receiverId, isTyping }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('typing', { senderId: uid, isTyping });
    }
  });

  // ── Mark read ─────────────────────────────────────────────────────────────
  socket.on('mark_read', async ({ senderId }) => {
    const convId = Message.makeConvId(uid, senderId);
    await Message.updateMany(
      { conversationId: convId, receiver: uid, read: false },
      { read: true }
    );
    const senderSocket = onlineUsers.get(senderId);
    if (senderSocket) {
      io.to(senderSocket).emit('messages_read', { by: uid });
    }
  });

  // ── Chat request approved/rejected — notify requester ────────────────────
  socket.on('chat_request_response', ({ requesterId, status, requestId }) => {
    const requesterSocket = onlineUsers.get(requesterId);
    if (requesterSocket) {
      io.to(requesterSocket).emit('chat_request_update', { status, requestId });
    }
  });

  // ── New chat request — notify admin ──────────────────────────────────────
  socket.on('new_chat_request', ({ adminId, requester }) => {
    const adminSocket = onlineUsers.get(adminId);
    if (adminSocket) {
      io.to(adminSocket).emit('incoming_chat_request', { requester });
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(uid);
    socket.broadcast.emit('user_offline', { userId: uid });
  });
});

// ── Express middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/users',      require('./routes/userRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/reports',    require('./routes/reportsRoutes'));
app.use('/api/shift',      require('./routes/shiftRoutes'));
app.use('/api/chat',       require('./routes/chatRoutes'));
app.use('/api/leave',      require('./routes/leaveRoutes'));
app.use('/api/holidays',       require('./routes/holidayRoutes'));
app.use('/api/absence-alerts', require('./routes/absenceAlertRoutes'));

app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'API running', ts: new Date().toISOString() })
);

app.use((req, res) =>
  res.status(404).json({ success: false, message: `${req.method} ${req.originalUrl} not found` })
);

app.use((err, _req, res, _next) => {
  console.error('Unhandled:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server on http://localhost:${PORT} [${process.env.NODE_ENV}]`)
);
