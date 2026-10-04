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
  },
  { timestamps: true }
);

module.exports = mongoose.model('MaintenanceIssue', maintenanceIssueSchema);
