const router = require('express').Router();
const { register, login, getMe, signup, setupAdmin } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public routes
router.post('/login',       login);
router.post('/signup',      signup);        // self-registration — employee only
router.post('/setup-admin', setupAdmin);    // first-time admin creation — blocked after first admin exists

// Admin-only registration (can set any role)
router.post('/register', protect, adminOnly, register);

// Protected
router.get('/me', protect, getMe);

module.exports = router;
