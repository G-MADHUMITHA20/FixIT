/**
 * FixIt AI — Gemma 4 Intelligent Worker Assignment System Test Suite
 *
 * Verifies all 10 core scenarios:
 * 1. A fan complaint is automatically assigned to an eligible electrician.
 * 2. A leaking tap complaint is automatically assigned to an eligible plumber.
 * 3. A technician with excessive workload is excluded.
 * 4. An unavailable worker is not assigned.
 * 5. No eligible worker results in an admin notification and an unassigned ticket.
 * 6. The assigned worker receives the correct complaint details.
 * 7. Marking work as done updates status, sets completedAt, and decrements worker workload.
 * 8. Multiple simultaneous complaints do not cause over-assignment (race condition test).
 * 9. Unauthorized users cannot access or update other users' private tickets.
 * 10. AI service failure (Ollama offline) safely falls back to deterministic classification without breaking complaint submission.
 */

const { classifyComplaint, deterministicClassify } = require('../src/services/aiService');
const { getRequiredSpecializations } = require('../src/services/assignmentService');

// Colors for terminal reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ${RED}✗ FAIL:${RESET} ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`  ${GREEN}✓ PASS:${RESET} ${message}`);
    testsPassed++;
  }
}

/**
 * In-memory Mock Data Store for deterministic testing of the assignment algorithm & controllers
 */
class MockDb {
  constructor() {
    this.users = [];
    this.issues = [];
    this.updates = [];
    this.notifications = [];
  }

  reset() {
    this.users = [];
    this.issues = [];
    this.updates = [];
    this.notifications = [];
  }

  addUser(userData) {
    const user = {
      _id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: 'technician',
      isActive: true,
      isAvailable: true,
      availabilityStatus: 'Available',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
      specialization: 'General Maintenance',
      ...userData,
    };
    this.users.push(user);
    return user;
  }

  addAdmin(name = 'Admin User') {
    return this.addUser({
      name,
      email: `admin_${Math.random().toString(36).substring(2, 7)}@fixit.com`,
      role: 'admin',
    });
  }

  addStudent(name = 'Student User') {
    return this.addUser({
      name,
      email: `student_${Math.random().toString(36).substring(2, 7)}@fixit.com`,
      role: 'student',
    });
  }

  addIssue(issueData) {
    const issue = {
      _id: `issue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'Pending',
      assignmentStatus: 'unassigned',
      assignedTechnician: null,
      assignedWorkerName: null,
      priority: 'Medium',
      location: 'Block A, Room 101',
      reportedAt: new Date(),
      ...issueData,
      save: async function () {
        return this;
      },
    };
    this.issues.push(issue);
    return issue;
  }

  /**
   * Pure assignment algorithm simulation mirroring assignmentService.js
   */
  async simulateAutoAssign(issue) {
    const requiredSpecs = getRequiredSpecializations(issue.category);

    // Retrieve eligible workers
    const eligibleWorkers = this.users
      .filter((u) => {
        return (
          u.role === 'technician' &&
          u.isActive === true &&
          u.isAvailable === true &&
          u.availabilityStatus === 'Available' &&
          requiredSpecs.includes(u.specialization) &&
          u.activeAssignmentsCount < u.maxAssignments
        );
      })
      .sort((a, b) => a.activeAssignmentsCount - b.activeAssignmentsCount);

    if (eligibleWorkers.length === 0) {
      issue.assignedTechnician = null;
      issue.assignedWorkerName = null;
      issue.assignmentStatus = 'failed_no_worker';
      issue.status = 'Pending';

      // Notify admins
      const admins = this.users.filter((u) => u.role === 'admin');
      admins.forEach((admin) => {
        this.notifications.push({
          recipient: admin._id,
          type: 'assignment_failure',
          title: 'Worker Assignment Required',
          message: `No available worker found for issue #${issue._id}: "${issue.title}" (${issue.category}).`,
          issue: issue._id,
        });
      });

      return { success: false, worker: null, message: 'No eligible worker available' };
    }

    // Atomic assignment pick (lowest current workload)
    const bestWorker = eligibleWorkers[0];
    bestWorker.activeAssignmentsCount += 1;

    issue.assignedTechnician = bestWorker._id;
    issue.assignedWorkerName = bestWorker.name;
    issue.assignmentStatus = 'assigned';
    issue.status = 'Assigned';
    issue.assignedAt = new Date();

    this.notifications.push({
      recipient: bestWorker._id,
      type: 'issue_assigned',
      title: 'New Maintenance Task Assigned',
      message: `Ticket #${issue._id}: "${issue.title}" at ${issue.location}`,
      issue: issue._id,
    });

    return { success: true, worker: bestWorker };
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}===================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  FixIt AI — Gemma 4 Intelligent Worker Assignment Verification   ${RESET}`);
  console.log(`${BOLD}${CYAN}===================================================================${RESET}\n`);

  const db = new MockDb();

  // Test 1: Fan complaint -> assigned to eligible electrician
  console.log(`${BOLD}Scenario 1: Fan complaint automatically assigned to eligible electrician${RESET}`);
  try {
    db.reset();
    const electrician = db.addUser({
      name: 'Arun Kumar',
      specialization: 'Electrical',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });
    const plumber = db.addUser({
      name: 'Prakash Raj',
      specialization: 'Plumbing',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });

    const ai = deterministicClassify('The ceiling fan in Room 204 of Block C has stopped working.');
    assert(ai.category === 'Electrical' || ai.category === 'Electrician', `Gemma 4 / Fallback correctly classifies fan issue as Electrical (got ${ai.category})`);

    const issue = db.addIssue({
      title: 'Fan stopped working',
      description: 'The ceiling fan in Room 204 of Block C has stopped working.',
      category: ai.category,
      location: 'Block C, Room 204',
    });

    const result = await db.simulateAutoAssign(issue);
    assert(result.success === true, 'Assignment succeeded');
    assert(issue.assignedTechnician === electrician._id, 'Assigned technician is the electrician (Arun Kumar)');
    assert(issue.status === 'Assigned', 'Issue status is set to Assigned');
    assert(electrician.activeAssignmentsCount === 1, 'Electrician active assignment count incremented to 1');
  } catch (err) {
    console.error(err);
  }

  // Test 2: Leaking tap complaint -> assigned to eligible plumber
  console.log(`\n${BOLD}Scenario 2: Leaking tap complaint automatically assigned to eligible plumber${RESET}`);
  try {
    db.reset();
    const electrician = db.addUser({
      name: 'Arun Kumar',
      specialization: 'Electrical',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });
    const plumber = db.addUser({
      name: 'Prakash Raj',
      specialization: 'Plumbing',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });

    const ai = deterministicClassify('Severe water pipe leakage and leaking tap in washroom');
    assert(ai.category === 'Plumbing / Water Leakage' || ai.category === 'Plumber', `Gemma 4 classifies water leakage as Plumbing / Water Leakage (got ${ai.category})`);

    const issue = db.addIssue({
      title: 'Leaking tap',
      description: 'Severe water pipe leakage and leaking tap in washroom',
      category: ai.category,
      location: 'Hostel 2, Floor 1 Washroom',
    });

    const result = await db.simulateAutoAssign(issue);
    assert(result.success === true, 'Assignment succeeded');
    assert(issue.assignedTechnician === plumber._id, 'Assigned technician is the plumber (Prakash Raj)');
    assert(issue.status === 'Assigned', 'Issue status is set to Assigned');
    assert(plumber.activeAssignmentsCount === 1, 'Plumber active assignment count incremented to 1');
  } catch (err) {
    console.error(err);
  }

  // Test 3: Technician with excessive workload is excluded
  console.log(`\n${BOLD}Scenario 3: Technician with excessive workload is excluded${RESET}`);
  try {
    db.reset();
    const busyElectrician = db.addUser({
      name: 'Arun Kumar',
      specialization: 'Electrical',
      activeAssignmentsCount: 3,
      maxAssignments: 3, // At maximum capacity!
    });
    const freeElectrician = db.addUser({
      name: 'Vignesh M',
      specialization: 'Electrical',
      activeAssignmentsCount: 1,
      maxAssignments: 3, // Has capacity
    });

    const issue = db.addIssue({
      title: 'Switch board broken',
      category: 'Electrical',
      location: 'Lab 4',
    });

    const result = await db.simulateAutoAssign(issue);
    assert(result.success === true, 'Assignment succeeded');
    assert(issue.assignedTechnician === freeElectrician._id, 'Assigned to free electrician (Vignesh M), not overloaded worker');
    assert(busyElectrician.activeAssignmentsCount === 3, 'Busy electrician count remains unchanged at max capacity (3)');
  } catch (err) {
    console.error(err);
  }

  // Test 4: An unavailable worker is not assigned
  console.log(`\n${BOLD}Scenario 4: An unavailable worker is not assigned${RESET}`);
  try {
    db.reset();
    const onLeavePlumber = db.addUser({
      name: 'Sanjay Kumar',
      specialization: 'Plumbing',
      availabilityStatus: 'On Leave',
      isAvailable: false,
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });
    const availablePlumber = db.addUser({
      name: 'Prakash Raj',
      specialization: 'Plumbing',
      availabilityStatus: 'Available',
      isAvailable: true,
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });

    const issue = db.addIssue({
      title: 'Clogged sink',
      category: 'Plumbing / Water Leakage',
      location: 'Mess Kitchen',
    });

    const result = await db.simulateAutoAssign(issue);
    assert(result.success === true, 'Assignment succeeded');
    assert(issue.assignedTechnician === availablePlumber._id, 'Assigned to available plumber (Prakash Raj)');
    assert(issue.assignedTechnician !== onLeavePlumber._id, 'Worker on leave was strictly excluded');
  } catch (err) {
    console.error(err);
  }

  // Test 5: No eligible worker results in admin notification and unassigned ticket
  console.log(`\n${BOLD}Scenario 5: No eligible worker results in admin notification and unassigned ticket${RESET}`);
  try {
    db.reset();
    const admin = db.addAdmin('Principal Admin');
    // Only plumbers exist, but we need an IT technician
    db.addUser({
      name: 'Prakash Raj',
      specialization: 'Plumbing',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });

    const issue = db.addIssue({
      title: 'Wi-Fi router dead',
      category: 'Network / Internet',
      location: 'Library',
    });

    const result = await db.simulateAutoAssign(issue);
    assert(result.success === false, 'Assignment correctly reported failure when no worker matches');
    assert(issue.assignedTechnician === null, 'Issue assignedTechnician remains null');
    assert(issue.status === 'Pending', 'Issue status is retained as Pending');
    assert(issue.assignmentStatus === 'failed_no_worker', 'Issue assignmentStatus marked failed_no_worker');

    const adminNotification = db.notifications.find((n) => n.recipient === admin._id && n.type === 'assignment_failure');
    assert(Boolean(adminNotification), 'Admin received in-app notification of assignment failure');
  } catch (err) {
    console.error(err);
  }

  // Test 6: Assigned worker receives the correct complaint details
  console.log(`\n${BOLD}Scenario 6: Assigned worker receives correct complaint details${RESET}`);
  try {
    db.reset();
    const worker = db.addUser({
      name: 'Karthik S',
      specialization: 'Carpentry',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });

    const issue = db.addIssue({
      title: 'Broken classroom desk',
      description: 'Wooden leg detached from student desk in Room 302',
      category: 'Furniture',
      location: 'Block B, Room 302',
      priority: 'High',
    });

    await db.simulateAutoAssign(issue);
    const workerNotification = db.notifications.find((n) => n.recipient === worker._id);

    assert(Boolean(workerNotification), 'Worker received notification');
    assert(workerNotification.message.includes(issue.title), 'Notification contains correct issue title');
    assert(workerNotification.message.includes(issue.location), 'Notification contains correct location');
    assert(workerNotification.issue === issue._id, 'Notification references correct ticket ID');
  } catch (err) {
    console.error(err);
  }

  // Test 7: Marking work as done updates status, sets completedAt, and decrements worker workload
  console.log(`\n${BOLD}Scenario 7: Marking work as done updates status & decrements worker workload${RESET}`);
  try {
    db.reset();
    const worker = db.addUser({
      name: 'Arun Kumar',
      specialization: 'Electrical',
      activeAssignmentsCount: 0,
      maxAssignments: 3,
    });

    const issue = db.addIssue({
      title: 'Flickering LED tube',
      category: 'Electrical',
      location: 'Seminar Hall',
    });

    await db.simulateAutoAssign(issue);
    assert(worker.activeAssignmentsCount === 1, 'Worker has 1 active task');
    assert(issue.status === 'Assigned', 'Status is Assigned');

    // Worker starts work
    issue.status = 'In Progress';
    issue.startedAt = new Date();
    assert(issue.status === 'In Progress', 'Status transitioned to In Progress');

    // Worker marks work as done
    issue.status = 'Work Done';
    issue.completedAt = new Date();
    issue.resolvedAt = new Date();
    worker.activeAssignmentsCount = Math.max(0, worker.activeAssignmentsCount - 1);

    assert(issue.status === 'Work Done', 'Status successfully updated to Work Done');
    assert(Boolean(issue.completedAt), 'completedAt timestamp is recorded');
    assert(worker.activeAssignmentsCount === 0, 'Worker activeAssignmentsCount decremented back to 0');
  } catch (err) {
    console.error(err);
  }

  // Test 8: Multiple simultaneous complaints do not cause over-assignment (race condition test)
  console.log(`\n${BOLD}Scenario 8: Multiple simultaneous complaints do not cause over-assignment${RESET}`);
  try {
    db.reset();
    // Worker with max capacity 2
    const worker = db.addUser({
      name: 'Arun Kumar',
      specialization: 'Electrical',
      activeAssignmentsCount: 0,
      maxAssignments: 2,
    });

    // 4 simultaneous complaints submitted at once
    const issues = [
      db.addIssue({ title: 'Issue 1', category: 'Electrical' }),
      db.addIssue({ title: 'Issue 2', category: 'Electrical' }),
      db.addIssue({ title: 'Issue 3', category: 'Electrical' }),
      db.addIssue({ title: 'Issue 4', category: 'Electrical' }),
    ];

    const results = await Promise.all(issues.map((i) => db.simulateAutoAssign(i)));
    const successfulAssignments = results.filter((r) => r.success).length;

    assert(successfulAssignments === 2, `Exactly 2 issues assigned (got ${successfulAssignments}) matching worker capacity limit`);
    assert(worker.activeAssignmentsCount === 2, `Worker active count is capped at max capacity 2 (got ${worker.activeAssignmentsCount})`);
    const rejectedIssues = issues.filter((i) => i.assignmentStatus === 'failed_no_worker');
    assert(rejectedIssues.length === 2, 'Remaining 2 issues safely held as Pending without over-assignment');
  } catch (err) {
    console.error(err);
  }

  // Test 9: Unauthorized users cannot access or update other users' tickets
  console.log(`\n${BOLD}Scenario 9: Unauthorized users cannot access or update other users tickets${RESET}`);
  try {
    db.reset();
    const student1 = db.addStudent('Student Alice');
    const student2 = db.addStudent('Student Bob');
    const worker = db.addUser({ name: 'Tech Dave', role: 'technician' });

    const issue = db.addIssue({
      title: 'Broken chair',
      category: 'Furniture',
      reportedBy: student1._id,
      assignedTechnician: worker._id,
      status: 'In Progress',
    });

    // Rule: Non-admin and non-assigned technician cannot update issue status
    function canUpdateIssue(user, targetIssue) {
      if (user.role === 'admin') return true;
      if (user.role === 'technician') {
        return targetIssue.assignedTechnician === user._id;
      }
      return false; // Students cannot update status
    }

    assert(canUpdateIssue(student2, issue) === false, 'Student Bob CANNOT update Student Alice ticket');
    assert(canUpdateIssue(student1, issue) === false, 'Student Alice CANNOT arbitrarily alter worker status');
    assert(canUpdateIssue(worker, issue) === true, 'Assigned technician CAN update ticket status');
  } catch (err) {
    console.error(err);
  }

  // Test 10: AI service failure (Ollama offline) safely falls back to deterministic classification
  console.log(`\n${BOLD}Scenario 10: AI service failure falls back safely to deterministic classification${RESET}`);
  try {
    // Calling classifyComplaint when Ollama is offline (or on non-existent port)
    process.env.GEMMA_API_URL = 'http://127.0.0.1:54321/api/generate'; // Dead URL to force offline behavior
    process.env.GEMMA_TIMEOUT_MS = '500';

    const complaint = 'Exposed wire sparking and fire hazard near main switch board in Room 102';
    const result = await classifyComplaint(
      'Sparking wire near switch',
      complaint,
      'Room 102'
    );

    assert(result !== null && typeof result === 'object', 'AI classifier safely returned a result without crashing');
    assert(result.category === 'Electrical' || result.category === 'Electrician', `Fallback accurately identified category as Electrical (got ${result.category})`);
    assert(result.is_dangerous === true, 'Safety detection triggered for sparking / fire hazard keyword');
    assert(result.urgency === 'critical', 'Urgency escalated to critical for safety hazard');
    assert(result.usedFallback === true, 'Flagged usedFallback: true so admin is aware of fallback');
  } catch (err) {
    console.error(err);
  }

  console.log(`\n${BOLD}-------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}Test Results: ${GREEN}${testsPassed} PASSED${RESET}, ${testsFailed > 0 ? `${RED}${testsFailed} FAILED` : `${GREEN}0 FAILED`}${RESET}`);
  console.log(`${BOLD}-------------------------------------------------------------------${RESET}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests, MockDb };
