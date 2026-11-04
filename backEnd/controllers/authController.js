const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { findBestMatch } = require('../utils/faceMatcher');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const safeUser = (u) => ({
  _id:               u._id,
  fullName:          u.fullName,
  employeeId:        u.employeeId,
  email:             u.email,
  department:        u.department,
  position:          u.position,
  role:              u.role,
  isActive:          u.isActive,
  avatar:            u.avatar || '',
  hasFace:           u.faceDescriptor?.length === 128,
  createdAt:         u.createdAt,
});

/**
 * Check if a face descriptor is already registered to another user.
 * Excludes `excludeId` so edit-mode doesn't flag the same user's own face.
 * Returns { duplicate: true, owner } or { duplicate: false }
 */
const checkFaceDuplicate = async (faceDescriptor, excludeId = null) => {
  const query = { 'faceDescriptor.0': { $exists: true } };
  if (excludeId) query._id = { $ne: excludeId };

  const allUsers = await User.find(query)
    .select('fullName employeeId faceDescriptor');

  const { matched, employee } = findBestMatch(faceDescriptor, allUsers, 0.5);
  if (matched) return { duplicate: true, owner: employee };
  return { duplicate: false };
};

// POST /api/auth/register  (admin only)
const register = async (req, res) => {
  try {
    const {
      fullName, employeeId, email, password, confirmPassword,
      department, position, role, faceDescriptor,
    } = req.body;

    if (!fullName || !employeeId || !email || !password || !department || !position) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (faceDescriptor !== undefined && (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128)) {
      return res.status(400).json({ success: false, message: 'Face descriptor must be 128 numbers.' });
    }

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { employeeId: employeeId.toUpperCase() }],
    });
    if (exists) {
      const field = exists.email === email.toLowerCase() ? 'Email' : 'Employee ID';
      return res.status(409).json({ success: false, message: `${field} already registered.` });
    }

    // ── Face duplicate check ──────────────────────────────
    if (faceDescriptor && faceDescriptor.length === 128) {
      const { duplicate, owner } = await checkFaceDuplicate(faceDescriptor);
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `This face is already registered to "${owner.fullName}" (ID: ${owner.employeeId}). Each employee must use their own unique face.`,
        });
      }
    }

    const user = await User.create({
      fullName: fullName.trim(),
      employeeId: employeeId.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      department: department.trim(),
      position: position.trim(),
      role: role === 'admin' ? 'admin' : 'employee',
      faceDescriptor: faceDescriptor || [],
    });

    return res.status(201).json({
      success: true,
      message: `Employee "${user.fullName}" registered.`,
      data: { user: safeUser(user), token: signToken(user._id, user.role) },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account deactivated.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user: safeUser(user), token: signToken(user._id, user.role) },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: { user: safeUser(user) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/signup  — public self-registration (role always 'employee')
const signup = async (req, res) => {
  try {
    const {
      fullName, employeeId, email, password, confirmPassword,
      department, position, faceDescriptor,
    } = req.body;

    if (!fullName || !employeeId || !email || !password || !department || !position) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (faceDescriptor !== undefined && (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128)) {
      return res.status(400).json({ success: false, message: 'Face descriptor must be 128 numbers.' });
    }

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { employeeId: employeeId.toUpperCase() }],
    });
    if (exists) {
      const field = exists.email === email.toLowerCase() ? 'Email' : 'Employee ID';
      return res.status(409).json({ success: false, message: `${field} already registered.` });
    }

    // ── Face duplicate check ──────────────────────────────
    if (faceDescriptor && faceDescriptor.length === 128) {
      const { duplicate, owner } = await checkFaceDuplicate(faceDescriptor);
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `This face is already registered to "${owner.fullName}" (ID: ${owner.employeeId}). Each person can only register their own face.`,
        });
      }
    }

    const user = await User.create({
      fullName:       fullName.trim(),
      employeeId:     employeeId.toUpperCase().trim(),
      email:          email.toLowerCase().trim(),
      password,
      department:     department.trim(),
      position:       position.trim(),
      role:           'employee',          // public signup always employee
      faceDescriptor: faceDescriptor || [],
    });

    return res.status(201).json({
      success: true,
      message: `Account created for "${user.fullName}". You can now sign in.`,
      data: { user: safeUser(user), token: signToken(user._id, user.role) },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
};

// POST /api/auth/setup-admin  — first-time admin creation (blocked if any admin exists)
const setupAdmin = async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Setup already complete. An admin account already exists.',
      });
    }

    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Auto-generate a unique admin employeeId that never conflicts with employees
    const adminEmployeeId = `ADMIN-${Date.now()}`;

    const user = await User.create({
      fullName:   fullName.trim(),
      employeeId: adminEmployeeId,
      email:      email.toLowerCase().trim(),
      password,
      department: 'Administration',
      position:   'System Administrator',
      role:       'admin',
    });

    return res.status(201).json({
      success: true,
      message: `Admin account created for "${user.fullName}". You can now sign in.`,
      data: { user: safeUser(user) },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }
    console.error('SetupAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Server error during admin setup.' });
  }
};

module.exports = { register, login, getMe, signup, setupAdmin };
