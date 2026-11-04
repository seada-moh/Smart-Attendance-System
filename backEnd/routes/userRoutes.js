const router = require('express').Router();
const {
  getAllUsers, getUserById, updateUser, deleteUser, updateFace, getDepartments, getNextEmployeeId, updateProfile,
} = require('../controllers/userController');
const { protect, adminOnly, employeeOrAdmin } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',                adminOnly,       getAllUsers);
router.get('/departments',     adminOnly,       getDepartments);
router.get('/generate-id',     adminOnly,       getNextEmployeeId);
router.get('/:id',             employeeOrAdmin, getUserById);
router.put('/:id',             adminOnly,       updateUser);
router.delete('/:id',          adminOnly,       deleteUser);
router.patch('/:id/face',      adminOnly,       updateFace);
router.patch('/:id/profile',   employeeOrAdmin, updateProfile);

module.exports = router;
