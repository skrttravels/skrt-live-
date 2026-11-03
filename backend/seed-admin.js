/**
 * Admin Seed Script
 * Run: node seed-admin.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

// Use Google DNS to fix SRV resolution issues with local ISP DNS
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
    console.log('✅ Connected to MongoDB:', mongoose.connection.name);

    const User = require('./src/modules/auth/model');

    const adminEmail = 'admin@skrt.com';
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      console.log(`ℹ️  Admin already exists: ${existing.email} (role: ${existing.role})`);
    } else {
      const admin = await User.create({
        name:     'SKRT Admin',
        email:    adminEmail,
        password: 'Admin@1234',
        role:     'admin',
        phone:    '9999999999'
      });
      console.log(`✅ Admin user created: ${admin.email}`);
    }

    const managerEmail = 'manager@skrt.com';
    const existingManager = await User.findOne({ email: managerEmail });
    if (!existingManager) {
      await User.create({
        name:     'SKRT Manager',
        email:    managerEmail,
        password: 'Manager@1234',
        role:     'manager',
        phone:    '8888888888'
      });
      console.log(`✅ Manager user created: ${managerEmail}`);
    } else {
      console.log(`ℹ️  Manager already exists: ${existingManager.email}`);
    }

    // Seed default permissions for manager role
    const RolePermission = require('./src/modules/settings/permissionModel');
    const existingPerms = await RolePermission.findOne({ role: 'manager' });
    if (!existingPerms) {
      await RolePermission.create({ role: 'manager', permissions: {} });
      console.log('✅ Default manager permissions seeded');
    } else {
      console.log('ℹ️  Manager permissions already exist');
    }

    await mongoose.connection.close();
    console.log('\n🎉 Seed complete!');
    console.log('   Admin  : admin@skrt.com    / Admin@1234');
    console.log('   Manager: manager@skrt.com  / Manager@1234');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seedAdmin();
