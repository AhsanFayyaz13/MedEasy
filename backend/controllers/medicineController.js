const Medicine = require('../models/Medicine');
const { uploadToCloudinary } = require('../utils/cloudinary');

// @desc    Get all medicines (with pagination, search, filter)
// @route   GET /api/medicines
// @access  Public
exports.getAllMedicines = async (req, res) => {
  // page/limit are validated & capped (max 100) by validators.medicines.list
  const pageSize = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  // Search by name — escape user input so it can't act as a regex (ReDoS / injection)
  const escaped = req.query.search ? req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const keyword = escaped ? { name: { $regex: escaped, $options: 'i' } } : {};

  // Filter by category
  const categoryFilter = req.query.category 
    ? { category: req.query.category } 
    : {};

  const count = await Medicine.countDocuments({ ...keyword, ...categoryFilter });
  const medicines = await Medicine.find({ ...keyword, ...categoryFilter })
    .sort({ createdAt: 1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    medicines,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
};

// @desc    Get single medicine
// @route   GET /api/medicines/:id
// @access  Public
exports.getMedicineById = async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);
  if (medicine) {
    res.json(medicine);
  } else {
    res.status(404).json({ message: 'Medicine not found' });
  }
};

// @desc    Create a medicine
// @route   POST /api/medicines
// @access  Private (Pharmacist/Admin)
exports.createMedicine = async (req, res) => {
  const medicine = new Medicine(req.body);
  const createdMedicine = await medicine.save();
  res.status(201).json(createdMedicine);
};

// @desc    Update a medicine
// @route   PUT /api/medicines/:id
// @access  Private (Pharmacist/Admin)
exports.updateMedicine = async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);

  if (medicine) {
    medicine.name = req.body.name || medicine.name;
    medicine.brand = req.body.brand !== undefined ? req.body.brand : medicine.brand;
    medicine.description = req.body.description || medicine.description;
    medicine.category = req.body.category || medicine.category;
    medicine.price = req.body.price !== undefined ? req.body.price : medicine.price;
    medicine.originalPrice = req.body.originalPrice !== undefined ? req.body.originalPrice : medicine.originalPrice;
    medicine.stock = req.body.stock !== undefined ? req.body.stock : medicine.stock;
    medicine.requiresPrescription = req.body.requiresPrescription !== undefined ? req.body.requiresPrescription : medicine.requiresPrescription;
    medicine.manufacturer = req.body.manufacturer || medicine.manufacturer;
    medicine.expiryDate = req.body.expiryDate || medicine.expiryDate;
    medicine.imageUrl = req.body.imageUrl || medicine.imageUrl;

    const updatedMedicine = await medicine.save();
    res.json(updatedMedicine);
  } else {
    res.status(404).json({ message: 'Medicine not found' });
  }
};

// @desc    Delete a medicine
// @route   DELETE /api/medicines/:id
// @access  Private (Admin)
exports.deleteMedicine = async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);

  if (medicine) {
    await medicine.deleteOne();
    res.json({ message: 'Medicine removed' });
  } else {
    res.status(404).json({ message: 'Medicine not found' });
  }
};

// @desc    Upload medicine photo
// @route   POST /api/medicines/upload-photo
// @access  Private (Pharmacist/Admin)
exports.uploadMedicinePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded or invalid file format.' });
    }

    // Upload to Cloudinary
    const secureUrl = await uploadToCloudinary(req.file.path, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'Medeasy Uploads'}/medicine_photos`
    });

    res.status(200).json({ imageUrl: secureUrl });
  } catch (error) {
    if (req.file && req.file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch { /* already removed */ }
    }
    throw error;
  }
};
