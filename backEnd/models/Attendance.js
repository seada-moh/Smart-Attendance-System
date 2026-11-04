const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, required: true, uppercase: true },
  fullName:   { type: String, required: true },
  department: { type: String, required: true },
  position:   { type: String, default: '' },
  // YYYY-MM-DD string — used for daily uniqueness check
  date:       { type: String, required: true },

  // ── Morning session ─────────────────────────────────────────────────────────
  checkInTime:  { type: Date, required: true, default: Date.now },
  checkOutTime: { type: Date, default: null },   // morning check-out (before lunch)

  // ── After-lunch session ──────────────────────────────────────────────────────
  afterLunchCheckIn:  { type: Date, default: null },  // check-in after lunch break
  afterLunchCheckOut: { type: Date, default: null },  // final end-of-day check-out

  status: {
    type: String, enum: ['Present', 'Late', 'Absent', 'Permission'], default: 'Present',
  },
  matchConfidence: { type: Number, default: null },
  lateMinutes:     { type: Number, default: 0 },   // 0 = on-time, >0 = minutes late
}, { timestamps: true });

// One record per employee per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ department: 1 });
attendanceSchema.index({ employeeId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
