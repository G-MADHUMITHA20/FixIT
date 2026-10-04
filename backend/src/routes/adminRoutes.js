const express = require('express');
const { createStaff } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.post('/staff', createStaff);

module.exports = router;
