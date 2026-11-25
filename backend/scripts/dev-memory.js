/**
 * Run the API against a throwaway in-memory MongoDB, pre-seeded with demo data.
 * No local MongoDB install required:  npm run dev:memory
 * Data is lost when the process exits.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('medeasy');
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me-0123456789';

  await mongoose.connect(process.env.MONGO_URI);
  const { seedData } = require('../seeds/seed');
  await seedData();
  console.log(`In-memory MongoDB ready at ${process.env.MONGO_URI} (seeded)`);

  require('../server');

  const shutdown = async () => {
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
