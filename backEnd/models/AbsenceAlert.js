const mongoose = require('mongoose');

const absenceAlertSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId:  { type: String, required: true },
  fullName:    { type: String, required: true },
  department:  { type: String, required: true },
  level:       { type: String, enum: ['warning', 'critical'], required: true },
  streak:      { type: Number, default: 0 },
  totalAbsent: { type: Number, default: 0 },
  message:     { type: String, default: '' },

  // Employee acknowledgement
  acknowledged:   { type: Boolean, default: false },
  acknowledgedAt: { type: Date, default: null },
  employeeNote:   { type: String, default: '' },

  // Admin response
  adminResponded:   { type: Boolean, default: false },
  adminResponse:    { type: String, enum: ['noted', 'warning_issued', 'excused', ''], default: '' },
  adminNote:        { type: String, default: '' },
  adminRespondedAt: { type: Date, default: null },
  respondedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Status
  status: { type: String, enum: ['open', 'acknowledged', 'closed'], default: 'open' },
}, { timestamps: true });

absenceAlertSchema.index({ userId: 1, createdAt: -1 });
absenceAlertSchema.index({ status: 1 });

module.exports = mongoose.model('AbsenceAlert', absenceAlertSchema);
