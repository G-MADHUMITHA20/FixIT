const MaintenanceIssue = require('../models/MaintenanceIssue');
const gemmaHarness = require('./gemmaHarness');
const { getVerifiedInventory } = require('./equipmentInventory');

/**
 * Bounded candidate retrieval limit
 */
const MAX_CANDIDATES = 10;

/**
 * Searches for potential duplicate active complaints using Gemma 4 AI semantic reasoning.
 * NO Jaccard similarity or text-embedding fallback is used.
 *
 * @param {string} category - Complaint category
 * @param {string} location - Complaint location / room
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @param {Object} [options] - Optional overrides (e.g. existingIssues for tests, mockProvider)
 * @returns {Promise<Object>} Detection result: { isDuplicate: boolean, matchingIssue: Object|null, decisionData: Object }
 */
const findDuplicate = async (category, location, title, description, options = {}) => {
  console.log(`[Gemma 4 Duplicate Detection] Checking: "${title}" at "${location}" [${category}]`);

  const newComplaint = { category, location, title, description: description || '' };

  // 1. Retrieve active candidate complaints from database (or use supplied candidates for tests)
  let candidates = options.existingIssues;

  if (!candidates) {
    // Only active complaints (Pending or In Progress) participate in duplicate detection
    candidates = await MaintenanceIssue.find({
      $or: [
        { category: { $regex: new RegExp(`^${category}$`, 'i') } },
        { location: { $regex: new RegExp(`^${location}$`, 'i') } }
      ],
      status: { $in: ['Pending', 'In Progress'] }
    })
      .sort({ createdAt: -1 })
      .limit(MAX_CANDIDATES)
      .lean();
  }

  // Filter candidates to ensure only active ones are evaluated
  const activeCandidates = candidates.filter((c) =>
    ['Pending', 'In Progress'].includes(c.status)
  );

  console.log(`[Gemma 4 Duplicate Detection] Active candidate issues found: ${activeCandidates.length}`);

  // If no active candidates exist, it cannot be a duplicate
  if (activeCandidates.length === 0) {
    return {
      isDuplicate: false,
      matchingIssue: null,
      decisionData: {
        decision: 'NOT_DUPLICATE',
        reason: 'No active complaints exist in the same category or location.',
        uncertainty: []
      }
    };
  }

  // 2. Retrieve verified equipment inventory for location if available
  const inventoryInfo = getVerifiedInventory(location);

  // 3. Call Gemma 4 AI Model Harness
  const aiResult = await gemmaHarness.evaluateComplaint(
    newComplaint,
    activeCandidates,
    inventoryInfo,
    options
  );

  console.log(`[Gemma 4 Duplicate Detection] Decision: ${aiResult.decision} | Reason: ${aiResult.reason}`);

  // 4. Handle Decision
  if (aiResult.decision === 'DUPLICATE') {
    const matchedIssue = activeCandidates.find(
      (c) => String(c._id || c.id) === String(aiResult.matchedComplaintId)
    );

    if (matchedIssue) {
      return {
        isDuplicate: true,
        matchingIssue: matchedIssue,
        decisionData: aiResult
      };
    }

    // If matched ID was somehow not found, fall back to uncertainty policy
    console.warn(`[Gemma 4 Duplicate Detection] Matched complaint ID ${aiResult.matchedComplaintId} not found in active list. Applying uncertainty policy.`);
    return {
      isDuplicate: false,
      matchingIssue: null,
      decisionData: {
        ...aiResult,
        decision: 'UNCERTAIN',
        uncertainty: ['Matched ID not found in candidate set']
      },
      isUncertain: true
    };
  }

  if (aiResult.decision === 'UNCERTAIN') {
    // Documented Uncertainty Policy:
    // Missing asset identifiers, conflicting evidence, or uncertain incident identity
    // must NOT cause automatic rejection. Allow submission as a distinct complaint.
    console.log(`[Gemma 4 Duplicate Detection] Uncertainty policy applied: allowing submission. Reason: ${aiResult.reason}`);
    return {
      isDuplicate: false,
      matchingIssue: null,
      decisionData: aiResult,
      isUncertain: true
    };
  }

  // NOT_DUPLICATE
  return {
    isDuplicate: false,
    matchingIssue: null,
    decisionData: aiResult
  };
};

module.exports = {
  findDuplicate,
  MAX_CANDIDATES
};
