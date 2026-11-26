const { sendVerificationDecisionEmail } = require('../utils/mailer');
const { normalizePhone } = require('../utils/phone');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const { notify } = require('../utils/notify');

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

/**
 * What a verification decision applies to. A pharmacy account and its pharmacist representative are
 * reviewed separately: the store first, then (optionally) the pharmacist who signs in for it.
 */
const reviewSubject = (user, requested) => {
  if (requested) return requested;
  if (user.role === 'pharmacy' && user.isVerifiedProfile && user.pharmacistDetails?.status === 'pending') return 'representative';
  return 'account';
};

exports.listPendingProfessionals = async (req, res) => {
  const pendingUsers = await User.find({
    $or: [
      { role: { $in: ['doctor', 'pharmacy'] }, isVerifiedProfile: false, verificationDeclinedAt: { $exists: false } },
      { role: 'pharmacy', 'pharmacistDetails.status': 'pending' },
    ],
  });
  res.json(pendingUsers);
};

exports.approveProfessional = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || !['doctor', 'pharmacy'].includes(user.role)) {
    return res.status(404).json({ message: 'Applicant not found' });
  }

  const subject = reviewSubject(user, req.body?.subject);
  if (subject === 'representative') {
    if (user.role !== 'pharmacy' || !user.pharmacistDetails?.email) {
      return res.status(400).json({ message: 'This account has no pharmacist representative to approve.' });
    }
    user.pharmacistDetails.status = 'approved';
    user.pharmacistDetails.declineReason = undefined;
  } else {
    user.isVerifiedProfile = true;
    user.verificationDeclineReason = undefined;
    user.verificationDeclinedAt = undefined;
  }
  await user.save();

  // Email the outcome (applicants can't sign in to see it). Never block the response.
  if (user.email) {
    const who = subject === 'representative' ? `your pharmacist ${user.pharmacistDetails?.name || ''}`.trim() : user.role === 'pharmacy' ? 'your pharmacy' : 'your doctor profile';
    sendVerificationDecisionEmail(user.email, { name: user.name, approved: true, who })
      .catch((err) => console.error('Verification email failed:', err.message));
  }
  res.json({ message: 'Approved successfully', subject, user });
  notify(user._id, {
    type: 'account',
    text: subject === 'representative' ? `Your pharmacist ${user.pharmacistDetails?.name || ''} has been approved and can now sign in.`.replace('  ', ' ') : 'Your account has been verified. Welcome to MedEasy!',
    link: subject === 'representative' ? '/pharmacist?tab=pharmacist-rep' : user.role === 'pharmacy' ? '/pharmacist' : '/doctor',
  });
};

exports.declineProfessional = async (req, res) => {
  const reason = req.body.reason || 'The details could not be verified.';
  const user = await User.findById(req.params.id);
  if (!user || !['doctor', 'pharmacy'].includes(user.role)) {
    return res.status(404).json({ message: 'Applicant not found' });
  }

  const subject = reviewSubject(user, req.body.subject);
  if (subject === 'representative') {
    if (user.role !== 'pharmacy' || !user.pharmacistDetails?.email) {
      return res.status(400).json({ message: 'This account has no pharmacist representative to decline.' });
    }
    // Only the pharmacist is declined; the store keeps working.
    user.pharmacistDetails.status = 'declined';
    user.pharmacistDetails.declineReason = reason;
  } else {
    user.isVerifiedProfile = false;
    user.verificationDeclineReason = reason;
    user.verificationDeclinedAt = new Date();
  }
  await user.save();

  if (user.email) {
    const who = subject === 'representative' ? `your pharmacist ${user.pharmacistDetails?.name || ''}`.trim() : user.role === 'pharmacy' ? 'your pharmacy' : 'your doctor profile';
    sendVerificationDecisionEmail(user.email, { name: user.name, approved: false, reason, who })
      .catch((err) => console.error('Verification email failed:', err.message));
  }
  res.json({ message: 'Declined successfully', subject, user });
  // Declined accounts can't sign in (they get an email); a declined representative's store still can.
  if (subject === 'representative') {
    notify(user._id, { type: 'cancel', text: `Your pharmacist ${user.pharmacistDetails?.name || ''} wasn't approved. Reason: ${reason}`.replace('  ', ' '), link: '/pharmacist?tab=pharmacist-rep' });
  }
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
