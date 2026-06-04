import axios from 'axios';

/**
 * Preconfigured Axios instance for MedEasy API.
 * Base URL is read from environment variables. Support both Vite (`VITE_API_BASE_URL`)
 * and Create React/App style (`REACT_APP_API_URL`) for compatibility.
 */
const DEFAULT_BASE = 'https://medeasy-backend-a5yi.onrender.com/api';

const baseUrl =
  import.meta.env?.VITE_API_BASE_URL ||
  import.meta.env?.VITE_API_URL ||   // fallback name
  DEFAULT_BASE;

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
