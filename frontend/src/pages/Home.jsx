import { useEffect } from 'react';
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
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
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

  const canBuy = medicine.in_stock && !medicine.requires_prescription;
  const discount = Math.round(
    ((medicine.originalPrice - medicine.price) / medicine.originalPrice) * 100
  );

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      openLoginModal();
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
        <div className="med-emoji-box">
          <span className="med-emoji">{medicine.emoji}</span>
        </div>
      </Link>

      {/* Info */}
      <div className="med-info">
        <span className="med-category">{medicine.category}</span>
        <Link to={`/medicines/${medicine.id}`} className="med-name">
          {medicine.name}
        </Link>
        <span className="med-brand">{medicine.brand}</span>

        <Stars rating={medicine.rating} />
        <span className="med-reviews">({medicine.reviews} reviews)</span>

        <div className="med-price-row">
          <span className="med-price">Rs. {medicine.price}</span>
          <span className="med-original-price">Rs. {medicine.originalPrice}</span>
        </div>

        <button
          className={`med-cart-btn ${!canBuy ? 'disabled' : ''}`}
          onClick={handleAddToCart}
          disabled={!canBuy}
          title={
            !medicine.in_stock
              ? 'Out of stock'
              : medicine.requires_prescription
              ? 'Requires prescription – upload yours first'
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

  useEffect(() => {
    if (isAuthenticated && userRole && userRole !== 'patient') {
      if (userRole === 'admin') navigate('/admin', { replace: true });
      else if (userRole === 'doctor') navigate('/doctor', { replace: true });
      else if (userRole === 'pharmacist') navigate('/pharmacist', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

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
                  <span className="orbit-icon o1">💊</span>
                  <span className="orbit-icon o2">🩺</span>
                  <span className="orbit-icon o3">🧪</span>
                  <span className="orbit-icon o4">❤️</span>
                </div>
                <div className="hero-center-icon">⚕️</div>
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
              { emoji: '✅', text: '100% Authentic'  },
              { emoji: '🚚', text: 'Free Delivery ≥ Rs.1000' },
              { emoji: '🔒', text: 'Secure Checkout' },
              { emoji: '💬', text: '24/7 Support'   },
              { emoji: '🔄', text: 'Easy Returns'   },
            ].map((t) => (
              <div key={t.text} className="trust-item">
                <span className="trust-emoji">{t.emoji}</span>
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
            {SAMPLE_MEDICINES.map((med) => (
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
              { name: 'Pain Relief',    emoji: '🩹', color: '#fef3c7' },
              { name: 'Antibiotics',    emoji: '🦠', color: '#d1fae5' },
              { name: 'Vitamins',       emoji: '🌿', color: '#dbeafe' },
              { name: 'Diabetes',       emoji: '🩸', color: '#fce7f3' },
              { name: 'Cardiology',     emoji: '❤️', color: '#fee2e2' },
              { name: 'Dermatology',    emoji: '✨', color: '#ede9fe' },
              { name: 'Eye Care',       emoji: '👁️', color: '#e0f2fe' },
              { name: 'Child Health',   emoji: '👶', color: '#fef9c3' },
            ].map((cat) => (
              <Col xs={6} sm={4} md={3} key={cat.name}>
                <Link
                  to={`/medicines?category=${encodeURIComponent(cat.name)}`}
                  className="category-card"
                  style={{ '--cat-bg': cat.color }}
                >
                  <span className="cat-emoji">{cat.emoji}</span>
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
            <div className="cta-illustration d-none d-md-block">🏥</div>
          </div>
        </Container>
      </section>

    </div>
  );
}
