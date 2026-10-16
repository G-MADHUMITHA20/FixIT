const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const env = require('../src/config/env');
const gemmaHarness = require('../src/services/gemmaHarness');

describe('FixIt Backend Environment Variable & Gemini Configuration Tests', () => {
  it('should reliably locate and load backend/.env file path', () => {
    assert.ok(env.backendEnvPath, 'backendEnvPath must be defined');
    assert.ok(fs.existsSync(env.backendEnvPath), `backend/.env must exist at: ${env.backendEnvPath}`);
    assert.ok(env.backendEnvPath.endsWith('.env'), 'Must target .env file');
  });

  it('should verify GEMINI_API_KEY presence using safe boolean check without exposing value', () => {
    const isConfigured = env.isGeminiApiKeyConfigured();
    assert.strictEqual(typeof isConfigured, 'boolean', 'Safe check must return a boolean');
    // If user has provided a key in backend/.env, isConfigured must be true
    const directCheck = Boolean(process.env.GEMINI_API_KEY?.trim());
    assert.strictEqual(isConfigured, directCheck, 'env.isGeminiApiKeyConfigured() must match Boolean check');
  });

  it('should configure a verified Gemma 4 model by default', () => {
    const model = env.getGemmaModel();
    assert.ok(model, 'Model must be defined');
    assert.ok(
      model.includes('gemma'),
      `Configured model "${model}" must be a Gemma model`
    );
  });

  it('should throw MISSING_API_KEY (503) when API key is completely absent', async () => {
    const dummyComplaint = {
      title: 'Water tap leaking',
      description: 'Dripping continuously',
      category: 'Plumbing',
      location: 'Washroom 2'
    };
    const dummyCandidate = [{
      _id: 'cand_plumb_1',
      title: 'Tap leaking',
      description: 'Dripping',
      category: 'Plumbing',
      location: 'Washroom 2',
      status: 'Pending'
    }];

    await assert.rejects(
      async () => {
        await gemmaHarness.evaluateComplaint(dummyComplaint, dummyCandidate, null, {
          apiKey: '',
          mockProvider: null
        });
      },
      (err) => {
        assert.ok(err instanceof gemmaHarness.GemmaAPIError);
        assert.strictEqual(err.code, 'MISSING_API_KEY');
        assert.strictEqual(err.statusCode, 503);
        assert.ok(err.message.includes('GEMINI_API_KEY in backend environment'));
        return true;
      }
    );
  });

  it('should throw INVALID_API_KEY (401) when an invalid key is supplied to live API', async () => {
    const dummyComplaint = {
      title: 'Water tap leaking',
      description: 'Dripping continuously',
      category: 'Plumbing',
      location: 'Washroom 2'
    };
    const dummyCandidate = [{
      _id: 'cand_plumb_1',
      title: 'Tap leaking',
      description: 'Dripping',
      category: 'Plumbing',
      location: 'Washroom 2',
      status: 'Pending'
    }];

    await assert.rejects(
      async () => {
        await gemmaHarness.evaluateComplaint(dummyComplaint, dummyCandidate, null, {
          apiKey: 'AIzaSy_INVALID_DUMMY_KEY_FOR_TESTING_12345678',
          mockProvider: null,
          timeoutMs: 10000
        });
      },
      (err) => {
        assert.ok(err instanceof gemmaHarness.GemmaAPIError);
        assert.strictEqual(err.code, 'INVALID_API_KEY');
        assert.strictEqual(err.statusCode, 401);
        assert.ok(err.message.includes('authentication failed'));
        return true;
      }
    );
  });

  it('should never expose GEMINI_API_KEY in error details or error messages', async () => {
    const dummyComplaint = {
      title: 'Water tap leaking',
      description: 'Dripping continuously',
      category: 'Plumbing',
      location: 'Washroom 2'
    };
    const dummyCandidate = [{
      _id: 'cand_plumb_1',
      title: 'Tap leaking',
      description: 'Dripping',
      category: 'Plumbing',
      location: 'Washroom 2',
      status: 'Pending'
    }];

    const fakeSecret = 'SECRET_TEST_KEY_THAT_MUST_NEVER_LEAK';
    try {
      await gemmaHarness.evaluateComplaint(dummyComplaint, dummyCandidate, null, {
        apiKey: fakeSecret,
        mockProvider: null,
        timeoutMs: 10000
      });
    } catch (err) {
      assert.ok(!err.message.includes(fakeSecret), 'Error message must not contain secret key');
    }
  });
});
