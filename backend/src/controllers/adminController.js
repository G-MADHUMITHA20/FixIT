const User = require('../models/User');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const eventService = require('../services/eventService');
const { assignBestWorker } = require('../services/assignmentService');
const { seedTechnicians, DEMO_WORKERS_32 } = require('../../scripts/seedTechnicians');

// @desc    Create staff account
// @route   POST /api/admin/staff
// @access  Private/Admin
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    if (process.env.COLLEGE_EMAIL_DOMAIN && !email.endsWith(`@${process.env.COLLEGE_EMAIL_DOMAIN}`)) {
      return res.status(400).json({ success: false, message: `Please use a valid @${process.env.COLLEGE_EMAIL_DOMAIN} email address` });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'staff',
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Seed or synchronize 32 demo workers (4 per specialization)
// @route   POST /api/admin/workers/seed-demo
// @access  Private/Admin
exports.seedDemoWorkers = async (req, res) => {
  try {
    const result = await seedTechnicians();
    eventService.broadcast('worker_created', {
      action: 'seed_demo_workers',
      total: result.total,
    });
    res.status(200).json({
      success: true,
      message: `Successfully initialized ${result.total} demo workers across all specializations.`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create technician / worker account with professional details & validation
// @route   POST /api/admin/technicians or /api/admin/workers
// @access  Private/Admin
exports.createTechnician = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      workerId = '',
      technicianId = '',
      specialization = 'General Maintenance',
      designation = 'Facilities Technician',
      experienceYears = 2,
      department = 'Campus Maintenance & Facilities',
      maxAssignments = 4,
      phone = '',
      availabilityStatus = 'Available',
      isDemo = false,
    } = req.body;

    // 1. Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, message: 'Professional email address is required' });
    }

    // 2. Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid professional email address' });
    }

    const techId = (technicianId || workerId || '').trim();
    if (!techId) {
      return res.status(400).json({ success: false, message: 'Technician ID is required' });
    }

    // 3. Validate duplicate email address
    const normalizedEmail = email.toLowerCase().trim();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: `A user or technician with email "${email}" already exists` });
    }

    // 4. Validate unique technician ID
    const existingTechId = await User.findOne({
      $or: [{ technicianId: techId }, { workerId: techId }],
    });
    if (existingTechId) {
      return res.status(400).json({ success: false, message: `Technician ID "${techId}" is already assigned to ${existingTechId.name}` });
    }

    const defaultPassword = password && password.length >= 6 ? password : 'Password@123';
    const isAvail = availabilityStatus === 'Available';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: defaultPassword,
      technicianId: techId,
      workerId: techId,
      role: 'technician',
      specialization,
      designation: designation.trim(),
      experienceYears: Number(experienceYears) || 0,
      department: department.trim(),
      maxAssignments: Number(maxAssignments) || 4,
      activeAssignmentsCount: 0,
      completedAssignmentsCount: 0,
      availabilityStatus,
      isAvailable: isAvail,
      isActive: true,
      isDemo: Boolean(isDemo),
      phone: phone.trim(),
    });

    eventService.broadcast('worker_created', {
      id: user._id,
      technicianId: user.technicianId,
      name: user.name,
      specialization: user.specialization,
      designation: user.designation,
      department: user.department,
      availabilityStatus: user.availabilityStatus,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        technicianId: user.technicianId,
        workerId: user.workerId,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        designation: user.designation,
        experienceYears: user.experienceYears,
        department: user.department,
        availabilityStatus: user.availabilityStatus,
        isAvailable: user.isAvailable,
        activeAssignmentsCount: user.activeAssignmentsCount,
        completedAssignmentsCount: user.completedAssignmentsCount,
        maxAssignments: user.maxAssignments,
        isActive: user.isActive,
        isDemo: user.isDemo,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all technicians / workers with live capacity & career metrics
// @route   GET /api/admin/technicians or /api/admin/workers
// @access  Private/Admin
exports.getTechnicians = async (req, res) => {
  try {
    const technicians = await User.find({ role: 'technician' }).select('-password').sort({ name: 1 });

    // Live sync active assignment counts and completed complaint counts
    const enrichedWorkers = await Promise.all(
      technicians.map(async (tech) => {
        const [activeCount, completedCount] = await Promise.all([
          MaintenanceIssue.countDocuments({
            assignedTechnician: tech._id,
            status: { $in: ['Assigned', 'In Progress'] },
          }),
          MaintenanceIssue.countDocuments({
            assignedTechnician: tech._id,
            status: { $in: ['Work Done', 'Resolved', 'Closed'] },
          }),
        ]);

        let hasChanged = false;
        if (tech.activeAssignmentsCount !== activeCount) {
          tech.activeAssignmentsCount = activeCount;
          hasChanged = true;
        }
        if (tech.completedAssignmentsCount !== completedCount) {
          tech.completedAssignmentsCount = completedCount;
          hasChanged = true;
        }

        if (hasChanged) {
          await User.findByIdAndUpdate(tech._id, {
            activeAssignmentsCount: activeCount,
            completedAssignmentsCount: completedCount,
          });
        }

        const techObj = tech.toObject();
        techObj.activeAssignmentsCount = activeCount;
        techObj.completedAssignmentsCount = completedCount;
        techObj.technicianId = techObj.technicianId || techObj.workerId || `TECH-${techObj._id.toString().slice(-4).toUpperCase()}`;
        return techObj;
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedWorkers.length,
      data: enrichedWorkers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update worker availability, specialization, capacity, or active status
// @route   PUT /api/admin/workers/:id or /api/admin/technicians/:id
// @access  Private/Admin
exports.updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      technicianId,
      workerId,
      specialization,
      designation,
      experienceYears,
      department,
      availabilityStatus,
      maxAssignments,
      isActive,
      phone,
    } = req.body;

    const worker = await User.findOne({ _id: id, role: 'technician' });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    // Check duplicate email if changed
    if (email && email.toLowerCase().trim() !== worker.email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid email address format' });
      }
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: `Email "${email}" is already in use by another user` });
      }
      worker.email = email.toLowerCase().trim();
    }

    // Check duplicate technicianId if changed
    const newTechId = (technicianId || workerId || '').trim();
    if (newTechId && newTechId !== worker.technicianId && newTechId !== worker.workerId) {
      const existingId = await User.findOne({
        _id: { $ne: id },
        $or: [{ technicianId: newTechId }, { workerId: newTechId }],
      });
      if (existingId) {
        return res.status(400).json({ success: false, message: `Technician ID "${newTechId}" is already assigned to ${existingId.name}` });
      }
      worker.technicianId = newTechId;
      worker.workerId = newTechId;
    }

    if (name !== undefined) worker.name = name.trim();
    if (specialization !== undefined) worker.specialization = specialization;
    if (designation !== undefined) worker.designation = designation.trim();
    if (experienceYears !== undefined) worker.experienceYears = Number(experienceYears) || 0;
    if (department !== undefined) worker.department = department.trim();
    if (availabilityStatus !== undefined) {
      worker.availabilityStatus = availabilityStatus;
      worker.isAvailable = availabilityStatus === 'Available';
    }
    if (maxAssignments !== undefined) worker.maxAssignments = Math.max(1, Number(maxAssignments) || 4);
    if (isActive !== undefined) worker.isActive = Boolean(isActive);
    if (req.body.isDemo !== undefined) worker.isDemo = Boolean(req.body.isDemo);
    if (phone !== undefined) worker.phone = phone.trim();

    await worker.save();

    eventService.broadcast('worker_updated', {
      id: worker._id,
      technicianId: worker.technicianId,
      name: worker.name,
      specialization: worker.specialization,
      availabilityStatus: worker.availabilityStatus,
      isAvailable: worker.isAvailable,
      maxAssignments: worker.maxAssignments,
      isActive: worker.isActive,
    });

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle technician active/inactive or availability status
// @route   PATCH /api/admin/technicians/:id/status
// @access  Private/Admin
exports.toggleWorkerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, availabilityStatus } = req.body;

    const worker = await User.findOne({ _id: id, role: 'technician' });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    if (isActive !== undefined) {
      worker.isActive = Boolean(isActive);
    }

    if (availabilityStatus !== undefined) {
      worker.availabilityStatus = availabilityStatus;
      worker.isAvailable = availabilityStatus === 'Available';
    }

    await worker.save();

    eventService.broadcast('worker_updated', {
      id: worker._id,
      technicianId: worker.technicianId,
      name: worker.name,
      availabilityStatus: worker.availabilityStatus,
      isActive: worker.isActive,
    });

    res.status(200).json({
      success: true,
      message: `Technician ${worker.name} status updated successfully`,
      data: worker,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete or deactivate technician account
// @route   DELETE /api/admin/technicians/:id or /api/admin/workers/:id
// @access  Private/Admin
exports.deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await User.findOne({ _id: id, role: 'technician' });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    // Check if technician has active assignments
    const activeTasksCount = await MaintenanceIssue.countDocuments({
      assignedTechnician: id,
      status: { $in: ['Assigned', 'In Progress'] },
    });

    if (activeTasksCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete technician ${worker.name} because they have ${activeTasksCount} active task(s). Reassign these tasks first.`,
      });
    }

    await User.findByIdAndDelete(id);

    eventService.broadcast('worker_updated', {
      id,
      deleted: true,
      name: worker.name,
    });

    res.status(200).json({
      success: true,
      message: `Technician ${worker.name} has been removed.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Batch auto-assign all unassigned complaints (Admin Action)
// @route   POST /api/admin/auto-assign
// @access  Private/Admin
exports.autoAssignAllComplaints = async (req, res) => {
  try {
    // 1. Fetch all eligible unassigned complaints
    const unassignedIssues = await MaintenanceIssue.find({
      assignedTechnician: null,
      status: { $in: ['Pending', 'Pending Assignment', 'Submitted', 'unassigned'] },
    }).sort({
      priorityWeight: -1, // Critical first, then High, Medium, Low
      createdAt: 1,       // Oldest first within priority
    });

    if (unassignedIssues.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No unassigned complaints found. All issues are currently assigned!',
        data: {
          totalProcessed: 0,
          assignedCount: 0,
          unassignedCount: 0,
          assignments: [],
          unassigned: [],
        },
      });
    }

    const assignments = [];
    const unassigned = [];

    // 2. Process each complaint through the workload-balancing assignment algorithm
    for (const issue of unassignedIssues) {
      const result = await assignBestWorker(issue, req.user.id);
      if (result.success && result.worker) {
        assignments.push({
          issueId: issue._id,
          ticketId: issue._id.toString().slice(-6).toUpperCase(),
          title: issue.title,
          category: issue.category,
          workerName: result.worker.name,
          workerSpecialization: result.worker.specialization,
          activeLoad: result.worker.activeAssignmentsCount,
        });
      } else {
        unassigned.push({
          issueId: issue._id,
          ticketId: issue._id.toString().slice(-6).toUpperCase(),
          title: issue.title,
          category: issue.category,
          reason: result.reason || result.message || 'No available technician matching specialization',
        });
      }
    }

    // 3. Broadcast batch assignment event
    eventService.broadcast('batch_auto_assigned', {
      totalProcessed: unassignedIssues.length,
      assignedCount: assignments.length,
      unassignedCount: unassigned.length,
      triggeredBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: `Auto-assignment completed: ${assignments.length} assigned, ${unassigned.length} pending.`,
      data: {
        totalProcessed: unassignedIssues.length,
        assignedCount: assignments.length,
        unassignedCount: unassigned.length,
        assignments,
        unassigned,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get automatic assignment metrics and worker capacity
// @route   GET /api/admin/assignment-metrics
// @access  Private/Admin
exports.getAssignmentMetrics = async (req, res) => {
  try {
    const workers = await User.find({ role: 'technician' });
    const totalWorkers = workers.length;
    const activeWorkers = workers.filter((w) => w.isActive && w.isAvailable).length;

    let totalCapacity = 0;
    let currentWorkload = 0;
    const workersBySpecialization = {};

    workers.forEach((w) => {
      totalCapacity += w.maxAssignments || 4;
      currentWorkload += w.activeAssignmentsCount || 0;
      const spec = w.specialization || 'General Maintenance';
      if (!workersBySpecialization[spec]) {
        workersBySpecialization[spec] = { total: 0, available: 0, activeLoad: 0, capacity: 0 };
      }
      workersBySpecialization[spec].total += 1;
      if (w.isActive && w.isAvailable) workersBySpecialization[spec].available += 1;
      workersBySpecialization[spec].activeLoad += w.activeAssignmentsCount || 0;
      workersBySpecialization[spec].capacity += w.maxAssignments || 4;
    });

    const unassignedCount = await MaintenanceIssue.countDocuments({
      status: { $in: ['Pending', 'Pending Assignment', 'Submitted'] },
      assignedTechnician: null,
    });

    const failedAssignments = await MaintenanceIssue.countDocuments({
      assignmentStatus: 'failed_no_worker',
      status: { $nin: ['Work Done', 'Resolved', 'Closed'] },
    });

    const autoAssignedCount = await MaintenanceIssue.countDocuments({
      assignmentStatus: 'assigned',
    });

    res.status(200).json({
      success: true,
      data: {
        totalWorkers,
        activeWorkers,
        totalCapacity,
        currentWorkload,
        capacityUtilizationRate: totalCapacity > 0 ? Math.round((currentWorkload / totalCapacity) * 100) : 0,
        unassignedCount,
        failedAssignments,
        autoAssignedCount,
        workersBySpecialization,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
