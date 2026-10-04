const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fixit_db';

async function listUsers() {
  await mongoose.connect(MONGO_URI);
  const users = await User.find({}).select('+password');
  console.log('Users:');
  for (const u of users) {
    console.log(`Email: ${u.email}, Role: ${u.role}, Password length: ${u.password ? u.password.length : 0}, Password starts with: ${u.password ? u.password.substring(0, 10) : 'none'}`);
  }
  process.exit();
}
listUsers();
