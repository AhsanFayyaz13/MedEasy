import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MedicineCard from '../components/MedicineCard';
import api from '../services/api';
import './Home.css';

// ─── Helper to normalize a DB medicine to MedicineCard-compatible shape ───────
function normalizeMedicine(db) {
  const originalPrice = db.originalPrice || db.original_price || db.price;
  const requires_prescription = db.requiresPrescription || db.requires_prescription || false;
  const stock = db.stock !== undefined ? Number(db.stock) : (db.in_stock ? 10 : 0);
  const discount_pct = originalPrice > db.price
    ? Math.round(((originalPrice - db.price) / originalPrice) * 100)
    : db.discount_pct || 0;

  return {
    id: db._id || db.id,
    name: db.name,
    brand: db.brand || '',
    category: db.category || 'General',
    price: db.price,
    original_price: originalPrice > db.price ? originalPrice : undefined,
    discount_pct,
    rating: db.rating || 0,
    reviews_count: db.reviews_count || db.reviews || db.reviewCount || 0,
    requires_prescription,
    stock,
    image: db.imageUrl || db.image || db.emoji || null,
    imageUrl: db.imageUrl || db.image || db.emoji || null,
  };
}

// ─── Feature list ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    materialIcon: 'verified_user',
    title: 'Verified Medicines',
    desc:  'All medicines sourced exclusively from licensed pharmaceutical suppliers and distributors with 100% authenticity tracking.',
    color: 'var(--color-primary-400)',
  },
  {
    materialIcon: 'rocket_launch',
    title: 'Lightning Delivery',
    desc:  'Order before 2 PM and receive your medicines the same day in Mailsi, Karachi, Lahore & Islamabad.',
    color: 'var(--color-accent-400)',
  },
  {
    materialIcon: 'support_agent',
    title: '24/7 Pharmacist Support',
    desc:  'Our licensed pharmacists are available around the clock to answer your health queries.',
    color: 'var(--color-violet-400)',
  },
  {
    materialIcon: 'upload_file',
    title: 'Prescription Upload',
    desc:  'Snap a photo of your prescription. Our team of licensed pharmacists verifies it within 30 minutes.',
    color: 'var(--color-warning-500)',
  },
  {
    materialIcon: 'calendar_month',
    title: 'Doctor Appointments',
    desc:  'Book online consultations and physical appointments with verified doctors across multiple specialties.',
    color: 'var(--color-rose-400)',
  },
  {
    materialIcon: 'public',
    title: 'Nationwide Reach',
    desc:  'Delivering to 30+ cities across Pakistan with real-time order tracking and secure shipping.',
    color: 'var(--color-orange-400)',
  },
];



// ─── Home Page Component ──────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user, userRole } = useAuth();
  const [featuredMeds, setFeaturedMeds] = useState([]);
  const [medsLoading, setMedsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && userRole && userRole !== 'patient') {
      if (userRole === 'admin') navigate('/admin', { replace: true });
      else if (userRole === 'doctor') navigate('/doctor', { replace: true });
      else if (userRole === 'pharmacist') navigate('/pharmacist', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  useEffect(() => {
    const fetchFeaturedMedicines = async () => {
      setMedsLoading(true);
      try {
        const { data } = await api.get('/medicines?limit=100');
        const dbMeds = data.medicines ?? data.results ?? data;
        if (Array.isArray(dbMeds) && dbMeds.length > 0) {
          // Show first 6 medicines directly from API
          const featured = dbMeds.slice(0, 6).map(normalizeMedicine);
          setFeaturedMeds(featured);
        }
      } catch (err) {
        console.error('Failed to fetch featured medicines:', err);
      } finally {
        setMedsLoading(false);
      }
    };
    fetchFeaturedMedicines();
  }, []);

  return (
    <div className="home-page antialiased">
      {/* ══ HERO SECTION ══════════════════════════════════════════════ */}
      <section className="hero-gradient relative py-20 px-margin-desktop overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <span className="inline-block bg-primary-container text-white text-label-md font-label-md px-3 py-1 rounded-full mb-6">
              Pakistan's #1 Online Pharmacy
            </span>
            {isAuthenticated ? (
              <h1 className="font-headline-xl text-headline-xl text-primary mb-6 leading-tight">
                Welcome back, <br />
                <span className="text-secondary">{user?.name?.split(' ')[0] || 'Friend'}!</span>
              </h1>
            ) : (
              <h1 className="font-headline-xl text-headline-xl text-primary mb-6 leading-tight">
                Your Health, <br />
                <span className="text-secondary">Delivered Fast</span>
              </h1>
            )}
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-10">
              Order medicines, book doctor appointments, and upload prescriptions — all from the comfort of your home with guaranteed authenticity.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/medicines')}
                className="btn-stitch-primary"
              >
                Shop Medicines
                <span className="material-symbols-outlined">shopping_bag</span>
              </button>
              <button 
                onClick={() => navigate('/appointments/book')}
                className="btn-stitch-outline"
              >
                Book Appointment
              </button>
            </div>
            <div className="flex gap-12 mt-12 border-t border-ui-border pt-8">
              <div>
                <div className="font-headline-md text-headline-md text-primary">50K+</div>
                <div className="text-label-md text-on-surface-variant">Happy Patients</div>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-primary">10K+</div>
                <div className="text-label-md text-on-surface-variant">Medicines</div>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-primary">200+</div>
                <div className="text-label-md text-on-surface-variant">Top Doctors</div>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-primary">30+</div>
                <div className="text-label-md text-on-surface-variant">Cities Covered</div>
              </div>
            </div>
          </div>
          <div className="relative hidden lg:block h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Abstract medical illustration background */}
              <div className="w-96 h-96 bg-primary-container/10 rounded-full animate-pulse"></div>
              <div className="absolute w-80 h-80 border-2 border-dashed border-primary/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
            </div>
            {/* Floating Icons Simulation */}
            <div className="absolute top-1/4 right-1/4 bg-sterile-white p-4 rounded-2xl shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
            </div>
            <div className="absolute bottom-1/4 left-1/4 bg-sterile-white p-4 rounded-2xl shadow-xl animate-bounce" style={{ animationDuration: '4s' }}>
              <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>prescriptions</span>
            </div>
            <div className="absolute top-1/2 left-0 bg-sterile-white p-4 rounded-2xl shadow-xl animate-bounce" style={{ animationDuration: '3.5s' }}>
              <span className="material-symbols-outlined text-error-red text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TRUST BADGES STRIP ════════════════════════════════════════ */}
      <div className="bg-sterile-white py-6 border-y border-ui-border">
        <div className="max-w-7xl mx-auto px-margin-desktop flex flex-wrap justify-between gap-8 opacity-70 grayscale hover:grayscale-0 transition-all">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">verified</span>
            <span className="font-label-md text-label-md">100% Authentic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">local_shipping</span>
            <span className="font-label-md text-label-md">Free Delivery ≥ Rs.1000</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">lock</span>
            <span className="font-label-md text-label-md">Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">support_agent</span>
            <span className="font-label-md text-label-md">24/7 Support</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">replay</span>
            <span className="font-label-md text-label-md">Easy Returns</span>
          </div>
        </div>
      </div>

      {/* ══ FEATURED MEDICINES SECTION ════════════════════════════════ */}
      <section className="py-20 px-margin-desktop bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Featured Medicines</h2>
              <p className="text-body-md text-on-surface-variant">Carefully selected, always in stock, shipped fast.</p>
            </div>
            <button 
              onClick={() => navigate('/medicines')}
              className="btn-view-all"
            >
              View All
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          {medsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-sterile-white border border-ui-border rounded-xl flex flex-col overflow-hidden" style={{ minHeight: '340px' }}>
                  <div className="h-36 bg-app-background animate-pulse"></div>
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div className="h-4 bg-app-background rounded animate-pulse w-2/3"></div>
                    <div className="h-3 bg-app-background rounded animate-pulse w-1/2"></div>
                    <div className="h-3 bg-app-background rounded animate-pulse w-1/3 mt-1"></div>
                    <div className="h-4 bg-app-background rounded animate-pulse w-1/4 mt-1"></div>
                    <div className="mt-auto h-10 bg-app-background rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredMeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {featuredMeds.map((med) => (
                <MedicineCard key={med.id} medicine={med} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.4 }}>medication</span>
              <p className="mt-4 text-body-md">Medicines unavailable. Please check back later.</p>
              <button onClick={() => navigate('/medicines')} className="btn-stitch-primary mt-6" style={{ display: 'inline-flex' }}>Browse All Medicines</button>
            </div>
          )}
        </div>
      </section>

      {/* ══ SHOP BY CATEGORY SECTION ══════════════════════════════════ */}
      <section className="py-20 px-margin-desktop bg-sterile-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-12 text-center">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { name: 'Pain Relief', linkTo: 'Analgesics', bg: 'var(--color-neutral-100)', textClass: 'text-orange-600', icon: 'pill' },
              { name: 'Antibiotics', linkTo: 'Antibiotics', bg: 'var(--color-neutral-100)', textClass: 'text-green-600', icon: 'vaccines' },
              { name: 'Vitamins', linkTo: 'Vitamins & Supplements', bg: 'var(--color-neutral-200)', textClass: 'text-primary', icon: 'eco' },
              { name: 'Diabetes', linkTo: 'Diabetes', bg: 'var(--color-neutral-100)', textClass: 'text-pink-600', icon: 'bloodtype' },
              { name: 'Cardiology', linkTo: 'Cardiology', bg: 'var(--color-neutral-200)', textClass: 'text-purple-600', icon: 'favorite' },
              { name: 'Dermatology', linkTo: 'Dermatology', bg: 'var(--color-neutral-100)', textClass: 'text-slate-600', icon: 'spa' },
              { name: 'Eye Care', linkTo: 'Eye Care', bg: 'var(--color-neutral-100)', textClass: 'text-cyan-600', icon: 'visibility' },
              { name: 'Pediatrics', linkTo: 'Child Health', bg: 'var(--color-neutral-50)', textClass: 'text-amber-600', icon: 'child_care' }
            ].map((cat) => (
              <Link
                key={cat.name}
                to={`/medicines?category=${encodeURIComponent(cat.linkTo)}`}
                className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:scale-105 transition-transform group"
                style={{ backgroundColor: cat.bg }}
              >
                <span className={`material-symbols-outlined text-3xl ${cat.textClass} group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </span>
                <span className="text-label-md font-bold text-on-surface">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY CHOOSE US SECTION ═════════════════════════════════════ */}
      <section className="py-20 px-margin-desktop bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Why MedEasy?</h2>
            <p className="text-body-md text-on-surface-variant max-w-2xl mx-auto">
              We combine technology and healthcare to make your life easier.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-sterile-white p-8 rounded-2xl border border-ui-border bento-card">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `color-mix(in srgb, ${f.color} 10%, transparent)`, color: f.color }}
                >
                  <span className="material-symbols-outlined">{f.materialIcon}</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm mb-3 text-on-surface">{f.title}</h3>
                <p className="text-body-md text-on-surface-variant">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRESCRIPTION UPLOAD CTA SECTION ═══════════════════════════ */}
      <section className="py-20 px-margin-desktop bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="bg-primary rounded-[2rem] overflow-hidden relative p-12 md:p-20 text-on-primary">
            <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:24px_24px] pointer-events-none"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-white mb-6">Need a prescription filled?</h2>
                <p className="text-body-lg text-white mb-10 opacity-90">
                  Upload a photo of your prescription and our team of licensed pharmacists will prepare your order within 30 minutes for confirmation.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => navigate('/prescriptions/upload')}
                    className="btn-stitch-white"
                  >
                    <span className="material-symbols-outlined">upload_file</span>
                    Upload Prescription
                  </button>
                  <button 
                    onClick={() => navigate('/appointments/book')}
                    className="btn-stitch-outline-white"
                  >
                    Book a Doctor
                  </button>
                </div>
              </div>
              <div className="hidden lg:flex justify-center">
                <div className="cta-glowing-orbit">
                  <span className="material-symbols-outlined">prescriptions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
