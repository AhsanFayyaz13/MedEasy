/**
 * Express application (no network listener) — imported by server.js and tests.
 */
const path = require('path');
const express = require('express');
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

// ── Parsing, sanitising, logging, rate limiting ──────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(sanitizeInput);
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

// ── Static uploads + seed images ─────────────────────────────────
const staticOpts = { maxAge: '7d', immutable: false };
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOpts));
app.use('/uploads', express.static(path.join(__dirname, 'static'), staticOpts));

// ── Routes ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/contacts', require('./routes/contacts'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
