import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import Home from '../features/home/pages/Home';

// Home is eager (landing page / LCP); every other page is code-split.
const Login = lazy(() => import('../features/auth/pages/Login'));
const Register = lazy(() => import('../features/auth/pages/Register'));
const MedicineList = lazy(() => import('../features/medicines/pages/MedicineList'));
const MedicineDetail = lazy(() => import('../features/medicines/pages/MedicineDetail'));
const Cart = lazy(() => import('../features/cart/pages/Cart'));
const Checkout = lazy(() => import('../features/cart/pages/Checkout'));
const OrderTracking = lazy(() => import('../features/orders/pages/OrderTracking'));
const Profile = lazy(() => import('../features/profile/pages/Profile'));
const PrescriptionUpload = lazy(() => import('../features/prescriptions/pages/PrescriptionUpload'));
const AppointmentBooking = lazy(() => import('../features/appointments/pages/AppointmentBooking'));
const Reviews = lazy(() => import('../features/reviews/pages/Reviews'));
const PharmacistDashboard = lazy(() => import('../features/pharmacist/pages/PharmacistDashboard'));
const DoctorDashboard = lazy(() => import('../features/doctor/pages/DoctorDashboard'));
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'));
const ContactUs = lazy(() => import('../features/contact/pages/ContactUs'));
// Each legal document is its own chunk (LegalPage itself is shared between them).
const legal = (load) =>
  lazy(() =>
    Promise.all([import('../features/legal/components/LegalPage'), load()]).then(([page, doc]) => {
      const LegalPage = page.default;
      return { default: () => <LegalPage doc={doc.default} /> };
    })
  );
const Privacy = legal(() => import('../features/legal/content/privacy'));
const Terms = legal(() => import('../features/legal/content/terms'));
const Cookies = legal(() => import('../features/legal/content/cookies'));
const RefundPolicy = legal(() => import('../features/legal/content/refunds'));
const MedicalDisclaimer = legal(() => import('../features/legal/content/medical'));
const LegalNotice = legal(() => import('../features/legal/content/notice'));
const PartnerAgreement = legal(() => import('../features/legal/content/partner'));
const TrackOrder = lazy(() => import('../features/orders/pages/TrackOrder'));
const NotFound = lazy(() => import('../features/system/pages/NotFound'));

const ROLES = {
  patient: ['patient'],
  pharmacy: ['pharmacist', 'pharmacy'],
  doctor: ['doctor'],
  admin: ['admin'],
  nonAdmin: ['patient', 'doctor', 'pharmacist', 'pharmacy'],
};

const guard = (element, roles) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;
/** Open to guests (OTC shopping); signed-in staff are sent to their dashboards. */
const shopper = (element) => <ProtectedRoute roles={ROLES.patient} allowGuests>{element}</ProtectedRoute>;

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/medicines" element={<MedicineList />} />
      <Route path="/medicines/:id" element={<MedicineDetail />} />
      <Route path="/reviews" element={<Reviews />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/contact" element={<ContactUs />} />

      {/* Legal */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/medical-disclaimer" element={<MedicalDisclaimer />} />
      <Route path="/legal" element={<LegalNotice />} />
      <Route path="/partner-agreement" element={<PartnerAgreement />} />

      {/* Authenticated */}
      <Route path="/cart" element={shopper(<Cart />)} />
      <Route path="/checkout" element={shopper(<Checkout />)} />
      <Route path="/track" element={shopper(<TrackOrder />)} />
      <Route path="/orders" element={guard(<OrderTracking />, ROLES.patient)} />
      <Route path="/orders/:orderId" element={guard(<OrderTracking />, ROLES.patient)} />
      <Route path="/profile" element={guard(<Profile />)} />
      <Route path="/prescriptions/upload" element={guard(<PrescriptionUpload />, ROLES.patient)} />
      <Route path="/appointments/book" element={guard(<AppointmentBooking />, ROLES.patient)} />

      {/* Role dashboards */}
      <Route path="/pharmacist" element={guard(<PharmacistDashboard />, ROLES.pharmacy)} />
      <Route path="/doctor" element={guard(<DoctorDashboard />, ROLES.doctor)} />
      <Route path="/admin" element={guard(<AdminDashboard />, ROLES.admin)} />

      {/* Legacy aliases kept for existing links/bookmarks */}
      <Route path="/prescription-upload" element={<Navigate to="/prescriptions/upload" replace />} />
      <Route path="/appointments" element={<Navigate to="/appointments/book" replace />} />
      <Route path="/dashboard/pharmacist" element={<Navigate to="/pharmacist" replace />} />
      <Route path="/dashboard/doctor" element={<Navigate to="/doctor" replace />} />
      <Route path="/team" element={<Navigate to="/" replace />} />
      <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
