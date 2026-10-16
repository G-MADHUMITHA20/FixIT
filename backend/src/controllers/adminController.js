const User = require('../models/User');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const eventService = require('../services/eventService');

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

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
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

const { seedTechnicians, DEMO_WORKERS_32 } = require('../../scripts/seedTechnicians');

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
      message: `Successfully initialized ${result.total} demo workers across all 8 specializations.`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create technician / worker account with specialization and workload rules
// @route   POST /api/admin/technician or /api/admin/workers
// @access  Private/Admin
exports.createTechnician = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      workerId = '',
      specialization = 'General Maintenance',
      maxAssignments = 3,
      phone = '',
      availabilityStatus = 'Available',
      isDemo = false,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const isAvailable = availabilityStatus === 'Available';

    const user = await User.create({
      name,
      email,
      password,
      workerId: workerId || undefined,
      role: 'technician',
      specialization,
      maxAssignments: Number(maxAssignments) || 3,
      activeAssignmentsCount: 0,
      availabilityStatus,
      isAvailable,
      isActive: true,
      isDemo: Boolean(isDemo),
      phone,
    });

    eventService.broadcast('worker_created', {
      id: user._id,
      workerId: user.workerId,
      name: user.name,
      specialization: user.specialization,
      availabilityStatus: user.availabilityStatus,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        workerId: user.workerId,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        availabilityStatus: user.availabilityStatus,
        isAvailable: user.isAvailable,
        activeAssignmentsCount: user.activeAssignmentsCount,
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

// @desc    Get all technicians / workers with live capacity calculation
// @route   GET /api/admin/technicians or /api/admin/workers
// @access  Private/Admin
exports.getTechnicians = async (req, res) => {
  try {
    const technicians = await User.find({ role: 'technician' }).select('-password').sort({ name: 1 });

    // Ensure active assignment counts reflect live database tickets
    const enrichedWorkers = await Promise.all(
      technicians.map(async (tech) => {
        const activeCount = await MaintenanceIssue.countDocuments({
          assignedTechnician: tech._id,
          status: { $in: ['Assigned', 'In Progress'] },
        });

        // Sync count if needed
        if (tech.activeAssignmentsCount !== activeCount) {
          tech.activeAssignmentsCount = activeCount;
          await User.findByIdAndUpdate(tech._id, { activeAssignmentsCount: activeCount });
        }

        const techObj = tech.toObject();
        techObj.activeAssignmentsCount = activeCount;
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
// @route   PUT /api/admin/workers/:id
// @access  Private/Admin
exports.updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      specialization,
      availabilityStatus,
      maxAssignments,
      isActive,
      phone,
    } = req.body;

    const worker = await User.findOne({ _id: id, role: 'technician' });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (name !== undefined) worker.name = name;
    if (req.body.workerId !== undefined) worker.workerId = req.body.workerId;
    if (specialization !== undefined) worker.specialization = specialization;
    if (availabilityStatus !== undefined) {
      worker.availabilityStatus = availabilityStatus;
      worker.isAvailable = availabilityStatus === 'Available';
    }
    if (maxAssignments !== undefined) worker.maxAssignments = Number(maxAssignments);
    if (isActive !== undefined) worker.isActive = Boolean(isActive);
    if (req.body.isDemo !== undefined) worker.isDemo = Boolean(req.body.isDemo);
    if (phone !== undefined) worker.phone = phone;

    await worker.save();

    eventService.broadcast('worker_updated', {
      id: worker._id,
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
      totalCapacity += w.maxAssignments || 3;
      currentWorkload += w.activeAssignmentsCount || 0;
      const spec = w.specialization || 'General Maintenance';
      if (!workersBySpecialization[spec]) {
        workersBySpecialization[spec] = { total: 0, available: 0, activeLoad: 0, capacity: 0 };
      }
      workersBySpecialization[spec].total += 1;
      if (w.isActive && w.isAvailable) workersBySpecialization[spec].available += 1;
      workersBySpecialization[spec].activeLoad += w.activeAssignmentsCount || 0;
      workersBySpecialization[spec].capacity += w.maxAssignments || 3;
    });

    const unassignedCount = await MaintenanceIssue.countDocuments({
      status: 'Pending',
      assignedTechnician: null,
    });

    const failedAssignments = await MaintenanceIssue.countDocuments({
      assignmentStatus: 'failed_no_worker',
      status: { $ne: 'Work Done' },
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
