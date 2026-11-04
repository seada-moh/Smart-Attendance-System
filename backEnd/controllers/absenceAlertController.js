const AbsenceAlert = require('../models/AbsenceAlert');

// POST /api/absence-alerts/acknowledge  — employee acknowledges their alert
const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId, employeeNote } = req.body;

    let alert;
    if (alertId) {
      alert = await AbsenceAlert.findOne({ _id: alertId, userId: req.user._id });
    } else {
      // Find most recent open alert for this employee
      alert = await AbsenceAlert.findOne({ userId: req.user._id, status: 'open' })
        .sort({ createdAt: -1 });
    }

    if (!alert) {
      // Create a new acknowledgement record if none exists
      const { level, streak, totalAbsent, message } = req.body;
      alert = await AbsenceAlert.create({
        userId:     req.user._id,
        employeeId: req.user.employeeId,
        fullName:   req.user.fullName,
        department: req.user.department,
        level:      level || 'warning',
        streak:     streak || 0,
        totalAbsent: totalAbsent || 0,
        message:    message || '',
      });
    }

    alert.acknowledged   = true;
    alert.acknowledgedAt = new Date();
    alert.employeeNote   = employeeNote || '';
    alert.status         = 'acknowledged';
    await alert.save();

    return res.json({ success: true, message: 'Alert acknowledged.', data: { alert } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/absence-alerts/my  — employee: own alerts
const getMyAlerts = async (req, res) => {
  try {
    const alerts = await AbsenceAlert.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(10);
    return res.json({ success: true, data: { alerts } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/absence-alerts  — admin: all acknowledged alerts needing response
const getAllAlerts = async (req, res) => {
  try {
    const { status = 'acknowledged', page = 1, limit = 30 } = req.query;
    const q = {};
    if (status !== 'all') q.status = status;
    const skip = (parseInt(page)-1) * parseInt(limit);
    const [alerts, total] = await Promise.all([
      AbsenceAlert.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AbsenceAlert.countDocuments(q),
    ]);
    return res.json({ success: true, data: { alerts,
      pagination: { total, page: +page, totalPages: Math.ceil(total/+limit) } } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/absence-alerts/pending-count  — admin badge
const getPendingCount = async (req, res) => {
  try {
    const count = await AbsenceAlert.countDocuments({ status: 'acknowledged', adminResponded: false });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/absence-alerts/:id/respond  — admin responds
const respondToAlert = async (req, res) => {
  try {
    const { adminResponse, adminNote } = req.body;
    if (!['noted','warning_issued','excused'].includes(adminResponse))
      return res.status(400).json({ success: false, message: 'Invalid response.' });

    const alert = await AbsenceAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });

    alert.adminResponded   = true;
    alert.adminResponse    = adminResponse;
    alert.adminNote        = adminNote || '';
    alert.adminRespondedAt = new Date();
    alert.respondedBy      = req.user._id;
    alert.status           = 'closed';
    await alert.save();

    return res.json({ success: true, message: 'Response saved.', data: { alert } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { acknowledgeAlert, getMyAlerts, getAllAlerts, getPendingCount, respondToAlert };
