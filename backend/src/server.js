const { PORT, MONGO_URI, isGeminiApiKeyConfigured, getGemmaModel } = require('./config/env');
const app = require('./app');
const mongoose = require('mongoose');
const { sanitizeMongoUri, diagnoseMongoError } = require('./utils/dbDiagnostics');

let PORT = 5000;
let MONGO_URI = process.env.MONGO_URI;
let isGeminiApiKeyConfigured = () => Boolean(process.env.GEMINI_API_KEY);
let getGemmaModel = () => process.env.GEMMA_MODEL || 'gemma-4-31b-it';

try {
  const envConfig = require('./config/env');
  PORT = envConfig.PORT || PORT;
  MONGO_URI = envConfig.MONGO_URI || MONGO_URI;
  if (envConfig.isGeminiApiKeyConfigured) isGeminiApiKeyConfigured = envConfig.isGeminiApiKeyConfigured;
  if (envConfig.getGemmaModel) getGemmaModel = envConfig.getGemmaModel;
} catch (e) {
  // Use process.env defaults
}

// Start HTTP server so health checks and dashboard APIs are responsive
const server = app.listen(PORT, () => {
  console.log(`[FixIt] Backend server running on http://localhost:${PORT}`);
  console.log(`[FixIt] Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`[FixIt] Gemini API configured: ${isGeminiApiKeyConfigured()}`);
  console.log(`[FixIt] Gemma Model: ${getGemmaModel()}`);
});

// Global state tracking for database health check endpoint
app.locals.dbState = {
  connected: false,
  lastError: null,
  connecting: true,
};

async function connectDatabase() {
  if (!MONGO_URI) {
    const errorInfo = {
      category: 'MISSING_CONFIGURATION',
      type: 'Missing MONGO_URI',
      message: 'MONGO_URI is not set in backend/.env',
    };
    app.locals.dbState = { connected: false, lastError: errorInfo, connecting: false };
    console.error('❌ Configuration Error: MONGO_URI is missing from backend/.env');
    return;
  }

  const safeUri = sanitizeMongoUri(MONGO_URI);
  console.log(`[FixIt] Connecting to MongoDB Atlas (${safeUri})...`);

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    app.locals.dbState = {
      connected: true,
      lastError: null,
      connecting: false,
    };
    console.log('✓ [FixIt] MongoDB Atlas connected successfully.');
  } catch (err) {
    const diagnosis = diagnoseMongoError(err);
    app.locals.dbState = {
      connected: false,
      lastError: diagnosis,
      connecting: false,
    };

    console.error('\n' + '='.repeat(65));
    console.error(`❌ MONGODB CONNECTION FAILED: [${diagnosis.category}]`);
    console.error('='.repeat(65));
    console.error(`Type: ${diagnosis.type}`);
    console.error(`Diagnosis: ${diagnosis.message}`);
    console.error(`\nActionable Guidance:\n${diagnosis.actionableGuidance}`);
    console.error('='.repeat(65) + '\n');
  }
}

connectDatabase();

module.exports = server;
