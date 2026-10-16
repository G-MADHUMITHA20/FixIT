const express = require('express');
const {
  createStaff,
  createTechnician,
  getTechnicians,
  updateWorker,
  deleteWorker,
  toggleWorkerStatus,
  autoAssignAllComplaints,
  getAssignmentMetrics,
  seedDemoWorkers,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.post('/staff', createStaff);

// Batch auto-assign endpoint for Admin Dashboard
router.post('/auto-assign', autoAssignAllComplaints);
router.post('/issues/auto-assign', autoAssignAllComplaints);

// Professional Technician Management endpoints
router.post('/technicians', createTechnician);
router.get('/technicians', getTechnicians);
router.put('/technicians/:id', updateWorker);
router.patch('/technicians/:id/status', toggleWorkerStatus);
router.delete('/technicians/:id', deleteWorker);

// Backward-compatible worker aliases
router.post('/workers', createTechnician);
router.get('/workers', getTechnicians);
router.put('/workers/:id', updateWorker);
router.delete('/workers/:id', deleteWorker);
router.post('/workers/seed-demo', seedDemoWorkers);

// Telemetry & metrics
router.get('/assignment-metrics', getAssignmentMetrics);

module.exports = router;
