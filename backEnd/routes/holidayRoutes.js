const router = require('express').Router();
const { getHolidays, addHoliday, deleteHoliday } = require('../controllers/holidayController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getHolidays);
router.post('/', protect, adminOnly, addHoliday);
router.delete('/:id', protect, adminOnly, deleteHoliday);

module.exports = router;
