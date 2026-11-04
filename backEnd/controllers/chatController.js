const Message = require('../models/Message');
const User    = require('../models/User');

// GET /api/chat/contacts
// Admin → all users; Employee → all other employees + admins
const getContacts = async (req, res) => {
  try {
    // Everyone can see everyone except themselves
    const users = await User.find({ _id: { $ne: req.user._id }, isActive: true })
      .select('fullName employeeId department position role avatar')
      .sort({ role: -1, fullName: 1 }); // admins first, then employees

    // Attach unread count per contact
    const withUnread = await Promise.all(users.map(async (u) => {
      const convId = Message.makeConvId(req.user._id, u._id);
      const unread = await Message.countDocuments({
        conversationId: convId,
        receiver:       req.user._id,
        read:           false,
      });
      const last = await Message.findOne({ conversationId: convId })
        .sort({ createdAt: -1 }).select('text createdAt sender');

      return {
        _id:        u._id,
        fullName:   u.fullName,
        employeeId: u.employeeId,
        department: u.department,
        position:   u.position,
        role:       u.role,
        avatar:     u.avatar || '',
        unread,
        lastMessage: last ? {
          text: last.text, createdAt: last.createdAt,
          isMine: last.sender.toString() === req.user._id.toString(),
        } : null,
      };
    }));

    // Sort: contacts with recent messages first
    withUnread.sort((a, b) => {
      const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
      const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
      return tb - ta;
    });

    return res.json({ success: true, data: { contacts: withUnread } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/messages/:contactId?page=1
const getMessages = async (req, res) => {
  try {
    const { contactId } = req.params;
    const page  = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip  = (page - 1) * limit;

    const convId = Message.makeConvId(req.user._id, contactId);

    const [messages, total] = await Promise.all([
      Message.find({ conversationId: convId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'fullName avatar role'),
      Message.countDocuments({ conversationId: convId }),
    ]);

    // Mark as read
    await Message.updateMany(
      { conversationId: convId, receiver: req.user._id, read: false },
      { read: true }
    );

    return res.json({
      success: true,
      data: {
        messages: messages.reverse(), // oldest first
        pagination: { total, page, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read:     false,
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getContacts, getMessages, getUnreadCount };
