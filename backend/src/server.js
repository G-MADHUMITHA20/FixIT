const { PORT, MONGO_URI, isGeminiApiKeyConfigured, getGemmaModel } = require('./config/env');
const app = require('./app');
const mongoose = require('mongoose');

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/fixit_db';

const connectDB = async () => {
  if (MONGO_URI) {
    try {
      console.log('Connecting to primary MongoDB URI...');
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB connected successfully to primary database');
      return;
    } catch (err) {
      console.warn('Primary MongoDB connection failed (check Atlas IP whitelist / network):', err.message);
      console.log(`Falling back to local MongoDB at ${LOCAL_MONGO_URI}...`);
    }
  }

  await mongoose.connect(LOCAL_MONGO_URI);
  console.log('MongoDB connected successfully to local database (fixit_db)');
};

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Gemini API configured: ${isGeminiApiKeyConfigured()}`);
      console.log(`Gemma duplicate detection model: ${getGemmaModel()}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
