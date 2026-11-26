const Notification = require('../models/Notification');

// @desc    Latest notifications and the unread count (the site checks this every half minute)
// @route   GET /api/notifications
// @access  Private
exports.listNotifications = async (req, res) => {
  const limit = req.query.limit || 30;
  const [items, unread] = await Promise.all([
    Notification.find({ recipient: req.user._id }).sort({ at: -1 }).limit(limit),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
  ]);
  res.json({ items, unread });
};

// @desc    Mark one notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private (recipient)
exports.markRead = async (req, res) => {
  const result = await Notification.updateOne({ _id: req.params.id, recipient: req.user._id }, { $set: { read: true } });
  if (!result.matchedCount) return res.status(404).json({ message: 'Notification not found' });
  res.json({ ok: true });
};

// @desc    Mark every notification as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
};
