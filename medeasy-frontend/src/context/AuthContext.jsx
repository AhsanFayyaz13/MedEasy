import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * AuthContext
 * ─────────────────────────────────────────────────────────────
 * Holds:
 *   user          – decoded user object (null if not logged in)
 *   token         – JWT access token (persisted in localStorage)
 *   userRole      – 'patient' | 'pharmacist' | 'doctor' | 'admin'
 *   isAuthenticated – boolean derived from user presence
 *   loading       – true while an auth request is in-flight
 *   authError     – last auth-related error string (null if none)
 *
 * Actions:
 *   login(email, password)  → calls POST /auth/login
 *   register(userData)      → calls POST /auth/register
 *   logout()                → clears all persisted state
 */

const AuthContext = createContext(null);

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';
const delay    = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Mock user accounts (frontend-only dev login) ─────────────────────────────
const MOCK_USERS = [
  { id: 1, name: 'Ahmed Khan',    email: 'patient@medeasy.pk',    password: 'patient123',    role: 'patient'    },
  { id: 2, name: 'Dr. Sara Ali', email: 'doctor@medeasy.pk',     password: 'doctor123',     role: 'doctor'     },
  { id: 3, name: 'Admin User',   email: 'admin@medeasy.pk',      password: 'admin123',      role: 'admin'      },
  { id: 4, name: 'Raza PharmD',  email: 'pharmacist@medeasy.pk', password: 'pharmacist123', role: 'pharmacist' },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  ACCESS:  'medeasy_access_token',
  REFRESH: 'medeasy_refresh_token',
  USER:    'medeasy_user',
};

function persistSession(accessToken, refreshToken, user) {
  localStorage.setItem(STORAGE_KEYS.ACCESS,  accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH, refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER,    JSON.stringify(user));
}

function clearSession() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}

function loadSession() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS);
    const raw   = localStorage.getItem(STORAGE_KEYS.USER);
    const user  = raw ? JSON.parse(raw) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

// ─── Role → dashboard route map ───────────────────────────────────────────────
export const ROLE_DASHBOARD = {
  patient:    '/',
  pharmacist: '/dashboard/pharmacist',
  doctor:     '/dashboard/doctor',
  admin:      '/dashboard/admin',
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const stored = loadSession();
  const [user,      setUser]      = useState(stored.user);
  const [token,     setToken]     = useState(stored.token);
  const [loading,   setLoading]   = useState(false);
  const [authError, setAuthError] = useState(null);

  // Keep axios default Authorization header in sync with token state
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // ── login ──────────────────────────────────────────────────────────────────
  /**
   * Authenticate a user.
   * @param {string} email
   * @param {string} password
   * @returns {{ user, token, role }} on success
   * @throws  Error with a human-readable message on failure
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      // ── Mock login (no backend needed) ────────────────────────
      if (USE_MOCK) {
        await delay(600);
        const found = MOCK_USERS.find(
          (u) => u.email === email && u.password === password
        );
        if (!found) {
          const msg = 'Invalid email or password. Please try again.';
          setAuthError(msg);
          throw new Error(msg);
        }
        const { password: _pw, ...userData } = found;
        const fakeToken = 'mock-jwt-' + btoa(JSON.stringify(userData));
        persistSession(fakeToken, 'mock-refresh', userData);
        setToken(fakeToken);
        setUser(userData);
        return { user: userData, token: fakeToken, role: userData.role };
      }

      // ── Real API login ─────────────────────────────────────────
      const { data } = await api.post('/auth/login/', { email, password });
      const { access, refresh, user: userData } = data;
      persistSession(access, refresh, userData);
      setToken(access);
      setUser(userData);
      return { user: userData, token: access, role: userData.role };
    } catch (err) {
      if (err.message && !err.response) throw err; // re-throw mock errors
      const msg = parseApiError(err, 'Invalid email or password. Please try again.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── register ───────────────────────────────────────────────────────────────
  /**
   * Register a new user.
   * @param {{ name, email, phone, password, role }} userData
   * @returns {{ user, token, role }} on success
   * @throws  Error with a human-readable message on failure
   */
  const register = useCallback(async (userData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.post('/auth/register/', userData);

      // Some backends auto-login on register; handle both patterns:
      // 1. Returns tokens → auto-login
      // 2. Returns only user → require manual login
      if (data.access) {
        const { access, refresh, user: newUser } = data;
        persistSession(access, refresh, newUser);
        setToken(access);
        setUser(newUser);
        return { user: newUser, token: access, role: newUser.role };
      }

      // Pattern 2: registration succeeded but no token yet
      return { user: data.user ?? data, token: null, role: (data.user ?? data).role };
    } catch (err) {
      const msg = parseApiError(err, 'Registration failed. Please check your details and try again.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
    setAuthError(null);
  }, []);

  // ── clear transient error ──────────────────────────────────────────────────
  const clearAuthError = useCallback(() => setAuthError(null), []);

  // ── context value ──────────────────────────────────────────────────────────
  const value = {
    user,
    token,
    userRole:        user?.role ?? null,
    isAuthenticated: Boolean(user && token),
    loading,
    authError,
    login,
    register,
    logout,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Custom hook ──────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Extract the most useful error message from an Axios error.
 * Handles Django REST Framework error shapes.
 */
function parseApiError(err, fallback) {
  if (!err.response) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  const data = err.response.data;
  if (!data) return fallback;

  // DRF non-field error
  if (data.detail)         return data.detail;
  if (data.non_field_errors) return data.non_field_errors[0];

  // First field error
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    return `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
  }

  return fallback;
}

export default AuthContext;
