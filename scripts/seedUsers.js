const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function seedUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    await User.deleteMany({});
    console.log('Old users removed');

    const rawUsers = [
      { username: 'waiter1', password: 'waiter123', role: 'waiter' },
      { username: 'waiter2', password: 'waiter123', role: 'waiter' },
      { username: 'waiter3', password: 'waiter123', role: 'waiter' },
      { username: 'parthiv', password: 'manager123', role: 'manager' },
      { username: 'divya', password: 'manager123', role: 'manager' },
      { username: 'admin', password: 'admin1234', role: 'admin' } // 👈 NEW
    ];

    const users = await Promise.all(
  rawUsers.map(async (user) => {
    const hashed = await bcrypt.hash(user.password, 10);
    return {
      username: user.username,
      password: hashed, // ✅ store in password
      role: user.role,
      active: true
    };
  })
);

    await User.insertMany(users);
    console.log('✅ Users seeded successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding users:', err.message);
    process.exit(1);
  }
}

seedUsers();