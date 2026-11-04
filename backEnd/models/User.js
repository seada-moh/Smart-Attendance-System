const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String, required: [true, 'Full name required'], trim: true,
  },
  employeeId: {
    type: String, required: [true, 'Employee ID required'],
    unique: true, trim: true, uppercase: true,
  },
  email: {
    type: String, required: [true, 'Email required'],
    unique: true, trim: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
  },
  password: {
    type: String, required: [true, 'Password required'],
    minlength: [6, 'Minimum 6 characters'], select: false,
  },
  department: { type: String, required: [true, 'Department required'], trim: true },
  position:   { type: String, required: [true, 'Position required'],   trim: true },
  role: {
    type: String, enum: ['admin', 'employee'], default: 'employee',
  },
  faceDescriptor: {
    type: [Number], default: [],
    validate: {
      validator: (a) => a.length === 0 || a.length === 128,
      message: 'Face descriptor must be 128 numbers',
    },
  },
  isActive: { type: Boolean, default: true },
  avatar:   { type: String,  default: '' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.password;
  return o;
};

module.exports = mongoose.model('User', userSchema);
