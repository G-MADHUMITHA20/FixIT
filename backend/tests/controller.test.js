const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { checkDuplicate, createIssue } = require('../src/controllers/issueController');
const gemmaHarness = require('../src/services/gemmaHarness');
const duplicateDetection = require('../src/utils/duplicateDetection');

describe('Issue Controller Gemma 4 Duplicate Detection API Integration', () => {
  beforeEach(() => {
    gemmaHarness.resetMockProvider();
  });

  afterEach(() => {
    gemmaHarness.resetMockProvider();
  });

  it('should return isDuplicate: false when complaints refer to different assets in the same room', async () => {
    gemmaHarness.setMockProvider(async (newComp) => {
      return {
        decision: 'NOT_DUPLICATE',
        matchedComplaintId: null,
        sameLocation: true,
        sameAsset: false,
        sameIncident: false,
        assetIdentity: { type: 'Monitor', identifier: '61', certainty: 'EXPLICIT_IN_COMPLAINT' },
        reason: 'Different monitor units (61 vs 17).',
        uncertainty: []
      };
    });

    const originalFind = duplicateDetection.findDuplicateWithDetails;
    try {
      duplicateDetection.findDuplicateWithDetails = async (cat, loc, title, desc) => {
        const existing = [{
          _id: 'issue_mon_17',
          category: 'Classroom',
          location: 'Room 41',
          title: 'Room 41 – Monitor 17 not working',
          description: 'No power',
          status: 'Pending'
        }];
        return originalFind(cat, loc, title, desc, { existingIssues: existing });
      };

      const req = {
        body: {
          category: 'Classroom',
          location: 'Room 41',
          title: 'Room 41 – Monitor 61 not working',
          description: 'Display problem'
        }
      };

      let statusCode = 0;
      let jsonResponse = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => { jsonResponse = data; }
          };
        }
      };

      await checkDuplicate(req, res);

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(jsonResponse.success, true);
      assert.strictEqual(jsonResponse.isDuplicate, false);
      assert.strictEqual(jsonResponse.decisionData.decision, 'NOT_DUPLICATE');
    } finally {
      duplicateDetection.findDuplicateWithDetails = originalFind;
    }
  });

  it('should return isDuplicate: true and matching issue when complaints refer to same incident', async () => {
    gemmaHarness.setMockProvider(async () => {
      return {
        decision: 'DUPLICATE',
        matchedComplaintId: 'issue_mon_17',
        sameLocation: true,
        sameAsset: true,
        sameIncident: true,
        assetIdentity: { type: 'Monitor', identifier: '17', certainty: 'EXPLICIT_IN_COMPLAINT' },
        reason: 'Identical display failure on Monitor 17.',
        uncertainty: []
      };
    });

    const originalFind = duplicateDetection.findDuplicateWithDetails;
    try {
      duplicateDetection.findDuplicateWithDetails = async (cat, loc, title, desc) => {
        const existing = [{
          _id: 'issue_mon_17',
          category: 'Classroom',
          location: 'Room 41',
          title: 'Room 41 – Monitor 17 display failure',
          description: 'display failure',
          status: 'Pending'
        }];
        return originalFind(cat, loc, title, desc, { existingIssues: existing });
      };

      const req = {
        body: {
          category: 'Classroom',
          location: 'Room 41',
          title: 'Room 41 – Monitor 17 display failure',
          description: 'display failure'
        }
      };

      let statusCode = 0;
      let jsonResponse = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => { jsonResponse = data; }
          };
        }
      };

      await checkDuplicate(req, res);

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(jsonResponse.success, true);
      assert.strictEqual(jsonResponse.isDuplicate, true);
      assert.strictEqual(jsonResponse.matchingIssue._id, 'issue_mon_17');
    } finally {
      duplicateDetection.findDuplicateWithDetails = originalFind;
    }
  });

  it('should return 503 and clear error when Gemma 4 API fails safely', async () => {
    const originalFind = duplicateDetection.findDuplicateWithDetails;
    try {
      duplicateDetection.findDuplicateWithDetails = async () => {
        throw new gemmaHarness.GemmaAPIError('Gemma 4 service is temporarily unavailable', 'SERVICE_UNAVAILABLE', 503);
      };

      const req = {
        body: {
          category: 'Classroom',
          location: 'Room 41',
          title: 'Monitor 17 not working',
          description: 'Black screen'
        }
      };

      let statusCode = 0;
      let jsonResponse = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => { jsonResponse = data; }
          };
        }
      };

      await checkDuplicate(req, res);

      assert.strictEqual(statusCode, 503);
      assert.strictEqual(jsonResponse.success, false);
      assert.ok(jsonResponse.message.includes('unavailable'));
    } finally {
      duplicateDetection.findDuplicateWithDetails = originalFind;
    }
  });
});
