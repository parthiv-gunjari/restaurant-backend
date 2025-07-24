const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' }); // Load env from parent directory

const Admin = require('../models/AdminModel');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const existing = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (existing) {
      existing.password = hashedPassword;
      await existing.save();
      console.log('✅ Existing admin updated');
    } else {
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: hashedPassword,
      });
      console.log('✅ Admin created successfully');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();