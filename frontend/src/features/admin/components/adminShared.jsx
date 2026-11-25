/* Shared constants & helpers (extracted from AdminDashboard.jsx) */
import { tokenColor } from '../../../lib/theme';
import { API_ORIGIN } from '../../../lib/env';

export const ROLES = ['patient','doctor','pharmacist','admin'];

export const ROLE_COLOR = { patient:'primary', doctor:'info', pharmacist:'success', admin:'danger' };

export const STATUS_COLOR = { active:'success', suspended:'warning' };

export const fmtRs = (n) => `Rs. ${(n || 0).toLocaleString()}`;

export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const dateStr = String(d);
    const hasTime = dateStr.includes('T') || dateStr.includes(' ') || dateStr.length > 10;
    const dt = hasTime ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
    if (isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

export const safeFmtDateOnly = (t) => {
  if (!t) return '—';
  try {
    const d = new Date(t);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-PK');
  } catch { return '—'; }
};

export const safeFmtJoined = (t) => {
  if (!t) return '—';
  try {
    const d = new Date(t);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

export const pdfPlaceholder = (label) => alert(`PDF download for "${label}" will be available once backend is connected.`);

export const serverUrl = API_ORIGIN;

export const chartOpts = () => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position:'top', labels: { color: tokenColor('--color-neutral-600') } }, title: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: tokenColor('--color-neutral-100') }, ticks: { color: tokenColor('--color-neutral-500') } },
    x: { grid: { display: false }, ticks: { color: tokenColor('--color-neutral-500') } },
  },
});
