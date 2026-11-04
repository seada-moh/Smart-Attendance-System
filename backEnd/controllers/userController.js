const User       = require('../models/User');
const Attendance = require('../models/Attendance');

/* ── Generate next unique Employee ID ── */
const generateEmployeeId = async () => {
  // Find the highest existing EMP-XXXX number
  const last = await User.findOne(
    { employeeId: /^EMP-\d+$/ },
    { employeeId: 1 },
  ).sort({ employeeId: -1 });

  let next = 1;
  if (last) {
    const num = parseInt(last.employeeId.replace('EMP-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `EMP-${String(next).padStart(4, '0')}`; // EMP-0001, EMP-0002 …
};

// GET /api/users/generate-id  — returns next unique employee ID
const getNextEmployeeId = async (req, res) => {
  try {
    const id = await generateEmployeeId();
    return res.json({ success: true, data: { employeeId: id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const { search, department, role, isActive, page = 1, limit = 50 } = req.query;
    const q = {};
    if (search) {
      q.$or = [
        { fullName:   { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
      ];
    }
    if (department) q.department = { $regex: department, $options: 'i' };
    if (role)       q.role = role;
    if (isActive !== undefined) q.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(q).select('-faceDescriptor').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(q),
    ]);
    return res.json({
      success: true,
      data: { users, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-faceDescriptor');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (req.user.role === 'employee' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    return res.json({ success: true, data: { user } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { fullName, email, department, position, role, isActive, password } = req.body;
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (fullName)   user.fullName   = fullName.trim();
    if (email)      user.email      = email.toLowerCase().trim();
    if (department) user.department = department.trim();
    if (position)   user.position   = position.trim();
    if (role && ['admin', 'employee'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (password) {
      if (password.length < 6) return res.status(400).json({ success: false, message: 'Password min 6 chars.' });
      user.password = password;
    }
    await user.save();
    return res.json({ success: true, message: 'User updated.', data: { user } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email in use.' });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }
    await Attendance.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: `"${user.fullName}" deleted.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/users/:id/face
const updateFace = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ success: false, message: 'Need 128-element array.' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id, { faceDescriptor }, { new: true, runValidators: true }
    ).select('-faceDescriptor');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, message: 'Face registered.', data: { user } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/departments
const getDepartments = async (req, res) => {
  try {
    const depts = await User.distinct('department');
    return res.json({ success: true, data: { departments: depts.sort() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, updateFace, getDepartments, getNextEmployeeId };

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/profile  — employee self-service (own account only)
// Allows: fullName, department, position, avatar (base64), password change
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Employees can only edit their own profile
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { fullName, department, position, avatar, currentPassword, newPassword } = req.body;

    const user = await User.findById(id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Basic info
    if (fullName) user.fullName = fullName.trim();

    // Department & Position — admin only
    if (req.user.role === 'admin') {
      if (department) user.department = department.trim();
      if (position)   user.position   = position.trim();
    }

    // Avatar — accept base64 data URL (max ~2MB)
    if (avatar !== undefined) {
      if (avatar && avatar.length > 2 * 1024 * 1024 * 1.37) { // base64 overhead
        return res.status(400).json({ success: false, message: 'Image too large. Max 2 MB.' });
      }
      user.avatar = avatar || '';
    }

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password required.' });
      }
      const ok = await user.comparePassword(currentPassword);
      if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      user.password = newPassword;
    }

    await user.save();

    const safe = {
      _id: user._id, fullName: user.fullName, employeeId: user.employeeId,
      email: user.email, department: user.department, position: user.position,
      role: user.role, isActive: user.isActive, avatar: user.avatar,
      hasFace: user.faceDescriptor?.length === 128,
    };

    return res.json({ success: true, message: 'Profile updated.', data: { user: safe } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email already in use.' });
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, updateFace, getDepartments, getNextEmployeeId, updateProfile };
