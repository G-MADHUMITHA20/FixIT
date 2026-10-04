const MaintenanceIssue = require('../models/MaintenanceIssue');
const IssueUpdate = require('../models/IssueUpdate');
const { findDuplicate } = require('../utils/duplicateDetection');

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
exports.createIssue = async (req, res) => {
  try {
    req.body.reportedBy = req.user.id;
    // Prevent students from setting status/priority freely
    if (req.user.role === 'student') {
      req.body.status = 'Pending';
      // They can suggest priority, but let's allow it as default or what they send
    }

    // Bypass check if explicitly requested
    if (!req.body.bypassDuplicateCheck) {
      const duplicate = await findDuplicate(req.body.category, req.body.location, req.body.title, req.body.description);
      if (duplicate) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          matchingIssue: duplicate,
          message: 'Similar issue already reported'
        });
      }
    }

    const issue = await MaintenanceIssue.create(req.body);

    res.status(201).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all issues
// @route   GET /api/issues
// @access  Private
exports.getIssues = async (req, res) => {
  try {
    let query;

    // Students see public issues (but without reporter's identity)
    if (req.user.role === 'student') {
      // If asking for 'my' issues
      if (req.query.my === 'true') {
        query = MaintenanceIssue.find({ reportedBy: req.user.id });
      } else {
        query = MaintenanceIssue.find().select('-reportedBy'); // omit reportedBy for privacy
      }
    } else if (req.user.role === 'admin') {
      // Admins see everything, and can populate reporter
      query = MaintenanceIssue.find().populate('reportedBy', 'name email');
    }

    // Sorting by newest first
    query = query.sort('-createdAt');

    const issues = await query;

    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Private
exports.getIssue = async (req, res) => {
  try {
    let issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (req.user.role === 'admin') {
      issue = await MaintenanceIssue.findById(req.params.id).populate('reportedBy', 'name email');
    } else {
      if (issue.reportedBy.toString() !== req.user.id) {
        issue.reportedBy = undefined;
      }
    }

    const updates = await IssueUpdate.find({ issueId: issue._id }).populate('updatedBy', 'name role').sort('createdAt');

    res.status(200).json({
      success: true,
      data: { ...issue.toObject(), updates },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update issue
// @route   PUT /api/issues/:id
// @access  Private (Admin only or owner for certain fields)
exports.updateIssue = async (req, res) => {
  try {
    let issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Only admin can change status and priority
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this issue' });
    }

    const previousStatus = issue.status;
    const newStatus = req.body.status || previousStatus;
    const note = req.body.note;

    // If status is resolved, set resolvedAt
    if (newStatus === 'Resolved' && previousStatus !== 'Resolved') {
      req.body.resolvedAt = Date.now();
    }

    if (newStatus !== previousStatus || note) {
      await IssueUpdate.create({
        issueId: issue._id,
        updatedBy: req.user.id,
        previousStatus: newStatus !== previousStatus ? previousStatus : undefined,
        newStatus: newStatus !== previousStatus ? newStatus : undefined,
        note
      });
    }

    issue = await MaintenanceIssue.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    const updates = await IssueUpdate.find({ issueId: issue._id }).populate('updatedBy', 'name role').sort('createdAt');

    res.status(200).json({
      success: true,
      data: { ...issue.toObject(), updates },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete issue
// @route   DELETE /api/issues/:id
// @access  Private/Admin
exports.deleteIssue = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete' });
    }

    await issue.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.checkDuplicate = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    const duplicate = await findDuplicate(category, location, title, description);
    if (duplicate) {
      res.status(200).json({ success: true, isDuplicate: true, matchingIssue: duplicate });
    } else {
      res.status(200).json({ success: true, isDuplicate: false });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.supportIssue = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    
    const userId = req.user.id;
    if (issue.reportedBy.toString() === userId || issue.supportedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You have already reported or supported this issue' });
    }
    
    issue.supportedBy.push(userId);
    issue.affectedUsers = issue.affectedUsers + 1;
    await issue.save();
    
    res.status(200).json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
