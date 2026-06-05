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
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Prescription = require('../models/Prescription');
const PendingUser = require('../models/PendingUser');
const bcrypt = require('bcryptjs');

async function seed() {
  await connectDB();

  // Clear all collections to prevent old mock ID CastErrors
  await User.deleteMany({});
  await Medicine.deleteMany({});
  await Appointment.deleteMany({});
  await Order.deleteMany({});
  await Review.deleteMany({});
  await Prescription.deleteMany({});
  await PendingUser.deleteMany({});

  const hashedSubPassword = await bcrypt.hash('RepPass123', 10);

  // Create users
  const users = [
    { name: 'Admin User', email: 'admin@medeasy.local', password: 'AdminPass123', role: 'admin', phone: '923001111111' },
    { name: 'Pharmacist', email: 'pharm@medeasy.local', password: 'PharmPass123', role: 'pharmacist', phone: '923002222222', isVerifiedProfile: true },
    { name: 'Dr. Doctor', email: 'doctor@medeasy.local', password: 'DoctorPass123', role: 'doctor', phone: '923003333333', isVerifiedProfile: true },
    { name: 'Patient User', email: 'patient@medeasy.local', password: 'PatientPass123', role: 'patient', phone: '923004444444' },
    {
      name: 'Nishtar Pharmacy',
      email: 'pharmacy@medeasy.local',
      password: 'PharmacyPass123',
      role: 'pharmacy',
      phone: '923005555555',
      address: 'Shop 12, DHA Phase 5, Lahore',
      pharmacyName: 'Nishtar Pharmacy',
      pharmacyLocation: 'DHA Phase 5, Lahore',
      ownerName: 'Fayyaz Ahmad',
      isVerifiedProfile: true,
      pharmacistDetails: {
        name: 'Dr. Ahsan Fayyaz',
        email: 'rep@medeasy.local',
        password: hashedSubPassword,
        status: 'approved',
        licenseNumber: 'PHA-98765',
        degreeName: 'Pharm.D (Doctor of Pharmacy)',
        degreePlace: 'University of Punjab'
      }
    }
  ];

  for (const u of users) {
    // User model hashes password in pre-save
    // Avoid duplicates
    const existing = await User.findOne({ email: u.email });
    if (!existing) await User.create(u);
  }

  // Sample medicines
  const meds = [
    { name: 'Paracetamol 500mg', brand: 'Panadol', description: 'Pain reliever', category: 'Analgesics', price: 50, originalPrice: 65, stock: 200, requiresPrescription: false, manufacturer: 'GSK Pakistan Ltd.', imageUrl: 'uploads/panadol.png' },
    { name: 'Amoxicillin 250mg', brand: 'Amoxil', description: 'Antibiotic', category: 'Antibiotics', price: 180, originalPrice: 200, stock: 80, requiresPrescription: true, manufacturer: 'PharmEvo Pvt. Ltd.', imageUrl: 'uploads/amoxil.png' },
    { name: 'Omeprazole 20mg', brand: 'Risek', description: 'Gastric relief', category: 'Gastroenterology', price: 95, originalPrice: 110, stock: 150, requiresPrescription: false, manufacturer: 'AGP Ltd.', imageUrl: 'uploads/risek.png' },
    { name: 'Cetirizine 10mg', brand: 'Zyrtec', description: 'Antihistamine', category: 'Antihistamines', price: 65, originalPrice: 75, stock: 320, requiresPrescription: false, manufacturer: 'GSK Pakistan Ltd.', imageUrl: 'uploads/zyrtec.png' },
    { name: 'Metformin 500mg', brand: 'Glucophage', description: 'Anti-diabetic medicine', category: 'Diabetes', price: 120, originalPrice: 140, stock: 140, requiresPrescription: true, manufacturer: 'Merck Pvt. Ltd.', imageUrl: 'uploads/glucophage.png' },
    { name: 'Amlodipine 5mg', brand: 'Norvasc', description: 'Calcium channel blocker for blood pressure', category: 'Cardiology', price: 140, originalPrice: 160, stock: 160, requiresPrescription: true, manufacturer: 'Pfizer Pakistan', imageUrl: 'uploads/norvasc.png' },
    { name: 'Vitamin D3 5000 IU', brand: 'D-Vit', description: 'Essential vitamin for bone health', category: 'Vitamins & Supplements', price: 280, originalPrice: 320, stock: 210, requiresPrescription: false, manufacturer: 'Nutrifactor', imageUrl: 'uploads/d-vit.png' },
    { name: 'Atorvastatin 20mg', brand: 'Lipitor', description: 'Cholesterol lowering statin', category: 'Cardiology', price: 320, originalPrice: 350, stock: 130, requiresPrescription: true, manufacturer: 'Pfizer Pakistan', imageUrl: 'uploads/lipitor.png' },
    { name: 'Salbutamol Inhaler', brand: 'Ventolin', description: 'Respiratory bronchodilator', category: 'Respiratory', price: 450, originalPrice: 480, stock: 95, requiresPrescription: true, manufacturer: 'GSK Pakistan Ltd.', imageUrl: 'uploads/ventolin.png' },
    { name: 'Ibuprofen 400mg', brand: 'Brufen', description: 'Non-steroidal anti-inflammatory drug (NSAID)', category: 'Analgesics', price: 75, originalPrice: 90, stock: 240, requiresPrescription: false, manufacturer: 'Abbott Laboratories', imageUrl: 'uploads/brufen.png' },
    { name: 'Loratadine 10mg', brand: 'Claritin', description: 'Second-generation non-drowsy antihistamine', category: 'Antihistamines', price: 55, originalPrice: 70, stock: 185, requiresPrescription: false, manufacturer: 'Bayer Pakistan', imageUrl: 'uploads/claritin.png' },
    { name: 'Zinc 20mg Tablets', brand: 'Zincovit', description: 'Essential mineral supplement for immunity', category: 'Vitamins & Supplements', price: 160, originalPrice: 180, stock: 300, requiresPrescription: false, manufacturer: 'HealthCorp', imageUrl: 'uploads/zincovit.png' },
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
