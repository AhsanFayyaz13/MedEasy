import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppNavbar from './components/Navbar';
import AppFooter from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// ── Pages ─────────────────────────────────────────────────────────────────────
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MedicineList from './pages/MedicineList';
import MedicineDetail from './pages/MedicineDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import Profile from './pages/Profile';
import PrescriptionUpload from './pages/PrescriptionUpload';
import AppointmentBooking from './pages/AppointmentBooking';
import Reviews from './pages/Reviews';
import PharmacistDashboard from './pages/PharmacistDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

// ── Contexts ──────────────────────────────────────────────────────────────────
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <div className="app-wrapper">
              <AppNavbar />

              <main className="main-content">
                <ErrorBoundary>
                  <Routes>

                    {/* ══════════════════════════════════════════════════════
                    PUBLIC ROUTES – accessible to everyone
                    ══════════════════════════════════════════════════════ */}
                    <Route path="/" element={<Home />} />
                    <Route path="/medicines" element={<MedicineList />} />
                    <Route path="/medicines/:id" element={<MedicineDetail />} />
                    <Route path="/reviews" element={<Reviews />} />

                    {/* Auth pages – redirect away if already logged in (handled inside each page) */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* ══════════════════════════════════════════════════════
                    PROTECTED ROUTES – any authenticated user
                    ══════════════════════════════════════════════════════ */}
                    <Route path="/cart" element={
                      <ProtectedRoute><Cart /></ProtectedRoute>
                    } />
                    <Route path="/checkout" element={
                      <ProtectedRoute><Checkout /></ProtectedRoute>
                    } />
                    <Route path="/orders" element={
                      <ProtectedRoute><OrderTracking /></ProtectedRoute>
                    } />
                    <Route path="/orders/:orderId" element={
                      <ProtectedRoute><OrderTracking /></ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute><Profile /></ProtectedRoute>
                    } />
                    <Route path="/prescriptions/upload" element={
                      <ProtectedRoute><PrescriptionUpload /></ProtectedRoute>
                    } />
                    {/* Legacy alias kept for any existing links */}
                    <Route path="/prescription-upload" element={
                      <Navigate to="/prescriptions/upload" replace />
                    } />
                    <Route path="/appointments/book" element={
                      <ProtectedRoute><AppointmentBooking /></ProtectedRoute>
                    } />
                    {/* Legacy alias */}
                    <Route path="/appointments" element={
                      <Navigate to="/appointments/book" replace />
                    } />

                    {/* ══════════════════════════════════════════════════════
                    ROLE-SPECIFIC DASHBOARDS
                    ══════════════════════════════════════════════════════ */}
                    <Route path="/pharmacist" element={
                      <ProtectedRoute roles={['pharmacist']}>
                        <PharmacistDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/doctor" element={
                      <ProtectedRoute roles={['doctor']}>
                        <DoctorDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin" element={
                      <ProtectedRoute roles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />

                    {/* Legacy dashboard aliases → new paths */}
                    <Route path="/dashboard/pharmacist" element={<Navigate to="/pharmacist" replace />} />
                    <Route path="/dashboard/doctor" element={<Navigate to="/doctor" replace />} />
                    <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />

                    {/* ══════════════════════════════════════════════════════
                    404 CATCH-ALL
                    ══════════════════════════════════════════════════════ */}
                    <Route path="*" element={<NotFound />} />

                  </Routes>
                </ErrorBoundary>
              </main>

              <AppFooter />
            </div>
          </BrowserRouter>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
