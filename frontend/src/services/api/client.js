import axios from 'axios';
import { API_BASE_URL } from '../../lib/env';

/**
 * Preconfigured Axios instance for the MedEasy API.
 * Base URL comes from VITE_API_BASE_URL (see lib/env.js).
 */

const baseUrl = API_BASE_URL;

const api = axios.create({
  baseURL: baseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attach the JWT access token from localStorage to every request.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('medeasy_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Handle 401 Unauthorized responses globally (e.g., expired token).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored credentials and redirect to login
      sessionStorage.removeItem('medeasy_access_token');
      sessionStorage.removeItem('medeasy_refresh_token');
      sessionStorage.removeItem('medeasy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
