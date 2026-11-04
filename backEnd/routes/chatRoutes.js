const router = require('express').Router();
const { getContacts, getMessages, getUnreadCount } = require('../controllers/chatController');
const { sendRequest, getRequests, respondRequest, checkStatus, getPendingCount } =
  require('../controllers/chatRequestController');
const { protect, adminOnly, employeeOrAdmin } = require('../middleware/authMiddleware');

router.use(protect);

// Messages
router.get('/contacts',             employeeOrAdmin, getContacts);
router.get('/unread-count',         employeeOrAdmin, getUnreadCount);
router.get('/messages/:contactId',  employeeOrAdmin, getMessages);

// Chat requests — now only needed for external users, employees can chat freely
router.post('/request',                   employeeOrAdmin, sendRequest);
router.get('/requests',                   adminOnly,       getRequests);
router.get('/pending-requests-count',     adminOnly,       getPendingCount);
router.patch('/request/:id',              adminOnly,       respondRequest);
router.get('/request-status/:adminId',    employeeOrAdmin, checkStatus);

module.exports = router;
