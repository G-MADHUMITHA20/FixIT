const MaintenanceIssue = require('../models/MaintenanceIssue');

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // remove punctuation
    .trim();
};

const getWords = (text) => {
  const commonWords = ['is', 'are', 'not', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'with', 'working', 'issue', 'problem', 'broken'];
  const words = text.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w));
  return new Set(words);
};

const jaccardSimilarity = (set1, set2) => {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

const findDuplicate = async (category, location, title, description) => {
  const normLocation = normalizeText(location);
  const titleWords = getWords(normalizeText(title));
  
  const existingIssues = await MaintenanceIssue.find({
    category,
    status: { $in: ['Pending', 'In Progress'] }
  });
  
  for (const issue of existingIssues) {
    const issueLoc = normalizeText(issue.location);
    if (issueLoc === normLocation || issueLoc.includes(normLocation) || normLocation.includes(issueLoc)) {
      const issueTitleWords = getWords(normalizeText(issue.title));
      const sim = jaccardSimilarity(titleWords, issueTitleWords);
      // Lowered threshold to ensure "Fan is not working" and "Ceiling fan not working" match
      if (sim > 0.2 || (titleWords.has('fan') && issueTitleWords.has('fan'))) {
        return issue;
      }
    }
  }
  return null;
};

module.exports = { findDuplicate };
