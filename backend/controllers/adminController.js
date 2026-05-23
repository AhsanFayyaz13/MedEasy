const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Prescription = require('../models/Prescription');

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
    res.json({ message: 'Declined successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
