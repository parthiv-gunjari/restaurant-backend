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
  'http://localhost:3000', // local frontend
  'http://localhost:3001', // alternate local dev (fixed)
  'http://localhost:3002',
  'https://parthiv-gunjari.github.io',
  'https://parthiv-gunjari.github.io/restaurant-frontend',
  'https://restaurant-frontend-rf1nt1klq-parthiv-kumar-gunjaris-projects.vercel.app',
  'https://restaurant-frontend-oxs4ie1fp-parthiv-kumar-gunjaris-projects.vercel.app',
  'https://www.parthivskitchen.com',
  process.env.RENDER_EXTERNAL_URL // dynamically fetched Render URL if set
];

// ✅ CORS config to allow specific origins
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("❌ CORS blocked for:", origin);
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
const stripeRoutes = require('./routes/stripe');
const paymentIntentRoutes = require('./routes/paymentIntent');
const userRoutes = require('./routes/userRoutes');
const tableRoutes = require('./routes/tableRoutes');
// const publicOrderRoutes = require('./routes/publicOrderRoutes');

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/stripe', paymentIntentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);
// app.use('/api/public-order-status', publicOrderRoutes);

// ✅ Root Route
app.get('/', (req, res) => {
  res.send('🎉 Parthiv\'s Kitchen Backend is live!');
});

// ✅ Health Check
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
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});