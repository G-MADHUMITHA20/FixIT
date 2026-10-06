const express = require('express');
const { createStaff, createTechnician, getTechnicians } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.post('/staff', createStaff);
router.post('/technician', createTechnician);
router.get('/technicians', getTechnicians);

module.exports = router;
