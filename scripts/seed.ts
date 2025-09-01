import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Project from '../models/Project';

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seed() {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});

    // Create users
    const users = await User.create([
      {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'EMPLOYEE',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'PM',
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'FM',
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        role: 'ADMIN',
      },
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create projects
    const projects = await Project.create([
      {
        name: 'Project Alpha',
        code: 'ALPHA',
        projectManagerId: users[1]._id, // Jane Smith (PM)
        active: true,
      },
      {
        name: 'Project Beta',
        code: 'BETA',
        projectManagerId: users[1]._id, // Jane Smith (PM)
        active: true,
      },
      {
        name: 'Project Gamma',
        code: 'GAMMA',
        projectManagerId: users[2]._id, // Mike Johnson (FM)
        active: true,
      },
      {
        name: 'Project Delta',
        code: 'DELTA',
        projectManagerId: users[3]._id, // Sarah Wilson (ADMIN)
        active: true,
      },
    ]);

    console.log(`✅ Created ${projects.length} projects`);

    // Set up manager relationships
    await User.findByIdAndUpdate(users[0]._id, {
      managerId: users[1]._id, // John reports to Jane
      functionalManagerId: users[2]._id, // John's functional manager is Mike
    });

    console.log('✅ Set up manager relationships');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Employee: john@example.com / password123');
    console.log('PM: jane@example.com / password123');
    console.log('FM: mike@example.com / password123');
    console.log('Admin: sarah@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
