require('./config/env');
const express = require('express');
const cors = require('cors');

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

app.get('/api/health', (req, res) => {
  const { isGeminiApiKeyConfigured, getGemmaModel } = require('./config/env');
  res.json({
    success: true,
    message: 'FixIt API is running',
    aiConfigured: isGeminiApiKeyConfigured(),
    aiModel: getGemmaModel()
  });
});

module.exports = app;
