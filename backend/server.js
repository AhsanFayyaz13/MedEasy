const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
// Body parser
app.use(express.json());

// CORS – allow frontend origin(s) from env or default localhost ports used by Vite
const rawOrigins = process.env.FRONTEND_ORIGIN || process.env.REACT_APP_API_URL || 'http://localhost:5173,http://localhost:5174';
const allowedOrigins = rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
const isLocalDevOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
};
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Static folder for uploads and fallback static seed images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'static')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/contacts', require('./routes/contacts'));

// Safe masked env variables diagnostic route
app.get('/api/test-env', (req, res) => {
  const mask = (val) => {
    if (!val) return 'MISSING / UNDEFINED';
    if (val.length <= 4) return '*** (short)';
    return `${val.substring(0, 2)}...${val.substring(val.length - 2)} (${val.length} chars)`;
  };
  res.json({
    CLOUDINARY_CLOUD_NAME: mask(process.env.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: mask(process.env.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: mask(process.env.CLOUDINARY_API_SECRET),
    CLOUDINARY_FOLDER: mask(process.env.CLOUDINARY_FOLDER),
  });
});

// Basic route
app.get('/api/test', (req, res) => {
  res.json({ message: "API is working" });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// 404 + error handlers (should be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
