const express = require('express');
const {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  checkDuplicate,
  supportIssue
} = require('../controllers/issueController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/check-duplicate', protect, checkDuplicate);
router.post('/:id/support', protect, supportIssue);

router.route('/')
  .post(protect, createIssue)
  .get(protect, getIssues);

router.route('/:id')
  .get(protect, getIssue)
  .put(protect, updateIssue)
  .delete(protect, deleteIssue);

module.exports = router;
