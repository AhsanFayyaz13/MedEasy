const crypto = require('crypto');

const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 15 * 60 * 1000;

/** Cryptographically random 6-digit code. */
function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/** OTPs are stored hashed so a database leak doesn't expose live codes. */
function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

/** Constant-time comparison of a submitted code against a stored hash. */
function codeMatches(submitted, storedHash) {
  if (!submitted || !storedHash) return false;
  const a = Buffer.from(hashCode(submitted), 'hex');
  const b = Buffer.from(String(storedHash), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Terminal delivery for local development only — never logs codes in production. */
function logVerificationCode({ method, identifier, code }) {
  if (process.env.NODE_ENV !== 'development') return;
  const address = method === 'email' ? `email ${identifier}` : `phone ${identifier}`;
  console.log(`[dev] Verification code for ${address}: ${code}`);
}

module.exports = { generateVerificationCode, hashCode, codeMatches, logVerificationCode, MAX_OTP_ATTEMPTS, OTP_TTL_MS };
