import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { initSocket, getSocket, disconnectSocket } from '../lib/socket';

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
  const { user, isAuthenticated, token } = useAuth();

  const [users,     setUsers]     = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [apts,      setApts]      = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchAll = useCallback(async () => {
    // Only admins have access to the full platform data endpoints
    if (!isAuthenticated || !user || user.role !== 'admin') return;

    setLoading(true);
    setError(null);
    try {
      const [usersRes, medsRes, aptsRes, ordersRes, prescriptionsRes, reviewsRes] = await Promise.all([
        api.get('/admin/users/all'),
        api.get('/medicines?limit=1000'),
        api.get('/appointments'),
        api.get('/orders/all'),
        api.get('/prescriptions?limit=1000'),
        api.get('/reviews?limit=1000'),
      ]);

      const ordersData = ordersRes.data || [];
      const prescriptionsList = prescriptionsRes.data?.results ?? prescriptionsRes.data ?? [];
      const reviewsList = reviewsRes.data?.results ?? reviewsRes.data ?? [];

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

      const mappedPrescriptions = Array.isArray(prescriptionsList)
        ? prescriptionsList.map(p => ({ ...p, id: p._id || p.id }))
        : [];
      const mappedReviews = Array.isArray(reviewsList)
        ? reviewsList.map(r => ({ ...r, id: r._id || r.id }))
        : [];

      setUsers(mappedUsers);
      setMedicines(mappedMeds);
      setApts(mappedApts);
      setOrders(mappedOrders);
      setPrescriptions(mappedPrescriptions);
      setReviews(mappedReviews);
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

  // Initialize realtime socket and subscribe to domain events
  useEffect(() => {
    let sock;
    let mounted = true;
    if (isAuthenticated && user) {
      sock = initSocket(token);

      // Orders
      const handleOrderCreated = (order) => {
        if (!mounted) return;
        const o = { ...order, id: order._id || order.id, createdAt: order.createdAt || new Date().toISOString() };
        setOrders(prev => [o, ...prev]);
      };
      const handleOrderUpdated = (order) => {
        if (!mounted) return;
        const id = order._id || order.id;
        setOrders(prev => prev.map(o => (o.id === id ? { ...o, ...order, id } : o)));
      };

      // Prescriptions
      const handlePrescriptionCreated = (presc) => {
        if (!mounted) return;
        const p = { ...presc, id: presc._id || presc.id };
        setPrescriptions(prev => [p, ...prev]);
      };
      const handlePrescriptionUpdated = (presc) => {
        if (!mounted) return;
        const id = presc._id || presc.id;
        setPrescriptions(prev => prev.map(p => (p.id === id ? { ...p, ...presc, id } : p)));
      };
      const handlePrescriptionDeleted = ({ id }) => {
        if (!mounted) return;
        setPrescriptions(prev => prev.filter(p => p.id !== id));
      };

      // Medicines
      const handleMedicineCreated = (m) => {
        if (!mounted) return;
        const med = { ...m, id: m._id || m.id };
        setMedicines(prev => [med, ...prev]);
      };
      const handleMedicineUpdated = (m) => {
        if (!mounted) return;
        const id = m._id || m.id;
        setMedicines(prev => prev.map(x => (x.id === id ? { ...x, ...m, id } : x)));
      };
      const handleMedicineDeleted = ({ id }) => {
        if (!mounted) return;
        setMedicines(prev => prev.filter(x => x.id !== id));
      };

      // Reviews
      const handleReviewCreated = (r) => {
        if (!mounted) return;
        const rev = { ...r, id: r._id || r.id };
        setReviews(prev => [rev, ...prev]);
      };

      // Appointments
      const handleAppointmentBooked = (a) => {
        if (!mounted) return;
        const ap = { ...a, id: a._id || a.id };
        setApts(prev => [ap, ...prev]);
      };
      const handleAppointmentUpdated = (a) => {
        if (!mounted) return;
        const id = a._id || a.id;
        setApts(prev => prev.map(x => (x.id === id ? { ...x, ...a, id } : x)));
      };

      const handleUserCreated = (u) => {
        if (!mounted) return;
        const user = { ...u, id: u._id || u.id };
        setUsers(prev => [user, ...prev]);
      };
      const handleUserUpdated = (u) => {
        if (!mounted) return;
        const id = u._id || u.id;
        setUsers(prev => prev.map(x => (x.id === id ? { ...x, ...u, id } : x)));
      };
      const handleUserDeleted = ({ id }) => {
        if (!mounted) return;
        setUsers(prev => prev.filter(x => x.id !== id));
      };

      sock.on('order:created', handleOrderCreated);
      sock.on('order:updated', handleOrderUpdated);

      sock.on('prescription:created', handlePrescriptionCreated);
      sock.on('prescription:updated', handlePrescriptionUpdated);
      sock.on('prescription:deleted', handlePrescriptionDeleted);

      sock.on('medicine:created', handleMedicineCreated);
      sock.on('medicine:updated', handleMedicineUpdated);
      sock.on('medicine:deleted', handleMedicineDeleted);

      sock.on('review:created', handleReviewCreated);

      sock.on('appointment:booked', handleAppointmentBooked);
      sock.on('appointment:updated', handleAppointmentUpdated);

      sock.on('user:created', handleUserCreated);
      sock.on('user:updated', handleUserUpdated);
      sock.on('user:deleted', handleUserDeleted);

      // cleanup
      return () => {
        mounted = false;
        try {
          sock.off('order:created', handleOrderCreated);
          sock.off('order:updated', handleOrderUpdated);

          sock.off('prescription:created', handlePrescriptionCreated);
          sock.off('prescription:updated', handlePrescriptionUpdated);
          sock.off('prescription:deleted', handlePrescriptionDeleted);

          sock.off('medicine:created', handleMedicineCreated);
          sock.off('medicine:updated', handleMedicineUpdated);
          sock.off('medicine:deleted', handleMedicineDeleted);

          sock.off('review:created', handleReviewCreated);

          sock.off('appointment:booked', handleAppointmentBooked);
          sock.off('appointment:updated', handleAppointmentUpdated);
          sock.off('user:created', handleUserCreated);
          sock.off('user:updated', handleUserUpdated);
          sock.off('user:deleted', handleUserDeleted);
        } catch (e) {}
        try { disconnectSocket(); } catch (e) {}
      };
    }
    return () => { mounted = false; };
  }, [isAuthenticated, user, token]);

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
      prescriptions, setPrescriptions,
      reviews, setReviews,
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
