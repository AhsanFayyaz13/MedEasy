/** Centralised access to Vite env variables (public at build time; never secrets). */

/** Production backend — used only when no VITE_API_BASE_URL is configured. */
const DEFAULT_API_BASE_URL = 'https://medeasy-backend-a5yi.onrender.com/api';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL;

/** Origin of the backend (used to resolve legacy `/uploads/...` image paths). */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://medeasy.systems';
