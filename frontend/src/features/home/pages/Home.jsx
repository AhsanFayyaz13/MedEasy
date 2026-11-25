import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiEye,
  FiGlobe,
  FiHeadphones,
  FiHeart,
  FiLock,
  FiRefreshCw,
  FiShield,
  FiShoppingBag,
  FiTruck,
  FiUploadCloud,
} from 'react-icons/fi';
import { FaBaby, FaCapsules, FaDroplet, FaLeaf, FaPills, FaSyringe } from 'react-icons/fa6';
import { useAuth } from '../../../context/AuthContext';
import { Button, ErrorState, Reveal, SkeletonGrid } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import useStaffRedirect from '../../../hooks/useStaffRedirect';
import MedicineCard from '../../medicines/components/MedicineCard';
import useMedicines from '../../medicines/hooks/useMedicines';
import './Home.css';

const STATS = [
  { value: '50K+', label: 'Happy patients' },
  { value: '10K+', label: 'Medicines' },
  { value: '200+', label: 'Verified doctors' },
  { value: '30+', label: 'Cities covered' },
];

const TRUST = [
  { icon: FiShield, label: '100% authentic' },
  { icon: FiTruck, label: 'Free delivery over Rs. 1,000' },
  { icon: FiLock, label: 'Secure checkout' },
  { icon: FiHeadphones, label: '24/7 support' },
  { icon: FiRefreshCw, label: 'Easy returns' },
];

const CATEGORIES = [
  { name: 'Pain relief', category: 'Analgesics', icon: FaPills, tone: 'orange' },
  { name: 'Antibiotics', category: 'Antibiotics', icon: FaSyringe, tone: 'accent' },
  { name: 'Vitamins', category: 'Vitamins & Supplements', icon: FaLeaf, tone: 'primary' },
  { name: 'Diabetes', category: 'Diabetes', icon: FaDroplet, tone: 'rose' },
  { name: 'Cardiology', category: 'Cardiology', icon: FiHeart, tone: 'violet' },
  { name: 'Dermatology', category: 'Dermatology', icon: FaCapsules, tone: 'warning' },
  { name: 'Eye care', category: 'Eye Care', icon: FiEye, tone: 'primary' },
  { name: 'Child health', category: 'Child Health', icon: FaBaby, tone: 'accent' },
];

const FEATURES = [
  { icon: FiShield, tone: 'primary', title: 'Verified medicines', desc: 'Sourced only from licensed pharmaceutical suppliers and distributors, with authenticity tracking on every pack.' },
  { icon: FiClock, tone: 'accent', title: 'Same-day delivery', desc: 'Order before 2 PM for same-day delivery in Mailsi, Karachi, Lahore and Islamabad.' },
  { icon: FiHeadphones, tone: 'violet', title: '24/7 pharmacist support', desc: 'Licensed pharmacists are available around the clock to answer your health questions.' },
  { icon: FiUploadCloud, tone: 'warning', title: 'Prescription upload', desc: 'Snap a photo of your prescription — our pharmacists verify it within 30 minutes.' },
  { icon: FiCalendar, tone: 'rose', title: 'Doctor appointments', desc: 'Book online or in-clinic consultations with verified doctors across specialties.' },
  { icon: FiGlobe, tone: 'orange', title: 'Nationwide reach', desc: 'Delivering to 30+ cities across Pakistan with real-time order tracking.' },
];

const STEPS = [
  { title: 'Find your medicine', desc: 'Search the catalogue or upload a prescription.' },
  { title: 'Checkout securely', desc: 'Pay cash on delivery, JazzCash, EasyPaisa or card.' },
  { title: 'Track to your door', desc: 'Follow every step until it arrives.' },
];

function FeaturedMedicines() {
  const { medicines, loading, error, retry } = useMedicines({ limit: 12 });
  const featured = medicines.slice(0, 8);

  if (loading) return <SkeletonGrid count={4} />;
  if (error) return <ErrorState title="Couldn’t load medicines" message={error} onRetry={retry} />;
  if (!featured.length) {
    return (
      <div className="home-empty">
        <p>Our catalogue is being updated — please check back soon.</p>
        <Button to="/medicines" variant="secondary">Browse all medicines</Button>
      </div>
    );
  }
  return (
    <ul className="home-med-grid">
      {featured.map((med) => (
        <li key={med.id}>
          <MedicineCard medicine={med} />
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  useStaffRedirect();
  const { isAuthenticated, user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="home">
      <PageMeta />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="container home-hero__grid">
          <div className="home-hero__copy">
            <span className="home-eyebrow">
              <span className="home-eyebrow__dot" aria-hidden="true" />
              Pakistan’s trusted online pharmacy
            </span>
            <h1 id="hero-title" className="home-hero__title">
              {isAuthenticated && firstName ? (
                <>
                  Welcome back, <span className="home-hero__accent">{firstName}</span>
                </>
              ) : (
                <>
                  Your health, <span className="home-hero__accent">delivered fast.</span>
                </>
              )}
            </h1>
            <p className="home-hero__lead">
              Order authentic medicines, book doctor appointments and upload prescriptions — all from the comfort of
              your home.
            </p>
            <div className="home-hero__ctas">
              <Button to="/medicines" size="lg" rightIcon={<FiShoppingBag aria-hidden="true" />}>
                Shop medicines
              </Button>
              <Button to="/appointments/book" size="lg" variant="secondary" leftIcon={<FiCalendar aria-hidden="true" />}>
                Book a doctor
              </Button>
            </div>
            <dl className="home-stats">
              {STATS.map((s) => (
                <div key={s.label} className="home-stats__item">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="home-hero__art" aria-hidden="true">
            <div className="home-orb">
              <img src="/MedEasy_withoutBG.png" alt="" width="160" height="160" />
            </div>
            <div className="home-float home-float--a"><FiShield /> <span>Verified pharmacy</span></div>
            <div className="home-float home-float--b"><FiTruck /> <span>Same-day delivery</span></div>
            <div className="home-float home-float--c"><FiHeart /> <span>Care that’s easy</span></div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────── */}
      <section className="home-trust" aria-label="Why customers trust us">
        <ul className="container home-trust__list">
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Featured medicines ───────────────────────────────────── */}
      <section className="home-section" aria-labelledby="featured-title">
        <div className="container">
          <Reveal className="home-section__head">
            <div>
              <p className="home-kicker">Popular right now</p>
              <h2 id="featured-title">Featured medicines</h2>
              <p className="home-section__sub">Carefully selected, always in stock, shipped fast.</p>
            </div>
            <Button to="/medicines" variant="ghost" rightIcon={<FiArrowRight aria-hidden="true" />}>
              View all
            </Button>
          </Reveal>
          <FeaturedMedicines />
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className="home-section home-section--alt" aria-labelledby="categories-title">
        <div className="container">
          <Reveal className="home-section__head home-section__head--center">
            <div>
              <p className="home-kicker">Browse</p>
              <h2 id="categories-title">Shop by category</h2>
            </div>
          </Reveal>
          <ul className="home-cats">
            {CATEGORIES.map(({ name, category, icon: Icon, tone }, i) => (
              <Reveal as="li" key={name} delay={i * 40}>
                <Link to={`/medicines?category=${encodeURIComponent(category)}`} className={`home-cat home-cat--${tone}`}>
                  <span className="home-cat__icon" aria-hidden="true"><Icon /></span>
                  <span className="home-cat__name">{name}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Why MedEasy ──────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="why-title">
        <div className="container">
          <Reveal className="home-section__head home-section__head--center">
            <div>
              <p className="home-kicker">Why MedEasy</p>
              <h2 id="why-title">Healthcare that fits your life</h2>
              <p className="home-section__sub">We combine technology and licensed professionals to make care simple.</p>
            </div>
          </Reveal>
          <ul className="home-features">
            {FEATURES.map(({ icon: Icon, tone, title, desc }, i) => (
              <Reveal as="li" key={title} delay={(i % 3) * 60} className="home-feature">
                <span className={`home-feature__icon home-tone--${tone}`} aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </Reveal>
            ))}
          </ul>

          <Reveal className="home-steps">
            <h3 className="home-steps__title">How it works</h3>
            <ol>
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="home-steps__n" aria-hidden="true">{i + 1}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ── Prescription CTA ─────────────────────────────────────── */}
      <section className="home-section home-section--tight" aria-labelledby="cta-title">
        <div className="container">
          <Reveal className="home-cta">
            <div className="home-cta__copy">
              <h2 id="cta-title">Need a prescription filled?</h2>
              <p>
                Upload a photo of your prescription and our licensed pharmacists will prepare your order within 30
                minutes for confirmation.
              </p>
              <div className="home-cta__actions">
                <Button to="/prescriptions/upload" size="lg" className="home-cta__primary" leftIcon={<FiUploadCloud aria-hidden="true" />}>
                  Upload prescription
                </Button>
                <Button to="/appointments/book" size="lg" variant="ghost" className="home-cta__ghost">
                  Book a doctor
                </Button>
              </div>
            </div>
            <div className="home-cta__art" aria-hidden="true">
              <FiUploadCloud />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
