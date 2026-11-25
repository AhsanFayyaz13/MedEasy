import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCalendar,
  FiDollarSign,
  FiEye,
  FiHeadphones,
  FiHeart,
  FiLock,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTruck,
  FiUploadCloud,
} from 'react-icons/fi';
import { FaBaby, FaCapsules, FaDroplet, FaLeaf, FaPills, FaSyringe } from 'react-icons/fa6';
import { useAuth } from '../../../context/AuthContext';
import { Button, ErrorState, Reveal, SkeletonGrid } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import useStaffRedirect from '../../../hooks/useStaffRedirect';
import { fetchReviews, SITE_REVIEW_TARGET } from '../../../services/api/reviewService';
import { formatPrice } from '../../../lib/format';
import { DELIVERY_FEE, FREE_THRESHOLD } from '../../cart/components/checkoutShared';
import MedicineCard from '../../medicines/components/MedicineCard';
import useMedicines from '../../medicines/hooks/useMedicines';
import { ReviewCard } from '../../reviews/components/ReviewParts';
import './Home.css';


const TRUST = [
  { icon: FiShield, label: 'Licensed suppliers only' },
  { icon: FiTruck, label: `Free delivery over ${formatPrice(FREE_THRESHOLD)}` },
  { icon: FiLock, label: 'Secure checkout' },
  { icon: FiHeadphones, label: 'Support by phone & email' },
  { icon: FiRefreshCw, label: 'Returns for wrong or damaged items' },
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
  { icon: FiShield, tone: 'primary', title: 'Genuine medicines', desc: 'Stocked only from licensed pharmaceutical suppliers and distributors.' },
  { icon: FiUploadCloud, tone: 'warning', title: 'Pharmacist-checked prescriptions', desc: 'Upload a photo; a licensed pharmacist verifies it before anything is dispensed.' },
  { icon: FiCalendar, tone: 'rose', title: 'Verified doctors', desc: 'Every doctor’s PMC registration is checked before they can take bookings.' },
  { icon: FiDollarSign, tone: 'accent', title: 'Pay on delivery', desc: `Cash on delivery with a flat ${formatPrice(DELIVERY_FEE)} fee, free above ${formatPrice(FREE_THRESHOLD)}.` },
  { icon: FiMapPin, tone: 'violet', title: 'Track every order', desc: 'See when your order is confirmed, packed and on its way.' },
  { icon: FiLock, tone: 'orange', title: 'Private by design', desc: 'Your health information is only shared with the pharmacist or doctor caring for you.' },
];

const STEPS = [
  { title: 'Find your medicine', desc: 'Search the catalogue or upload a prescription.' },
  { title: 'Order in a minute', desc: 'Add your delivery details and pay cash on delivery.' },
  { title: 'Track to your door', desc: 'Follow every step until it arrives.' },
];

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/medicines?q=${encodeURIComponent(q.trim())}` : '/medicines');
  };
  return (
    <form className="home-search" role="search" onSubmit={submit}>
      <label htmlFor="home-search-input" className="sr-only">Search medicines</label>
      <FiSearch aria-hidden="true" />
      <input id="home-search-input" type="search" placeholder="Search medicines, e.g. Panadol" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <Button type="submit">Search</Button>
    </form>
  );
}

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

/** A few recent site reviews; the section hides itself while there are none. */
function RecentReviews() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    let alive = true;
    fetchReviews({ ...SITE_REVIEW_TARGET, limit: 6 })
      .then((list) => alive && setReviews(list.filter((r) => r.comment).slice(0, 3)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!reviews.length) return null;
  return (
    <section className="home-section" aria-labelledby="reviews-title">
      <div className="container">
        <Reveal className="home-section__head">
          <div>
            <p className="home-kicker">Reviews</p>
            <h2 id="reviews-title">What patients say</h2>
          </div>
          <Button to="/reviews" variant="ghost" rightIcon={<FiArrowRight aria-hidden="true" />}>All reviews</Button>
        </Reveal>
        <ul className="home-reviews">
          {reviews.map((r) => (
            <li key={r._id}><ReviewCard review={r} /></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Landing page, ordered for someone arriving to buy: search and categories first,
 * then products, the prescription/doctor service, how it works, reviews, and why us.
 */
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
              Online pharmacy &amp; doctor bookings
            </span>
            <h1 id="hero-title" className="home-hero__title">
              {isAuthenticated && firstName ? (
                <>
                  Welcome back, <span className="home-hero__accent">{firstName}</span>
                </>
              ) : (
                <>
                  Your medicines, <span className="home-hero__accent">delivered.</span>
                </>
              )}
            </h1>
            <p className="home-hero__lead">
              Order genuine medicines, get your prescription checked by a licensed pharmacist and book a doctor — from home.
            </p>
            <HeroSearch />
            <div className="home-hero__ctas">
              <Button to="/prescriptions/upload" variant="secondary" leftIcon={<FiUploadCloud aria-hidden="true" />}>
                Upload a prescription
              </Button>
              <Button to="/appointments/book" variant="ghost" leftIcon={<FiCalendar aria-hidden="true" />}>
                Book a doctor
              </Button>
            </div>
          </div>

          <div className="home-hero__art" aria-hidden="true">
            <div className="home-orb">
              <img src="/MedEasy_withoutBG.png" alt="" width="160" height="160" />
            </div>
            <div className="home-float home-float--a"><FiShield /> <span>Pharmacist-checked</span></div>
            <div className="home-float home-float--b"><FiTruck /> <span>Cash on delivery</span></div>
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

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="categories-title">
        <div className="container">
          <Reveal className="home-section__head">
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

      {/* ── Featured medicines ───────────────────────────────────── */}
      <section className="home-section home-section--alt" aria-labelledby="featured-title">
        <div className="container">
          <Reveal className="home-section__head">
            <div>
              <p className="home-kicker">Popular</p>
              <h2 id="featured-title">Featured medicines</h2>
              <p className="home-section__sub">A selection from our catalogue.</p>
            </div>
            <Button to="/medicines" variant="ghost" rightIcon={<FiArrowRight aria-hidden="true" />}>View all</Button>
          </Reveal>
          <FeaturedMedicines />
        </div>
      </section>

      {/* ── Prescription & doctors ───────────────────────────────── */}
      <section className="home-section home-section--tight" aria-labelledby="cta-title">
        <div className="container">
          <Reveal className="home-cta">
            <div className="home-cta__copy">
              <h2 id="cta-title">Have a prescription?</h2>
              <p>
                Upload a photo of it. A licensed pharmacist checks it, then you can order the medicines on it — or book a
                doctor if you need a new one.
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

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="home-section home-section--tight" aria-label="How it works">
        <div className="container">
          <Reveal className="home-steps">
            <h2 className="home-steps__title">How it works</h2>
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

      <RecentReviews />

      {/* ── Why MedEasy ──────────────────────────────────────────── */}
      <section className="home-section home-section--alt" aria-labelledby="why-title">
        <div className="container">
          <Reveal className="home-section__head home-section__head--center">
            <div>
              <p className="home-kicker">Why MedEasy</p>
              <h2 id="why-title">Healthcare that fits your life</h2>
              <p className="home-section__sub">Licensed professionals and simple tools, in one place.</p>
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
        </div>
      </section>
    </div>
  );
}
