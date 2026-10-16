const crypto = require('crypto');
const { getGeminiApiKey, getGemmaModel, isGeminiApiKeyConfigured } = require('../config/env');

/**
 * Custom Gemma 4 AI Model Harness
 * Integrates Google DeepMind Gemma 4 via the Gemini API endpoint.
 * Provides prompt formatting, structured schema validation, candidate verification,
 * explicit asset guardrails, rate-limit/timeout handling, and mock injection for testing.
 */

class GemmaAPIError extends Error {
  constructor(message, code, statusCode = null, details = null) {
    super(message);
    this.name = 'GemmaAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Default model configuration (Gemma 4 model verified compatible with Gemini API)
const DEFAULT_MODEL = 'gemma-4-26b-a4b-it';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GEMMA_TIMEOUT_MS, 10) || 45000;
const MAX_CANDIDATES = 10;

// Allowed decision enum
const ALLOWED_DECISIONS = ['DUPLICATE', 'NOT_DUPLICATE', 'UNCERTAIN'];

// In-memory mock provider for unit and integration testing
let mockProvider = null;

const setMockProvider = (provider) => {
  mockProvider = provider;
};

const resetMockProvider = () => {
  mockProvider = null;
};

const getMockProvider = () => mockProvider;

/**
 * Helper to extract explicit asset identifier if present (for backend sanity guardrail)
 */
const extractExplicitIdentifier = (text = '') => {
  if (!text) return null;
  // Match patterns like "Monitor 22", "Monitor-25", "PC 5", "Fan #2", "Projector 1", "Room 105 - Monitor 25"
  // Exclude room numbers
  const sanitized = text.replace(/\b(?:room|rm|classroom|hall|lab|floor|block)\s*(?:no\b\.?|number\b|#)?\s*\d+\b/gi, ' ');
  const match = sanitized.match(/\b([a-zA-Z]{2,15})\s*(?:no\b\.?|number\b|#|-)?\s*(\d+[a-zA-Z]?)\b/i);
  if (match) {
    return {
      type: match[1].toLowerCase(),
      identifier: match[2].toLowerCase()
    };
  }
  return null;
};

/**
 * Normalizes location for comparison guardrail
 */
const normalizeLocationKey = (loc = '') => {
  return loc.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\b(number|no)\b/g, '').replace(/\brm\b/g, 'room').split(/\s+/).filter(Boolean).sort().join(' ');
};

/**
 * Builds the structured prompt for Gemma 4
 */
const buildPrompt = (newComplaint, candidateComplaints, inventoryInfo = null) => {
  const candidateList = candidateComplaints.map((c, idx) => ({
    candidateIndex: idx + 1,
    id: String(c._id || c.id),
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    status: c.status,
    reportedAt: c.reportedAt || c.createdAt || 'Unknown'
  }));

  const systemInstructions = `You are the core intelligence of the FixIt Campus Maintenance Reporting System.
Your job is to perform accurate, asset-aware semantic duplicate detection between a newly submitted maintenance complaint and relevant active ongoing complaints.

MANDATORY RULES:
1. Different explicitly identified physical assets (e.g. Monitor 22 vs Monitor 25, Fan 1 vs Fan 2) must NEVER be marked as duplicates, even if they share the same room, category, and symptoms.
2. Reports referring to the exact same physical asset and the same ongoing incident are DUPLICATES, even if reported with completely different phrasing or vocabulary (e.g. "ceiling fan is not working" vs "fan has stopped rotating" where inventory confirms only one fan).
3. The same asset with clearly distinct faults (e.g. cracked screen vs power failure) must NOT be automatically classified as a duplicate unless reliable evidence shows they describe the same incident.
4. The same room or category alone is NEVER sufficient evidence of a duplicate.
5. Different physical locations (e.g. Room 105 vs Room 106) must be considered separate complaints unless explicit evidence proves they describe the same incident.
6. Missing asset identifiers, conflicting evidence, or uncertain incident identity must result in UNCERTAIN (never force a duplicate).
7. If equipment inventory indicates a room has multiple identical devices and no asset identifier is provided, you must NOT assume they are the same device.
8. matchedComplaintId MUST be the exact id string from the Candidate Complaints list if DUPLICATE, or null if NOT_DUPLICATE or UNCERTAIN. Never hallucinate an id.

You must respond with ONLY a valid, parseable JSON object matching this schema:
{
  "decision": "DUPLICATE" | "NOT_DUPLICATE" | "UNCERTAIN",
  "matchedComplaintId": string | null,
  "sameLocation": boolean,
  "sameAsset": boolean,
  "sameIncident": boolean,
  "assetIdentity": {
    "type": string | null,
    "identifier": string | null,
    "certainty": "EXPLICIT_IN_COMPLAINT" | "INFERRED_FROM_VERIFIED_INVENTORY" | "UNKNOWN"
  },
  "reason": string,
  "uncertainty": string[]
}`;

  const promptBody = `NEW COMPLAINT:
- Title: ${newComplaint.title}
- Description: ${newComplaint.description || '(No additional description provided)'}
- Category: ${newComplaint.category}
- Location: ${newComplaint.location}

VERIFIED EQUIPMENT INVENTORY FOR LOCATION:
${inventoryInfo ? JSON.stringify(inventoryInfo, null, 2) : 'No verified single-device inventory available. Assume multiple devices may exist.'}

RELEVANT ACTIVE CANDIDATE COMPLAINTS (${candidateList.length} items):
${JSON.stringify(candidateList, null, 2)}

Evaluate the new complaint against the candidate complaints and return the structured JSON decision.`;

  return { systemInstructions, promptBody };
};

/**
 * Validates the raw JSON returned by Gemma 4 against the strict schema
 */
const validateResponseSchema = (data, candidateIds = new Set()) => {
  if (!data || typeof data !== 'object') {
    throw new GemmaAPIError('Gemma 4 returned a non-object payload', 'MALFORMED_RESPONSE');
  }

  if (!ALLOWED_DECISIONS.includes(data.decision)) {
    throw new GemmaAPIError(
      `Invalid decision "${data.decision}". Allowed decisions: ${ALLOWED_DECISIONS.join(', ')}`,
      'MALFORMED_RESPONSE'
    );
  }

  // Validate matchedComplaintId
  if (data.decision === 'DUPLICATE') {
    if (!data.matchedComplaintId) {
      throw new GemmaAPIError(
        'Decision is DUPLICATE but matchedComplaintId was not specified',
        'MALFORMED_RESPONSE'
      );
    }
    const matchedStr = String(data.matchedComplaintId);
    if (!candidateIds.has(matchedStr)) {
      throw new GemmaAPIError(
        `matchedComplaintId "${matchedStr}" does not exist in candidate complaints list`,
        'INVALID_CANDIDATE_ID'
      );
    }
  }

  if (typeof data.sameLocation !== 'boolean') data.sameLocation = false;
  if (typeof data.sameAsset !== 'boolean') data.sameAsset = false;
  if (typeof data.sameIncident !== 'boolean') data.sameIncident = false;

  if (!data.assetIdentity || typeof data.assetIdentity !== 'object') {
    data.assetIdentity = { type: null, identifier: null, certainty: 'UNKNOWN' };
  }

  if (!data.reason || typeof data.reason !== 'string') {
    data.reason = 'No reason provided by model.';
  }

  if (!Array.isArray(data.uncertainty)) {
    data.uncertainty = [];
  }

  return data;
};

/**
 * Mandatory backend safeguards that prevent model hallucinations from violating fundamental rules
 */
const applyBackendGuardrails = (newComplaint, candidateComplaints, validatedDecision) => {
  if (validatedDecision.decision !== 'DUPLICATE') {
    return validatedDecision;
  }

  const matchedCandidate = candidateComplaints.find(
    (c) => String(c._id || c.id) === String(validatedDecision.matchedComplaintId)
  );

  if (!matchedCandidate) {
    return {
      decision: 'UNCERTAIN',
      matchedComplaintId: null,
      sameLocation: false,
      sameAsset: false,
      sameIncident: false,
      assetIdentity: validatedDecision.assetIdentity,
      reason: 'Backend guardrail: Matched candidate ID was not found in active candidates set.',
      uncertainty: ['Matched candidate ID not found']
    };
  }

  // Safeguard 1: Location divergence guardrail (Rule E)
  const normNewLoc = normalizeLocationKey(newComplaint.location);
  const normCandLoc = normalizeLocationKey(matchedCandidate.location);
  if (normNewLoc !== normCandLoc) {
    return {
      decision: 'NOT_DUPLICATE',
      matchedComplaintId: null,
      sameLocation: false,
      sameAsset: validatedDecision.sameAsset,
      sameIncident: false,
      assetIdentity: validatedDecision.assetIdentity,
      reason: `Backend guardrail (Rule E): Locations differ ("${newComplaint.location}" vs "${matchedCandidate.location}"). Physical locations are distinct.`,
      uncertainty: []
    };
  }

  // Safeguard 2: Explicit Asset Identifier Conflict Guardrail (Rule A)
  const newAsset = extractExplicitIdentifier(`${newComplaint.title} ${newComplaint.description}`);
  const candAsset = extractExplicitIdentifier(`${matchedCandidate.title} ${matchedCandidate.description}`);

  if (newAsset && candAsset && newAsset.type === candAsset.type && newAsset.identifier !== candAsset.identifier) {
    return {
      decision: 'NOT_DUPLICATE',
      matchedComplaintId: null,
      sameLocation: true,
      sameAsset: false,
      sameIncident: false,
      assetIdentity: {
        type: newAsset.type,
        identifier: newAsset.identifier,
        certainty: 'EXPLICIT_IN_COMPLAINT'
      },
      reason: `Backend guardrail (Rule A): Explicit asset identifiers differ (${newAsset.type} ${newAsset.identifier} vs ${candAsset.type} ${candAsset.identifier}). Cannot be merged.`,
      uncertainty: []
    };
  }

  return validatedDecision;
};

/**
 * Main AI Model Harness evaluation function
 */
const evaluateComplaint = async (newComplaint, candidateComplaints = [], inventoryInfo = null, options = {}) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const rawModel = options.model || getGemmaModel() || DEFAULT_MODEL;
  const model = rawModel.startsWith('models/') ? rawModel.slice(7) : rawModel;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  // Bounded candidate retrieval
  const boundedCandidates = candidateComplaints.slice(0, MAX_CANDIDATES);
  const candidateIds = new Set(boundedCandidates.map((c) => String(c._id || c.id)));

  // If there are 0 active candidates, it is definitely not a duplicate
  if (boundedCandidates.length === 0) {
    return {
      decision: 'NOT_DUPLICATE',
      matchedComplaintId: null,
      sameLocation: false,
      sameAsset: false,
      sameIncident: false,
      assetIdentity: { type: null, identifier: null, certainty: 'UNKNOWN' },
      reason: 'No active complaints exist in this location or category.',
      uncertainty: [],
      metadata: { requestId, latencyMs: Date.now() - startTime, model, candidatesEvaluated: 0 }
    };
  }

  // Check for in-memory mock provider (used in unit/integration tests)
  const activeMock = options.mockProvider || mockProvider;
  if (activeMock) {
    try {
      const mockResult = await activeMock(newComplaint, boundedCandidates, inventoryInfo, options);
      const validated = validateResponseSchema(mockResult, candidateIds);
      const safeguarded = applyBackendGuardrails(newComplaint, boundedCandidates, validated);
      safeguarded.metadata = {
        requestId,
        latencyMs: Date.now() - startTime,
        model: `${model}-mocked`,
        candidatesEvaluated: boundedCandidates.length
      };
      return safeguarded;
    } catch (err) {
      if (err instanceof GemmaAPIError) throw err;
      throw new GemmaAPIError(`Mock provider failed: ${err.message}`, 'MOCK_FAILURE', 500, err);
    }
  }

  // Check Gemini API Key configuration
  const apiKey = (options.apiKey !== undefined
    ? (options.apiKey || '')
    : (getGeminiApiKey() || process.env.GEMINI_API_KEY || '')
  ).trim();
  if (!apiKey) {
    throw new GemmaAPIError(
      'Gemini API key is not configured. Set GEMINI_API_KEY in backend environment.',
      'MISSING_API_KEY',
      503
    );
  }

  const { systemInstructions, promptBody } = buildPrompt(newComplaint, boundedCandidates, inventoryInfo);

  // Send request to Google Generative Language API
  const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestPayload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstructions}\n\n${promptBody}` }]
      }
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 2048
    }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });
  } catch (netErr) {
    clearTimeout(timer);
    if (netErr.name === 'AbortError' && model === 'gemma-4-31b-it' && !options._retried) {
      console.warn(`[Gemma 4 Harness] Model gemma-4-31b-it timed out after ${timeoutMs}ms. Retrying with verified responsive Gemma 4 model (gemma-4-26b-a4b-it)...`);
      return evaluateComplaint(newComplaint, candidateComplaints, inventoryInfo, {
        ...options,
        model: 'gemma-4-26b-a4b-it',
        _retried: true
      });
    }
    if (netErr.name === 'AbortError') {
      throw new GemmaAPIError(`Gemma 4 request timed out after ${timeoutMs}ms`, 'TIMEOUT', 504);
    }
    throw new GemmaAPIError(`Network error communicating with Gemma 4: ${netErr.message}`, 'NETWORK_ERROR', 503);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson = null;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // Non-JSON response
    }

    const apiMessage = errorJson?.error?.message || errorText;
    const apiStatus = errorJson?.error?.status || '';

    // Distinguish authentication / invalid key errors from missing key errors
    if (
      response.status === 401 ||
      response.status === 403 ||
      apiStatus === 'UNAUTHENTICATED' ||
      apiStatus === 'PERMISSION_DENIED' ||
      (response.status === 400 && /API_KEY_INVALID|API key not valid|invalid api key/i.test(apiMessage))
    ) {
      throw new GemmaAPIError(
        'Gemini API authentication failed: The configured GEMINI_API_KEY is invalid or unauthorized.',
        'INVALID_API_KEY',
        401,
        apiMessage
      );
    }

    if (response.status === 404) {
      throw new GemmaAPIError(
        `Gemma 4 model "${model}" was not found or is not supported by the Gemini API endpoint.`,
        'MODEL_NOT_FOUND',
        404,
        apiMessage
      );
    }

    if (response.status === 429) {
      throw new GemmaAPIError(
        'Gemma 4 API quota or rate limit exceeded.',
        'RATE_LIMIT_EXCEEDED',
        429,
        apiMessage
      );
    }

    if (response.status === 503) {
      throw new GemmaAPIError(
        'Gemma 4 service is temporarily unavailable.',
        'SERVICE_UNAVAILABLE',
        503,
        apiMessage
      );
    }

    throw new GemmaAPIError(
      `Gemma 4 API error (HTTP ${response.status}): ${apiMessage || response.statusText}`,
      'API_ERROR',
      response.status,
      apiMessage
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new GemmaAPIError('Failed to parse Gemma 4 API response as JSON', 'MALFORMED_RESPONSE', 502);
  }

  // Extract model output parts (Gemma 4 provides thought parts and non-thought response parts)
  const parts = data.candidates?.[0]?.content?.parts || [];
  if (parts.length === 0) {
    throw new GemmaAPIError('Gemma 4 returned an empty response body', 'EMPTY_RESPONSE', 502);
  }

  // Extract final non-thought text part
  const nonThoughtParts = parts.filter((p) => !p.thought);
  const candidatePart = (nonThoughtParts.length > 0
    ? nonThoughtParts[nonThoughtParts.length - 1].text
    : parts[parts.length - 1].text
  ) || '';

  if (!candidatePart.trim()) {
    throw new GemmaAPIError('Gemma 4 returned empty text content', 'EMPTY_RESPONSE', 502);
  }

  let parsedDecision;
  try {
    // Strip markdown code fences if present
    let cleanedJson = candidatePart.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleanedJson.indexOf('{');
    const lastBrace = cleanedJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
    }
    parsedDecision = JSON.parse(cleanedJson);
  } catch (jsonErr) {
    throw new GemmaAPIError(
      `Gemma 4 response was not valid JSON: ${candidatePart.slice(0, 200)}`,
      'MALFORMED_RESPONSE',
      502
    );
  }

  const validated = validateResponseSchema(parsedDecision, candidateIds);
  const finalDecision = applyBackendGuardrails(newComplaint, boundedCandidates, validated);

  const latencyMs = Date.now() - startTime;
  console.log(`[Gemma 4 Harness] Request: ${requestId} | Model: ${model} | Latency: ${latencyMs}ms | Decision: ${finalDecision.decision}`);

  finalDecision.metadata = {
    requestId,
    latencyMs,
    model,
    candidatesEvaluated: boundedCandidates.length
  };

  return finalDecision;
};

module.exports = {
  evaluateComplaint,
  buildPrompt,
  validateResponseSchema,
  applyBackendGuardrails,
  extractExplicitIdentifier,
  setMockProvider,
  resetMockProvider,
  getMockProvider,
  GemmaAPIError,
  DEFAULT_MODEL,
  ALLOWED_DECISIONS
};
