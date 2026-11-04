const mongoose = require('mongoose');

const chatRequestSchema = new mongoose.Schema({
  from:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  message:  { type: String, default: 'I would like to chat with you.', maxlength: 200 },
}, { timestamps: true });

// One pending request at a time per pair
chatRequestSchema.index({ from: 1, to: 1, status: 1 });

module.exports = mongoose.model('ChatRequest', chatRequestSchema);
