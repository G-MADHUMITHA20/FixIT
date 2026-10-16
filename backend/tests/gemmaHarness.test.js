const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const gemmaHarness = require('../src/services/gemmaHarness');

describe('Gemma 4 Custom AI Model Harness Unit Tests', () => {
  beforeEach(() => {
    gemmaHarness.resetMockProvider();
  });

  afterEach(() => {
    gemmaHarness.resetMockProvider();
  });

  it('should format structured prompts with system instructions and bounded candidates', () => {
    const newComplaint = {
      title: 'Monitor 25 is not working',
      description: 'Display is black',
      category: 'Classroom',
      location: 'Room 105'
    };

    const candidates = [
      {
        id: 'cand_1',
        title: 'Monitor 22 has a display fault',
        description: 'Flickering',
        category: 'Classroom',
        location: 'Room 105',
        status: 'Pending'
      }
    ];

    const { systemInstructions, promptBody } = gemmaHarness.buildPrompt(newComplaint, candidates, null);

    assert.ok(systemInstructions.includes('MANDATORY RULES:'));
    assert.ok(systemInstructions.includes('Different explicitly identified physical assets'));
    assert.ok(promptBody.includes('Monitor 25 is not working'));
    assert.ok(promptBody.includes('cand_1'));
  });

  it('should validate strict schema and accept valid DUPLICATE decision', () => {
    const rawDecision = {
      decision: 'DUPLICATE',
      matchedComplaintId: 'cand_100',
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

    const validated = gemmaHarness.validateResponseSchema(rawDecision, new Set(['cand_100', 'cand_101']));
    assert.strictEqual(validated.decision, 'DUPLICATE');
    assert.strictEqual(validated.matchedComplaintId, 'cand_100');
  });

  it('should reject invalid decision enum with GemmaAPIError', () => {
    const rawDecision = {
      decision: 'MAYBE_DUPLICATE',
      matchedComplaintId: 'cand_1'
    };

    assert.throws(() => {
      gemmaHarness.validateResponseSchema(rawDecision, new Set(['cand_1']));
    }, (err) => err instanceof gemmaHarness.GemmaAPIError && err.code === 'MALFORMED_RESPONSE');
  });

  it('should reject DUPLICATE decision with hallucinated candidate ID', () => {
    const rawDecision = {
      decision: 'DUPLICATE',
      matchedComplaintId: 'hallucinated_id_999'
    };

    assert.throws(() => {
      gemmaHarness.validateResponseSchema(rawDecision, new Set(['valid_cand_1', 'valid_cand_2']));
    }, (err) => err instanceof gemmaHarness.GemmaAPIError && err.code === 'INVALID_CANDIDATE_ID');
  });

  it('should enforce explicit asset identifier guardrail (Rule A) over model hallucinations', () => {
    const newComplaint = {
      title: 'Room 105 — Monitor 25 is not working',
      description: 'Monitor 25 will not turn on',
      category: 'Classroom',
      location: 'Room 105'
    };

    const candidates = [
      {
        _id: 'cand_22',
        title: 'Room 105 — Monitor 22 has a display fault',
        description: 'Screen broken',
        category: 'Classroom',
        location: 'Room 105'
      }
    ];

    // Simulate model mistakenly returning DUPLICATE
    const hallucinatedDecision = {
      decision: 'DUPLICATE',
      matchedComplaintId: 'cand_22',
      sameLocation: true,
      sameAsset: true,
      sameIncident: true,
      assetIdentity: { type: 'monitor', identifier: '22', certainty: 'EXPLICIT_IN_COMPLAINT' },
      reason: 'Model mistakenly assumed both are monitors in Room 105'
    };

    const safeguarded = gemmaHarness.applyBackendGuardrails(newComplaint, candidates, hallucinatedDecision);
    assert.strictEqual(safeguarded.decision, 'NOT_DUPLICATE');
    assert.strictEqual(safeguarded.matchedComplaintId, null);
    assert.ok(safeguarded.reason.includes('Rule A'));
  });

  it('should enforce location divergence guardrail (Rule E) over model hallucinations', () => {
    const newComplaint = {
      title: 'Monitor 22 is not working',
      description: 'Power issue',
      category: 'Classroom',
      location: 'Room 106'
    };

    const candidates = [
      {
        _id: 'cand_room_105',
        title: 'Monitor 22 is not working',
        description: 'Power issue',
        category: 'Classroom',
        location: 'Room 105'
      }
    ];

    const hallucinatedDecision = {
      decision: 'DUPLICATE',
      matchedComplaintId: 'cand_room_105',
      sameLocation: true,
      sameAsset: true,
      sameIncident: true,
      assetIdentity: { type: 'monitor', identifier: '22', certainty: 'EXPLICIT_IN_COMPLAINT' },
      reason: 'Same monitor 22'
    };

    const safeguarded = gemmaHarness.applyBackendGuardrails(newComplaint, candidates, hallucinatedDecision);
    assert.strictEqual(safeguarded.decision, 'NOT_DUPLICATE');
    assert.strictEqual(safeguarded.matchedComplaintId, null);
    assert.ok(safeguarded.reason.includes('Rule E'));
  });

  it('should safely return NOT_DUPLICATE when zero active candidates exist without calling API', async () => {
    const newComplaint = {
      title: 'Water leak',
      description: 'Ceiling drip',
      category: 'Plumbing',
      location: 'Room 12'
    };

    const result = await gemmaHarness.evaluateComplaint(newComplaint, [], null);
    assert.strictEqual(result.decision, 'NOT_DUPLICATE');
    assert.strictEqual(result.matchedComplaintId, null);
    assert.strictEqual(result.metadata.candidatesEvaluated, 0);
  });

  it('should throw MISSING_API_KEY error when GEMINI_API_KEY is not set and no mock is used', async () => {
    const newComplaint = {
      title: 'Water leak',
      description: 'Drip',
      category: 'Plumbing',
      location: 'Room 12'
    };
    const candidates = [{ _id: '1', title: 'Leak', category: 'Plumbing', location: 'Room 12' }];

    // Ensure no mock and no key
    gemmaHarness.resetMockProvider();
    const origKey = process.env.GEMINI_API_KEY;
    const origGemmaKey = process.env.GEMMA_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMMA_API_KEY;

    try {
      await assert.rejects(async () => {
        await gemmaHarness.evaluateComplaint(newComplaint, candidates, null, { apiKey: null });
      }, (err) => err instanceof gemmaHarness.GemmaAPIError && err.code === 'MISSING_API_KEY');
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey;
      if (origGemmaKey) process.env.GEMMA_API_KEY = origGemmaKey;
    }
  });

  it('should handle mock provider injection for offline tests', async () => {
    gemmaHarness.setMockProvider(async (newComp, candidates) => {
      return {
        decision: 'NOT_DUPLICATE',
        matchedComplaintId: null,
        sameLocation: true,
        sameAsset: false,
        sameIncident: false,
        assetIdentity: { type: 'monitor', identifier: '25', certainty: 'EXPLICIT_IN_COMPLAINT' },
        reason: 'Distinct monitor units.',
        uncertainty: []
      };
    });

    const result = await gemmaHarness.evaluateComplaint(
      { title: 'Monitor 25', location: 'Room 105', category: 'Classroom' },
      [{ _id: 'cand_1', title: 'Monitor 22', location: 'Room 105', category: 'Classroom' }]
    );

    assert.strictEqual(result.decision, 'NOT_DUPLICATE');
    assert.ok(result.metadata.model.includes('mocked'));
  });
});
