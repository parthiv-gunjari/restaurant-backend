const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const path = require('path');
const fs = require('fs');

const app = express();


// ✅ Updated: Allowed frontend origins
const allowedOrigins = [
  'http://localhost:3000', // local frontend
  'http://localhost:3001', // alternate local dev
  'http://localhost:3002',
  'https://parthiv-gunjari.github.io',
  'https://parthiv-gunjari.github.io/restaurant-frontend',
  'https://www.parthivskitchen.com',
  process.env.RENDER_EXTERNAL_URL, // Render service URL, if set
  process.env.FRONTEND_URL,        // Custom frontend URL, if set
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` // Vercel preview/prod URL, if set
].filter(Boolean);

// ✅ CORS config to allow specific origins, *.vercel.app, and requests with no origin
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // allow non-browser or same-origin requests (health checks, curl, server-to-server)
      return callback(null, true);
    }
    const isAllowed =
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(new URL(origin).hostname);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error('❌ CORS blocked for:', origin);
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true
}));

// Respond to preflight requests for all routes
app.options('*', cors());

// ✅ Ensure uploads directory exists (useful locally; on some hosts the FS is ephemeral)
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory at', uploadsDir);
  }
} catch (e) {
  console.warn('⚠️ Could not ensure uploads directory:', e.message);
}

// ✅ Serve uploaded images (after CORS so images include CORS headers)
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // images are safe to be public
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
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
const reservationRoutes = require('./routes/reservationRoutes');

// const publicOrderRoutes = require('./routes/publicOrderRoutes');

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/stripe', paymentIntentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);

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
const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT : 5051;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});