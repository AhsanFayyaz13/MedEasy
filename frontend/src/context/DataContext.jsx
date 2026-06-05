import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

/**
 * DataContext
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for platform-wide data.
 * Fetches once on mount (when user is authenticated) and exposes
 * a refresh() function so any component can trigger a re-fetch.
 *
 * Provides:
 *   users       – all non-admin users (patients / doctors / pharmacists)
 *   medicines   – full medicine catalogue
 *   orders      – all orders
 *   apts        – all appointments
 *   loading     – true while any fetch is in flight
 *   error       – error message string | null
 *   refresh()   – manually re-fetch everything
 *   stats       – pre-computed summary numbers
 */

const DataContext = createContext(null);

// ─── helpers ──────────────────────────────────────────────────
const safeFmtJoined = (t) => {
  if (!t) return '—';
  try {
    const d = new Date(t);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

// ─── Provider ─────────────────────────────────────────────────
export function DataProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [users,     setUsers]     = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [apts,      setApts]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchAll = useCallback(async () => {
    // Only admins have access to the full platform data endpoints
    if (!isAuthenticated || !user || user.role !== 'admin') return;

    setLoading(true);
    setError(null);
    try {
      const [usersRes, medsRes, aptsRes, ordersRes] = await Promise.all([
        api.get('/admin/users/all'),
        api.get('/medicines?limit=1000'),
        api.get('/appointments'),
        api.get('/orders/all'),
      ]);

      const ordersData = ordersRes.data || [];

      // Map users — exclude admin accounts
      const mappedUsers = (usersRes.data || [])
        .filter(u => u.role !== 'admin')
        .map(u => ({
          ...u,
          id: u._id,
          joined: safeFmtJoined(u.createdAt),
          orders: ordersData.filter(
            o => o.userId && (o.userId._id === u._id || o.userId === u._id)
          ).length,
        }));

      const mappedMeds = (medsRes.data?.medicines || []).map(m => ({ ...m, id: m._id }));

      const mappedApts = (aptsRes.data || []).map(a => ({
        ...a,
        id: a._id,
        patientName: a.patientId?.name || 'Unknown Patient',
        doctorName:  a.doctorId?.name  || 'Unknown Doctor',
        reason:      a.reason          || 'General Consult',
      }));

      const mappedOrders = ordersData.map(o => ({
        ...o,
        id: o._id,
        createdAt: o.createdAt || new Date().toISOString(),
      }));

      setUsers(mappedUsers);
      setMedicines(mappedMeds);
      setApts(mappedApts);
      setOrders(mappedOrders);
    } catch (err) {
      console.error('DataContext fetch failed:', err);
      setError(err.response?.data?.message || 'Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch on mount and whenever auth state changes
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Pre-computed stats ──────────────────────────────────────
  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const stats = {
    usersCount:  users.length,  // already excludes admins
    ordersCount: orders.filter(o => o.status !== 'cancelled').length,
    aptsCount:   apts.filter(a => a.status === 'scheduled').length,
    revenueMtd:  orders
      .filter(o => o.status !== 'cancelled' && safeFmtJoined(o.createdAt) === currentMonthYear)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    medicinesCount: medicines.length,
  };

  return (
    <DataContext.Provider value={{
      users, setUsers,
      medicines, setMedicines,
      orders, setOrders,
      apts, setApts,
      loading, error,
      refresh: fetchAll,
      stats,
    }}>
      {children}
    </DataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
