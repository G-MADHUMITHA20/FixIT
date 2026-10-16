const express = require('express');
const {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  checkDuplicate,
  supportIssue,
  getStats,
  assignTechnician,
  startWork,
  completeWork,
  reopenIssue,
  autoAssignIssue,
} = require('../controllers/issueController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, getStats);
router.post('/check-duplicate', protect, checkDuplicate);
router.post('/:id/support', protect, supportIssue);
router.post('/:id/assign', protect, assignTechnician);

// Worker & Lifecycle actions
router.post('/:id/start-work', protect, startWork);
router.post('/:id/complete-work', protect, completeWork);
router.post('/:id/reopen', protect, reopenIssue);
router.post('/:id/auto-assign', protect, autoAssignIssue);

router.route('/')
  .post(protect, createIssue)
  .get(protect, getIssues);

router.route('/:id')
  .get(protect, getIssue)
  .put(protect, updateIssue)
  .delete(protect, deleteIssue);

module.exports = router;
