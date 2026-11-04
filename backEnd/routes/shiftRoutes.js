const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/shiftController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

router.get('/',  getSettings);
router.put('/',  updateSettings);

module.exports = router;
