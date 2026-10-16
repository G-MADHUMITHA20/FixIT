require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User = require('../src/models/User');
const MaintenanceIssue = require('../src/models/MaintenanceIssue');
const IssueUpdate = require('../src/models/IssueUpdate');
const Notification = require('../src/models/Notification');

const migrate = async () => {
  try {
    // 1. Connect to Local DB
    console.log('Connecting to Local MongoDB...');
    const localDb = await mongoose.createConnection('mongodb://127.0.0.1:27017/fixit_db').asPromise();
    
    // Create models for local DB
    const LocalUser = localDb.model('User', User.schema);
    const LocalIssue = localDb.model('MaintenanceIssue', MaintenanceIssue.schema);
    const LocalUpdate = localDb.model('IssueUpdate', IssueUpdate.schema);
    const LocalNotification = localDb.model('Notification', Notification.schema);

    console.log('Fetching local data...');
    const users = await LocalUser.find().select('+password').lean();
    const issues = await LocalIssue.find().lean();
    const updates = await LocalUpdate.find().lean();
    const notifications = await LocalNotification.find().lean();
    
    console.log(`Found: ${users.length} Users, ${issues.length} Issues, ${updates.length} Updates, ${notifications.length} Notifications`);

    // 2. Connect to Atlas DB
    console.log('Connecting to Atlas MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Clearing existing Atlas data to prevent duplicates (optional)...');
    // If we only want to ADD previous data that doesn't exist, we can use insertMany without dropping, but dropping ensures an exact copy.
    // Assuming they just want the exact state from before on the new cluster.
    await User.deleteMany({});
    await MaintenanceIssue.deleteMany({});
    await IssueUpdate.deleteMany({});
    await Notification.deleteMany({});

    console.log('Inserting into Atlas DB...');
    if (users.length) await User.insertMany(users);
    if (issues.length) await MaintenanceIssue.insertMany(issues);
    if (updates.length) await IssueUpdate.insertMany(updates);
    if (notifications.length) await Notification.insertMany(notifications);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
