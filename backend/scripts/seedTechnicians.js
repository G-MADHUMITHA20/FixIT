// Demo technician accounts for hackathon presentation.
// These accounts are fictional and can be removed after the demo.

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fixit_db';

const technicians = [
  { name: 'Arun Kumar', email: 'arun.kumar@fixit-demo.com', password: 'password123', role: 'technician' },
  { name: 'Prakash Raj', email: 'prakash.raj@fixit-demo.com', password: 'password123', role: 'technician' },
  { name: 'Karthik S', email: 'karthik.s@fixit-demo.com', password: 'password123', role: 'technician' },
  { name: 'Suresh B', email: 'suresh.b@fixit-demo.com', password: 'password123', role: 'technician' },
  { name: 'Naveen Kumar', email: 'naveen.kumar@fixit-demo.com', password: 'password123', role: 'technician' },
  { name: 'Dinesh R', email: 'dinesh.r@fixit-demo.com', password: 'password123', role: 'technician' },
  { name: 'Vignesh M', email: 'vignesh.m@fixit-demo.com', password: 'password123', role: 'technician' },
  { name: 'Sanjay Kumar', email: 'sanjay.kumar@fixit-demo.com', password: 'password123', role: 'technician' }
];

const seedTechnicians = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');
    console.log('Demo technicians:');

    let createdCount = 0;

    for (const tech of technicians) {
      const exists = await User.findOne({ email: tech.email });
      if (!exists) {
        await User.create(tech);
        console.log(`✓ ${tech.name} created.`);
        createdCount++;
      } else {
        console.log(`- ${tech.name} already exists. Skipping.`);
      }
    }

    console.log(`\nTechnician seed completed successfully. (${createdCount} created)`);
    process.exit();
  } catch (error) {
    console.error('Error seeding technicians', error);
    process.exit(1);
  }
};

seedTechnicians();
