require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const seedStaff = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fixit');
    
    // First, try to find an existing test staff account
    let staff = await User.findOne({ email: 'staff@example.com' });
    
    if (staff) {
      // Reset the password by deleting and recreating or just updating
      await User.deleteOne({ email: 'staff@example.com' });
      console.log('Deleted existing staff test account to reset it.');
    }
    
    // Create new test staff account
    staff = await User.create({
      name: 'Test Staff',
      email: 'staff@example.com',
      password: 'password123',
      role: 'staff'
    });
    
    console.log('✅ Staff test account created/reset successfully.');
    console.log(`Email: ${staff.email}`);
    console.log(`Role: ${staff.role}`);
    
    process.exit();
  } catch (error) {
    console.error('❌ Error creating staff account:', error.message);
    process.exit(1);
  }
};

seedStaff();
