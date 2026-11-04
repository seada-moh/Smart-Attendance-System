const router = require('express').Router();
const { acknowledgeAlert, getMyAlerts, getAllAlerts, getPendingCount, respondToAlert } =
  require('../controllers/absenceAlertController');
const { protect, adminOnly, employeeOrAdmin } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/acknowledge',       employeeOrAdmin, acknowledgeAlert);
router.get('/my',                 employeeOrAdmin, getMyAlerts);
router.get('/',                   adminOnly,       getAllAlerts);
router.get('/pending-count',      adminOnly,       getPendingCount);
router.patch('/:id/respond',      adminOnly,       respondToAlert);

module.exports = router;
