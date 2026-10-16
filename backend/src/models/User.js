const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['student', 'staff', 'admin', 'technician'],
      default: 'student',
    },
    workerId: {
      type: String,
      trim: true,
      sparse: true,
    },
    technicianId: {
      type: String,
      trim: true,
      sparse: true,
    },
    specialization: {
      type: String,
      enum: [
        'Electrician',
        'Plumber',
        'Carpenter',
        'Civil/Masonry',
        'Civil Maintenance Worker',
        'HVAC/AC Technician',
        'HVAC / AC Technician',
        'Painter',
        'IT Technician',
        'Laboratory Technician',
        'Housekeeping / Cleaner',
        'Electrical',
        'Plumbing',
        'Carpentry',
        'IT',
        'Cleaning',
        'General Maintenance',
        'All',
      ],
      default: 'General Maintenance',
    },
    designation: {
      type: String,
      default: 'Facilities Technician',
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 2,
      min: 0,
    },
    department: {
      type: String,
      default: 'Campus Maintenance & Facilities',
      trim: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Busy', 'Unavailable', 'On Leave'],
      default: 'Available',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    activeAssignmentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAssignmentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAssignments: {
      type: Number,
      default: 4,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Indexes for high-performance auto-assignment queries and unique ID lookups
userSchema.index({ role: 1, isActive: 1, availabilityStatus: 1, specialization: 1 });
userSchema.index({ activeAssignmentsCount: 1 });
userSchema.index({ technicianId: 1 }, { sparse: true, unique: true });

// Sync technicianId and workerId on save
userSchema.pre('save', function (next) {
  if (this.technicianId && !this.workerId) {
    this.workerId = this.technicianId;
  } else if (this.workerId && !this.technicianId) {
    this.technicianId = this.workerId;
  }
  if (typeof next === 'function') next();
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
