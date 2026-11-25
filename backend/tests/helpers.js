/**
 * Test harness: in-memory MongoDB + the Express app (no network listener).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-0123456789-abcdefghijklmnopqrstuvwxyz';
process.env.MONGO_URI = 'mongodb://placeholder/test'; // replaced in setup()

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('medeasy-test');
  await mongoose.connect(process.env.MONGO_URI);
  const app = require('../app');
  // Build indexes (e.g. unique review index) before tests run.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  return app;
}

async function teardown() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function reset() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

const tokenFor = (user, role = user.role) => jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

let phoneSeq = 0;
async function createUser(overrides = {}) {
  const User = require('../models/User');
  phoneSeq += 1;
  return User.create({
    name: 'Test User',
    password: 'Password123!',
    phone: `9230000${String(phoneSeq).padStart(5, '0')}`,
    role: 'patient',
    ...overrides,
  });
}

async function createMedicine(overrides = {}) {
  const Medicine = require('../models/Medicine');
  return Medicine.create({
    name: 'Paracetamol 500mg',
    brand: 'Panadol',
    description: 'Pain reliever',
    category: 'Analgesics',
    price: 50,
    stock: 10,
    ...overrides,
  });
}

module.exports = { setup, teardown, reset, tokenFor, createUser, createMedicine };
