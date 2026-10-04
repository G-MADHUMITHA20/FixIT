const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'FixIt API is running'
  });
});

module.exports = app;
