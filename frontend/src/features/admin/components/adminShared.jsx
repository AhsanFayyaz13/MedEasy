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
