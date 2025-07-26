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
  { username: 'waiter1', password: 'waiter123', role: 'waiter', fullName: 'Waiter One' },
  { username: 'waiter2', password: 'waiter123', role: 'waiter', fullName: 'Waiter Two' },
  { username: 'waiter3', password: 'waiter123', role: 'waiter', fullName: 'Waiter Three' },
  { username: 'parthiv', password: 'manager123', role: 'manager', fullName: 'Parthiv Kumar' },
  { username: 'divya', password: 'manager123', role: 'manager', fullName: 'Divya Sri' },
  { username: 'admin', password: 'admin1234', role: 'admin', fullName: 'Admin User' }
];

    const users = await Promise.all(
      rawUsers.map(async (user) => {
        const hashed = await bcrypt.hash(user.password, 10);
      return {
  username: user.username,
  password: hashed,
  role: user.role,
  fullName: user.fullName,
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