require('./config/env');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const eventService = require('./services/eventService');

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Real-time Server-Sent Events (SSE) connection endpoint
app.get('/api/events', (req, res) => {
  let user = null;
  const token = req.query.token;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'supersecret123');
    } catch (err) {
      // Allow anonymous connection or client handles fallback
    }
  }
  eventService.addClient(req, res, user);
});

app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  let aiConfigured = false;
  let aiModel = 'gemma-4-31b-it';
  try {
    const { isGeminiApiKeyConfigured, getGemmaModel } = require('./config/env');
    aiConfigured = isGeminiApiKeyConfigured();
    aiModel = getGemmaModel();
  } catch (e) {
    aiConfigured = Boolean(process.env.GEMINI_API_KEY);
    aiModel = process.env.GEMMA_MODEL || 'gemma-4-31b-it';
  }

  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const currentReadyState = mongoose.connection.readyState;
  const stateName = readyStates[currentReadyState] || 'unknown';

  if (currentReadyState === 1 && mongoose.connection.db) {
    try {
      await mongoose.connection.db.admin().ping();
      return res.status(200).json({
        success: true,
        status: 'healthy',
        database: {
          connected: true,
          readyState: stateName,
          ping: 'ok',
        },
        aiConfigured,
        aiModel,
        service: 'FixIt API with Gemma 4 Intelligent Worker Assignment',
        timestamp: new Date().toISOString(),
      });
    } catch (pingErr) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        database: {
          connected: false,
          readyState: stateName,
          pingError: pingErr.message,
        },
        aiConfigured,
        aiModel,
        service: 'FixIt API',
        timestamp: new Date().toISOString(),
      });
    }
  }

  const diagnosis = req.app.locals?.dbState?.lastError || {
    category: 'DISCONNECTED',
    type: 'Database not connected',
    message: 'Mongoose connection is not in a ready state',
    actionableGuidance: 'Check backend console logs for connection diagnostics.',
  };

  return res.status(503).json({
    success: false,
    status: 'unhealthy',
    database: {
      connected: false,
      readyState: stateName,
      diagnosis: {
        category: diagnosis.category,
        type: diagnosis.type,
        message: diagnosis.message,
      },
    },
    aiConfigured,
    aiModel,
    service: 'FixIt API',
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
