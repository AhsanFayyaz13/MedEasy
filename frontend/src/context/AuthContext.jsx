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

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  ACCESS:  'medeasy_access_token',
  REFRESH: 'medeasy_refresh_token',
  USER:    'medeasy_user',
};

function persistSession(accessToken, refreshToken, user) {
  sessionStorage.setItem(STORAGE_KEYS.ACCESS,  accessToken);
  if (refreshToken) sessionStorage.setItem(STORAGE_KEYS.REFRESH, refreshToken);
  sessionStorage.setItem(STORAGE_KEYS.USER,    JSON.stringify(user));
}

function clearSession() {
  Object.values(STORAGE_KEYS).forEach((k) => sessionStorage.removeItem(k));
}

function loadSession() {
  try {
    const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS);
    const raw   = sessionStorage.getItem(STORAGE_KEYS.USER);
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
  pharmacy:   '/dashboard/pharmacist',
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
      // Sync fresh profile details from server on mount/auth change
      api.get('/auth/profile')
        .then(({ data }) => {
          persistSession(token, null, data);
          setUser(data);
        })
        .catch(() => {});
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // ── login ──────────────────────────────────────────────────────────────────
  /**
   * Authenticate a user.
   * @param {string} identifier (email or phone)
   * @param {string} password
   * @returns {{ user, token, role }} on success
   * @throws  Error with a human-readable message on failure
   */
  const login = useCallback(async (identifier, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      // ── Real API login ─────────────────────────────────────────
      const { data } = await api.post('/auth/login', { identifier, password });
      const { token: access, ...userData } = data;
      persistSession(access, null, userData);
      setToken(access);
      setUser(userData);
      return { user: userData, token: access, role: userData.role };
    } catch (err) {
      if (err.message && !err.response) throw err; // re-throw network or offline errors
      const msg = parseApiError(err, 'Invalid email/phone or password. Please try again.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── register ───────────────────────────────────────────────────────────────
  /**
   * Register a new user (creates pending user, triggers verification code).
   * @param {{ name, email, phone, password, role, verificationChannel }} userData
   * @returns {Object} response metadata containing pending verification info
   * @throws  Error with a human-readable message on failure
   */
  const register = useCallback(async (userData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.post('/auth/register', userData);
      return data; // Returns message, normalized phone, and chosen channel
    } catch (err) {
      const msg = parseApiError(err, 'Registration failed. Please check your details and try again.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── verifyRegistration ──────────────────────────────────────────────────────
  const verifyRegistration = useCallback(async (phone, code) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.post('/auth/verify-registration', { phone, code });
      const { token: access, ...userData } = data;
      persistSession(access, null, userData);
      setToken(access);
      setUser(userData);
      return { user: userData, token: access, role: userData.role };
    } catch (err) {
      const msg = parseApiError(err, 'Verification failed. Please check the code and try again.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── resendVerification ──────────────────────────────────────────────────────
  const resendVerification = useCallback(async (phone) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.post('/auth/resend-verification', { phone });
      return data;
    } catch (err) {
      const msg = parseApiError(err, 'Failed to resend verification code.');
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

  // ── updateProfile ──────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.put('/auth/profile', profileData);
      persistSession(token, null, data);
      setUser(data);
      return data;
    } catch (err) {
      const msg = parseApiError(err, 'Failed to update profile details.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── uploadProfilePhoto ─────────────────────────────────────────────────────
  const uploadProfilePhoto = useCallback(async (file) => {
    setLoading(true);
    setAuthError(null);
    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);
      const { data } = await api.post('/auth/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      persistSession(token, null, data);
      setUser(data);
      return data;
    } catch (err) {
      const msg = parseApiError(err, 'Failed to upload profile photo.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── updatePharmacistDetails ───────────────────────────────────────────────
  const updatePharmacistDetails = useCallback(async (pharmacistData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.put('/auth/profile/pharmacist', pharmacistData);
      persistSession(token, null, data);
      setUser(data);
      return data;
    } catch (err) {
      const msg = parseApiError(err, 'Failed to update pharmacist details.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── removePharmacistDetails ───────────────────────────────────────────────
  const removePharmacistDetails = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.delete('/auth/profile/pharmacist');
      persistSession(token, null, data);
      setUser(data);
      return data;
    } catch (err) {
      const msg = parseApiError(err, 'Failed to remove pharmacist details.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── forgotPassword ──────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (identifier) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.post('/auth/forgot-password', { identifier });
      return data;
    } catch (err) {
      const msg = parseApiError(err, 'Failed to request password reset code.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── resetPassword ───────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (identifier, code, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data } = await api.post('/auth/reset-password', { identifier, code, password });
      return data;
    } catch (err) {
      const msg = parseApiError(err, 'Failed to reset password.');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
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
    verifyRegistration,
    resendVerification,
    updateProfile,
    uploadProfilePhoto,
    updatePharmacistDetails,
    removePharmacistDetails,
    forgotPassword,
    resetPassword,
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

  // Custom backend message
  if (data.message) return data.message;

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
