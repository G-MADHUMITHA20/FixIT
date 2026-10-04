const mongoose = require('mongoose');

const maintenanceIssueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an issue title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      enum: [
        'Electrical',
        'Plumbing / Water Leakage',
        'Furniture',
        'Classroom',
        'Laboratory',
        'Washroom',
        'Network / Internet',
        'Cleaning',
        'Other',
      ],
    },
    location: {
      type: String,
      required: [true, 'Please provide a location'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    reportedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    affectedUsers: {
      type: Number,
      default: 1,
    },
    supportedBy: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
    },
    priorityWeight: {
      type: Number,
      default: 2,
    },
    slaDeadline: {
      type: Date,
    },
    isEscalated: {
      type: Boolean,
      default: false,
    },
    escalatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

maintenanceIssueSchema.pre('save', function (next) {
  const weights = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const slaHours = { Critical: 24, High: 48, Medium: 72, Low: 96 };
  
  if (this.isModified('priority') || this.isNew) {
    this.priorityWeight = weights[this.priority] || 2;
    const hours = slaHours[this.priority] || 72;
    const baseDate = this.reportedAt || Date.now();
    this.slaDeadline = new Date(new Date(baseDate).getTime() + hours * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('MaintenanceIssue', maintenanceIssueSchema);
