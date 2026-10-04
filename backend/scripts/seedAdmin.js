require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fixit_db';

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    
    const adminExists = await User.findOne({ email: 'admin@fixit.com' });
    if (adminExists) {
      console.log('Admin already exists');
      process.exit();
    }
    
    await User.create({
      name: 'System Admin',
      email: 'admin@fixit.com',
      password: 'adminpassword123',
      role: 'admin'
    });
    
    console.log('Admin created successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding admin', error);
    process.exit(1);
  }
};

seedAdmin();
