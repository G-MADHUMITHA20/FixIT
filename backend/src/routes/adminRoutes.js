const express = require('express');
const {
  createStaff,
  createTechnician,
  getTechnicians,
  updateWorker,
  getAssignmentMetrics,
  seedDemoWorkers,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.post('/staff', createStaff);

// Technician / Worker endpoints
router.post('/technician', createTechnician);
router.get('/technicians', getTechnicians);
router.post('/workers', createTechnician);
router.get('/workers', getTechnicians);
router.put('/workers/:id', updateWorker);
router.post('/workers/seed-demo', seedDemoWorkers);
router.get('/assignment-metrics', getAssignmentMetrics);

module.exports = router;
