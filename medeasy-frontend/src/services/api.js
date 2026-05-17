import axios from 'axios';

/**
 * Preconfigured Axios instance for MedEasy API.
 * Base URL is read from the Vite environment variable VITE_API_BASE_URL,
 * falling back to the local Django dev server.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attach the JWT access token from localStorage to every request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medeasy_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
      localStorage.removeItem('medeasy_access_token');
      localStorage.removeItem('medeasy_refresh_token');
      localStorage.removeItem('medeasy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
