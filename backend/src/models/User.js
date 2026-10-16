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
      unique: true,
    },
    specialization: {
      type: String,
      enum: [
        'Electrician',
        'Plumber',
        'Carpenter',
        'IT Technician',
        'Laboratory Technician',
        'Housekeeping / Cleaner',
        'Civil Maintenance Worker',
        'HVAC / AC Technician',
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
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Unavailable', 'On Leave'],
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
    maxAssignments: {
      type: Number,
      default: 3,
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
