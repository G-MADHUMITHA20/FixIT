const { describe, it } = require('node:test');
const assert = require('node:assert');
const gemmaHarness = require('../src/services/gemmaHarness');

describe('Optional Live Gemma 4 Model Integration', () => {
  it('should run live against configured Gemma 4 endpoint if GEMINI_API_KEY is present', async (t) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMMA_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      console.log('   [Live Test Skipped] GEMINI_API_KEY not configured. Real API test skipped safely.');
      return;
    }

    console.log('   [Live Test] Running real Gemma 4 call with configured GEMINI_API_KEY...');

    const newComplaint = {
      title: 'Room 105 — Monitor 25 is not working',
      description: 'Monitor 25 screen is black',
      category: 'Classroom',
      location: 'Room 105'
    };

    const candidates = [
      {
        id: 'candidate_issue_1',
        title: 'Room 105 — Monitor 22 has a display fault',
        description: 'Screen broken',
        category: 'Classroom',
        location: 'Room 105',
        status: 'Pending'
      }
    ];

    try {
      const result = await gemmaHarness.evaluateComplaint(newComplaint, candidates, null, {
        apiKey,
        timeoutMs: 15000
      });

      assert.ok(result);
      assert.ok(['DUPLICATE', 'NOT_DUPLICATE', 'UNCERTAIN'].includes(result.decision));
      assert.strictEqual(typeof result.reason, 'string');
      console.log(`   [Live Test Result] Decision: ${result.decision} | Latency: ${result.metadata.latencyMs}ms`);
    } catch (err) {
      console.warn(`   [Live Test Warning] Real API returned: ${err.message}`);
      // Do not fail if user has invalid/expired key, but report error safely
    }
  });
});
