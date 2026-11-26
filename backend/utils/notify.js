/**
 * In-app notifications. Every helper here is fire-and-forget: a failed notification is logged and
 * never fails the action that caused it (an order is placed even if its alert can't be saved).
 */
const Notification = require('../models/Notification');
const User = require('../models/User');

const log = (err) => console.error('Notification failed:', err.message);
const idOf = (ref) => ref?._id || ref;

/** Notify one or more users. */
function notify(recipients, { type, text, link }) {
  const ids = [...new Set([].concat(recipients).filter(Boolean).map((r) => String(idOf(r))))];
  if (!ids.length) return Promise.resolve();
  return Notification.insertMany(ids.map((recipient) => ({ recipient, type, text, link }))).catch(log);
}

/** Where each staff role handles a kind of work. */
const STAFF_LINKS = {
  orders: { admin: '/admin?tab=orders', pharmacy: '/pharmacist?tab=orders' },
  prescriptions: { pharmacy: '/pharmacist?tab=prescriptions' },
  prescriptionOffers: { pharmacy: '/pharmacist?tab=prescriptions&view=offers' },
  verifications: { admin: '/admin?tab=verifications' },
  complaints: { admin: '/admin?tab=audits' },
};

/**
 * Notify staff about new work: active admins and approved pharmacies (their pharmacist representative
 * signs in to the same account, so they see it too). With `thread`, each person keeps one unread
 * alert per thread, which later events update instead of adding more. `area` picks who is told and where the link goes.
 */
async function notifyStaff(area, { type, text, thread }) {
  try {
    const links = STAFF_LINKS[area];
    const roles = Object.keys(links);
    const staff = await User.find({
      role: { $in: roles },
      status: { $ne: 'suspended' },
      $or: [{ role: 'admin' }, { isVerifiedProfile: true }],
    }).select('_id role').lean();
    if (!staff.length) return;
    if (!thread) {
      await Notification.insertMany(staff.map((u) => ({ recipient: u._id, type, text, link: links[u.role] })));
      return;
    }
    await Notification.bulkWrite(staff.map((u) => ({
      updateOne: {
        filter: { recipient: u._id, thread, read: false },
        update: { $set: { text, link: links[u.role], at: new Date() }, $setOnInsert: { type } },
        upsert: true,
      },
    })));
  } catch (err) {
    log(err);
  }
}

/**
 * One alert per conversation: while the recipient hasn't read the last one, new messages update it
 * instead of adding more. Resolves to true when a new alert was created (the recipient wasn't
 * already waiting on this chat), which is when an email is worth sending.
 */
async function notifyChat(recipient, chatId, { text, link }) {
  try {
    const thread = `chat:${chatId}`; // chatId: an appointment id, or rx:<prescription id>
    const existing = await Notification.findOneAndUpdate(
      { recipient: idOf(recipient), thread, read: false },
      { $set: { text, link, at: new Date() } },
      { returnDocument: 'after' }
    );
    if (existing) return false;
    await Notification.create({ recipient: idOf(recipient), type: 'chat', thread, text, link });
    return true;
  } catch (err) {
    log(err);
    return false;
  }
}

/** Mark a chat's alert as read once the recipient has opened the conversation. */
function markChatRead(recipient, chatId) {
  return Notification.updateMany({ recipient: idOf(recipient), thread: `chat:${chatId}`, read: false }, { $set: { read: true } }).catch(log);
}

module.exports = { notify, notifyStaff, notifyChat, markChatRead };
