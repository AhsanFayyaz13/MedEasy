/* Shared constants & helpers (extracted from DoctorDashboard.jsx) */
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';

export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const dateStr = String(d);
    const hasTimeOrIsIso = dateStr.includes('T') || dateStr.includes(' ') || dateStr.length > 10;
    const targetDate = hasTimeOrIsIso ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
    
    if (isNaN(targetDate.getTime())) {
      const fallbackDate = new Date(dateStr);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }
      return dateStr;
    }
    return targetDate.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};


export const safeFmtTime = (t) => {
  if (!t) return '—';
  try {
    const d = new Date(t);
    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};


/**
 * sendNotification — Writes a notification to a user's isolated localStorage bucket.
 * For patients: writes to both the specific patientId key AND 'medeasy_notifications_patient'
 * so the currently logged-in patient can receive it regardless of which ID was stored
 * on the mock appointment record.
 * @param {'doctor'|'pharmacist'|'admin'|'patient'} role
 * @param {string|number} [specificId] - The specific user ID if targeting a patient
 * @param {Object} notification - The notification object to push
 */
export function sendNotification(role, specificId, notification) {
  try {
    // Always write to the role-specific key for professional roles
    if (role === 'doctor' || role === 'pharmacist' || role === 'admin') {
      const key = `medeasy_notifications_${role}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      // Dedup: skip if same text appeared within last 3s
      const isDup = existing.some(a => a.text === notification.text && Date.now() - a.time < 3000);
      if (!isDup) {
        existing.unshift(notification);
        localStorage.setItem(key, JSON.stringify(existing));
      }
      return;
    }

    // For patients: write to specific ID key AND the generic 'patient' broadcast key
    const keysToWrite = new Set();
    if (specificId) keysToWrite.add(`medeasy_notifications_${specificId}`);
    keysToWrite.add('medeasy_notifications_patient'); // broadcast fallback

    keysToWrite.forEach(key => {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const isDup = existing.some(a => a.text === notification.text && Date.now() - a.time < 3000);
      if (!isDup) {
        existing.unshift(notification);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    });
  } catch (err) {
    console.error('sendNotification error:', err);
  }
}


export const STATUS_CFG = {
  scheduled: { color:'primary', icon:<FaClock /> },
  completed: { color:'success', icon:<FaCheckCircle /> },
  cancelled: { color:'danger',  icon:<FaTimesCircle /> },
};
