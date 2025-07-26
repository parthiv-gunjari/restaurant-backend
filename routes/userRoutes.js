const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

// 🔐 Register a new waiter/manager (use only during dev/testing)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!['waiter', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashed, role });
    await newUser.save();
    res.status(201).json({ message: `${role} registered successfully` });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 🔐 Login for waiter/manager
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, username: user.username, fullName: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: user.role, message: `Login successful as ${user.role}` });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login error' });
  }
});
module.exports = router;