const path = require('path');
const dotenv = require('dotenv');

// Explicit, reliable path to FixIt/backend/.env
const backendEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

// Load environment variables from backend/.env
dotenv.config({ path: backendEnvPath });

// Fallback to workspace root .env if GEMINI_API_KEY wasn't defined in backend/.env
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: rootEnvPath });
}

// Configure DNS servers for reliable Google API resolution on Windows
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // Ignored if custom DNS servers are restricted
}

/**
 * Safe boolean check for Gemini API key configuration without exposing the secret.
 * @returns {boolean}
 */
const isGeminiApiKeyConfigured = () => {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
};

/**
 * Retrieves the Gemini API key safely for backend internal use only.
 * @returns {string}
 */
const getGeminiApiKey = () => {
  return (process.env.GEMINI_API_KEY || '').trim();
};

/**
 * Retrieves the configured Gemma 4 model ID.
 * Defaults to 'gemma-4-26b-a4b-it', verified and supported by Gemini API.
 * @returns {string}
 */
const getGemmaModel = () => {
  return (process.env.GEMMA_MODEL || process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it').trim();
};

module.exports = {
  isGeminiApiKeyConfigured,
  getGeminiApiKey,
  getGemmaModel,
  backendEnvPath,
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'fixit_secret_key'
};
