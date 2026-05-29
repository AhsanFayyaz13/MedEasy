import { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaShieldAlt,
  FaTruck,
  FaClock,
  FaStar,
  FaRegStar,
  FaShoppingCart,
  FaUpload,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaLock,
  FaCommentDots,
  FaSyncAlt,
  FaFlask,
  FaStethoscope,
  FaHospital,
  FaHeart,
  FaUserMd,
  FaPills,
  FaCheckCircle,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import MedicalIcon from '../components/MedicalIcon';
import api from '../services/api';
import './Home.css';

// ─── Hardcoded sample medicines ───────────────────────────────────────────────
const SAMPLE_MEDICINES = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    brand: 'Panadol',
    category: 'Analgesics',
    price: 50,
    originalPrice: 65,
    rating: 4,
    reviews: 128,
    requires_prescription: false,
    in_stock: true,
    badge: 'Bestseller',
    badgeColor: '#34d399',
    emoji: '💊',
  },
  {
    id: 2,
    name: 'Amoxicillin 250mg',
    brand: 'Amoxil',
    category: 'Antibiotics',
    price: 180,
    originalPrice: 200,
    rating: 5,
    reviews: 94,
    requires_prescription: true,
    in_stock: true,
    badge: 'Rx Required',
    badgeColor: '#f59e0b',
    emoji: '🧪',
  },
  {
    id: 3,
    name: 'Omeprazole 20mg',
    brand: 'Risek',
    category: 'Gastroenterology',
    price: 95,
    originalPrice: 110,
    rating: 4,
    reviews: 76,
    requires_prescription: false,
    in_stock: true,
    badge: null,
    badgeColor: null,
    emoji: '💉',
  },
  {
    id: 4,
    name: 'Cetirizine 10mg',
    brand: 'Zyrtec',
    category: 'Antihistamines',
    price: 65,
    originalPrice: 75,
    rating: 4,
    reviews: 211,
    requires_prescription: false,
    in_stock: true,
    badge: 'Popular',
    badgeColor: '#818cf8',
    emoji: '🌿',
  },
  {
    id: 5,
    name: 'Metformin 500mg',
    brand: 'Glucophage',
    category: 'Diabetes',
    price: 120,
    originalPrice: 140,
    rating: 5,
    reviews: 183,
    requires_prescription: true,
    in_stock: false,
    badge: 'Out of Stock',
    badgeColor: '#ef4444',
    emoji: '🔬',
  },
  {
    id: 6,
    name: 'Amlodipine 5mg',
    brand: 'Norvasc',
    category: 'Cardiology',
    price: 140,
    originalPrice: 160,
    rating: 5,
    reviews: 97,
    requires_prescription: true,
    in_stock: true,
    badge: 'Rx Required',
    badgeColor: '#f59e0b',
    emoji: '❤️',
  },
];

// ─── Feature list ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <FaShieldAlt />,
    title: 'Verified Medicines',
    desc:  'All medicines sourced exclusively from licensed pharmaceutical suppliers and distributors.',
    color: '#38bdf8',
  },
  {
    icon: <FaTruck />,
    title: 'Same-Day Delivery',
    desc:  'Order before 2 PM and receive your medicines the same day in Mailsi, Karachi, Lahore & Islamabad.',
    color: '#34d399',
  },
  {
    icon: <FaClock />,
    title: '24/7 Pharmacist Support',
    desc:  'Our licensed pharmacists are available around the clock to answer your health queries.',
    color: '#a78bfa',
  },
  {
    icon: <FaUpload />,
    title: 'Prescription Upload',
    desc:  'Snap a photo of your prescription. Our team verifies it within 30 minutes.',
    color: '#f59e0b',
  },
  {
    icon: <FaCalendarAlt />,
    title: 'Doctor Appointments',
    desc:  'Book online consultations with verified doctors across multiple specialties.',
    color: '#f472b6',
  },
  {
    icon: <FaMapMarkerAlt />,
    title: 'Nationwide Reach',
    desc:  'Delivering to 30+ cities across Pakistan with real-time order tracking.',
    color: '#fb923c',
  },
];

// ─── Star renderer ────────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <div className="home-stars">
      {Array.from({ length: 5 }, (_, i) =>
        i < Math.round(rating)
          ? <FaStar    key={i} className="star-filled" />
          : <FaRegStar key={i} className="star-empty"  />
      )}
    </div>
  );
}

// ─── Home medicine card ───────────────────────────────────────────────────────
function HomeMedicineCard({ medicine }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useAuthModal();
  const navigate = useNavigate();

  const canBuy = medicine.in_stock && !medicine.requires_prescription;
  const discount = Math.round(
    ((medicine.originalPrice - medicine.price) / medicine.originalPrice) * 100
  );

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (medicine.requires_prescription) {
      navigate('/prescriptions/upload', { state: { requiredForMedicine: medicine.name } });
      return;
    }
    canBuy && addToCart(medicine);
  };

  return (
    <div className={`home-med-card ${!medicine.in_stock ? 'oos' : ''}`}>
      {/* Badge */}
      {medicine.badge && (
        <span className="med-badge" style={{ background: medicine.badgeColor }}>
          {medicine.badge}
        </span>
      )}

      {/* Discount chip */}
      {discount > 0 && medicine.in_stock && (
        <span className="discount-chip">-{discount}%</span>
      )}

      {/* Image area */}
      <Link to={`/medicines/${medicine.id}`} className="med-img-link">
        <div className="med-emoji-box" style={{ display: 'flex', justifyContent: 'center', padding: '1.25rem 0' }}>
          <MedicalIcon emoji={medicine.emoji} category={medicine.category} size={38} />
        </div>
      </Link>

      {/* Info */}
      <div className="med-info">
        <span className="med-category">{medicine.category}</span>
        <Link to={`/medicines/${medicine.id}`} className="med-name">
          {medicine.brand || medicine.name}
        </Link>
        <span className="med-brand">{medicine.brand ? medicine.name : ''}</span>

        <Stars rating={medicine.rating} />
        <span className="med-reviews">({medicine.reviews} reviews)</span>

        <div className="med-price-row">
          <span className="med-price">Rs. {medicine.price}</span>
          <span className="med-original-price">Rs. {medicine.originalPrice}</span>
        </div>

        <button
          className={`med-cart-btn ${!medicine.in_stock ? 'disabled' : ''} ${medicine.requires_prescription ? 'rx-btn' : ''}`}
          onClick={handleAddToCart}
          disabled={!medicine.in_stock}
          title={
            !medicine.in_stock
              ? 'Out of stock'
              : medicine.requires_prescription
              ? 'Requires prescription – click to upload and order'
              : 'Add to cart'
          }
        >
          <FaShoppingCart />
          {medicine.requires_prescription
            ? 'Rx Only'
            : !medicine.in_stock
            ? 'Out of Stock'
            : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user, userRole } = useAuth();
  const [featuredMeds, setFeaturedMeds] = useState(SAMPLE_MEDICINES);

  useEffect(() => {
    if (isAuthenticated && userRole && userRole !== 'patient') {
      if (userRole === 'admin') navigate('/admin', { replace: true });
      else if (userRole === 'doctor') navigate('/doctor', { replace: true });
      else if (userRole === 'pharmacist') navigate('/pharmacist', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  useEffect(() => {
    const syncFeaturedMedicines = async () => {
      try {
        const { data } = await api.get('/medicines?limit=100');
        const dbMeds = data.medicines ?? data.results ?? data;
        if (Array.isArray(dbMeds)) {
          const updated = SAMPLE_MEDICINES.map(sample => {
            const dbMatch = dbMeds.find(db => 
              (db.brand && sample.brand && db.brand.toLowerCase() === sample.brand.toLowerCase()) ||
              db.name.toLowerCase().includes(sample.brand.toLowerCase()) ||
              db.name.toLowerCase() === sample.name.toLowerCase()
            );
            if (dbMatch) {
              return {
                ...sample,
                id: dbMatch._id || dbMatch.id,
                in_stock: dbMatch.stock > 0,
                stock: dbMatch.stock,
                price: dbMatch.price,
                requires_prescription: dbMatch.requiresPrescription || false,
                name: dbMatch.name,
                brand: dbMatch.brand || sample.brand
              };
            }
            return sample;
          });
          setFeaturedMeds(updated);
        }
      } catch (err) {
        console.error('Failed to sync featured medicines:', err);
      }
    };
    syncFeaturedMedicines();
  }, []);

  return (
    <div className="home-page">

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center hero-row">
            <Col lg={6} className="hero-content">
              <Badge bg="info" className="hero-badge mb-3">
                Pakistan's #1 Online Pharmacy
              </Badge>

              {isAuthenticated ? (
                <h1 className="hero-title">
                  Welcome back,<br />
                  <span className="hero-accent">{user?.name?.split(' ')[0] || 'Friend'}!</span>
                </h1>
              ) : (
                <h1 className="hero-title">
                  Your Health,<br />
                  <span className="hero-accent">Delivered Fast</span>
                </h1>
              )}

              <p className="hero-subtitle">
                Order medicines, book doctor appointments, and upload prescriptions —
                all from the comfort of your home with <strong>guaranteed authenticity</strong>.
              </p>

              <div className="hero-stats">
                {[
                  { value: '50K+', label: 'Happy Patients' },
                  { value: '10K+', label: 'Medicines'      },
                  { value: '200+', label: 'Doctors'        },
                  { value: '30+',  label: 'Cities'         },
                ].map((s) => (
                  <div key={s.label} className="hero-stat">
                    <span className="hero-stat-value">{s.value}</span>
                    <span className="hero-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="hero-actions">
                <Button as={Link} to="/medicines" size="lg" className="btn-hero-primary">
                  Shop Medicines <FaArrowRight className="ms-2" />
                </Button>
                <Button as={Link} to="/appointments/book" size="lg" className="btn-hero-secondary">
                  Book Appointment
                </Button>
              </div>
            </Col>

            <Col lg={6} className="hero-visual d-none d-lg-flex">
              <div className="hero-blob">
                <div className="hero-pill-orbit">
                  <span className="orbit-icon o1"><div className="hero-orbit-card"><FaPills className="text-info" /></div></span>
                  <span className="orbit-icon o2"><div className="hero-orbit-card"><FaStethoscope className="text-primary" /></div></span>
                  <span className="orbit-icon o3"><div className="hero-orbit-card"><FaFlask className="text-success" /></div></span>
                  <span className="orbit-icon o4"><div className="hero-orbit-card"><FaHeart className="text-danger" /></div></span>
                </div>
                <div className="hero-center-icon">
                  <FaUserMd className="text-info" size={80} style={{ filter: 'drop-shadow(0 8px 24px rgba(56, 189, 248, 0.35))' }} />
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ══ TRUST STRIP ══════════════════════════════════════════════ */}
      <section className="trust-strip">
        <Container>
          <div className="trust-items">
            {[
              { icon: <FaCheckCircle className="text-success" />, text: '100% Authentic'  },
              { icon: <FaTruck className="text-info" />, text: 'Free Delivery ≥ Rs.1000' },
              { icon: <FaLock className="text-warning" />, text: 'Secure Checkout' },
              { icon: <FaCommentDots className="text-primary" />, text: '24/7 Support'   },
              { icon: <FaSyncAlt className="text-secondary" />, text: 'Easy Returns'   },
            ].map((t) => (
              <div key={t.text} className="trust-item">
                <span className="trust-icon d-flex align-items-center fs-5">{t.icon}</span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ══ FEATURED MEDICINES ════════════════════════════════════════ */}
      <section className="medicines-section">
        <Container>
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured Medicines</h2>
              <p className="section-sub">Carefully selected, always in stock, shipped fast</p>
            </div>
            <Button as={Link} to="/medicines" variant="outline-primary" className="view-all-btn">
              View All <FaArrowRight className="ms-1" />
            </Button>
          </div>

          <div className="med-grid">
            {featuredMeds.map((med) => (
              <HomeMedicineCard key={med.id} medicine={med} />
            ))}
          </div>
        </Container>
      </section>

      {/* ══ CATEGORIES ════════════════════════════════════════════════ */}
      <section className="categories-section">
        <Container>
          <h2 className="section-title text-center mb-4">Shop by Category</h2>
          <Row className="gy-3">
            {[
              { name: 'Pain Relief',    linkTo: 'Analgesics',             color: '#fef3c7', icon: <MedicalIcon category="Pain Relief" size={24} /> },
              { name: 'Antibiotics',    linkTo: 'Antibiotics',            color: '#d1fae5', icon: <MedicalIcon category="Antibiotics" size={24} /> },
              { name: 'Vitamins',       linkTo: 'Vitamins & Supplements', color: '#dbeafe', icon: <MedicalIcon category="Vitamins" size={24} /> },
              { name: 'Diabetes',       linkTo: 'Diabetes',               color: '#fce7f3', icon: <MedicalIcon category="Diabetes" size={24} /> },
              { name: 'Cardiology',     linkTo: 'Cardiology',             color: '#fee2e2', icon: <MedicalIcon category="Cardiology" size={24} /> },
              { name: 'Dermatology',    linkTo: 'Dermatology',            color: '#ede9fe', icon: <MedicalIcon category="Dermatology" size={24} /> },
              { name: 'Eye Care',       linkTo: 'Eye Care',               color: '#e0f2fe', icon: <MedicalIcon category="Eye Care" size={24} /> },
              { name: 'Child Health',   linkTo: 'Child Health',           color: '#fef9c3', icon: <MedicalIcon category="Child Health" size={24} /> },
            ].map((cat) => (
              <Col xs={6} sm={4} md={3} key={cat.name}>
                <Link
                  to={`/medicines?category=${encodeURIComponent(cat.linkTo)}`}
                  className="category-card"
                  style={{ '--cat-bg': cat.color }}
                >
                  <span className="cat-icon-badge mb-2">{cat.icon}</span>
                  <span className="cat-name">{cat.name}</span>
                </Link>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════ */}
      <section className="features-section">
        <Container>
          <h2 className="section-title text-center mb-2">Why MedEasy?</h2>
          <p className="section-sub text-center mb-5">
            We combine technology and healthcare to make your life easier
          </p>
          <Row className="gy-4">
            {FEATURES.map((f) => (
              <Col md={4} key={f.title}>
                <div className="feature-card" style={{ '--feat-color': f.color }}>
                  <div className="feature-icon-wrap">
                    <div className="feature-icon">{f.icon}</div>
                  </div>
                  <h5>{f.title}</h5>
                  <p>{f.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ══ CTA BANNER ════════════════════════════════════════════════ */}
      <section className="cta-section">
        <Container>
          <div className="cta-card">
            <div className="cta-content">
              <h2>Need a prescription filled?</h2>
              <p>Upload your prescription and our pharmacists will prepare your order within the hour.</p>
              <div className="cta-actions">
                <Button as={Link} to="/prescriptions/upload" className="btn-cta-primary">
                  <FaUpload className="me-2" /> Upload Prescription
                </Button>
                <Button as={Link} to="/appointments/book" variant="outline-light" className="btn-cta-secondary">
                  <FaCalendarAlt className="me-2" /> Book a Doctor
                </Button>
              </div>
            </div>
            <div className="cta-illustration d-none d-md-block text-white">
              <FaHospital size={110} style={{ filter: 'drop-shadow(0 8px 24px rgba(56, 189, 248, 0.35))' }} />
            </div>
          </div>
        </Container>
      </section>

    </div>
  );
}
