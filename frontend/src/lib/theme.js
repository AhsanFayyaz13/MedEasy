/**
 * Read design tokens from CSS at runtime.
 * Needed for <canvas> consumers (chart.js) that cannot resolve `var(--x)`.
 */
export function cssVar(name, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Apply alpha to a hex token value, returning an rgba() string. */
export function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Token-backed colour for charts: tokenColor('--color-primary-400', 0.7) */
export const tokenColor = (name, alpha = 1) => withAlpha(cssVar(name, '#94a3b8'), alpha);
