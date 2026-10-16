const User = require('../models/User');
const Notification = require('../models/Notification');
const IssueUpdate = require('../models/IssueUpdate');
const eventService = require('./eventService');

/**
 * Normalizes any category string or user input to canonical specialization keys and groups.
 * Handles cases like 'Electrician', 'electrical', 'Electrical Work', 'Plumbing', 'Plumbing / Water Leakage', etc.
 *
 * @param {string} category
 * @param {Object} issue
 * @returns {{ primary: string, candidates: string[], pattern: RegExp }}
 */
function getNormalizedSpecializations(category, issue = null) {
  const cat = (category || '').trim().toLowerCase();
  const text = (cat + ' ' + (issue?.title || '') + ' ' + (issue?.description || '')).toLowerCase();

  // 1. HVAC / AC Technician
  if (
    cat.includes('hvac') ||
    cat.includes('ac') ||
    text.includes('air condition') ||
    text.includes('cooling') ||
    text.includes('chiller') ||
    text.includes('thermostat')
  ) {
    return {
      primary: 'HVAC / AC Technician',
      candidates: ['HVAC / AC Technician', 'HVAC/AC Technician', 'HVAC', 'AC Technician', 'General Maintenance', 'All'],
      pattern: /hvac|ac\s*technician|cooling/i,
    };
  }

  // 2. Electrician
  if (
    cat.includes('electr') ||
    text.includes('electrical') ||
    text.includes('electrician') ||
    text.includes('light') ||
    text.includes('bulb') ||
    text.includes('wire') ||
    text.includes('wiring') ||
    text.includes('socket') ||
    text.includes('switchboard') ||
    text.includes('fan') ||
    text.includes('short circuit') ||
    text.includes('power cut')
  ) {
    return {
      primary: 'Electrician',
      candidates: ['Electrician', 'Electrical', 'Electrical Work', 'All'],
      pattern: /electric/i,
    };
  }

  // 3. Plumber
  if (
    cat.includes('plumb') ||
    cat.includes('water') ||
    cat.includes('leak') ||
    cat.includes('washroom') ||
    cat.includes('toilet') ||
    cat.includes('tap') ||
    text.includes('plumbing') ||
    text.includes('pipe') ||
    text.includes('drain') ||
    text.includes('flush') ||
    text.includes('faucet')
  ) {
    return {
      primary: 'Plumber',
      candidates: ['Plumber', 'Plumbing', 'Plumbing / Water Leakage', 'All'],
      pattern: /plumb/i,
    };
  }

  // 4. Carpenter
  if (
    cat.includes('carpent') ||
    cat.includes('furnitur') ||
    cat.includes('wood') ||
    cat.includes('door') ||
    cat.includes('window') ||
    cat.includes('lock') ||
    text.includes('carpentry') ||
    text.includes('bench') ||
    text.includes('desk') ||
    text.includes('table') ||
    text.includes('chair') ||
    text.includes('hinge') ||
    text.includes('drawer')
  ) {
    return {
      primary: 'Carpenter',
      candidates: ['Carpenter', 'Carpentry', 'Furniture', 'All'],
      pattern: /carpent|furnitur/i,
    };
  }

  // 5. Painter
  if (
    cat.includes('paint') ||
    text.includes('painter') ||
    text.includes('painting') ||
    text.includes('whitewash') ||
    text.includes('wall color')
  ) {
    return {
      primary: 'Painter',
      candidates: ['Painter', 'Civil/Masonry', 'Civil Maintenance Worker', 'General Maintenance', 'All'],
      pattern: /paint/i,
    };
  }

  // 6. Civil / Masonry
  if (
    cat.includes('civil') ||
    cat.includes('mason') ||
    cat.includes('wall') ||
    cat.includes('tile') ||
    cat.includes('crack') ||
    text.includes('cement') ||
    text.includes('plaster') ||
    text.includes('roof') ||
    text.includes('ceiling') ||
    text.includes('flooring')
  ) {
    return {
      primary: 'Civil/Masonry',
      candidates: ['Civil/Masonry', 'Civil Maintenance Worker', 'Civil', 'Masonry', 'General Maintenance', 'All'],
      pattern: /civil|mason/i,
    };
  }

  // 7. IT Technician
  if (
    cat.includes('it') ||
    cat.includes('network') ||
    cat.includes('internet') ||
    cat.includes('wifi') ||
    cat.includes('computer') ||
    text.includes('lan') ||
    text.includes('router') ||
    text.includes('ethernet') ||
    text.includes('monitor') ||
    text.includes('printer') ||
    text.includes('projector')
  ) {
    return {
      primary: 'IT Technician',
      candidates: ['IT Technician', 'IT', 'Network', 'Laboratory Technician', 'All'],
      pattern: /it\b|network|internet|computer/i,
    };
  }

  // 8. Laboratory Technician
  if (cat.includes('laboratory') || cat.includes('lab')) {
    return {
      primary: 'Laboratory Technician',
      candidates: ['Laboratory Technician', 'IT Technician', 'All'],
      pattern: /lab/i,
    };
  }

  // 9. Housekeeping / Cleaner
  if (
    cat.includes('clean') ||
    cat.includes('housekeep') ||
    text.includes('trash') ||
    text.includes('garbage') ||
    text.includes('dustbin') ||
    text.includes('dirty') ||
    text.includes('smell') ||
    text.includes('waste') ||
    text.includes('sanitation')
  ) {
    return {
      primary: 'Housekeeping / Cleaner',
      candidates: ['Housekeeping / Cleaner', 'Housekeeping', 'Cleaner', 'Cleaning', 'All'],
      pattern: /clean|housekeep/i,
    };
  }

  // Fallback: General Maintenance
  return {
    primary: 'General Maintenance',
    candidates: [category, 'General Maintenance', 'Civil/Masonry', 'Civil Maintenance Worker', 'All'],
    pattern: /general|maintenance/i,
  };
}

/**
 * Backward compatible helper for specializations array
 */
function getRequiredSpecializations(category, issue = null) {
  return getNormalizedSpecializations(category, issue).candidates;
}

/**
 * Finds and assigns the most suitable worker for an issue.
 * Concurrency-safe to prevent race conditions and over-assignment.
 *
 * @param {Object} issue MaintenanceIssue mongoose document
 * @param {string|null} assignedById User ID triggering assignment (or null if automated)
 * @returns {Promise<{success: boolean, worker: Object|null, message: string, reason?: string}>}
 */
async function assignBestWorker(issue, assignedById = null) {
  const norm = getNormalizedSpecializations(issue.category, issue);
  const targetSpecializations = norm.candidates;

  // Maximum retry attempts for concurrent contention
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. Query all potentially eligible workers from database
    // Flexible match: accepts either normalized candidate list or regex pattern
    // Also accommodates documents where isAvailable or activeAssignmentsCount is missing/default
    const eligibleWorkers = await User.find({
      role: 'technician',
      isActive: { $ne: false },
      $or: [
        { availabilityStatus: { $in: ['Available', 'available'] } },
        { availabilityStatus: { $exists: false }, isAvailable: { $ne: false } },
        { isAvailable: true, availabilityStatus: { $nin: ['Unavailable', 'Busy', 'On Leave', 'unavailable', 'busy', 'on leave'] } },
      ],
      $and: [
        {
          $or: [
            { specialization: { $in: targetSpecializations } },
            { specialization: { $regex: norm.pattern } },
          ],
        },
        {
          $or: [
            { activeAssignmentsCount: { $exists: false } },
            {
              $expr: {
                $lt: [
                  { $ifNull: ['$activeAssignmentsCount', 0] },
                  { $ifNull: ['$maxAssignments', 4] },
                ],
              },
            },
          ],
        },
      ],
    }).sort({
      activeAssignmentsCount: 1,      // Primary: Lowest active workload
      completedAssignmentsCount: 1,   // Secondary: Fair career distribution
      createdAt: 1,                   // Tertiary: Seniority tie-breaker
      _id: 1,                         // Final deterministic tie-breaker
    });

    if (!eligibleWorkers || eligibleWorkers.length === 0) {
      // Investigate the truthful reason for failure so admin & student have complete clarity
      let failureReason = `No active and available technician found with specialization matching "${norm.primary}" (${issue.category}).`;

      try {
        // Check if matching technicians exist at all in system
        const anyMatchingTechs = await User.find({
          role: 'technician',
          $or: [
            { specialization: { $in: targetSpecializations } },
            { specialization: { $regex: norm.pattern } },
          ],
        });

        if (anyMatchingTechs.length === 0) {
          failureReason = `No technician is currently registered under the "${norm.primary}" specialization. Please contact facility administration.`;
        } else {
          const availableTechs = anyMatchingTechs.filter(
            (t) => t.isActive !== false && (t.availabilityStatus === 'Available' || t.isAvailable !== false) && t.availabilityStatus !== 'Unavailable' && t.availabilityStatus !== 'Busy' && t.availabilityStatus !== 'On Leave'
          );

          if (availableTechs.length === 0) {
            failureReason = `All registered ${norm.primary} technicians are currently off-duty, busy, or on leave.`;
          } else {
            const overloadedCount = availableTechs.filter(
              (t) => (t.activeAssignmentsCount || 0) >= (t.maxAssignments || 4)
            ).length;
            if (overloadedCount === availableTechs.length) {
              failureReason = `All ${availableTechs.length} available ${norm.primary} technician(s) are currently at maximum workload capacity (${availableTechs[0]?.maxAssignments || 4} tasks). Ticket placed in priority queue.`;
            }
          }
        }
      } catch (inspectErr) {
        console.error('[FixIt AI] Error inspecting failure reason:', inspectErr.message);
      }

      // Log failure clearly for auditing & debugging
      console.warn(`[FixIt Assignment] Assignment failed for Ticket #${issue._id}: ${failureReason}`);

      // Update issue status to reflect truthful unassigned state
      issue.assignedTechnician = null;
      issue.assignedWorkerName = null;
      issue.assignmentStatus = 'failed_no_worker';
      issue.assignmentFailureReason = failureReason;
      issue.status = 'Pending Assignment';
      await issue.save();

      // Log issue timeline entry
      await IssueUpdate.create({
        issueId: issue._id,
        updatedBy: assignedById || issue.reportedBy,
        note: `Auto-assignment attempted: ${failureReason} Ticket retained as Pending Assignment.`,
      });

      // Notify all admins about the assignment failure
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          type: 'assignment_failure',
          title: 'Worker Assignment Required',
          message: `Ticket #${issue._id.toString().slice(-6)}: "${issue.title}" (${issue.category}) could not be assigned automatically. Reason: ${failureReason}`,
          issue: issue._id,
        });
      }

      // Broadcast real-time SSE update to dashboards
      eventService.broadcast('assignment_failed', {
        issueId: issue._id,
        category: issue.category,
        title: issue.title,
        message: failureReason,
      });

      return {
        success: false,
        worker: null,
        message: failureReason,
        reason: failureReason,
      };
    }

    // Try assigning to the top eligible candidate atomically
    for (const candidate of eligibleWorkers) {
      const updatedWorker = await User.findOneAndUpdate(
        {
          _id: candidate._id,
          isActive: { $ne: false },
          $or: [
            { availabilityStatus: { $in: ['Available', 'available'] } },
            { isAvailable: true },
          ],
          $expr: {
            $lt: [
              { $ifNull: ['$activeAssignmentsCount', 0] },
              { $ifNull: ['$maxAssignments', 4] },
            ],
          },
        },
        {
          $inc: { activeAssignmentsCount: 1 },
          $set: { isAvailable: true, availabilityStatus: 'Available' },
        },
        { new: true }
      );

      if (updatedWorker) {
        // Atomic acquisition succeeded!
        issue.assignedTechnician = updatedWorker._id;
        issue.assignedWorkerName = updatedWorker.name;
        issue.assignmentStatus = 'assigned';
        issue.assignmentFailureReason = null;
        issue.status = 'Assigned';
        issue.assignedAt = new Date();
        if (assignedById) {
          issue.assignedBy = assignedById;
        }
        await issue.save();

        console.log(`[FixIt Assignment] Successfully assigned Ticket #${issue._id} to ${updatedWorker.name} (${updatedWorker.specialization}, Active Load: ${updatedWorker.activeAssignmentsCount}/${updatedWorker.maxAssignments || 4})`);

        // Create assignment timeline note
        await IssueUpdate.create({
          issueId: issue._id,
          updatedBy: assignedById || updatedWorker._id,
          previousStatus: 'Pending Assignment',
          newStatus: 'Assigned',
          note: `Automatically assigned to worker: ${updatedWorker.name} (Specialization: ${updatedWorker.specialization}, Active Load: ${updatedWorker.activeAssignmentsCount}/${updatedWorker.maxAssignments || 4}).`,
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
          specialization: updatedWorker.specialization,
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
          message: `Successfully assigned to ${updatedWorker.name} (${updatedWorker.specialization})`,
        };
      }
      // If atomic update failed, candidate was claimed concurrently. Loop to next candidate!
    }
  }

  // If all attempts failed due to heavy concurrent contention
  const contentionReason = 'High concurrent assignment contention; complaint retained as Pending Assignment for automated retry.';
  issue.assignmentStatus = 'failed_no_worker';
  issue.assignmentFailureReason = contentionReason;
  issue.status = 'Pending Assignment';
  await issue.save();

  return {
    success: false,
    worker: null,
    message: contentionReason,
    reason: contentionReason,
  };
}

/**
 * Decrements worker's active assignment count safely and increments completed count
 *
 * @param {string|mongoose.Types.ObjectId} workerId
 * @param {boolean} isCompleted Whether this release corresponds to task completion
 */
async function releaseWorkerAssignment(workerId, isCompleted = true) {
  if (!workerId) return;
  const updateOp = {
    $inc: {
      activeAssignmentsCount: -1,
      ...(isCompleted ? { completedAssignmentsCount: 1 } : {}),
    },
  };

  await User.findOneAndUpdate(
    { _id: workerId, activeAssignmentsCount: { $gt: 0 } },
    updateOp
  );
}

module.exports = {
  assignBestWorker,
  releaseWorkerAssignment,
  getRequiredSpecializations,
  getNormalizedSpecializations,
};
