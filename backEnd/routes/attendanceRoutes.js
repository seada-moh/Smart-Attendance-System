const router = require('express').Router();
const {
  markAttendance, checkOutAttendance, getKioskStatus,
  getCompanyAttendance, getMyAttendance, getDashboard, getMyStats,
  getAnalytics, getAbsentWarnings,
} = require('../controllers/attendanceController');
const { protect, adminOnly, employeeOrAdmin } = require('../middleware/authMiddleware');

// Public — kiosk (no auth required)
router.get('/kiosk-status', getKioskStatus);
router.post('/mark',        markAttendance);
router.post('/checkout',    checkOutAttendance);

router.use(protect);

router.get('/dashboard',        adminOnly,       getDashboard);
router.get('/analytics',        adminOnly,       getAnalytics);
router.get('/absent-warnings',  adminOnly,       getAbsentWarnings);
router.get('/my/stats',         employeeOrAdmin, getMyStats);
router.get('/my',               employeeOrAdmin, getMyAttendance);
router.get('/',                 adminOnly,       getCompanyAttendance);

module.exports = router;
