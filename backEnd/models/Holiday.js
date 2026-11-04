const mongoose = require('mongoose');

// Custom holidays added by admin (on top of built-in Ethiopian holidays)
const holidaySchema = new mongoose.Schema({
  date:        { type: String, required: true, unique: true }, // YYYY-MM-DD
  name:        { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 300 },
  type:        { type: String, enum: ['national', 'religious', 'company', 'other'], default: 'national' },
  recurring:   { type: Boolean, default: false }, // repeat every year on same month-day
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
