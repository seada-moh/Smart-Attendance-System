const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, required: true },
  fullName:   { type: String, required: true },
  department: { type: String, required: true },

  startDate:  { type: String, required: true },  // YYYY-MM-DD
  endDate:    { type: String, required: true },   // YYYY-MM-DD
  reason:     { type: String, required: true, maxlength: 500 },
  leaveType:  {
    type: String,
    enum: ['Annual Leave', 'Sick Leave', 'Emergency', 'Personal', 'Other'],
    default: 'Personal',
  },

  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:    { type: String, default: '' },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:   { type: Date, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ userId: 1, status: 1 });
leaveRequestSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
