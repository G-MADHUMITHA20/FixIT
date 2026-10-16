const User = require('../models/User');
const Notification = require('../models/Notification');
const IssueUpdate = require('../models/IssueUpdate');
const eventService = require('./eventService');

/**
 * Maps issue category to compatible worker specializations
 */
function getRequiredSpecializations(category, issue = null) {
  const cat = (category || '').toLowerCase();
  const text = (cat + ' ' + (issue?.title || '') + ' ' + (issue?.description || '')).toLowerCase();

  // 1. HVAC / AC Technician
  if (cat.includes('hvac') || cat.includes('ac') || text.includes('ac ') || text.includes('cooling') || text.includes('air condition')) {
    return ['HVAC / AC Technician', 'All'];
  }
  // 2. Electrician
  if (cat.includes('electr') || text.includes('light') || text.includes('bulb') || text.includes('wire') || text.includes('socket')) {
    return ['Electrician', 'Electrical', 'All'];
  }
  // 3. Plumber
  if (cat.includes('plumb') || cat.includes('water') || cat.includes('leak') || cat.includes('washroom') || cat.includes('toilet') || cat.includes('tap')) {
    return ['Plumber', 'Plumbing', 'All'];
  }
  // 4. Carpenter
  if (cat.includes('carpent') || cat.includes('furnitur') || cat.includes('wood') || cat.includes('door') || cat.includes('window') || cat.includes('lock') || text.includes('door is broken')) {
    return ['Carpenter', 'Carpentry', 'All'];
  }
  // 5. Housekeeping / Cleaner
  if (cat.includes('clean') || cat.includes('housekeep') || text.includes('trash') || text.includes('garbage') || text.includes('dirty') || text.includes('not clean')) {
    return ['Housekeeping / Cleaner', 'Cleaning', 'All'];
  }
  // 6. Laboratory Technician (or IT Technician if lab monitor / computer equipment)
  if (cat.includes('laboratory') || cat.includes('lab')) {
    return ['Laboratory Technician', 'IT Technician', 'All'];
  }
  // 7. IT Technician
  if (cat.includes('it') || cat.includes('network') || cat.includes('internet') || cat.includes('wifi') || cat.includes('computer') || text.includes('monitor')) {
    return ['IT Technician', 'IT', 'Laboratory Technician', 'All'];
  }
  // 8. Civil Maintenance Worker
  if (cat.includes('civil') || text.includes('wall') || text.includes('tile') || text.includes('crack') || text.includes('mason') || text.includes('cement')) {
    return ['Civil Maintenance Worker', 'General Maintenance', 'All'];
  }
  return [category, 'Civil Maintenance Worker', 'General Maintenance', 'All'];
}

/**
 * Finds and assigns the most suitable worker for an issue.
 * Concurrency-safe to prevent race conditions and over-assignment.
 *
 * @param {Object} issue MaintenanceIssue mongoose document
 * @param {string|null} assignedById User ID triggering assignment (or null if automated)
 * @returns {Promise<{success: boolean, worker: Object|null, message: string}>}
 */
async function assignBestWorker(issue, assignedById = null) {
  const requiredSpecializations = getRequiredSpecializations(issue.category, issue);

  // Maximum retry attempts for concurrent contention
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. Query all potentially eligible workers from database
    const eligibleWorkers = await User.find({
      role: 'technician',
      isActive: true,
      isAvailable: true,
      availabilityStatus: 'Available',
      specialization: { $in: requiredSpecializations },
      $expr: { $lt: ['$activeAssignmentsCount', '$maxAssignments'] },
    }).sort({
      activeAssignmentsCount: 1, // Prioritize lowest current workload
      updatedAt: 1,              // Secondary sort for fair distribution
    });

    if (!eligibleWorkers || eligibleWorkers.length === 0) {
      // No eligible worker available!
      // Update issue status to reflect unassigned state
      issue.assignedTechnician = null;
      issue.assignedWorkerName = null;
      issue.assignmentStatus = 'failed_no_worker';
      issue.status = 'Pending';
      await issue.save();

      // Log issue timeline entry
      await IssueUpdate.create({
        issueId: issue._id,
        updatedBy: assignedById || issue.reportedBy,
        note: `Auto-assignment attempted: No eligible worker available with specialization matching "${issue.category}". Ticket retained as Pending for admin intervention.`,
      });

      // Notify all admins about the assignment failure
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          type: 'assignment_failure',
          title: 'Worker Assignment Required',
          message: `No available worker found for issue #${issue._id.toString().slice(-6)}: "${issue.title}" (${issue.category}). Please review worker capacity or assign manually.`,
          issue: issue._id,
        });
      }

      // Broadcast real-time SSE update to dashboards
      eventService.broadcast('assignment_failed', {
        issueId: issue._id,
        category: issue.category,
        title: issue.title,
        message: 'No eligible worker available',
      });

      return {
        success: false,
        worker: null,
        message: 'No eligible worker available matching the required specialization and capacity.',
      };
    }

    // Try assigning to the top eligible worker atomically
    for (const candidate of eligibleWorkers) {
      // Atomic increment with capacity check to eliminate race conditions
      const updatedWorker = await User.findOneAndUpdate(
        {
          _id: candidate._id,
          isActive: true,
          isAvailable: true,
          availabilityStatus: 'Available',
          activeAssignmentsCount: candidate.activeAssignmentsCount,
          $expr: { $lt: ['$activeAssignmentsCount', '$maxAssignments'] },
        },
        {
          $inc: { activeAssignmentsCount: 1 },
        },
        { new: true }
      );

      if (updatedWorker) {
        // Atomic acquisition succeeded!
        issue.assignedTechnician = updatedWorker._id;
        issue.assignedWorkerName = updatedWorker.name;
        issue.assignmentStatus = 'assigned';
        issue.status = 'Assigned';
        issue.assignedAt = new Date();
        if (assignedById) {
          issue.assignedBy = assignedById;
        }
        await issue.save();

        // Create assignment timeline note
        await IssueUpdate.create({
          issueId: issue._id,
          updatedBy: assignedById || updatedWorker._id,
          newStatus: 'Assigned',
          note: `Automatically assigned to worker: ${updatedWorker.name} (Specialization: ${updatedWorker.specialization}, Active Load: ${updatedWorker.activeAssignmentsCount}/${updatedWorker.maxAssignments}).`,
        });

        // Notify assigned worker immediately
        const notification = await Notification.create({
          recipient: updatedWorker._id,
          type: 'issue_assigned',
          title: 'New Maintenance Task Assigned',
          message: `Ticket #${issue._id.toString().slice(-6)}: "${issue.title}" at ${issue.location} (${issue.category}, ${issue.priority} Priority).`,
          issue: issue._id,
        });

        // Broadcast real-time SSE updates
        eventService.broadcast('issue_assigned', {
          issueId: issue._id,
          ticketId: issue._id,
          workerId: updatedWorker._id,
          workerName: updatedWorker.name,
          category: issue.category,
          status: 'Assigned',
          activeLoad: updatedWorker.activeAssignmentsCount,
        });

        eventService.broadcast(
          'notification',
          notification,
          { userId: updatedWorker._id }
        );

        return {
          success: true,
          worker: updatedWorker,
          message: `Successfully assigned to ${updatedWorker.name}`,
        };
      }
      // If atomic update failed, candidate was claimed concurrently. Loop to next candidate!
    }
  }

  // If all attempts failed due to heavy concurrent contention
  issue.assignmentStatus = 'failed_no_worker';
  issue.status = 'Pending';
  await issue.save();

  return {
    success: false,
    worker: null,
    message: 'Concurrent assignment contention; issue queued as Pending.',
  };
}

/**
 * Decrements worker's active assignment count safely
 */
async function releaseWorkerAssignment(workerId) {
  if (!workerId) return;
  await User.findOneAndUpdate(
    { _id: workerId, activeAssignmentsCount: { $gt: 0 } },
    { $inc: { activeAssignmentsCount: -1 } }
  );
}

module.exports = {
  assignBestWorker,
  releaseWorkerAssignment,
  getRequiredSpecializations,
};
