/**
 * Express application (no network listener) — imported by server.js and tests.
 */
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { sanitizeInput, apiLimiter } = require('./middleware/security');

const app = express();

// Behind Render/Vercel proxies: needed for correct client IPs in rate limiting.
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

// ── Security headers ─────────────────────────────────────────────
app.use(
  helmet({
    // API only serves JSON + images; allow the SPA (another origin) to embed uploaded images.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── CORS: explicit allow-list (localhost only allowed outside production) ──
const isLocalOrigin = (origin) => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
};
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes(origin) || (!env.isProd && isLocalOrigin(origin))) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// ── Compression (JSON lists shrink ~70–80%) ──────────────────────
app.use(compression());

// ── Parsing, sanitising, logging, rate limiting ──────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(sanitizeInput);
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

// Personal data (orders, prescriptions, profiles) must never be stored by browsers or proxies.
app.use('/api', (req, res, next) => {
  if (req.headers.authorization) res.set('Cache-Control', 'private, no-store');
  next();
});

// ── Static uploads + seed images ─────────────────────────────────
const staticOpts = { maxAge: '7d', immutable: false };
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOpts));
app.use('/uploads', express.static(path.join(__dirname, 'static'), staticOpts));

// ── Routes ───────────────────────────────────────────────────────
// Health check for the host's monitor: 503 while the database is unreachable, so it can restart us.
app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.set('Cache-Control', 'no-store');
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', database: dbUp ? 'up' : 'down', uptime: Math.round(process.uptime()), timestamp: Date.now() });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/feedback', require('./routes/feedback'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
