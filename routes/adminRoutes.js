const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel'); // ✅ Updated to unified User model

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log("🔐 Attempting login for:", username);

  try {
    const user = await User.findOne({ username });
    console.log("Found user?", !!user);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid credentials or inactive user' });
    }

    if (!['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this portal' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match?", isMatch);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not defined in environment variables');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token, role: user.role, message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;