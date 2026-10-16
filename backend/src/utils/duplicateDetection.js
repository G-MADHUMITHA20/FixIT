const duplicateDetectionService = require('../services/duplicateDetectionService');

/**
 * FixIt Duplicate Detection Adapter
 * Completely powered by Google DeepMind Gemma 4 semantic reasoning.
 * The legacy Jaccard similarity algorithm has been completely removed.
 */
const findDuplicate = async (category, location, title, description, options = {}) => {
  const result = await duplicateDetectionService.findDuplicate(
    category,
    location,
    title,
    description,
    options
  );

  if (result.isDuplicate) {
    return result.matchingIssue;
  }
  return null;
};

module.exports = {
  findDuplicate,
  findDuplicateWithDetails: duplicateDetectionService.findDuplicate
};
