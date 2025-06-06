const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

const app = express();

// ✅ Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Updated: Allowed frontend origins
const allowedOrigins = [
  'http://localhost:3000',                            // local frontend
  'http://localhost:3001',                            // alternate local dev
  'https://parthiv-gunjari.github.io',
  'https://parthiv-gunjari.github.io/restaurant-frontend'                // GitHub Pages
];

// ✅ Updated: CORS config to check allowed origins
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true
}));

// ✅ Explicitly handle preflight requests for all routes
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true
}));

// ✅ Parse incoming JSON
app.use(express.json());

// ✅ Routes
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicOrderRoutes = require('./routes/publicOrderRoutes');

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public-order-status', publicOrderRoutes);

app.get('/test', (req, res) => {
  res.json({ message: 'Backend working fine!' });
});

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ✅ Server start
const PORT = process.env.PORT || 5051;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});