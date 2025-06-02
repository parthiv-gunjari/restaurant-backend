const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Enable CORS with full options
app.use(cors({
  origin: 'http://localhost:3009',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ Handle preflight requests
app.options('*', cors());

app.use(express.json());

// ✅ Routes
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <— if separate

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes); // if using separate login route

app.get('/test', (req, res) => {
  res.json({ message: 'Backend working fine!' });
});

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5051;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});