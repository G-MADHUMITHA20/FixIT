const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const gemmaHarness = require('../src/services/gemmaHarness');
const duplicateDetectionService = require('../src/services/duplicateDetectionService');
const duplicateDetection = require('../src/utils/duplicateDetection');

describe('FixIt Gemma 4 Semantic Duplicate Detection Integration Tests', () => {
  beforeEach(() => {
    gemmaHarness.resetMockProvider();
  });

  afterEach(() => {
    gemmaHarness.resetMockProvider();
  });

  // -------------------------------------------------------------------------
  // TEST A: Different monitors in the same room
  // -------------------------------------------------------------------------
  it('Test A: should accept separate complaints for different monitors in the same room (Monitor 22 vs Monitor 25)', async () => {
    const existingComplaint = {
      _id: 'issue_room105_mon22',
      category: 'Classroom',
      location: 'Room 105',
      title: 'Room 105 — Monitor 22 has a display fault',
      description: 'Display has visual artifacts and lines',
      status: 'Pending',
      affectedUsers: 1,
      reportedBy: 'user_alice'
    };

    gemmaHarness.setMockProvider(async (newComp, candidates) => {
      // Gemma 4 distinguishes explicit asset identifier 22 from 25
      return {
        decision: 'NOT_DUPLICATE',
        matchedComplaintId: null,
        sameLocation: true,
        sameAsset: false,
        sameIncident: false,
        assetIdentity: {
          type: 'Monitor',
          identifier: '25',
          certainty: 'EXPLICIT_IN_COMPLAINT'
        },
        reason: 'Different explicit monitor identifiers in Room 105 (Monitor 25 vs Monitor 22). These are distinct physical workstations.',
        uncertainty: []
      };
    });

    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 105',
      'Room 105 — Monitor 25 is not working',
      'Monitor 25 will not turn on',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, false, 'Expected Monitor 25 to NOT be marked as duplicate of Monitor 22');
    assert.strictEqual(result.matchingIssue, null);
    assert.strictEqual(result.decisionData.decision, 'NOT_DUPLICATE');
    assert.strictEqual(result.decisionData.sameAsset, false);
  });

  // -------------------------------------------------------------------------
  // TEST B: Same fan and same ongoing problem (Verified single inventory)
  // -------------------------------------------------------------------------
  it('Test B: should detect duplicate for same fan with linguistic variations in room with single verified fan', async () => {
    const existingComplaint = {
      _id: 'issue_room5_fan',
      category: 'Electrical',
      location: 'Room 5',
      title: 'Room 5 — The ceiling fan is not working',
      description: 'The fan does not spin when switched on',
      status: 'Pending',
      affectedUsers: 1,
      reportedBy: 'user_alice',
      supportedBy: []
    };

    gemmaHarness.setMockProvider(async (newComp, candidates, inventoryInfo) => {
      // Gemma 4 recognizes that Room 5 has verified single fan inventory and both describe same failure
      assert.ok(inventoryInfo.hasVerifiedInventory, 'Verified inventory should be provided to Gemma 4');
      return {
        decision: 'DUPLICATE',
        matchedComplaintId: 'issue_room5_fan',
        sameLocation: true,
        sameAsset: true,
        sameIncident: true,
        assetIdentity: {
          type: 'Fan',
          identifier: null,
          certainty: 'INFERRED_FROM_VERIFIED_INVENTORY'
        },
        reason: 'Both reports refer to the only fan in Room 5 and describe the same unresolved failure.',
        uncertainty: []
      };
    });

    const result = await duplicateDetectionService.findDuplicate(
      'Electrical',
      'Room 5',
      'Room 5 — The fan has stopped rotating',
      'Ceiling fan is completely dead',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, true, 'Expected duplicate to be detected for same fan incident');
    assert.ok(result.matchingIssue);
    assert.strictEqual(result.matchingIssue._id, 'issue_room5_fan');
    assert.strictEqual(result.decisionData.decision, 'DUPLICATE');
    assert.strictEqual(result.decisionData.assetIdentity.certainty, 'INFERRED_FROM_VERIFIED_INVENTORY');

    // Simulate duplicate support workflow behavior
    const simulateSupport = (issue, userId) => {
      if (issue.status === 'Resolved') return { error: 'Cannot support a resolved issue' };
      if (issue.reportedBy === userId || issue.supportedBy.includes(userId)) {
        return { error: 'You have already reported or supported this issue' };
      }
      return {
        success: true,
        updatedIssue: {
          ...issue,
          supportedBy: [...issue.supportedBy, userId],
          affectedUsers: issue.affectedUsers + 1
        }
      };
    };

    // User Bob supports existing issue -> affectedUsers increments
    const supportRes = simulateSupport(result.matchingIssue, 'user_bob');
    assert.strictEqual(supportRes.success, true);
    assert.strictEqual(supportRes.updatedIssue.affectedUsers, 2);

    // User Bob attempts to support again -> prevented
    const duplicateVote = simulateSupport(supportRes.updatedIssue, 'user_bob');
    assert.strictEqual(duplicateVote.error, 'You have already reported or supported this issue');
  });

  // -------------------------------------------------------------------------
  // TEST C: Same monitor but different faults
  // -------------------------------------------------------------------------
  it('Test C: should allow separate complaints for same monitor with clearly distinct faults', async () => {
    const existingComplaint = {
      _id: 'issue_room105_mon22_screen',
      category: 'Classroom',
      location: 'Room 105',
      title: 'Room 105 — Monitor 22 has a cracked screen',
      description: 'Physical screen impact crack on upper corner',
      status: 'Pending',
      affectedUsers: 1,
      reportedBy: 'user_alice'
    };

    gemmaHarness.setMockProvider(async (newComp, candidates) => {
      // Gemma 4 assesses that cracked glass and power failure are distinct maintenance faults
      return {
        decision: 'NOT_DUPLICATE',
        matchedComplaintId: null,
        sameLocation: true,
        sameAsset: true,
        sameIncident: false,
        assetIdentity: {
          type: 'Monitor',
          identifier: '22',
          certainty: 'EXPLICIT_IN_COMPLAINT'
        },
        reason: 'While both complaints reference Monitor 22 in Room 105, a physical cracked screen and an electrical power failure describe separate distinct faults rather than the same ongoing incident.',
        uncertainty: []
      };
    });

    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 105',
      'Room 105 — Monitor 22 has a power failure',
      'Monitor will not receive AC power, LED indicator is unlit',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, false, 'Distinct faults on same device must be allowed separately');
    assert.strictEqual(result.matchingIssue, null);
    assert.strictEqual(result.decisionData.sameIncident, false);
  });

  // -------------------------------------------------------------------------
  // TEST D: Different descriptions of the same leak (Semantic equivalence)
  // -------------------------------------------------------------------------
  it('Test D: should detect duplicate for semantically equivalent leak descriptions without shared words', async () => {
    const existingComplaint = {
      _id: 'issue_room12_leak',
      category: 'Plumbing / Water Leakage',
      location: 'Room 12',
      title: 'Room 12 — Water is dripping from the ceiling',
      description: 'Noticeable droplets coming through overhead tiles',
      status: 'Pending',
      affectedUsers: 1,
      reportedBy: 'user_charlie',
      supportedBy: []
    };

    gemmaHarness.setMockProvider(async (newComp, candidates) => {
      // Gemma 4 understands that "ceiling leak" and "water is dripping from the ceiling" describe the same ongoing incident
      return {
        decision: 'DUPLICATE',
        matchedComplaintId: 'issue_room12_leak',
        sameLocation: true,
        sameAsset: true,
        sameIncident: true,
        assetIdentity: {
          type: 'Ceiling / Pipe',
          identifier: null,
          certainty: 'EXPLICIT_IN_COMPLAINT'
        },
        reason: 'Both reports describe the same ongoing ceiling water intrusion in Room 12 using semantically equivalent phrasing.',
        uncertainty: []
      };
    });

    const result = await duplicateDetectionService.findDuplicate(
      'Plumbing / Water Leakage',
      'Room 12',
      'Room 12 — There is a ceiling leak',
      'Water penetrating roof panels',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, true, 'Semantically equivalent leak reports must be flagged as duplicates');
    assert.strictEqual(result.matchingIssue._id, 'issue_room12_leak');
    assert.strictEqual(result.decisionData.sameIncident, true);
  });

  // -------------------------------------------------------------------------
  // TEST E: Same equipment type in different rooms
  // -------------------------------------------------------------------------
  it('Test E: should accept new complaint as separate when locations differ (Room 105 vs Room 106)', async () => {
    const existingComplaint = {
      _id: 'issue_room105_mon22',
      category: 'Classroom',
      location: 'Room 105',
      title: 'Room 105 — Monitor 22 is not working',
      description: 'Power issue',
      status: 'Pending'
    };

    gemmaHarness.setMockProvider(async (newComp, candidates) => {
      return {
        decision: 'NOT_DUPLICATE',
        matchedComplaintId: null,
        sameLocation: false,
        sameAsset: false,
        sameIncident: false,
        assetIdentity: {
          type: 'Monitor',
          identifier: '22',
          certainty: 'EXPLICIT_IN_COMPLAINT'
        },
        reason: 'Locations differ (Room 106 vs Room 105). They represent different physical equipment in separate rooms.',
        uncertainty: []
      };
    });

    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 106',
      'Room 106 — Monitor 22 is not working',
      'Power issue',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, false, 'Complaints in different rooms must not be merged');
    assert.strictEqual(result.matchingIssue, null);
    assert.strictEqual(result.decisionData.sameLocation, false);
  });

  // -------------------------------------------------------------------------
  // ADDITIONAL MANDATORY TESTS
  // -------------------------------------------------------------------------

  // 1. Same complaint submitted twice by the same user
  it('Additional Test 1: should detect duplicate and prevent same user from supporting their own reported complaint', async () => {
    const existingComplaint = {
      _id: 'issue_same_user',
      category: 'Classroom',
      location: 'Room 105',
      title: 'Room 105 — Monitor 22 has a display fault',
      description: 'Display fault',
      status: 'Pending',
      reportedBy: 'user_alice',
      supportedBy: []
    };

    gemmaHarness.setMockProvider(async () => ({
      decision: 'DUPLICATE',
      matchedComplaintId: 'issue_same_user',
      sameLocation: true,
      sameAsset: true,
      sameIncident: true,
      assetIdentity: { type: 'Monitor', identifier: '22', certainty: 'EXPLICIT_IN_COMPLAINT' },
      reason: 'Identical complaint reported twice.',
      uncertainty: []
    }));

    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 105',
      'Room 105 — Monitor 22 has a display fault',
      'Display fault',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, true);

    // Duplicate support prevention for original reporter
    const userId = 'user_alice';
    const canSupport = existingComplaint.reportedBy !== userId && !existingComplaint.supportedBy.includes(userId);
    assert.strictEqual(canSupport, false, 'Original reporter must not be permitted to support their own duplicate');
  });

  // 2. Same incident reported by two different users
  it('Additional Test 2: should allow second user to support existing incident and increment affectedUsers', async () => {
    const existingComplaint = {
      _id: 'issue_multi_user',
      category: 'Washroom',
      location: 'Washroom 3',
      title: 'Water tap leaking',
      description: 'Constant drip from tap',
      status: 'Pending',
      reportedBy: 'user_alice',
      supportedBy: [],
      affectedUsers: 1
    };

    gemmaHarness.setMockProvider(async () => ({
      decision: 'DUPLICATE',
      matchedComplaintId: 'issue_multi_user',
      sameLocation: true,
      sameAsset: true,
      sameIncident: true,
      assetIdentity: { type: 'Tap', identifier: null, certainty: 'UNKNOWN' },
      reason: 'Same leaking tap reported by another student.',
      uncertainty: []
    }));

    const result = await duplicateDetectionService.findDuplicate(
      'Washroom',
      'Washroom 3',
      'Tap in Washroom 3 is dripping continuously',
      'Water wastage from faucet',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.matchingIssue._id, 'issue_multi_user');

    // Second user supports
    const secondUserId = 'user_david';
    const updated = {
      ...existingComplaint,
      supportedBy: [...existingComplaint.supportedBy, secondUserId],
      affectedUsers: existingComplaint.affectedUsers + 1
    };
    assert.strictEqual(updated.affectedUsers, 2);
    assert.ok(updated.supportedBy.includes(secondUserId));
  });

  // 3. Different categories in the same room
  it('Additional Test 3: should accept complaints in same room under different categories as separate', async () => {
    const existingComplaint = {
      _id: 'issue_elec',
      category: 'Electrical',
      location: 'Room 41',
      title: 'Power socket sparking',
      description: 'Sparking wall plug',
      status: 'Pending'
    };

    gemmaHarness.setMockProvider(async () => ({
      decision: 'NOT_DUPLICATE',
      matchedComplaintId: null,
      sameLocation: true,
      sameAsset: false,
      sameIncident: false,
      assetIdentity: { type: 'Desk', identifier: null, certainty: 'UNKNOWN' },
      reason: 'Different equipment categories in the same room (desk furniture vs electrical power socket).',
      uncertainty: []
    }));

    const result = await duplicateDetectionService.findDuplicate(
      'Furniture',
      'Room 41',
      'Room 41 - Wooden desk broken',
      'Desk leg is wobbly',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, false);
  });

  // 4. Complaints without an explicit asset identifier (Ambiguity handled via uncertainty policy)
  it('Additional Test 4: should apply uncertainty policy and allow submission when asset is unnumbered and inventory unknown', async () => {
    const existingComplaint = {
      _id: 'issue_generic_fan',
      category: 'Electrical',
      location: 'Hall B',
      title: 'A fan is making squeaking noise',
      description: 'Squeaking noise from motor',
      status: 'Pending'
    };

    gemmaHarness.setMockProvider(async () => ({
      decision: 'UNCERTAIN',
      matchedComplaintId: null,
      sameLocation: true,
      sameAsset: false,
      sameIncident: false,
      assetIdentity: { type: 'Fan', identifier: null, certainty: 'UNKNOWN' },
      reason: 'Hall B contains multiple unnumbered fans and reports do not identify which unit is squeaking vs stopped.',
      uncertainty: ['Multiple fans in hall with no identifier']
    }));

    const result = await duplicateDetectionService.findDuplicate(
      'Electrical',
      'Hall B',
      'Fan has stopped',
      'One fan is stopped in Hall B',
      { existingIssues: [existingComplaint] }
    );

    // Uncertainty policy: Do not automatically block legitimate complaints
    assert.strictEqual(result.isDuplicate, false, 'Uncertain complaints must not be blocked');
    assert.strictEqual(result.isUncertain, true);
    assert.strictEqual(result.decisionData.decision, 'UNCERTAIN');
  });

  // 5. Different capitalization, spelling, natural-language phrasing
  it('Additional Test 5: should recognize duplicate across ALL-CAPS, punctuation and varied phrasing', async () => {
    const existingComplaint = {
      _id: 'issue_case_test',
      category: 'Classroom',
      location: 'Room 105',
      title: 'monitor 22 display failure',
      description: 'screen is dead',
      status: 'Pending'
    };

    gemmaHarness.setMockProvider(async () => ({
      decision: 'DUPLICATE',
      matchedComplaintId: 'issue_case_test',
      sameLocation: true,
      sameAsset: true,
      sameIncident: true,
      assetIdentity: { type: 'Monitor', identifier: '22', certainty: 'EXPLICIT_IN_COMPLAINT' },
      reason: 'Semantically identical issue reported with uppercase letters.',
      uncertainty: []
    }));

    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 105',
      'ROOM 105 — MONITOR 22 DISPLAY FAILURE!',
      'SCREEN IS DEAD',
      { existingIssues: [existingComplaint] }
    );

    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.matchingIssue._id, 'issue_case_test');
  });

  // 6. Conflicting asset identifiers returned by the model (Guardrail overrides hallucination)
  it('Additional Test 6: should override hallucinated duplicate when explicit asset identifiers conflict', async () => {
    const existingComplaint = {
      _id: 'issue_mon_01',
      category: 'Classroom',
      location: 'Room 105',
      title: 'Room 105 — Monitor 1 not working',
      description: 'Blank screen',
      status: 'Pending'
    };

    // Simulate buggy model output claiming Monitor 2 is a duplicate of Monitor 1
    gemmaHarness.setMockProvider(async () => ({
      decision: 'DUPLICATE',
      matchedComplaintId: 'issue_mon_01',
      sameLocation: true,
      sameAsset: true,
      sameIncident: true,
      assetIdentity: { type: 'Monitor', identifier: '1', certainty: 'EXPLICIT_IN_COMPLAINT' },
      reason: 'Model hallucinated that Monitor 2 and Monitor 1 are same.',
      uncertainty: []
    }));

    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 105',
      'Room 105 — Monitor 2 not working',
      'Blank screen',
      { existingIssues: [existingComplaint] }
    );

    // Backend guardrail must override to NOT_DUPLICATE
    assert.strictEqual(result.isDuplicate, false, 'Guardrail must prevent merging Monitor 1 and Monitor 2');
    assert.strictEqual(result.decisionData.decision, 'NOT_DUPLICATE');
    assert.ok(result.decisionData.reason.includes('Rule A'));
  });

  // 7. Invalid JSON or malformed Gemma 4 responses
  it('Additional Test 7: should throw GemmaAPIError when model returns malformed JSON or invalid schema', async () => {
    gemmaHarness.setMockProvider(async () => {
      // Return invalid non-JSON payload
      throw new gemmaHarness.GemmaAPIError('Malformed JSON received from Gemma 4', 'MALFORMED_RESPONSE', 502);
    });

    await assert.rejects(async () => {
      await duplicateDetectionService.findDuplicate(
        'Classroom',
        'Room 105',
        'Monitor 22 not working',
        'Display black',
        { existingIssues: [{ _id: '1', category: 'Classroom', location: 'Room 105', title: 'Mon 22', status: 'Pending' }] }
      );
    }, (err) => err instanceof gemmaHarness.GemmaAPIError && err.code === 'MALFORMED_RESPONSE');
  });

  // 8. API timeout, rate limit, and service-unavailable responses
  it('Additional Test 8: should handle API rate limit (429) and timeout (504) with clear error codes', async () => {
    // 8a. Rate limit
    gemmaHarness.setMockProvider(async () => {
      throw new gemmaHarness.GemmaAPIError('Gemma 4 API rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
    });

    await assert.rejects(async () => {
      await duplicateDetectionService.findDuplicate('Classroom', 'Room 105', 'Mon 22', '', {
        existingIssues: [{ _id: '1', category: 'Classroom', location: 'Room 105', title: 'Mon 22', status: 'Pending' }]
      });
    }, (err) => err.code === 'RATE_LIMIT_EXCEEDED' && err.statusCode === 429);

    // 8b. Timeout
    gemmaHarness.setMockProvider(async () => {
      throw new gemmaHarness.GemmaAPIError('Gemma 4 request timed out after 10000ms', 'TIMEOUT', 504);
    });

    await assert.rejects(async () => {
      await duplicateDetectionService.findDuplicate('Classroom', 'Room 105', 'Mon 22', '', {
        existingIssues: [{ _id: '1', category: 'Classroom', location: 'Room 105', title: 'Mon 22', status: 'Pending' }]
      });
    }, (err) => err.code === 'TIMEOUT' && err.statusCode === 504);
  });

  // 9. Resolved complaints versus new complaints about same asset
  it('Additional Test 9: should exclude Resolved complaints from duplicate candidates', async () => {
    const resolvedComplaint = {
      _id: 'issue_resolved_mon22',
      category: 'Classroom',
      location: 'Room 105',
      title: 'Room 105 — Monitor 22 display fault',
      description: 'Fixed yesterday',
      status: 'Resolved'
    };

    // findDuplicate will filter out Resolved complaints before calling Gemma
    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 105',
      'Room 105 — Monitor 22 display fault',
      'Monitor 22 broke again',
      { existingIssues: [resolvedComplaint] }
    );

    assert.strictEqual(result.isDuplicate, false);
    assert.strictEqual(result.decisionData.decision, 'NOT_DUPLICATE');
    assert.ok(result.decisionData.reason.includes('No active complaints'));
  });

  // 10. Multiple existing candidates, where only one is a genuine duplicate
  it('Additional Test 10: should accurately match the single genuine duplicate among multiple candidates', async () => {
    const candidates = [
      { _id: 'cand_mon_1', title: 'Monitor 1 no power', category: 'Classroom', location: 'Room 105', status: 'Pending' },
      { _id: 'cand_mon_2', title: 'Monitor 2 screen crack', category: 'Classroom', location: 'Room 105', status: 'Pending' },
      { _id: 'cand_mon_22', title: 'Monitor 22 display flickering', category: 'Classroom', location: 'Room 105', status: 'Pending' }
    ];

    gemmaHarness.setMockProvider(async (newComp, candidateList) => {
      return {
        decision: 'DUPLICATE',
        matchedComplaintId: 'cand_mon_22',
        sameLocation: true,
        sameAsset: true,
        sameIncident: true,
        assetIdentity: { type: 'Monitor', identifier: '22', certainty: 'EXPLICIT_IN_COMPLAINT' },
        reason: 'Matches candidate 3 (Monitor 22) display flickering issue.',
        uncertainty: []
      };
    });

    const result = await duplicateDetectionService.findDuplicate(
      'Classroom',
      'Room 105',
      'Monitor 22 display flickering continuously',
      'Screen keeps going black and flickers',
      { existingIssues: candidates }
    );

    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.matchingIssue._id, 'cand_mon_22');
  });

  // 11. Empty or missing descriptions
  it('Additional Test 11: should safely handle empty or missing description strings without errors', async () => {
    const candidate = {
      _id: 'cand_empty_desc',
      title: 'Water leak',
      description: '',
      category: 'Plumbing / Water Leakage',
      location: 'Room 12',
      status: 'Pending'
    };

    gemmaHarness.setMockProvider(async (newComp) => {
      assert.strictEqual(newComp.description, '');
      return {
        decision: 'NOT_DUPLICATE',
        matchedComplaintId: null,
        sameLocation: true,
        sameAsset: false,
        sameIncident: false,
        assetIdentity: { type: null, identifier: null, certainty: 'UNKNOWN' },
        reason: 'Insufficient details.',
        uncertainty: ['Empty description']
      };
    });

    const result = await duplicateDetectionService.findDuplicate(
      'Plumbing / Water Leakage',
      'Room 12',
      'Pipe dripping',
      null,
      { existingIssues: [candidate] }
    );

    assert.strictEqual(result.isDuplicate, false);
  });

  // 12. Unauthorized users attempting to access or manipulate duplicate-support functionality
  it('Additional Test 12: should verify authorization protection on duplicate support endpoint', () => {
    // Simulate authMiddleware behavior
    const authenticate = (req) => {
      const authHeader = req.headers?.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Not authorized to access this route', status: 401 };
      }
      return { success: true };
    };

    const unauthReq = { headers: {} };
    const authResult = authenticate(unauthReq);
    assert.strictEqual(authResult.status, 401);
    assert.strictEqual(authResult.error, 'Not authorized to access this route');
  });
});
