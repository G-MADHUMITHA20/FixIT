const { PORT = 5000, MONGO_URI, isGeminiApiKeyConfigured, getGemmaModel } = require('./config/env');
const app = require('./app');
const mongoose = require('mongoose');
const { sanitizeMongoUri, diagnoseMongoError } = require('./utils/dbDiagnostics');

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/fixit_db';

// Global state tracking for database health check endpoint
app.locals.dbState = {
  connected: false,
  lastError: null,
  connecting: true,
};

// Start HTTP server so health checks and dashboard APIs are responsive
const server = app.listen(PORT, () => {
  console.log(`[FixIt] Backend server running on http://localhost:${PORT}`);
  console.log(`[FixIt] Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`[FixIt] Gemini API configured: ${typeof isGeminiApiKeyConfigured === 'function' ? isGeminiApiKeyConfigured() : Boolean(process.env.GEMINI_API_KEY)}`);
  console.log(`[FixIt] Gemma Model: ${typeof getGemmaModel === 'function' ? getGemmaModel() : (process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it')}`);
});

async function connectDatabase() {
  if (MONGO_URI) {
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
      return;
    } catch (err) {
      const diagnosis = diagnoseMongoError(err);
      console.warn(`[FixIt] Primary MongoDB Atlas connection failed (${diagnosis.type}: ${diagnosis.message})`);
      console.log(`[FixIt] Falling back to local MongoDB at ${LOCAL_MONGO_URI}...`);
    }
  }

  // Fallback to local MongoDB
  try {
    await mongoose.connect(LOCAL_MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    app.locals.dbState = {
      connected: true,
      lastError: null,
      connecting: false,
    };
    console.log('✓ [FixIt] Connected successfully to local database (fixit_db).');
  } catch (localErr) {
    const diagnosis = diagnoseMongoError(localErr);
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
