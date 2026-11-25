/**
 * Validated environment configuration. Import this instead of reading
 * process.env directly. The process exits at startup with a clear message if
 * required variables are missing or malformed.
 */
require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_ORIGIN: z.string().default(process.env.REACT_APP_API_URL || 'http://localhost:5173,http://localhost:5174'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),

  RESEND_API_KEY: z.string().optional(),
  SENDER_EMAIL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('Medeasy Uploads'),
  FIREBASE_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const env = parsed.data;
if (env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET is shorter than 32 characters — use a long random value (see README).');
}
env.isProd = env.NODE_ENV === 'production';
env.isTest = env.NODE_ENV === 'test';
const OFFICIAL_ORIGINS = ['https://medeasy.systems', 'https://www.medeasy.systems'];
env.allowedOrigins = [...new Set([...env.FRONTEND_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean), ...OFFICIAL_ORIGINS])];

module.exports = env;
