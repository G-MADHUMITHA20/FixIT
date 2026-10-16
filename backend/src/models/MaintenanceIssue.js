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
        'Electrician',
        'Plumber',
        'Carpenter',
        'IT Technician',
        'Laboratory Technician',
        'Housekeeping / Cleaner',
        'Civil Maintenance Worker',
        'HVAC / AC Technician',
        'Electrical',
        'Plumbing / Water Leakage',
        'Plumbing',
        'Furniture',
        'Carpentry',
        'Classroom',
        'Laboratory',
        'Washroom',
        'Network / Internet',
        'IT',
        'Cleaning',
        'General Maintenance',
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
      enum: ['Pending', 'Assigned', 'In Progress', 'Work Done', 'Resolved', 'Reopened'],
      default: 'Pending',
    },
    reportedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    reporterType: {
      type: String,
      enum: ['student', 'staff'],
      required: true,
      default: 'student',
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
    assignedTechnician: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedWorkerName: {
      type: String,
      default: null,
    },
    assignmentStatus: {
      type: String,
      enum: ['unassigned', 'assigned', 'failed_no_worker', 'reassigned'],
      default: 'unassigned',
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null,
    },
    technicianCompletion: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
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
    isSafetyHazard: {
      type: Boolean,
      default: false,
    },
    safetyHazardReason: {
      type: String,
      default: '',
    },
    aiClassification: {
      predictedCategory: { type: String },
      issueSummary: { type: String },
      urgency: { type: String },
      locationExtracted: { type: String },
      isDangerous: { type: Boolean, default: false },
      dangerReason: { type: String, default: '' },
      usedFallback: { type: Boolean, default: false },
      classifiedAt: { type: Date },
      rawOutput: { type: mongoose.Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

maintenanceIssueSchema.pre('save', function () {
  const weights = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const slaHours = { Critical: 24, High: 48, Medium: 72, Low: 96 };
  
  if (this.isModified('priority') || this.isNew) {
    this.priorityWeight = weights[this.priority] || 2;
    const hours = slaHours[this.priority] || 72;
    const baseDate = this.reportedAt || Date.now();
    this.slaDeadline = new Date(new Date(baseDate).getTime() + hours * 60 * 60 * 1000);
  }
});

module.exports = mongoose.model('MaintenanceIssue', maintenanceIssueSchema);
