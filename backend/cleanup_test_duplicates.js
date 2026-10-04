require('dotenv').config();
const mongoose = require('mongoose');
const MaintenanceIssue = require('./src/models/MaintenanceIssue');

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fixit');
    console.log('MongoDB connected');
    
    // Removing the second test issue: "room 104 block c"
    const issueId = '6ac258a2377c30f55e667a15';
    const result = await MaintenanceIssue.findByIdAndDelete(issueId);
    
    if (result) {
      console.log(`Successfully deleted duplicate issue: ${result.title} at ${result.location}`);
    } else {
      console.log('Duplicate issue not found. It may have already been deleted.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanup();
