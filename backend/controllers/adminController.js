const { normalizePhone } = require('../utils/phone');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Prescription = require('../models/Prescription');

// @desc    Get sales report
// @route   GET /api/admin/sales
// @access  Private (Admin)
exports.salesReport = async (req, res) => {
  const { period } = req.query; // 'day', 'week', 'month'
  
  let groupFormat = "%Y-%m-%d"; // default day
  if (period === 'month') {
    groupFormat = "%Y-%m";
  } else if (period === 'week') {
    groupFormat = "%Y-%U";
  }

  const salesData = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
        totalRevenue: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const totalRevenue = salesData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalOrders = salesData.reduce((acc, curr) => acc + curr.orderCount, 0);

  res.json({
    period: period || 'day',
    totalRevenue,
    totalOrders,
    data: salesData
  });
};

// @desc    Get inventory report
// @route   GET /api/admin/inventory
// @access  Private (Admin)
exports.inventoryReport = async (req, res) => {
  const lowStockThreshold = 10;

  const lowStockItems = await Medicine.find({ stock: { $lt: lowStockThreshold } })
    .select('name stock price category')
    .sort({ stock: 1 });

  const inventoryStats = await Medicine.aggregate([
    {
      $group: {
        _id: null,
        totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
        totalItems: { $sum: 1 },
        totalStockCount: { $sum: "$stock" }
      }
    }
  ]);

  res.json({
    lowStockItems,
    stats: inventoryStats.length > 0 ? inventoryStats[0] : { totalValue: 0, totalItems: 0, totalStockCount: 0 }
  });
};

// @desc    Get user stats
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.userStats = async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 }
      }
    }
  ]);

  res.json(stats);
};

// @desc    Get prescription analytics
// @route   GET /api/admin/prescriptions/analytics
// @access  Private (Admin)
exports.prescriptionAnalytics = async (req, res) => {
  const analytics = await Prescription.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const totalUploaded = analytics.reduce((acc, curr) => acc + curr.count, 0);

  res.json({
    totalUploaded,
    breakdown: analytics
  });
};

exports.listPendingProfessionals = async (req, res) => {
  const pendingUsers = await User.find({
    $or: [
      { role: 'doctor', isVerifiedProfile: false },
      { role: 'pharmacy', 'pharmacistDetails.status': 'pending' }
    ]
  }).select('-password');
  res.json(pendingUsers);
};

exports.approveProfessional = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.role === 'doctor') {
    user.isVerifiedProfile = true;
  } else if (user.role === 'pharmacy') {
    if (user.pharmacistDetails) {
      user.pharmacistDetails.status = 'approved';
    }
    user.isVerifiedProfile = true;
  }
  user.verificationDeclineReason = undefined;
  user.verificationDeclinedAt = undefined;

  await user.save();
  res.json({ message: 'Approved successfully', user });
};

exports.declineProfessional = async (req, res) => {
  const { reason } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.role === 'doctor') {
    user.isVerifiedProfile = false;
  } else if (user.role === 'pharmacy') {
    if (user.pharmacistDetails) {
      user.pharmacistDetails.status = 'declined';
      user.pharmacistDetails.declineReason = reason || 'Credentials did not pass audit.';
    }
    user.isVerifiedProfile = false;
  }
  user.verificationDeclineReason = reason || 'Credentials did not pass audit.';
  user.verificationDeclinedAt = new Date();

  await user.save();
  res.json({ message: 'Declined successfully', user });
};

// @desc    List all users
// @route   GET /api/admin/users/all
// @access  Private (Admin)
exports.listAllUsers = async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
};

// @desc    Create a user
// @route   POST /api/admin/users
// @access  Private (Admin)
exports.createAdminUser = async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;

  if (!name || !password || !phone) {
    return res.status(400).json({ message: 'Name, password, and phone number are required.' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: 'Please enter a valid phone number.' });
  }

  // Check if user already exists
  let existingUser = await User.findOne({ phone: normalizedPhone });
  if (existingUser) {
    return res.status(400).json({ message: 'User with this phone number already exists.' });
  }
  if (email) {
    existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
  }

  const newUser = new User({
    name,
    email,
    password,
    role: role || 'patient',
    phone: normalizedPhone,
    address,
    isVerifiedProfile: true // Auto-verify accounts created by admin
  });

  await newUser.save();
  
  // Respond without password
  const userResponse = newUser.toObject();
  delete userResponse.password;

  res.status(201).json(userResponse);
};

// @desc    Toggle user status (active/suspended)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent admin from suspending themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot suspend your own admin account.' });
  }

  user.status = user.status === 'suspended' ? 'active' : 'suspended';
  await user.save();

  res.json({ message: `User status changed to ${user.status}`, user: { _id: user._id, status: user.status } });
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot delete your own admin account.' });
  }

  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted successfully' });
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot change your own role.' });
  }

  const validRoles = ['patient', 'pharmacist', 'doctor', 'admin', 'pharmacy'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  user.role = role;
  await user.save();

  res.json({ message: `User role changed to ${role}`, user: { _id: user._id, role: user.role } });
};
