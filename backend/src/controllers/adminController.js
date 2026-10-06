const User = require('../models/User');

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
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create technician account
// @route   POST /api/admin/technician
// @access  Private/Admin
exports.createTechnician = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'technician',
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all technicians
// @route   GET /api/admin/technicians
// @access  Private/Admin
exports.getTechnicians = async (req, res) => {
  try {
    const technicians = await User.find({ role: 'technician' }).select('-password');
    res.status(200).json({
      success: true,
      count: technicians.length,
      data: technicians
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
