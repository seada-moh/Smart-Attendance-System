const LeaveRequest = require('../models/LeaveRequest');
const Attendance   = require('../models/Attendance');
const User         = require('../models/User');

// ── Helper: generate working days between two dates ────────────────────────
const workingDaysBetween = (start, end) => {
  const days = [];
  const cur  = new Date(start);
  const fin  = new Date(end);
  while (cur <= fin) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

// ── Mark attendance days as Permission ──────────────────────────────────────
const markAttendancePermission = async (leave) => {
  const days = workingDaysBetween(leave.startDate, leave.endDate);
  for (const date of days) {
    // Upsert: create if missing, update if Absent
    const existing = await Attendance.findOne({ userId: leave.userId, date });
    if (!existing) {
      await Attendance.create({
        userId:     leave.userId,
        employeeId: leave.employeeId,
        fullName:   leave.fullName,
        department: leave.department,
        date,
        checkInTime:  new Date(`${date}T08:00:00`),
        status:       'Permission',
        lateMinutes:  0,
      });
    } else if (existing.status === 'Absent') {
      existing.status = 'Permission';
      await existing.save();
    }
  }
};

// ── Undo Permission marks when rejected ─────────────────────────────────────
const unmarkAttendancePermission = async (leave) => {
  const days = workingDaysBetween(leave.startDate, leave.endDate);
  await Attendance.deleteMany({
    userId: leave.userId,
    date:   { $in: days },
    status: 'Permission',
  });
};

// POST /api/leave  — employee submits request
const createLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason, leaveType } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'startDate, endDate and reason are required.' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ success: false, message: 'End date must be after start date.' });
    }

    // Check for overlapping pending/approved leave
    const overlap = await LeaveRequest.findOne({
      userId: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: endDate },   endDate: { $gte: startDate } },
      ],
    });
    if (overlap) {
      return res.status(409).json({
        success: false,
        message: `You already have a ${overlap.status} leave request that overlaps these dates.`,
      });
    }

    const leave = await LeaveRequest.create({
      userId:     req.user._id,
      employeeId: req.user.employeeId,
      fullName:   req.user.fullName,
      department: req.user.department,
      startDate, endDate, reason,
      leaveType:  leaveType || 'Personal',
    });

    return res.status(201).json({ success: true, message: 'Leave request submitted.', data: { leave } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/my  — employee: own requests
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: { leaves } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave  — admin: all requests
const getAllLeaves = async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const q = {};
    if (status) q.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leaves, total] = await Promise.all([
      LeaveRequest.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      LeaveRequest.countDocuments(q),
    ]);
    return res.json({
      success: true,
      data: { leaves, pagination: { total, page: +page, totalPages: Math.ceil(total / +limit) } },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/pending-count  — admin badge
const getPendingCount = async (req, res) => {
  try {
    const count = await LeaveRequest.countDocuments({ status: 'pending' });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/leave/:id  — admin: approve or reject
const reviewLeave = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });
    if (leave.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'Request already reviewed.' });
    }

    leave.status     = status;
    leave.adminNote  = adminNote || '';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    if (status === 'approved') {
      await markAttendancePermission(leave);
    } else {
      await unmarkAttendancePermission(leave);
    }

    return res.json({ success: true, message: `Leave ${status}.`, data: { leave } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/leave/:id  — employee cancels pending request
const cancelLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });
    if (leave.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'Only pending requests can be cancelled.' });
    }
    await LeaveRequest.deleteOne({ _id: leave._id });
    return res.json({ success: true, message: 'Leave request cancelled.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createLeave, getMyLeaves, getAllLeaves, getPendingCount, reviewLeave, cancelLeave };
