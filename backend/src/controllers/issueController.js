const MaintenanceIssue = require('../models/MaintenanceIssue');
const IssueUpdate = require('../models/IssueUpdate');
const { findDuplicate } = require('../utils/duplicateDetection');
const { evaluateSLA, evaluateSingleSLA } = require('../utils/slaService');

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
exports.createIssue = async (req, res) => {
  try {
    req.body.reportedBy = req.user.id;
    req.body.reporterType = req.user.role === 'staff' ? 'staff' : 'student';
    // Prevent students from setting status/priority freely
    if (req.user.role === 'student' || req.user.role === 'staff') {
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
    let queryObj = {};

    if (req.query.my === 'true') {
      queryObj.reportedBy = req.user.id;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      queryObj.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex }
      ];
    }

    if (req.query.category && req.query.category !== 'All Categories') {
      queryObj.category = req.query.category;
    }
    if (req.query.status && req.query.status !== 'All Statuses') {
      queryObj.status = req.query.status;
    }
    if (req.query.priority && req.query.priority !== 'All Priorities') {
      queryObj.priority = req.query.priority;
    }
    if (req.query.location && req.query.location !== 'All Locations') {
      queryObj.location = req.query.location;
    }

    query = MaintenanceIssue.find(queryObj);

    if (req.query.my !== 'true') {
      query = query.select('-reportedBy');
    }

    if (req.query.sort) {
      let sortBy = {};
      if (req.query.sort === 'newest') sortBy = { createdAt: -1 };
      else if (req.query.sort === 'oldest') sortBy = { createdAt: 1 };
      else if (req.query.sort === 'highestPriority') sortBy = { priorityWeight: -1, createdAt: -1 };
      else if (req.query.sort === 'mostAffected') sortBy = { affectedUsers: -1, createdAt: -1 };
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 0;
    const startIndex = (page - 1) * limit;

    if (limit > 0) {
      query = query.skip(startIndex).limit(limit);
    }

    let issues = await query;
    issues = await evaluateSLA(issues);

    const total = await MaintenanceIssue.countDocuments(queryObj);

    res.status(200).json({
      success: true,
      count: issues.length,
      total,
      page,
      pages: limit > 0 ? Math.ceil(total / limit) : 1,
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

    if (req.user.role !== 'admin' && issue.reportedBy.toString() !== req.user.id) {
      issue.reportedBy = undefined;
    }

    issue = await evaluateSingleSLA(issue);

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

exports.getStats = async (req, res) => {
  try {
    const issues = await MaintenanceIssue.find();
    
    const total = issues.length;
    const pending = issues.filter(i => i.status === 'Pending').length;
    const inProgress = issues.filter(i => i.status === 'In Progress').length;
    const resolved = issues.filter(i => i.status === 'Resolved').length;
    const critical = issues.filter(i => i.priority === 'Critical').length;
    const resolutionPercentage = total === 0 ? 0 : Math.round((resolved / total) * 100);
    
    const issuesByCategory = issues.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});
    
    const issuesByPriority = issues.reduce((acc, curr) => {
      acc[curr.priority] = (acc[curr.priority] || 0) + 1;
      return acc;
    }, {});

    const issuesByStatus = { Pending: pending, 'In Progress': inProgress, Resolved: resolved };

    const issuesByLocation = issues.reduce((acc, curr) => {
      acc[curr.location] = (acc[curr.location] || 0) + 1;
      return acc;
    }, {});
    
    const mostAffectedLocations = Object.entries(issuesByLocation)
      .sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, count]) => ({ name, count }));
      
    const mostReportedCategories = Object.entries(issuesByCategory)
      .sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, count]) => ({ name, count }));
      
    // Active SLA breaches
    const now = new Date();
    const activeBreaches = issues.filter(i => i.status !== 'Resolved' && i.isEscalated).map(i => {
      const breachHours = Math.round((now - new Date(i.slaDeadline)) / (1000 * 60 * 60));
      return {
        _id: i._id,
        title: i.title,
        category: i.category,
        location: i.location,
        priority: i.priority,
        breachHours,
        reporterType: i.reporterType
      };
    });
    
    const criticalUnresolved = issues.filter(i => i.status !== 'Resolved' && i.priority === 'Critical').map(i => ({
      _id: i._id, title: i.title, location: i.location, reporterType: i.reporterType
    }));
    const oldestUnresolved = [...issues.filter(i => i.status !== 'Resolved')].sort((a,b) => new Date(a.reportedAt) - new Date(b.reportedAt)).slice(0,5).map(i => ({
      _id: i._id, title: i.title, reportedAt: i.reportedAt, reporterType: i.reporterType
    }));

    const studentReports = issues.filter(i => i.reporterType === 'student').length;
    const staffReports = issues.filter(i => i.reporterType === 'staff').length;

    res.status(200).json({
      success: true,
      data: {
        total, pending, inProgress, resolved, critical, resolutionPercentage,
        issuesByCategory: Object.entries(issuesByCategory).map(([name, value]) => ({ name, value })),
        issuesByPriority: Object.entries(issuesByPriority).map(([name, value]) => ({ name, value })),
        issuesByStatus: Object.entries(issuesByStatus).map(([name, value]) => ({ name, value })),
        reportsByUserType: {
          student: studentReports,
          staff: staffReports
        },
        mostAffectedLocations,
        mostReportedCategories,
        activeBreaches,
        criticalUnresolved,
        oldestUnresolved
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
