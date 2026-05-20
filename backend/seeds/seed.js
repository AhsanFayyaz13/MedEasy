/**
 * Simple seed script to populate sample users and medicines.
 * Run: `node seeds/seed.js` from the backend folder after setting MONGO_URI in .env
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Medicine = require('../models/Medicine');

async function seed() {
  await connectDB();

  // Clear collections
  await User.deleteMany({});
  await Medicine.deleteMany({});

  // Create users
  const users = [
    { name: 'Admin User', email: 'admin@medeasy.local', password: 'AdminPass123', role: 'admin' },
    { name: 'Pharmacist', email: 'pharm@medeasy.local', password: 'PharmPass123', role: 'pharmacist' },
    { name: 'Dr. Doctor', email: 'doctor@medeasy.local', password: 'DoctorPass123', role: 'doctor' },
    { name: 'Patient User', email: 'patient@medeasy.local', password: 'PatientPass123', role: 'patient' },
  ];

  for (const u of users) {
    // User model hashes password in pre-save
    // Avoid duplicates
    const existing = await User.findOne({ email: u.email });
    if (!existing) await User.create(u);
  }

  // Sample medicines
  const meds = [
    { name: 'Paracetamol 500mg', description: 'Pain reliever', category: 'Analgesics', price: 50, stock: 200, requiresPrescription: false, manufacturer: 'Acme Pharma' },
    { name: 'Amoxicillin 250mg', description: 'Antibiotic', category: 'Antibiotics', price: 180, stock: 80, requiresPrescription: true, manufacturer: 'HealthCorp' },
    { name: 'Cetirizine 10mg', description: 'Antihistamine', category: 'Antihistamines', price: 65, stock: 320, requiresPrescription: false, manufacturer: 'Wellness Labs' },
    { name: 'Omeprazole 20mg', description: 'Gastric relief', category: 'Gastroenterology', price: 95, stock: 150, requiresPrescription: false, manufacturer: 'DigestiveCo' },
  ];

  for (const m of meds) {
    await Medicine.create(m);
  }

  console.log('Seed completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
