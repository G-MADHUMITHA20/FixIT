const MaintenanceIssue = require('../models/MaintenanceIssue');
const IssueUpdate = require('../models/IssueUpdate');
const Notification = require('../models/Notification');
const User = require('../models/User');
const duplicateDetection = require('../utils/duplicateDetection');
const { findDuplicate } = duplicateDetection;
const { evaluateSLA, evaluateSingleSLA } = require('../utils/slaService');
const { classifyComplaint } = require('../services/aiService');
const { assignBestWorker, releaseWorkerAssignment } = require('../services/assignmentService');
const eventService = require('../services/eventService');

// @desc    Create new issue with Gemma 4 intelligence & automatic worker assignment
// @route   POST /api/issues
// @access  Private
exports.createIssue = async (req, res) => {
  try {
    req.body.reportedBy = req.user.id;
    req.body.reporterType = req.user.role === 'staff' ? 'staff' : 'student';

    // 1. Run Gemma 4 AI Complaint Classification
    const aiResult = await classifyComplaint(
      req.body.title,
      req.body.description,
      req.body.location
    );

    // Apply AI predictions if user didn't explicitly specify, or enhance
    if (!req.body.category || req.body.category === 'Other') {
      req.body.category = aiResult.category;
    }

    // Safety Escalation: If AI detects danger or safety rules trigger, escalate immediately
    if (aiResult.is_dangerous) {
      req.body.priority = 'Critical';
      req.body.isSafetyHazard = true;
      req.body.safetyHazardReason = aiResult.danger_reason;
      req.body.isEscalated = true;
      req.body.escalatedAt = new Date();
    } else if (!req.body.priority || req.user.role === 'student' || req.user.role === 'staff') {
      // Map AI urgency to FixIt priority levels
      const urgencyMap = {
        low: 'Low',
        normal: 'Medium',
        high: 'High',
        critical: 'Critical',
      };
      if (aiResult.urgency && urgencyMap[aiResult.urgency]) {
        req.body.priority = urgencyMap[aiResult.urgency];
      }
    }

    // If location was empty and AI extracted a location, fill it
    if ((!req.body.location || req.body.location.trim() === '') && aiResult.location_extracted) {
      req.body.location = aiResult.location_extracted;
    }

    req.body.aiClassification = {
      predictedCategory: aiResult.category,
      issueSummary: aiResult.issue_summary,
      urgency: aiResult.urgency,
      locationExtracted: aiResult.location_extracted,
      isDangerous: aiResult.is_dangerous,
      dangerReason: aiResult.danger_reason,
      usedFallback: aiResult.usedFallback,
      classifiedAt: new Date(),
      rawOutput: aiResult.rawOutput,
    };

    // By default, issue starts as Pending before auto-assignment
    req.body.status = 'Pending';
    req.body.assignmentStatus = 'unassigned';

    // 2. Duplicate Detection
    if (!req.body.bypassDuplicateCheck) {
      let duplicate = null;
      let decisionData = null;
      if (typeof duplicateDetection.findDuplicateWithDetails === 'function') {
        const duplicateResult = await duplicateDetection.findDuplicateWithDetails(
          req.body.category,
          req.body.location,
          req.body.title,
          req.body.description
        );
        if (duplicateResult && duplicateResult.isDuplicate && duplicateResult.matchingIssue) {
          duplicate = duplicateResult.matchingIssue;
          decisionData = duplicateResult.decisionData;
        }
      } else if (typeof findDuplicate === 'function') {
        duplicate = await findDuplicate(
          req.body.category,
          req.body.location,
          req.body.title,
          req.body.description
        );
      }

      if (duplicate) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'A similar issue has already been reported.',
          decisionData,
          existingIssue: {
            id: duplicate._id,
            title: duplicate.title,
            category: duplicate.category,
            location: duplicate.location,
            status: duplicate.status,
            affectedUsers: duplicate.affectedUsers,
          },
        });
      }
    }

    // 3. Save Issue in Database
    let issue = await MaintenanceIssue.create(req.body);

    // Initial timeline entry
    await IssueUpdate.create({
      issueId: issue._id,
      updatedBy: req.user.id,
      note: `Complaint submitted by ${req.user.name}. Gemma 4 classification: [${issue.category}] - ${aiResult.issue_summary} (Urgency: ${aiResult.urgency}).`,
    });

    // 4. If Safety Hazard, immediately alert admins
    if (issue.isSafetyHazard) {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          type: 'safety_alert',
          title: '🚨 CRITICAL SAFETY ESCALATION',
          message: `Hazardous complaint detected at ${issue.location}: "${issue.title}". ${issue.safetyHazardReason}`,
          issue: issue._id,
        });
      }
      eventService.broadcast('safety_alert', {
        issueId: issue._id,
        title: issue.title,
        location: issue.location,
        reason: issue.safetyHazardReason,
      });
    }

    // 5. Run Automatic Worker Assignment Algorithm
    const assignmentResult = await assignBestWorker(issue);

    // Refetch the issue with assignment fields populated
    const populatedIssue = await MaintenanceIssue.findById(issue._id)
      .populate('assignedTechnician', 'name email specialization phone availabilityStatus activeAssignmentsCount maxAssignments')
      .populate('reportedBy', 'name email role');

    // Broadcast new issue event via SSE
    eventService.broadcast('issue_created', {
      issue: populatedIssue,
      assignment: assignmentResult,
    });

    res.status(201).json({
      success: true,
      data: populatedIssue,
      assignment: assignmentResult,
    });
  } catch (error) {
    console.error('Error in createIssue:', error);
    const statusCode = error.statusCode || (error.name === 'GemmaAPIError' ? 503 : 400);
    res.status(statusCode).json({
      success: false,
      message: error.message,
      code: error.code || 'BAD_REQUEST',
    });
  }
};

// @desc    Get all issues with role-based filtering and security
// @route   GET /api/issues
// @access  Private
exports.getIssues = async (req, res) => {
  try {
    let queryObj = {};

    // Strict access control:
    // Students and staff can only see their own private issues when ?my=true
    if (req.query.my === 'true') {
      queryObj.reportedBy = req.user.id;
    } else if (req.user.role === 'student' || req.user.role === 'staff') {
      // In public feed, students/staff see public issues
      // But reportedBy details will be sanitized below
    }

    // Workers/technicians see issues assigned to them when looking at their tasks
    if (req.user.role === 'technician') {
      if (req.query.campus !== 'true') {
        queryObj.assignedTechnician = req.user.id;
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      queryObj.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { assignedWorkerName: searchRegex },
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
    if (req.query.unassigned === 'true') {
      queryObj.assignedTechnician = null;
    }

    let query = MaintenanceIssue.find(queryObj).populate(
      'assignedTechnician',
      'name email specialization phone availabilityStatus activeAssignmentsCount maxAssignments'
    );

    // Sanitize reportedBy for non-admins to prevent privacy leaks
    if (req.query.my !== 'true' && req.user.role !== 'admin') {
      query = query.select('-reportedBy');
    } else {
      query = query.populate('reportedBy', 'name email role');
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
    let issue = await MaintenanceIssue.findById(req.params.id)
      .populate('assignedTechnician', 'name email specialization phone availabilityStatus activeAssignmentsCount maxAssignments')
      .populate('reportedBy', 'name email role');

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Security: hide reporter details from users who aren't admin or the original reporter
    if (
      req.user.role !== 'admin' &&
      issue.reportedBy &&
      issue.reportedBy._id?.toString() !== req.user.id
    ) {
      issue.reportedBy = undefined;
    }

    issue = await evaluateSingleSLA(issue);

    const updates = await IssueUpdate.find({ issueId: issue._id })
      .populate('updatedBy', 'name role specialization')
      .sort('createdAt');

    res.status(200).json({
      success: true,
      data: { ...issue.toObject(), updates },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Start work on an assigned issue (Worker action)
// @route   POST /api/issues/:id/start-work
// @access  Private/Technician or Admin
exports.startWork = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Only assigned worker or admin can start work
    const isAssignedWorker = issue.assignedTechnician && issue.assignedTechnician.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isAssignedWorker) {
      return res.status(403).json({ success: false, message: 'Only the assigned technician or administrator can start work on this task' });
    }

    const previousStatus = issue.status;
    issue.status = 'In Progress';
    issue.startedAt = new Date();
    await issue.save();

    const note = req.body.note || `Worker ${req.user.name} has started work on this task.`;

    await IssueUpdate.create({
      issueId: issue._id,
      updatedBy: req.user.id,
      previousStatus,
      newStatus: 'In Progress',
      note,
    });

    // Notify the reporter
    if (issue.reportedBy) {
      await Notification.create({
        recipient: issue.reportedBy,
        type: 'work_started',
        title: 'Work Started on Your Request',
        message: `Technician ${req.user.name} has begun working on ticket #${issue._id.toString().slice(-6)}: "${issue.title}".`,
        issue: issue._id,
      });
    }

    eventService.broadcast('work_started', {
      issueId: issue._id,
      workerName: req.user.name,
      status: 'In Progress',
      startedAt: issue.startedAt,
    });

    const updatedIssue = await MaintenanceIssue.findById(issue._id)
      .populate('assignedTechnician', 'name email specialization phone availabilityStatus');

    const updates = await IssueUpdate.find({ issueId: issue._id })
      .populate('updatedBy', 'name role')
      .sort('createdAt');

    res.status(200).json({
      success: true,
      data: { ...updatedIssue.toObject(), updates },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Mark work as done (Worker action)
// @route   POST /api/issues/:id/complete-work
// @access  Private/Technician or Admin
exports.completeWork = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Only assigned worker or admin can mark work done
    const isAssignedWorker = issue.assignedTechnician && issue.assignedTechnician.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isAssignedWorker) {
      return res.status(403).json({ success: false, message: 'Only the assigned technician or administrator can complete this task' });
    }

    const previousStatus = issue.status;
    const now = new Date();
    issue.status = 'Work Done';
    issue.completedAt = now;
    issue.resolvedAt = now;
    await issue.save();

    // Release worker workload count atomically
    if (issue.assignedTechnician) {
      await releaseWorkerAssignment(issue.assignedTechnician);
    }

    const completionNote = req.body.note || `Work completed and verified by ${req.user.name}.`;

    await IssueUpdate.create({
      issueId: issue._id,
      updatedBy: req.user.id,
      previousStatus,
      newStatus: 'Work Done',
      note: completionNote,
    });

    // Notify original reporter
    if (issue.reportedBy) {
      await Notification.create({
        recipient: issue.reportedBy,
        type: 'work_completed',
        title: 'Maintenance Work Completed',
        message: `Your maintenance ticket #${issue._id.toString().slice(-6)}: "${issue.title}" has been marked as Work Done by ${req.user.name}.`,
        issue: issue._id,
      });
    }

    // Broadcast real-time update
    eventService.broadcast('work_completed', {
      issueId: issue._id,
      workerName: req.user.name,
      status: 'Work Done',
      completedAt: issue.completedAt,
    });

    const updatedIssue = await MaintenanceIssue.findById(issue._id)
      .populate('assignedTechnician', 'name email specialization phone availabilityStatus activeAssignmentsCount maxAssignments');

    const updates = await IssueUpdate.find({ issueId: issue._id })
      .populate('updatedBy', 'name role')
      .sort('createdAt');

    res.status(200).json({
      success: true,
      data: { ...updatedIssue.toObject(), updates },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Reopen an unresolved issue
// @route   POST /api/issues/:id/reopen
// @access  Private (Reporter or Admin)
exports.reopenIssue = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    const isReporter = issue.reportedBy && issue.reportedBy.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isReporter) {
      return res.status(403).json({ success: false, message: 'Only the complaint reporter or administrator can reopen this issue' });
    }

    const previousStatus = issue.status;
    issue.status = 'Reopened';
    issue.completedAt = null;
    issue.resolvedAt = null;
    await issue.save();

    const note = req.body.note || `Issue reopened by ${req.user.name}. Issue requires further maintenance attention.`;

    await IssueUpdate.create({
      issueId: issue._id,
      updatedBy: req.user.id,
      previousStatus,
      newStatus: 'Reopened',
      note,
    });

    // Notify assigned worker or admin
    if (issue.assignedTechnician) {
      await Notification.create({
        recipient: issue.assignedTechnician,
        type: 'status_update',
        title: 'Ticket Reopened',
        message: `Ticket #${issue._id.toString().slice(-6)}: "${issue.title}" has been reopened for further work.`,
        issue: issue._id,
      });
    }

    eventService.broadcast('issue_reopened', {
      issueId: issue._id,
      status: 'Reopened',
      reopenedBy: req.user.name,
    });

    const updatedIssue = await MaintenanceIssue.findById(issue._id)
      .populate('assignedTechnician', 'name email specialization phone availabilityStatus');

    const updates = await IssueUpdate.find({ issueId: issue._id })
      .populate('updatedBy', 'name role')
      .sort('createdAt');

    res.status(200).json({
      success: true,
      data: { ...updatedIssue.toObject(), updates },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Trigger automatic worker assignment for an unassigned issue
// @route   POST /api/issues/:id/auto-assign
// @access  Private/Admin
exports.autoAssignIssue = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can trigger auto-assignment' });
    }

    const assignmentResult = await assignBestWorker(issue, req.user.id);

    const updatedIssue = await MaintenanceIssue.findById(issue._id)
      .populate('assignedTechnician', 'name email specialization phone availabilityStatus activeAssignmentsCount maxAssignments');

    res.status(200).json({
      success: assignmentResult.success,
      message: assignmentResult.message,
      data: updatedIssue,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update issue (Admin or technician status update)
// @route   PUT /api/issues/:id
// @access  Private
exports.updateIssue = async (req, res) => {
  try {
    let issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (req.user.role !== 'admin') {
      if (req.user.role === 'technician') {
        if (!issue.assignedTechnician || issue.assignedTechnician.toString() !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Not authorized to update this issue' });
        }
        // Technician can only update status (except Resolved) and technicianCompletion
        if (req.body.status === 'Resolved') {
          return res.status(403).json({ success: false, message: 'Technicians cannot mark as Resolved directly. Use Work Done.' });
        }
        delete req.body.priority;
        delete req.body.category;
        delete req.body.location;
        delete req.body.title;
        delete req.body.description;
      } else {
        return res.status(403).json({ success: false, message: 'Not authorized to update this issue' });
      }
    }

    const previousStatus = issue.status;
    const newStatus = req.body.status || previousStatus;
    const note = req.body.note;

    if (newStatus === 'Work Done' || newStatus === 'Resolved') {
      if (previousStatus !== 'Work Done' && previousStatus !== 'Resolved') {
        req.body.resolvedAt = new Date();
        req.body.completedAt = new Date();
        req.body.technicianCompletion = true;
        if (issue.assignedTechnician) {
          await releaseWorkerAssignment(issue.assignedTechnician);
        }
      }
    }

    if (newStatus !== previousStatus || note || (req.body.technicianCompletion && !issue.technicianCompletion)) {
      let customNote = note;
      if (req.body.technicianCompletion && !issue.technicianCompletion) {
        customNote = 'Technician Work Completed. Awaiting Admin Confirmation.' + (note ? `\nNote: ${note}` : '');
      }

      await IssueUpdate.create({
        issueId: issue._id,
        updatedBy: req.user.id,
        previousStatus: newStatus !== previousStatus ? previousStatus : undefined,
        newStatus: newStatus !== previousStatus ? newStatus : undefined,
        note: customNote || note,
      });
    }

    issue = await MaintenanceIssue.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('assignedTechnician', 'name email specialization phone availabilityStatus');

    const updates = await IssueUpdate.find({ issueId: issue._id })
      .populate('updatedBy', 'name role')
      .sort('createdAt');

    eventService.broadcast('issue_updated', {
      issueId: issue._id,
      status: issue.status,
      priority: issue.priority,
    });

    res.status(200).json({
      success: true,
      data: { ...issue.toObject(), updates },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Manually assign or reassign technician to issue
// @route   POST /api/issues/:id/assign
// @access  Private/Admin
exports.assignTechnician = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to assign technicians' });
    }

    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({ success: false, message: 'Please provide technicianId' });
    }

    const newWorker = await User.findById(technicianId);
    if (!newWorker || newWorker.role !== 'technician') {
      return res.status(400).json({ success: false, message: 'Invalid technician' });
    }

    const previousTechnician = issue.assignedTechnician;

    if (previousTechnician && previousTechnician.toString() === technicianId.toString()) {
      return res.status(400).json({ success: false, message: 'Technician is already assigned to this issue' });
    }

    // Release previous worker's workload count
    if (previousTechnician) {
      await releaseWorkerAssignment(previousTechnician);
    }

    // Increment new worker's workload count
    await User.findByIdAndUpdate(technicianId, {
      $inc: { activeAssignmentsCount: 1 },
    });

    issue.assignedTechnician = technicianId;
    issue.assignedWorkerName = newWorker.name;
    issue.assignedBy = req.user.id;
    issue.assignedAt = new Date();
    issue.status = 'Assigned';
    issue.assignmentStatus = previousTechnician ? 'reassigned' : 'assigned';

    await issue.save();

    let updateNote = `Assigned to Worker: ${newWorker.name} (${newWorker.specialization})`;
    if (previousTechnician) {
      const prevTech = await User.findById(previousTechnician);
      updateNote = `Reassigned from ${prevTech ? prevTech.name : 'Previous Worker'} to ${newWorker.name} (${newWorker.specialization})`;
    }

    await IssueUpdate.create({
      issueId: issue._id,
      updatedBy: req.user.id,
      newStatus: 'Assigned',
      note: updateNote,
    });

    await Notification.create({
      recipient: technicianId,
      type: 'issue_assigned',
      title: 'Maintenance Issue Assigned',
      message: `Ticket #${issue._id.toString().slice(-6)}: "${issue.title}" at ${issue.location} has been assigned to you.`,
      issue: issue._id,
    });

    eventService.broadcast('issue_assigned', {
      issueId: issue._id,
      workerId: newWorker._id,
      workerName: newWorker.name,
      status: 'Assigned',
    });

    const populatedIssue = await MaintenanceIssue.findById(issue._id)
      .populate('assignedTechnician', 'name email specialization phone availabilityStatus activeAssignmentsCount maxAssignments');

    res.status(200).json({
      success: true,
      data: populatedIssue,
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

    if (issue.assignedTechnician && issue.status !== 'Work Done' && issue.status !== 'Resolved') {
      await releaseWorkerAssignment(issue.assignedTechnician);
    }

    await issue.deleteOne();

    eventService.broadcast('issue_deleted', { issueId: req.params.id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Check duplicate
// @route   POST /api/issues/check-duplicate
// @access  Private
exports.checkDuplicate = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    const result = await duplicateDetection.findDuplicateWithDetails(category, location, title, description);
    if (result.isDuplicate) {
      res.status(200).json({
        success: true,
        isDuplicate: true,
        matchingIssue: result.matchingIssue,
        decisionData: result.decisionData
      });
    } else {
      res.status(200).json({
        success: true,
        isDuplicate: false,
        decisionData: result.decisionData
      });
    }
  } catch (error) {
    const statusCode = error.statusCode || (error.name === 'GemmaAPIError' ? 503 : 400);
    res.status(statusCode).json({
      success: false,
      message: error.message,
      code: error.code || 'BAD_REQUEST'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/issues/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const issues = await MaintenanceIssue.find();

    const total = issues.length;
    const pending = issues.filter((i) => i.status === 'Pending').length;
    const assigned = issues.filter((i) => i.status === 'Assigned').length;
    const inProgress = issues.filter((i) => i.status === 'In Progress').length;
    const workDone = issues.filter((i) => i.status === 'Work Done' || i.status === 'Resolved').length;
    const critical = issues.filter((i) => i.priority === 'Critical').length;
    const resolutionPercentage = total === 0 ? 0 : Math.round((workDone / total) * 100);

    const issuesByCategory = issues.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});

    const issuesByPriority = issues.reduce((acc, curr) => {
      acc[curr.priority] = (acc[curr.priority] || 0) + 1;
      return acc;
    }, {});

    const issuesByStatus = {
      Pending: pending,
      Assigned: assigned,
      'In Progress': inProgress,
      'Work Done': workDone,
    };

    const issuesByLocation = issues.reduce((acc, curr) => {
      acc[curr.location] = (acc[curr.location] || 0) + 1;
      return acc;
    }, {});

    const mostAffectedLocations = Object.entries(issuesByLocation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const mostReportedCategories = Object.entries(issuesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Active SLA breaches
    const now = new Date();
    const activeBreaches = issues
      .filter((i) => i.status !== 'Work Done' && i.status !== 'Resolved' && i.isEscalated)
      .map((i) => {
        const breachHours = i.slaDeadline
          ? Math.round((now - new Date(i.slaDeadline)) / (1000 * 60 * 60))
          : 0;
        return {
          _id: i._id,
          title: i.title,
          category: i.category,
          location: i.location,
          priority: i.priority,
          breachHours,
          reporterType: i.reporterType,
        };
      });

    const criticalUnresolved = issues
      .filter((i) => i.status !== 'Work Done' && i.status !== 'Resolved' && i.priority === 'Critical')
      .map((i) => ({
        _id: i._id,
        title: i.title,
        location: i.location,
        reporterType: i.reporterType,
        isSafetyHazard: i.isSafetyHazard,
        safetyHazardReason: i.safetyHazardReason,
      }));

    const unassignedIssues = issues
      .filter((i) => i.status === 'Pending' && !i.assignedTechnician)
      .map((i) => ({
        _id: i._id,
        title: i.title,
        category: i.category,
        location: i.location,
        priority: i.priority,
        reportedAt: i.reportedAt,
        assignmentStatus: i.assignmentStatus,
      }));

    const studentReports = issues.filter((i) => i.reporterType === 'student').length;
    const staffReports = issues.filter((i) => i.reporterType === 'staff').length;

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        assigned,
        inProgress,
        resolved: workDone,
        workDone,
        critical,
        resolutionPercentage,
        issuesByCategory: Object.entries(issuesByCategory).map(([name, value]) => ({ name, value })),
        issuesByPriority: Object.entries(issuesByPriority).map(([name, value]) => ({ name, value })),
        issuesByStatus: Object.entries(issuesByStatus).map(([name, value]) => ({ name, value })),
        reportsByUserType: {
          student: studentReports,
          staff: staffReports,
        },
        mostAffectedLocations,
        mostReportedCategories,
        activeBreaches,
        criticalUnresolved,
        unassignedIssues,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Support an existing issue
// @route   POST /api/issues/:id/support
// @access  Private
exports.supportIssue = async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const userId = req.user.id;
    if (issue.status === 'Work Done' || issue.status === 'Resolved') {
      return res.status(400).json({ success: false, message: 'Cannot support a resolved issue' });
    }
    if (issue.reportedBy.toString() === userId || issue.supportedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You have already reported or supported this issue' });
    }

    const updatedIssue = await MaintenanceIssue.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { supportedBy: userId },
        $inc: { affectedUsers: 1 },
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedIssue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
