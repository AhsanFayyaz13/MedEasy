/** Date/time helpers shared by patient booking and the doctor dashboard. */

/** "Mon, 3 Jun 2026" — accepts YYYY-MM-DD or ISO strings. */
export function fmtDate(d) {
  if (!d) return '—';
  const s = String(d);
  const date = s.length > 10 || s.includes('T') || s.includes(' ') ? new Date(s) : new Date(`${s}T00:00:00`);
  if (Number.isNaN(date.getTime())) return s;
  return date.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "10:30 AM" from a timestamp; "—" when invalid. */
export function safeFmtTime(t) {
  if (!t) return '—';
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** YYYY-MM-DD in local time. */
export function localDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const BOOKING_WINDOW_DAYS = 30;

/** Badge tone per appointment status (UI kit Badge tones). */
export const APPOINTMENT_TONE = { scheduled: 'primary', completed: 'success', cancelled: 'error' };
