const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const { getIO } = require('../socket');

// @desc    Get sales report
// @route   GET /api/admin/sales
// @access  Private (Admin)
exports.salesReport = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get inventory report
// @route   GET /api/admin/inventory
// @access  Private (Admin)
exports.inventoryReport = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user stats
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.userStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get prescription analytics
// @route   GET /api/admin/prescriptions/analytics
// @access  Private (Admin)
exports.prescriptionAnalytics = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listPendingProfessionals = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      $or: [
        { role: 'doctor', isVerifiedProfile: false },
        { role: 'pharmacy', 'pharmacistDetails.status': 'pending' }
      ]
    }).select('-password');
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveProfessional = async (req, res) => {
  try {
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

    await user.save();

    try {
      const io = getIO();
      io.emit('user:updated', { ...user.toObject(), id: user._id });
    } catch (e) {
      console.warn('Could not emit user:updated', e.message);
    }

    res.json({ message: 'Approved successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.declineProfessional = async (req, res) => {
  try {
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

    await user.save();

    try {
      const io = getIO();
      io.emit('user:updated', { ...user.toObject(), id: user._id });
    } catch (e) {
      console.warn('Could not emit user:updated', e.message);
    }

    res.json({ message: 'Declined successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List all users
// @route   GET /api/admin/users/all
// @access  Private (Admin)
exports.listAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a user
// @route   POST /api/admin/users
// @access  Private (Admin)
exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (!name || !password || !phone) {
      return res.status(400).json({ message: 'Name, password, and phone number are required.' });
    }

    // Check if user already exists
    let existingUser = await User.findOne({ phone });
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
      phone,
      address,
      isVerifiedProfile: true // Auto-verify accounts created by admin
    });

    await newUser.save();
    
    // Respond without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle user status (active/suspended)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res) => {
  try {
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

    try {
      const io = getIO();
      io.emit('user:updated', { ...user.toObject(), id: user._id });
    } catch (e) {
      console.warn('Could not emit user:updated', e.message);
    }

    res.json({ message: `User status changed to ${user.status}`, user: { _id: user._id, status: user.status } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    await User.findByIdAndDelete(req.params.id);

    try {
      const io = getIO();
      io.emit('user:deleted', { id: req.params.id });
    } catch (e) {
      console.warn('Could not emit user:deleted', e.message);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
exports.updateUserRole = async (req, res) => {
  try {
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

    try {
      const io = getIO();
      io.emit('user:updated', { ...user.toObject(), id: user._id });
    } catch (e) {
      console.warn('Could not emit user:updated', e.message);
    }

    res.json({ message: `User role changed to ${role}`, user: { _id: user._id, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
