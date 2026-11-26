/**
 * Security middleware: NoSQL-injection sanitising and rate limiters.
 */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Remove keys starting with "$" or containing "." from user input so values
 * like { "email": { "$gt": "" } } can't become MongoDB operators.
 * (express-mongo-sanitize is not compatible with Express 5's read-only req.query.)
 */
function stripOperators(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => stripOperators(v, depth + 1));
  const clean = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('$') || k.includes('.')) continue;
    clean[k] = stripOperators(v, depth + 1);
  }
  return clean;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = stripOperators(req.body);
  if (req.params) req.params = stripOperators(req.params);
  const q = req.query;
  if (q && typeof q === 'object') {
    Object.defineProperty(req, 'query', { value: stripOperators({ ...q }), writable: true, configurable: true });
  }
  next();
}

const json429 = (message) => (req, res) =>
  res.status(429).json({ success: false, message, error: { code: 'TOO_MANY_REQUESTS', message } });

const skipInTest = () => process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_IN_TEST !== 'true';

/**
 * Background checks the site makes while open (new notifications, new chat messages). They are
 * limited per signed-in user by pollLimiter instead, so many people sharing one mobile-network IP
 * don't use up each other's allowance.
 */
const isPoll = (req) => req.method === 'GET' && /^\/(notifications\/?|appointments\/[a-f\d]{24}\/messages\/?)$/i.test(req.path);

/** Whole-API limiter: generous, protects against floods. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => skipInTest() || isPoll(req),
  handler: json429('Too many requests. Please slow down and try again shortly.'),
});

/** Login / registration / OTP / password reset: strict, keyed by IP + identifier. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => {
    const id = String(req.body?.identifier || req.body?.email || req.body?.phone || '').toLowerCase().slice(0, 100);
    return `${ipKeyGenerator(req.ip)}|${id}`;
  },
  handler: json429('Too many attempts. Please wait 15 minutes and try again.'),
});

/** Anonymous / write-heavy endpoints (uploads, contact form). */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  handler: json429('Upload limit reached. Please try again later.'),
});

/** Guest checkout and order look-ups: limits fake cash-on-delivery orders and number guessing. */
const guestOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => skipInTest() || Boolean(req.user),
  handler: json429('Too many attempts. Please try again later or sign in.'),
});

/** Polling endpoints, per signed-in user (runs after `protect`). An open chat checks every 5 s. */
const pollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 900,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => `user:${req.user?._id || ipKeyGenerator(req.ip)}`,
  handler: json429('Too many requests. Please slow down and try again shortly.'),
});

/** Sending chat messages, per user: plenty for a conversation, stops floods. */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => `user:${req.user?._id || ipKeyGenerator(req.ip)}`,
  handler: json429('You’re sending messages too quickly. Please wait a moment.'),
});

/** Feedback, complaints and ratings: plenty for real use, stops one account flooding the admin queue. */
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  keyGenerator: (req) => `user:${req.user?._id || ipKeyGenerator(req.ip)}`,
  handler: json429('You’ve sent a lot of feedback recently. Please try again in an hour.'),
});

module.exports = { sanitizeInput, stripOperators, apiLimiter, authLimiter, uploadLimiter, guestOrderLimiter, pollLimiter, messageLimiter, feedbackLimiter };
