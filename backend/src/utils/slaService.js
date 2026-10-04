const MaintenanceIssue = require('../models/MaintenanceIssue');

const evaluateSLA = async (issues) => {
  const now = new Date();
  let needsSave = false;

  const evaluatedIssues = issues.map(issue => {
    let modified = false;

    if (issue.status !== 'Resolved' && issue.slaDeadline && now > issue.slaDeadline) {
      if (!issue.isEscalated) {
        issue.isEscalated = true;
        issue.escalatedAt = now;
        modified = true;
      }
    } else if (issue.status === 'Resolved' && issue.isEscalated) {
      // If resolved, it shouldn't remain actively escalated (or we keep the flag to know it WAS escalated? 
      // The prompt says "If an issue remains Pending or In Progress beyond its SLA mark it as escalated."
      // Let's keep it escalated if it breached, so we have a record.
    }

    if (modified) {
      // Background save without awaiting to not block the response
      issue.save().catch(e => console.error('Error saving SLA update', e));
    }
    return issue;
  });

  return evaluatedIssues;
};

const evaluateSingleSLA = async (issue) => {
  const now = new Date();
  if (issue.status !== 'Resolved' && issue.slaDeadline && now > issue.slaDeadline) {
    if (!issue.isEscalated) {
      issue.isEscalated = true;
      issue.escalatedAt = now;
      await issue.save().catch(e => console.error('Error saving SLA update', e));
    }
  }
  return issue;
};

module.exports = { evaluateSLA, evaluateSingleSLA };
