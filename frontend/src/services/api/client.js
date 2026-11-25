import axios from 'axios';
import { API_BASE_URL } from '../../lib/env';

/**
 * Preconfigured Axios instance for the MedEasy API.
 * Base URL comes from VITE_API_BASE_URL (see lib/env.js).
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const SESSION_KEYS = ['medeasy_access_token', 'medeasy_refresh_token', 'medeasy_user'];

/** Sign-in endpoints answer 401 for a wrong password; that is a form error, not an expired session. */
const AUTH_FORM_ENDPOINT = /\/auth\/(login|register|verify-registration|resend-verification|forgot-password|reset-password)\b/;

// Attach the session token (kept in sessionStorage, so it ends with the tab).
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('medeasy_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A signed-in request rejected as unauthorised means the session has ended (expired, password
// changed elsewhere, or account suspended): clear it and send the user to sign in, then back here.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, config } = error;
    const hadSession = Boolean(config?.headers?.Authorization);
    const suspended = response?.status === 403 && response.data?.error?.code === 'ACCOUNT_SUSPENDED';
    const sessionEnded = (response?.status === 401 || suspended) && hadSession && !AUTH_FORM_ENDPOINT.test(config?.url || '');

    if (sessionEnded && !window.location.pathname.startsWith('/login')) {
      SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?session=${suspended ? 'suspended' : 'expired'}&next=${next}`);
    }
    return Promise.reject(error);
  }
);

export default api;
