// FixIt AI Worker / Technician Seeder (32 Demo Workers: 4 per Specialization)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported in environment
}
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI;

const DEMO_WORKERS_32 = [
  // 1. Electrician (4 workers)
  {
    workerId: 'DEMO-ELEC-01',
    name: 'Demo Worker - Electrician 1 (Ramesh Kumar)',
    email: 'demo.elec1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Electrician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 01001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-ELEC-02',
    name: 'Demo Worker - Electrician 2 (Priya Sharma)',
    email: 'demo.elec2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Electrician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 01002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-ELEC-03',
    name: 'Demo Worker - Electrician 3 (Vignesh M)',
    email: 'demo.elec3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Electrician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 3,
    phone: '+91 98001 01003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-ELEC-04',
    name: 'Demo Worker - Electrician 4 (Anand Verma)',
    email: 'demo.elec4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Electrician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 01004',
    isActive: true,
    isDemo: true,
  },

  // 2. Plumber (4 workers)
  {
    workerId: 'DEMO-PLUM-01',
    name: 'Demo Worker - Plumber 1 (Prakash Raj)',
    email: 'demo.plum1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Plumber',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 02001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-PLUM-02',
    name: 'Demo Worker - Plumber 2 (Murugan S)',
    email: 'demo.plum2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Plumber',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 3,
    phone: '+91 98001 02002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-PLUM-03',
    name: 'Demo Worker - Plumber 3 (Gopal Krishnan)',
    email: 'demo.plum3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Plumber',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 02003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-PLUM-04',
    name: 'Demo Worker - Plumber 4 (Sanjay Patil)',
    email: 'demo.plum4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Plumber',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 02004',
    isActive: true,
    isDemo: true,
  },

  // 3. Carpenter (4 workers)
  {
    workerId: 'DEMO-CARP-01',
    name: 'Demo Worker - Carpenter 1 (Karthik S)',
    email: 'demo.carp1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Carpenter',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 3,
    phone: '+91 98001 03001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CARP-02',
    name: 'Demo Worker - Carpenter 2 (Joseph Anthony)',
    email: 'demo.carp2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Carpenter',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 03002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CARP-03',
    name: 'Demo Worker - Carpenter 3 (Manoj Tiwari)',
    email: 'demo.carp3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Carpenter',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 3,
    phone: '+91 98001 03003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CARP-04',
    name: 'Demo Worker - Carpenter 4 (David Raj)',
    email: 'demo.carp4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Carpenter',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 03004',
    isActive: true,
    isDemo: true,
  },

  // 4. IT Technician (4 workers)
  {
    workerId: 'DEMO-IT-01',
    name: 'Demo Worker - IT Technician 1 (Suresh Babu)',
    email: 'demo.it1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'IT Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 5,
    phone: '+91 98001 04001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-IT-02',
    name: 'Demo Worker - IT Technician 2 (Divya Nair)',
    email: 'demo.it2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'IT Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 5,
    phone: '+91 98001 04002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-IT-03',
    name: 'Demo Worker - IT Technician 3 (Arvind Swamy)',
    email: 'demo.it3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'IT Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 04003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-IT-04',
    name: 'Demo Worker - IT Technician 4 (Rohit Sen)',
    email: 'demo.it4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'IT Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 5,
    phone: '+91 98001 04004',
    isActive: true,
    isDemo: true,
  },

  // 5. Laboratory Technician (4 workers)
  {
    workerId: 'DEMO-LAB-01',
    name: 'Demo Worker - Lab Technician 1 (Dr. K. Meenakshi)',
    email: 'demo.lab1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Laboratory Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 05001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-LAB-02',
    name: 'Demo Worker - Lab Technician 2 (Balaji R)',
    email: 'demo.lab2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Laboratory Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 05002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-LAB-03',
    name: 'Demo Worker - Lab Technician 3 (Geetha Raman)',
    email: 'demo.lab3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Laboratory Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 3,
    phone: '+91 98001 05003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-LAB-04',
    name: 'Demo Worker - Lab Technician 4 (Farooq Ahmed)',
    email: 'demo.lab4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Laboratory Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 05004',
    isActive: true,
    isDemo: true,
  },

  // 6. Housekeeping / Cleaner (4 workers)
  {
    workerId: 'DEMO-CLN-01',
    name: 'Demo Worker - Housekeeping 1 (Naveen Kumar)',
    email: 'demo.cln1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Housekeeping / Cleaner',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 5,
    phone: '+91 98001 06001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CLN-02',
    name: 'Demo Worker - Housekeeping 2 (Lakshmi Devi)',
    email: 'demo.cln2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Housekeeping / Cleaner',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 5,
    phone: '+91 98001 06002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CLN-03',
    name: 'Demo Worker - Housekeeping 3 (Selvam P)',
    email: 'demo.cln3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Housekeeping / Cleaner',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 06003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CLN-04',
    name: 'Demo Worker - Housekeeping 4 (Saravanan V)',
    email: 'demo.cln4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Housekeeping / Cleaner',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 5,
    phone: '+91 98001 06004',
    isActive: true,
    isDemo: true,
  },

  // 7. Civil Maintenance Worker (4 workers)
  {
    workerId: 'DEMO-CIV-01',
    name: 'Demo Worker - Civil Maintenance 1 (Dinesh R)',
    email: 'demo.civ1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Civil Maintenance Worker',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 07001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CIV-02',
    name: 'Demo Worker - Civil Maintenance 2 (Rajesh G)',
    email: 'demo.civ2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Civil Maintenance Worker',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 07002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CIV-03',
    name: 'Demo Worker - Civil Maintenance 3 (Sundar Pichai)',
    email: 'demo.civ3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Civil Maintenance Worker',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 3,
    phone: '+91 98001 07003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-CIV-04',
    name: 'Demo Worker - Civil Maintenance 4 (Muthu Vel)',
    email: 'demo.civ4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'Civil Maintenance Worker',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 07004',
    isActive: true,
    isDemo: true,
  },

  // 8. HVAC / AC Technician (4 workers)
  {
    workerId: 'DEMO-HVAC-01',
    name: 'Demo Worker - HVAC/AC 1 (Imran Khan)',
    email: 'demo.hvac1@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'HVAC / AC Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 08001',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-HVAC-02',
    name: 'Demo Worker - HVAC/AC 2 (Vijay Raghavan)',
    email: 'demo.hvac2@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'HVAC / AC Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 08002',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-HVAC-03',
    name: 'Demo Worker - HVAC/AC 3 (Deepak Joshi)',
    email: 'demo.hvac3@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'HVAC / AC Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 08003',
    isActive: true,
    isDemo: true,
  },
  {
    workerId: 'DEMO-HVAC-04',
    name: 'Demo Worker - HVAC/AC 4 (Syed Mansoor)',
    email: 'demo.hvac4@fixit.campus',
    password: 'password123',
    role: 'technician',
    specialization: 'HVAC / AC Technician',
    availabilityStatus: 'Available',
    isAvailable: true,
    activeAssignmentsCount: 0,
    maxAssignments: 4,
    phone: '+91 98001 08004',
    isActive: true,
    isDemo: true,
  },
];

const seedTechnicians = async () => {
  try {
    console.log('[FixIt Seeder] Connecting to MongoDB Atlas...');
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      });
    }
    console.log('✓ Connected to MongoDB Atlas\n');
    console.log('--- Initializing 32 Demo Workers (4 per Specialization) ---');

    let createdCount = 0;
    let updatedCount = 0;

    for (const worker of DEMO_WORKERS_32) {
      const existing = await User.findOne({ email: worker.email });
      if (!existing) {
        worker.technicianId = worker.technicianId || worker.workerId;
        worker.designation = worker.designation || 'Maintenance Specialist';
        worker.experienceYears = worker.experienceYears || 3;
        worker.department = worker.department || 'Campus Facilities';
        worker.completedAssignmentsCount = worker.completedAssignmentsCount || 0;
        await User.create(worker);
        createdCount++;
        console.log(`✓ [NEW] ${worker.workerId} | ${worker.name} [${worker.specialization}]`);
      } else {
        existing.workerId = worker.workerId;
        existing.technicianId = worker.technicianId || worker.workerId;
        existing.name = worker.name;
        existing.role = 'technician';
        existing.specialization = worker.specialization;
        existing.designation = worker.designation || existing.designation || 'Maintenance Specialist';
        existing.experienceYears = worker.experienceYears || existing.experienceYears || 3;
        existing.department = worker.department || existing.department || 'Campus Facilities';
        existing.availabilityStatus = worker.availabilityStatus;
        existing.isAvailable = worker.isAvailable;
        existing.maxAssignments = worker.maxAssignments;
        existing.phone = worker.phone;
        existing.isActive = worker.isActive;
        existing.isDemo = true;
        await existing.save();
        updatedCount++;
        console.log(`✓ [SYNC] ${worker.workerId} | ${worker.name} [${worker.specialization}]`);
      }
    }

    console.log(`\n========================================`);
    console.log(`Seeding Summary:`);
    console.log(`- Created: ${createdCount} workers`);
    console.log(`- Updated: ${updatedCount} workers`);
    console.log(`- Total Demo Workers in System: ${DEMO_WORKERS_32.length}`);
    console.log(`========================================\n`);

    return { createdCount, updatedCount, total: DEMO_WORKERS_32.length };
  } catch (error) {
    console.error('Error seeding workers:', error);
    throw error;
  }
};

if (require.main === module) {
  seedTechnicians()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedTechnicians, DEMO_WORKERS_32 };
