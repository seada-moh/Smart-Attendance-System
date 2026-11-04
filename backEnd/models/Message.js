const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation is identified by sorted pair of two userIds
  conversationId: { type: String, required: true, index: true },

  sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  text:     { type: String, required: true, trim: true, maxlength: 2000 },
  read:     { type: Boolean, default: false },
}, { timestamps: true });

// conversationId helper: always sorted so A↔B === B↔A
messageSchema.statics.makeConvId = (id1, id2) =>
  [id1.toString(), id2.toString()].sort().join('_');

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
