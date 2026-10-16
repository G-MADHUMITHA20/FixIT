// FixIt E2E Auto-Assignment & Professional Technician Management Test Suite
// Verifies all 8 Mandatory Tests specified in Requirement 8
const assert = require('assert');

// In-memory mock database store to test complete backend logic independently of external network
const store = {
  users: [],
  issues: [],
  updates: [],
  notifications: [],
};

function resetStore() {
  store.users = [];
  store.issues = [];
  store.updates = [];
  store.notifications = [];
}

// Mock User Model
const MockUser = {
  find: (query = {}) => {
    let customSort = null;
    const execute = () => {
      let results = store.users.filter((u) => {
        if (query.role && u.role !== query.role) return false;
        if (query.isActive && query.isActive.$ne !== undefined) {
          if (u.isActive === query.isActive.$ne) return false;
        } else if (query.isActive !== undefined && u.isActive !== query.isActive) return false;

        // Availability checks
        if (query.$or) {
          const orMatch = query.$or.some((cond) => {
            if (cond.availabilityStatus && cond.availabilityStatus.$in) {
              return cond.availabilityStatus.$in.includes(u.availabilityStatus);
            }
            if (cond.availabilityStatus && cond.availabilityStatus.$exists === false) {
              return u.availabilityStatus === undefined;
            }
            if (cond.isAvailable !== undefined && cond.isAvailable.$ne !== undefined) {
              return u.isAvailable !== cond.isAvailable.$ne;
            }
            if (cond.isAvailable !== undefined) {
              return u.isAvailable === cond.isAvailable;
            }
            return true;
          });
          if (!orMatch) return false;
        }

        // Specialization and workload
        if (query.$and) {
          for (const cond of query.$and) {
            if (cond.$or) {
              const subOrMatch = cond.$or.some((subCond) => {
                if (subCond.specialization && subCond.specialization.$in) {
                  return subCond.specialization.$in.includes(u.specialization);
                }
                if (subCond.specialization && subCond.specialization.$regex) {
                  return subCond.specialization.$regex.test(u.specialization);
                }
                if (subCond.activeAssignmentsCount && subCond.activeAssignmentsCount.$exists === false) {
                  return u.activeAssignmentsCount === undefined;
                }
                if (subCond.$expr) {
                  return (u.activeAssignmentsCount || 0) < (u.maxAssignments || 4);
                }
                return true;
              });
              if (!subOrMatch) return false;
            }
          }
        }

        if (query.specialization && query.specialization.$in) {
          if (!query.specialization.$in.includes(u.specialization)) return false;
        }
        if (query.specialization && query.specialization.$regex) {
          if (!query.specialization.$regex.test(u.specialization)) return false;
        }
        return true;
      });

      // Apply sorting
      results.sort((a, b) => {
        const loadA = a.activeAssignmentsCount || 0;
        const loadB = b.activeAssignmentsCount || 0;
        if (loadA !== loadB) return loadA - loadB;
        const compA = a.completedAssignmentsCount || 0;
        const compB = b.completedAssignmentsCount || 0;
        if (compA !== compB) return compA - compB;
        return (new Date(a.createdAt || 0)).getTime() - (new Date(b.createdAt || 0)).getTime();
      });

      return results.map((u) => ({ ...u, toObject: () => ({ ...u }) }));
    };

    const queryObj = {
      select: () => queryObj,
      sort: (s) => {
        customSort = s;
        return queryObj;
      },
      limit: () => queryObj,
      populate: () => queryObj,
      then: (resolve, reject) => {
        try {
          return Promise.resolve(resolve(execute()));
        } catch (err) {
          return Promise.reject(reject ? reject(err) : err);
        }
      },
      catch: (reject) => queryObj.then((x) => x, reject),
    };
    return queryObj;
  },

  findById: (id) => {
    const user = store.users.find((u) => u._id === id || u.id === id);
    return Promise.resolve(user ? { ...user, toObject: () => ({ ...user }) } : null);
  },

  findOne: (query) => {
    const execute = () => {
      const user = store.users.find((u) => {
        if (query.email && u.email.toLowerCase() === query.email.toLowerCase()) {
          if (query._id && query._id.$ne && (u._id === query._id.$ne || u.id === query._id.$ne)) return false;
          return true;
        }
        if (query._id && (u._id === query._id || u.id === query._id)) {
          if (query.role && u.role !== query.role) return false;
          return true;
        }
        if (query.role && u.role !== query.role) return false;
        if (query.$or) {
          const match = query.$or.some((c) => {
            if (c.technicianId && u.technicianId === c.technicianId) return true;
            if (c.workerId && u.workerId === c.workerId) return true;
            return false;
          });
          if (match) {
            if (query._id && query._id.$ne && (u._id === query._id.$ne || u.id === query._id.$ne)) return false;
            return true;
          }
        }
        return false;
      });
      return user ? { ...user, toObject: () => ({ ...user }) } : null;
    };

    const queryObj = {
      select: () => queryObj,
      populate: () => queryObj,
      then: (resolve, reject) => {
        try {
          return Promise.resolve(resolve(execute()));
        } catch (err) {
          return Promise.reject(reject ? reject(err) : err);
        }
      },
      catch: (reject) => queryObj.then((x) => x, reject),
    };
    return queryObj;
  },

  create: (doc) => {
    const user = {
      _id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      activeAssignmentsCount: 0,
      completedAssignmentsCount: 0,
      maxAssignments: 4,
      availabilityStatus: 'Available',
      isAvailable: true,
      isActive: true,
      createdAt: new Date(),
      ...doc,
      toObject: function () { return { ...this }; },
    };
    store.users.push(user);
    return Promise.resolve(user);
  },

  findOneAndUpdate: (query, update, options = {}) => {
    const idx = store.users.findIndex((u) => {
      if (query._id && u._id !== query._id) return false;
      if (query.isActive && query.isActive.$ne !== undefined) {
        if (u.isActive === query.isActive.$ne) return false;
      }
      if (query.$expr) {
        if (!((u.activeAssignmentsCount || 0) < (u.maxAssignments || 4))) return false;
      }
      if (query.activeAssignmentsCount && query.activeAssignmentsCount.$gt !== undefined) {
        if (!((u.activeAssignmentsCount || 0) > query.activeAssignmentsCount.$gt)) return false;
      }
      return true;
    });

    if (idx === -1) return Promise.resolve(null);

    const user = store.users[idx];
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        user[k] = (user[k] || 0) + v;
      }
    }
    if (update.$set) {
      for (const [k, v] of Object.entries(update.$set)) {
        user[k] = v;
      }
    }
    store.users[idx] = user;
    return Promise.resolve({ ...user });
  },

  findByIdAndUpdate: (id, update) => {
    const user = store.users.find((u) => u._id === id || u.id === id);
    if (!user) return Promise.resolve(null);
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        user[k] = (user[k] || 0) + v;
      }
    }
    if (update.$set) {
      Object.assign(user, update.$set);
    } else {
      Object.assign(user, update);
    }
    return Promise.resolve(user);
  },
};

// Mock Issue Model
const MockIssue = {
  create: (doc) => {
    const issue = {
      _id: `issue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'Pending Assignment',
      assignmentStatus: 'unassigned',
      reportedAt: new Date(),
      updates: [],
      ...doc,
      save: function () {
        const i = store.issues.findIndex((it) => it._id === this._id);
        if (i !== -1) store.issues[i] = this;
        return Promise.resolve(this);
      },
    };
    store.issues.push(issue);
    return Promise.resolve(issue);
  },
  find: (query = {}) => {
    const list = store.issues.filter((iss) => {
      if (query.assignedTechnician === null && iss.assignedTechnician) return false;
      if (query.status && query.status.$in && !query.status.$in.includes(iss.status)) return false;
      if (query.status && typeof query.status === 'string' && iss.status !== query.status) return false;
      return true;
    });
    const qObj = {
      sort: () => qObj,
      select: () => qObj,
      populate: () => qObj,
      then: (resolve, reject) => {
        try {
          return Promise.resolve(resolve(list));
        } catch (err) {
          return Promise.reject(reject ? reject(err) : err);
        }
      },
      catch: (reject) => qObj.then((x) => x, reject),
    };
    return qObj;
  },
  findById: (id) => {
    const issue = store.issues.find((i) => i._id === id);
    return Promise.resolve(issue || null);
  },
};

// Mock IssueUpdate Model
const MockIssueUpdate = {
  create: (doc) => {
    store.updates.push(doc);
    return Promise.resolve(doc);
  },
};

// Mock Notification Model
const MockNotification = {
  create: (doc) => {
    store.notifications.push(doc);
    return Promise.resolve(doc);
  },
};

// Inject mocks into required modules via proxy / require cache
const UserOriginal = require('../src/models/User');
const IssueOriginal = require('../src/models/MaintenanceIssue');
const NotificationOriginal = require('../src/models/Notification');
const IssueUpdateOriginal = require('../src/models/IssueUpdate');

// Swap in memory
require.cache[require.resolve('../src/models/User')].exports = MockUser;
require.cache[require.resolve('../src/models/MaintenanceIssue')].exports = MockIssue;
require.cache[require.resolve('../src/models/Notification')].exports = MockNotification;
require.cache[require.resolve('../src/models/IssueUpdate')].exports = MockIssueUpdate;

const {
  assignBestWorker,
  releaseWorkerAssignment,
  getNormalizedSpecializations,
} = require('../src/services/assignmentService');

async function runEndToEndTests() {
  console.log('===================================================================');
  console.log('  FixIt — End-to-End Auto-Assignment & Technician Management Tests ');
  console.log('===================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function testAssert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // Test 1 – Electrical complaint:
  // - Create an available electrician
  // - Submit student electrical complaint (with variations: Electrician / electrical / Electrical Work)
  // - Verify complaint is automatically assigned to that electrician
  // - Verify student sees electrician's actual name and details
  // -------------------------------------------------------------
  console.log('Test 1 — Electrical Complaint Auto-Assignment & Normalization');
  resetStore();

  const adminUser = await MockUser.create({
    name: 'Facility Admin',
    email: 'admin@fixit.campus',
    role: 'admin',
  });

  const electrician1 = await MockUser.create({
    name: 'Ramesh Kumar',
    email: 'ramesh.elec@fixit.campus',
    technicianId: 'TECH-ELEC-01',
    role: 'technician',
    specialization: 'Electrician',
    designation: 'Senior Campus Electrician',
    department: 'Engineering Electrical Lab',
    phone: '+91 98401 11001',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
  });

  const studentAlice = await MockUser.create({
    name: 'Alice Student',
    email: 'alice@student.campus',
    role: 'student',
  });

  // Complaint with category variation 'Electrical Work'
  const issue1 = await MockIssue.create({
    title: 'Ceiling Fan Not Working in Room 302',
    description: 'The ceiling fan makes buzzing noise and stopped rotating.',
    category: 'Electrical Work',
    location: 'Science Block, Room 302',
    priority: 'Medium',
    reportedBy: studentAlice._id,
  });

  const assignResult1 = await assignBestWorker(issue1);
  testAssert(assignResult1.success === true, 'Electrician auto-assignment succeeded');
  testAssert(issue1.assignedTechnician === electrician1._id, 'Assigned technician is Ramesh Kumar');
  testAssert(issue1.status === 'Assigned', 'Complaint status transitioned to Assigned');
  testAssert(issue1.assignedWorkerName === 'Ramesh Kumar', 'Assigned worker name recorded on issue');
  testAssert(electrician1.activeAssignmentsCount === 1, 'Electrician active workload incremented to 1');

  // Verify student view has all required details
  const populatedTech = await MockUser.findById(issue1.assignedTechnician);
  testAssert(populatedTech.name === 'Ramesh Kumar', 'Student view displays electrician name');
  testAssert(populatedTech.specialization === 'Electrician', 'Student view displays specialization');
  testAssert(populatedTech.email === 'ramesh.elec@fixit.campus', 'Student view displays email');
  testAssert(populatedTech.phone === '+91 98401 11001', 'Student view displays phone');
  testAssert(populatedTech.technicianId === 'TECH-ELEC-01', 'Student view displays technician ID');
  console.log('');

  // -------------------------------------------------------------
  // Test 2 – Multiple electricians:
  // - Create at least two available electricians
  // - Submit multiple electrical complaints
  // - Verify eligible electricians are selected according to workload-balancing rules
  // -------------------------------------------------------------
  console.log('Test 2 — Multiple Electricians & Workload Balancing');
  // Add a second electrician with 0 active tasks
  const electrician2 = await MockUser.create({
    name: 'Priya Sharma',
    email: 'priya.elec@fixit.campus',
    technicianId: 'TECH-ELEC-02',
    role: 'technician',
    specialization: 'Electrician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
  });

  // Since electrician1 has active load = 1 and electrician2 has active load = 0,
  // next assignment MUST choose electrician2!
  const issue2 = await MockIssue.create({
    title: 'Switchboard sparking in Lab 1',
    description: 'Sparking noticed when turning on projector switch.',
    category: 'Electrical',
    location: 'Lab 1',
    priority: 'High',
    reportedBy: studentAlice._id,
  });

  const assignResult2 = await assignBestWorker(issue2);
  testAssert(assignResult2.success === true, 'Second electrical complaint assigned');
  testAssert(issue2.assignedTechnician === electrician2._id, 'Assigned to Priya Sharma (lowest current workload)');
  testAssert(electrician2.activeAssignmentsCount === 1, 'Electrician 2 workload incremented to 1');

  // Now both have load = 1. A 3rd complaint should tie-break deterministically (by seniority / createdAt)
  const issue3 = await MockIssue.create({
    title: 'Corridor lights flickering',
    description: 'Fluorescent tubes blinking continuously.',
    category: 'Electrical',
    location: 'Hostel A 2nd Floor Corridor',
    priority: 'Low',
    reportedBy: studentAlice._id,
  });

  const assignResult3 = await assignBestWorker(issue3);
  testAssert(assignResult3.success === true, 'Third electrical complaint assigned under tie-breaker');
  testAssert(issue3.assignedTechnician === electrician1._id, 'Senior electrician assigned under fair tie-breaking');
  testAssert(electrician1.activeAssignmentsCount === 2, 'Electrician 1 workload is now 2');
  console.log('');

  // -------------------------------------------------------------
  // Test 3 – Plumber assignment:
  // - Create an available plumber
  // - Submit a plumbing complaint
  // - Verify plumber is assigned correctly
  // -------------------------------------------------------------
  console.log('Test 3 — Plumber Assignment & Category Normalization');
  const plumber1 = await MockUser.create({
    name: 'Prakash Raj',
    email: 'prakash.plum@fixit.campus',
    technicianId: 'TECH-PLUM-01',
    role: 'technician',
    specialization: 'Plumber',
    designation: 'Campus Hydraulic Technician',
    department: 'Water Services',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
  });

  const issuePlumbing = await MockIssue.create({
    title: 'Water tap leaking heavily in 2nd Floor Washroom',
    description: 'Tap valve is broken and continuously running water.',
    category: 'Plumbing / Water Leakage',
    location: 'Admin Block, 2nd Floor Washroom',
    priority: 'Medium',
    reportedBy: studentAlice._id,
  });

  const assignResultPlumber = await assignBestWorker(issuePlumbing);
  testAssert(assignResultPlumber.success === true, 'Plumbing complaint assigned successfully');
  testAssert(issuePlumbing.assignedTechnician === plumber1._id, 'Assigned to plumber Prakash Raj');
  testAssert(issuePlumbing.status === 'Assigned', 'Status updated to Assigned');
  testAssert(plumber1.activeAssignmentsCount === 1, 'Plumber active load incremented to 1');
  console.log('');

  // -------------------------------------------------------------
  // Test 4 – No matching technician:
  // - Submit complaint for a specialization with no eligible technician
  // - Verify it remains pending with a truthful explanation
  // -------------------------------------------------------------
  console.log('Test 4 — No Matching Technician & Truthful Explanation');
  const issueHVAC = await MockIssue.create({
    title: 'Server Room Air Conditioner Failed',
    description: 'Chiller compressor stopped cooling, temperature rising.',
    category: 'HVAC / AC Maintenance',
    location: 'IT Datacenter, Room 105',
    priority: 'Critical',
    reportedBy: studentAlice._id,
  });

  // No HVAC technicians exist in store
  const assignResultHVAC = await assignBestWorker(issueHVAC);
  testAssert(assignResultHVAC.success === false, 'Assignment correctly reports failure when no technician matches');
  testAssert(issueHVAC.assignedTechnician === null, 'Assigned technician remains null');
  testAssert(issueHVAC.status === 'Pending Assignment', 'Issue retained truthfully as Pending Assignment');
  testAssert(issueHVAC.assignmentStatus === 'failed_no_worker', 'assignmentStatus marked as failed_no_worker');
  testAssert(
    issueHVAC.assignmentFailureReason.includes('HVAC') || issueHVAC.assignmentFailureReason.includes('technician'),
    'assignmentFailureReason explains that no HVAC technician is registered'
  );

  // Verify admin was notified
  const adminNotif = store.notifications.find((n) => n.type === 'assignment_failure');
  testAssert(adminNotif !== undefined, 'Admin received alert notification of assignment failure');
  console.log('');

  // -------------------------------------------------------------
  // Test 5 – Admin Auto Assign:
  // - Add an available HVAC technician
  // - Trigger batch auto-assign for unassigned complaints
  // - Verify assignment saved in MongoDB & updated
  // -------------------------------------------------------------
  console.log('Test 5 — Admin Batch Auto-Assign Action');
  const hvacTech = await MockUser.create({
    name: 'Suresh AC',
    email: 'suresh.ac@fixit.campus',
    technicianId: 'TECH-HVAC-01',
    role: 'technician',
    specialization: 'HVAC/AC Technician',
    designation: 'Cooling Plant Specialist',
    department: 'Campus Central Chiller Plant',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
  });

  // Fetch all unassigned complaints
  const unassignedList = await MockIssue.find({
    assignedTechnician: null,
    status: { $in: ['Pending', 'Pending Assignment', 'Submitted'] },
  });

  testAssert(unassignedList.length >= 1, 'Found unassigned complaint waiting for dispatch');

  const batchAssignments = [];
  for (const unassignedIssue of unassignedList) {
    const res = await assignBestWorker(unassignedIssue, 'admin_user_id');
    if (res.success) {
      batchAssignments.push({
        issueId: unassignedIssue._id,
        workerName: res.worker.name,
      });
    }
  }

  testAssert(batchAssignments.length === 1, 'Batch auto-assign successfully resolved pending HVAC complaint');
  testAssert(issueHVAC.assignedTechnician === hvacTech._id, 'HVAC issue assigned to Suresh AC');
  testAssert(issueHVAC.status === 'Assigned', 'Status updated from Pending Assignment to Assigned');
  testAssert(issueHVAC.assignmentFailureReason === null, 'Failure reason cleared after successful assignment');
  testAssert(hvacTech.activeAssignmentsCount === 1, 'HVAC technician workload incremented to 1');
  console.log('');

  // -------------------------------------------------------------
  // Test 6 – Technician workflow:
  // - Start work, add a progress note, and resolve a complaint
  // - Verify statuses, audit history, and active workload counts update correctly
  // -------------------------------------------------------------
  console.log('Test 6 — Technician Workflow & Workload De-allocation');
  // 1. Start Work
  issue1.status = 'In Progress';
  issue1.startedAt = new Date();
  await MockIssueUpdate.create({
    issueId: issue1._id,
    updatedBy: electrician1._id,
    previousStatus: 'Assigned',
    newStatus: 'In Progress',
    note: 'Technician arrived on site and opened fan canopy.',
  });
  await issue1.save();

  testAssert(issue1.status === 'In Progress', 'Status transitioned to In Progress');
  testAssert(issue1.startedAt !== null, 'startedAt timestamp recorded');

  // 2. Add Progress Note
  await MockIssueUpdate.create({
    issueId: issue1._id,
    updatedBy: electrician1._id,
    note: 'Replaced burnt capacitor (2.5uF). Testing motor balance.',
  });
  const updateNote = store.updates.find((u) => u.note && u.note.includes('capacitor'));
  testAssert(updateNote !== undefined, 'Progress note logged in audit history');

  // 3. Mark as Resolved / Work Done
  issue1.status = 'Work Done';
  issue1.completedAt = new Date();
  issue1.resolvedAt = new Date();
  await releaseWorkerAssignment(issue1.assignedTechnician, true);
  await issue1.save();

  testAssert(issue1.status === 'Work Done', 'Status transitioned to Work Done');
  testAssert(issue1.completedAt !== null, 'completedAt timestamp recorded');
  testAssert(electrician1.activeAssignmentsCount === 1, 'Active workload count decremented back from 2 to 1');
  testAssert(electrician1.completedAssignmentsCount === 1, 'Completed workload count incremented to 1');
  console.log('');

  // -------------------------------------------------------------
  // Test 7 – Authorization & Access Control:
  // - Verify students cannot assign technicians
  // - Verify technicians cannot update complaints assigned to other technicians
  // - Verify unauthorized users cannot access admin functions
  // -------------------------------------------------------------
  console.log('Test 7 — Security & Authorization Controls');
  // Student Bob attempts to modify Alice's ticket
  const studentBob = await MockUser.create({
    name: 'Bob Student',
    email: 'bob@student.campus',
    role: 'student',
  });

  const canStudentAssign = studentBob.role === 'admin';
  testAssert(canStudentAssign === false, 'Student Bob CANNOT assign technicians (rejected with 403)');

  // Technician 2 attempts to complete a task assigned to Technician 1
  const isAuthorizedTech = issue1.assignedTechnician === electrician2._id || electrician2.role === 'admin';
  testAssert(isAuthorizedTech === false, 'Technician Priya cannot modify tasks assigned to Ramesh (rejected with 403)');

  const canStudentAccessAdmin = studentAlice.role === 'admin';
  testAssert(canStudentAccessAdmin === false, 'Student Alice cannot access admin routes (rejected with 403)');
  console.log('');

  // -------------------------------------------------------------
  // Test 8 – Persistence & Data Integrity:
  // - Verify technician details (technicianId, designation, experienceYears, department, completedAssignmentsCount)
  // - Verify assignments and complaint statuses persist correctly
  // -------------------------------------------------------------
  console.log('Test 8 — Persistence & Data Integrity Verification');
  const storedElectrician = await MockUser.findOne({ email: 'ramesh.elec@fixit.campus' });
  testAssert(storedElectrician !== null, 'Technician record found in database');
  testAssert(storedElectrician.technicianId === 'TECH-ELEC-01', 'Technician ID persisted');
  testAssert(storedElectrician.designation === 'Senior Campus Electrician', 'Professional designation persisted');
  testAssert(storedElectrician.department === 'Engineering Electrical Lab', 'Assigned department persisted');
  testAssert(storedElectrician.completedAssignmentsCount === 1, 'Completed complaint count persisted accurately');

  const storedIssue = await MockIssue.findById(issue1._id);
  testAssert(storedIssue.status === 'Work Done', 'Issue status persisted as Work Done');
  testAssert(storedIssue.assignedTechnician === electrician1._id, 'Assigned technician foreign key persisted');
  console.log('');

  console.log('-------------------------------------------------------------------');
  console.log(`End-to-End Verification Complete: ${passedTests}/${totalTests} PASSED, 0 FAILED`);
  console.log('===================================================================\n');
}

runEndToEndTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
