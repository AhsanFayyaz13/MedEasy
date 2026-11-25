/**
 * In-browser notification feed (localStorage). Read by the navbar bell
 * (components/layout/Navbar/useNotifications.js).
 *
 * NOTE: localStorage is per-device — this is a demo-grade stand-in until the API
 * provides a notifications endpoint. Keeping all writes here makes that swap easy.
 */

const PREFIX = 'medeasy_notifications_';
const STAFF_ROLES = ['doctor', 'pharmacist', 'admin'];

/** Storage key for a recipient: staff roles share a role bucket, patients use their id. */
export function notifKey(role, id) {
  return PREFIX + (STAFF_ROLES.includes(role) ? role : id || 'patient');
}

/** Prepend a notification to a bucket, skipping identical text sent within 3 s. */
export function pushNotification(key, notification) {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const item = { time: Date.now(), unread: true, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...notification };
    if (existing.some((a) => a.text === item.text && item.time - a.time < 3000)) return;
    existing.unshift(item);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (err) {
    console.error('pushNotification failed:', err);
  }
}

/**
 * Notify a role (doctor / pharmacist / admin) or a specific patient.
 * Patients also get the shared "patient" broadcast bucket as a fallback.
 */
export function sendNotification(role, specificId, notification) {
  if (STAFF_ROLES.includes(role)) {
    pushNotification(notifKey(role), notification);
    return;
  }
  const keys = new Set([PREFIX + 'patient']);
  if (specificId) keys.add(PREFIX + specificId);
  keys.forEach((k) => pushNotification(k, notification));
}

/** Notify the currently signed-in user (e.g. "booking confirmed"). */
export function notifySelf(user, notification) {
  pushNotification(PREFIX + (user?._id || user?.id || 'patient'), notification);
}
