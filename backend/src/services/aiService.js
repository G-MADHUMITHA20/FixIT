const http = require('http');
const https = require('https');
const url = require('url');

/**
 * Normalizes category names to standard FixIt system categories
 */
const CATEGORY_MAP = {
  electrician: 'Electrician',
  electrical: 'Electrician',
  plumber: 'Plumber',
  plumbing: 'Plumber',
  carpenter: 'Carpenter',
  carpentry: 'Carpenter',
  furniture: 'Carpenter',
  it_technician: 'IT Technician',
  it: 'IT Technician',
  network: 'IT Technician',
  laboratory_technician: 'Laboratory Technician',
  laboratory: 'Laboratory Technician',
  lab: 'Laboratory Technician',
  housekeeping: 'Housekeeping / Cleaner',
  housekeeping_cleaner: 'Housekeeping / Cleaner',
  cleaner: 'Housekeeping / Cleaner',
  cleaning: 'Housekeeping / Cleaner',
  civil_maintenance: 'Civil Maintenance Worker',
  civil: 'Civil Maintenance Worker',
  civil_maintenance_worker: 'Civil Maintenance Worker',
  hvac: 'HVAC / AC Technician',
  hvac_technician: 'HVAC / AC Technician',
  ac: 'HVAC / AC Technician',
  ac_technician: 'HVAC / AC Technician',
  general_maintenance: 'Civil Maintenance Worker',
  general: 'Civil Maintenance Worker',
  classroom: 'Carpenter',
  washroom: 'Plumber',
  other: 'Civil Maintenance Worker',
};

/**
 * Dangerous / Safety hazard patterns that require immediate escalation
 */
const SAFETY_HAZARD_KEYWORDS = [
  'spark',
  'sparking',
  'sparks',
  'electric shock',
  'shocked',
  'live wire',
  'exposed wire',
  'burning smell',
  'smoke',
  'smoking',
  'fire',
  'gas leak',
  'gas smell',
  'short circuit',
  'ceiling collapse',
  'falling ceiling',
  'water near electric',
  'water near switch',
  'explod',
  'flame',
];

/**
 * Deterministic keyword-based fallback classifier
 */
function deterministicClassify(text, locationHint = '') {
  const lower = (text || '').toLowerCase();

  // 1. Safety hazard check
  let isDangerous = false;
  let dangerReason = '';
  for (const keyword of SAFETY_HAZARD_KEYWORDS) {
    if (lower.includes(keyword)) {
      isDangerous = true;
      dangerReason = `Detected safety-critical keyword: "${keyword}". Immediate maintenance intervention required.`;
      break;
    }
  }

  // 2. Keyword category determination
  // 2. Keyword category determination
  let category = 'Civil Maintenance Worker';

  // 2a. HVAC / AC Technician
  if (
    lower.includes('ac') ||
    lower.includes('air condition') ||
    lower.includes('cooling') ||
    lower.includes('hvac') ||
    lower.includes('thermostat') ||
    lower.includes('chiller') ||
    lower.includes('compressor') ||
    lower.includes('filter cleaning')
  ) {
    category = 'HVAC / AC Technician';
  }
  // 2b. Electrician
  else if (
    lower.includes('light') ||
    lower.includes('lights') ||
    lower.includes('bulb') ||
    lower.includes('fan') ||
    lower.includes('wire') ||
    lower.includes('wiring') ||
    lower.includes('switch') ||
    lower.includes('socket') ||
    lower.includes('plug') ||
    lower.includes('power') ||
    lower.includes('electricity') ||
    lower.includes('breaker') ||
    lower.includes('tripping') ||
    lower.includes('short circuit')
  ) {
    category = 'Electrician';
  }
  // 2c. Plumber
  else if (
    lower.includes('tap') ||
    lower.includes('pipe') ||
    lower.includes('leak') ||
    lower.includes('water') ||
    lower.includes('flush') ||
    lower.includes('toilet') ||
    lower.includes('sink') ||
    lower.includes('drain') ||
    lower.includes('drainage') ||
    lower.includes('faucet') ||
    lower.includes('clog') ||
    lower.includes('overflow') ||
    lower.includes('washroom') ||
    lower.includes('restroom')
  ) {
    category = 'Plumber';
  }
  // 2d. Carpenter
  else if (
    lower.includes('door') ||
    lower.includes('hinge') ||
    lower.includes('lock') ||
    lower.includes('window') ||
    lower.includes('broken door') ||
    lower.includes('chair') ||
    lower.includes('desk') ||
    lower.includes('table') ||
    lower.includes('bench') ||
    lower.includes('cupboard') ||
    lower.includes('wood') ||
    lower.includes('wooden') ||
    lower.includes('furniture')
  ) {
    category = 'Carpenter';
  }
  // 2e. Housekeeping / Cleaner
  else if (
    lower.includes('clean') ||
    lower.includes('cleaning') ||
    lower.includes('garbage') ||
    lower.includes('trash') ||
    lower.includes('dust') ||
    lower.includes('sweep') ||
    lower.includes('mop') ||
    lower.includes('dirty') ||
    lower.includes('spill') ||
    lower.includes('waste') ||
    lower.includes('smell') ||
    lower.includes('not clean')
  ) {
    category = 'Housekeeping / Cleaner';
  }
  // 2f. Laboratory Technician vs IT Technician
  else if (
    lower.includes('laboratory') ||
    lower.includes('chemistry lab') ||
    lower.includes('physics lab') ||
    lower.includes('biology lab') ||
    lower.includes('lab apparatus') ||
    lower.includes('lab equipment') ||
    lower.includes('microscope')
  ) {
    category = 'Laboratory Technician';
  }
  // 2g. IT Technician / Lab Monitor
  else if (
    lower.includes('monitor') ||
    lower.includes('computer') ||
    lower.includes('screen') ||
    lower.includes('wifi') ||
    lower.includes('internet') ||
    lower.includes('network') ||
    lower.includes('lan') ||
    lower.includes('ethernet') ||
    lower.includes('pc') ||
    lower.includes('printer') ||
    lower.includes('projector') ||
    lower.includes('router')
  ) {
    if (lower.includes('lab')) {
      category = 'Laboratory Technician';
    } else {
      category = 'IT Technician';
    }
  }
  // 2h. Civil Maintenance Worker
  else if (
    lower.includes('wall') ||
    lower.includes('crack') ||
    lower.includes('tile') ||
    lower.includes('mason') ||
    lower.includes('cement') ||
    lower.includes('plaster') ||
    lower.includes('paint') ||
    lower.includes('painting') ||
    lower.includes('ceiling') ||
    lower.includes('floor') ||
    lower.includes('concrete')
  ) {
    category = 'Civil Maintenance Worker';
  }

  // 3. Urgency determination
  let urgency = 'normal';
  if (isDangerous) {
    urgency = 'critical';
  } else if (
    lower.includes('urgent') ||
    lower.includes('emergency') ||
    lower.includes('immediately') ||
    lower.includes('flood') ||
    lower.includes('severe')
  ) {
    urgency = 'high';
  } else if (
    lower.includes('minor') ||
    lower.includes('slight') ||
    lower.includes('cosmetic')
  ) {
    urgency = 'low';
  }

  // 4. Issue Summary
  const firstSentence = text.split(/[.\n]/)[0].trim();
  const summary = firstSentence.length > 0 && firstSentence.length <= 120
    ? firstSentence
    : text.substring(0, 100).trim();

  return {
    category,
    issue_summary: summary || 'Maintenance complaint reported',
    urgency,
    location_extracted: locationHint || '',
    is_dangerous: isDangerous,
    danger_reason: dangerReason,
    usedFallback: true,
  };
}

/**
 * Helper to execute HTTP request with timeout
 */
function postJson(targetUrl, payload, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const postData = JSON.stringify(payload);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseBody));
            } catch (err) {
              reject(new Error(`Failed to parse AI runtime response JSON: ${err.message}`));
            }
          } else {
            reject(new Error(`AI runtime returned HTTP ${res.statusCode}: ${responseBody.slice(0, 200)}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`AI runtime request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Classifies a complaint using Gemma 4 via Ollama, with safety checks and fallback
 *
 * @param {string} title
 * @param {string} description
 * @param {string} location
 * @returns {Promise<Object>} classification results
 */
async function classifyComplaint(title, description, location = '') {
  const combinedText = `${title || ''}. ${description || ''}`.trim();
  const locationText = location ? ` Location: ${location}.` : '';

  // Independent deterministic safety rule check (never bypass safety!)
  const fallbackResult = deterministicClassify(combinedText, location);

  const apiUrl = process.env.GEMMA_API_URL || 'http://127.0.0.1:11434/api/generate';
  const modelName = process.env.GEMMA_MODEL || 'gemma4';
  const timeoutMs = parseInt(process.env.GEMMA_TIMEOUT_MS, 10) || 5000;

  const prompt = `You are FixIt AI's Gemma 4 maintenance triage system for a university campus.
Analyze the following maintenance complaint and extract:
1. "category": Must be one of ["Electrician", "Plumber", "Carpenter", "IT Technician", "Laboratory Technician", "Housekeeping / Cleaner", "Civil Maintenance Worker", "HVAC / AC Technician"].
2. "issue_summary": A concise 1-sentence summary of the specific issue.
3. "urgency": "low", "normal", "high", or "critical".
4. "location_extracted": Any room, floor, or building mentioned (or "" if not specified).
5. "is_dangerous": true ONLY if there is direct safety risk (e.g. fire hazard, live wires, sparking, gas leak, ceiling falling). Otherwise false.
6. "danger_reason": Brief explanation if dangerous, otherwise "".

Respond with ONLY valid JSON with no markdown formatting.

Complaint:
"${combinedText}${locationText}"

JSON Output:`;

  try {
    let rawText = '';

    // A. Use Google Cloud API if GEMINI_API_KEY is configured
    if (process.env.GEMINI_API_KEY) {
      const apiKey = process.env.GEMINI_API_KEY;
      const targetModel = process.env.GEMMA_MODEL || 'gemini-2.5-flash';
      const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      };

      try {
        const googleRes = await postJson(googleApiUrl, payload, timeoutMs);
        rawText = googleRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (cloudErr) {
        console.warn(`[FixIt AI] Google Cloud API call failed: ${cloudErr.message}. Trying local Ollama runtime...`);
      }
    }

    // B. If not using Cloud or Cloud failed, try local Ollama runtime
    if (!rawText) {
      const payload = {
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
        },
      };

      const aiResponse = await postJson(apiUrl, payload, timeoutMs);
      if (aiResponse.response) {
        rawText = aiResponse.response;
      } else if (aiResponse.message && aiResponse.message.content) {
        rawText = aiResponse.message.content;
      }
    }

    // Sanitize and parse JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[FixIt AI] Gemma 4 response did not contain JSON object. Using deterministic fallback.');
      return fallbackResult;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize
    const rawCategory = (parsed.category || '').toLowerCase().trim();
    const normalizedCategory = CATEGORY_MAP[rawCategory] || parsed.category || fallbackResult.category;

    const urgency = ['low', 'normal', 'high', 'critical'].includes(
      (parsed.urgency || '').toLowerCase()
    )
      ? parsed.urgency.toLowerCase()
      : fallbackResult.urgency;

    const isDangerous = Boolean(parsed.is_dangerous) || fallbackResult.is_dangerous;
    const dangerReason = parsed.danger_reason || fallbackResult.danger_reason;

    return {
      category: normalizedCategory,
      issue_summary: parsed.issue_summary || fallbackResult.issue_summary,
      urgency: isDangerous ? 'critical' : urgency,
      location_extracted: parsed.location_extracted || location || '',
      is_dangerous: isDangerous,
      danger_reason: dangerReason,
      usedFallback: false,
      rawOutput: parsed,
    };
  } catch (error) {
    console.warn(`[FixIt AI] Gemma 4 runtime unavailable or errored (${error.message}). Falling back safely to deterministic rule classifier.`);
    return fallbackResult;
  }
}

module.exports = {
  classifyComplaint,
  deterministicClassify,
  CATEGORY_MAP,
  SAFETY_HAZARD_KEYWORDS,
};
