const express = require('express');
const router = express.Router();
const Admin = require('../models/AdminModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🔐 Register Admin (for development/testing only)
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashed });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 🔐 Login Admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: 'Login error' });
  }
});

module.exports = router;
