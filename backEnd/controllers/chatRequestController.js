const ChatRequest = require('../models/ChatRequest');
const User        = require('../models/User');

// POST /api/chat/request  — employee sends request to admin
const sendRequest = async (req, res) => {
  try {
    const { toId, message } = req.body;
    if (!toId) return res.status(400).json({ success: false, message: 'Target user required.' });

    // Check target is admin
    const target = await User.findById(toId).select('role fullName');
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (target.role !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Requests can only be sent to admin.' });
    }

    // Check for existing pending
    const existing = await ChatRequest.findOne({
      from: req.user._id, to: toId, status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A request is already pending.' });
    }

    // Check if already approved (can already chat)
    const approved = await ChatRequest.findOne({
      from: req.user._id, to: toId, status: 'approved',
    });
    if (approved) {
      return res.status(409).json({ success: false, message: 'Chat already approved.', alreadyApproved: true });
    }

    const request = await ChatRequest.create({
      from:    req.user._id,
      to:      toId,
      message: message || 'I would like to chat with you.',
    });

    await request.populate('from', 'fullName employeeId department avatar');

    return res.status(201).json({ success: true, message: 'Request sent.', data: { request } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/requests  — admin sees pending requests
const getRequests = async (req, res) => {
  try {
    const requests = await ChatRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'fullName employeeId department position avatar')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: { requests } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/chat/request/:id  — admin approves or rejects
const respondRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const request = await ChatRequest.findOne({ _id: req.params.id, to: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    request.status = status;
    await request.save();
    await request.populate('from', 'fullName employeeId');

    return res.json({ success: true, message: `Request ${status}.`, data: { request } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/request-status/:adminId  — employee checks if approved
const checkStatus = async (req, res) => {
  try {
    const request = await ChatRequest.findOne({
      from: req.user._id,
      to:   req.params.adminId,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        status:  request?.status || 'none',
        request: request || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/chat/pending-requests-count  — admin badge count
const getPendingCount = async (req, res) => {
  try {
    const count = await ChatRequest.countDocuments({ to: req.user._id, status: 'pending' });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendRequest, getRequests, respondRequest, checkStatus, getPendingCount };
