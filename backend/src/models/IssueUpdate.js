const mongoose = require('mongoose');

const issueUpdateSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.ObjectId,
      ref: 'MaintenanceIssue',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    previousStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true } // timestamps handles createdAt / timestamp automatically
);

module.exports = mongoose.model('IssueUpdate', issueUpdateSchema);
