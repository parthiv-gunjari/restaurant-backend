const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Simple static admin credentials (can be moved to DB later)
const ADMIN_USER = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

// ===============================
// POST /api/admin/login
// ===============================
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET || 'defaultsecret', {
      expiresIn: '1d',
    });

    res.json({ message: 'Login successful', token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;