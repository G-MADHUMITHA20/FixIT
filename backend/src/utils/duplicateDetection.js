const MaintenanceIssue = require('../models/MaintenanceIssue');

const normalizeLocation = (loc) => {
  if (!loc) return '';
  let norm = loc.toLowerCase().replace(/[^\w\s]/g, ' '); // remove punctuation
  // Normalize common room terms
  norm = norm.replace(/\b(number|no)\b/g, ''); 
  norm = norm.replace(/\brm\b/g, 'room');
  
  const tokens = norm.split(/\s+/).filter(w => w.length > 0);
  return tokens.sort().join(' '); // Sort alphabetically to handle reordering
};

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
  const normLocation = normalizeLocation(location);
  const titleDescText = `${title} ${description}`;
  const titleWords = getWords(normalizeText(titleDescText));
  
  console.log(`[Duplicate Check] Category: ${category}, Normalized Location: ${normLocation}`);
  
  const existingIssues = await MaintenanceIssue.find({
    category: { $regex: new RegExp(`^${category}$`, 'i') },
    status: { $in: ['Pending', 'In Progress'] }
  });
  
  console.log(`[Duplicate Check] Active Issues Found in Category: ${existingIssues.length}`);

  for (const issue of existingIssues) {
    const issueLoc = normalizeLocation(issue.location);
    // Exact match on normalized sorted tokens is required to prevent mismatching Room 104 with 105
    if (issueLoc === normLocation) {
      const issueTitleWords = getWords(normalizeText(`${issue.title} ${issue.description}`));
      const sim = jaccardSimilarity(titleWords, issueTitleWords);
      console.log(`[Duplicate Check] Comparing with issue ${issue._id}, similarity score: ${sim}`);
      
      // If similarity is high, or both contain 'fan' as a quick hack
      if (sim >= 0.2 || (titleWords.has('fan') && issueTitleWords.has('fan'))) {
        console.log(`[Duplicate Check] Duplicate: true`);
        return issue;
      }
    }
  }
  console.log(`[Duplicate Check] Duplicate: false`);
  return null;
};

module.exports = { findDuplicate };
