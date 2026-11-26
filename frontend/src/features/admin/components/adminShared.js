/* Shared admin-dashboard constants & helpers. */
import { tokenColor } from '../../../lib/theme';
import { formatDate, formatPrice } from '../../../lib/format';

/** Roles an admin manages (admins are not listed). */
export const ROLES = [
  { id: 'patient', label: 'Patients' },
  { id: 'doctor', label: 'Doctors' },
  { id: 'pharmacy', label: 'Pharmacies' },
  { id: 'pharmacist', label: 'Pharmacists' },
];

export const ROLE_TONE = { patient: 'primary', doctor: 'violet', pharmacy: 'success', pharmacist: 'info', admin: 'error' };

export const fmtRs = formatPrice;
export const fmtDate = (d) => formatDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const shortId = (id) => String(id || '').slice(-8).toUpperCase();

export const chartOpts = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top', labels: { color: tokenColor('--color-neutral-600') } }, title: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: tokenColor('--color-neutral-100') }, ticks: { color: tokenColor('--color-neutral-500') } },
    x: { grid: { display: false }, ticks: { color: tokenColor('--color-neutral-500') } },
  },
});

/**
 * Applications to review. A pharmacy and its pharmacist representative are separate applications:
 * the store is approved first; a pharmacist it adds later is reviewed on its own.
 *   subject 'account'        → a doctor or pharmacy account
 *   subject 'representative' → a pharmacy's pharmacist
 */
export function reviewItems(users) {
  const pending = [];
  const declined = [];
  for (const u of users) {
    if (u.role !== 'doctor' && u.role !== 'pharmacy') continue;
    if (!u.isVerifiedProfile) {
      (u.verificationDeclinedAt ? declined : pending).push({ key: `${u.id}:account`, user: u, subject: 'account', kind: u.role });
    }
    const rep = u.pharmacistDetails?.status;
    if (u.role === 'pharmacy' && u.isVerifiedProfile && (rep === 'pending' || rep === 'declined')) {
      (rep === 'pending' ? pending : declined).push({ key: `${u.id}:representative`, user: u, subject: 'representative', kind: 'pharmacist' });
    }
  }
  return { pending, declined };
}
