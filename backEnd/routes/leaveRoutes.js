const router = require('express').Router();
const {
  createLeave, getMyLeaves, getAllLeaves, getPendingCount, reviewLeave, cancelLeave,
} = require('../controllers/leaveController');
const { protect, adminOnly, employeeOrAdmin } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/',              employeeOrAdmin, createLeave);
router.get('/my',             employeeOrAdmin, getMyLeaves);
router.get('/',               adminOnly,       getAllLeaves);
router.get('/pending-count',  adminOnly,       getPendingCount);
router.patch('/:id',          adminOnly,       reviewLeave);
router.delete('/:id',         employeeOrAdmin, cancelLeave);

module.exports = router;
