import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Button, Badge,
  Spinner, Alert, Breadcrumb,
} from 'react-bootstrap';
import {
  FaShoppingCart, FaStar, FaRegStar, FaStarHalfAlt,
  FaMinus, FaPlus, FaArrowLeft, FaCheckCircle,
  FaExclamationTriangle, FaInfoCircle, FaUpload,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import './MedicineDetail.css';

function useMedicine(id) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    const fetchMed = async () => {
      try {
        const { data: med } = await api.get(`/medicines/${id}`);
        if (isMounted) {
          setData({
            ...med,
            id: med._id,
            requires_prescription: med.requiresPrescription,
            image: med.imageUrl || '💊',
            discount_pct: 0,
            original_price: med.price,
            rating: 5,
            reviews_count: 1,
            country_of_origin: 'N/A',
            usage: 'Take as directed by your physician.',
            side_effects: 'Consult your doctor for details.',
            storage: 'Store in a cool, dry place.',
            tags: [med.category]
          });
        }
      } catch (err) {
        if (isMounted) setError('Medicine not found.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMed();
    return () => { isMounted = false; };
  }, [id]);

  return { data, loading, error };
}

// ─── Half-star row ────────────────────────────────────────────────────────────
function StarRow({ rating, count }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) return <FaStar        key={i} className="star filled" />;
    if (i < rating)             return <FaStarHalfAlt key={i} className="star filled" />;
    return                             <FaRegStar      key={i} className="star"        />;
  });
  return (
    <div className="detail-stars">
      {stars}
      <span className="detail-rating-num">{rating.toFixed(1)}</span>
      <span className="detail-reviews">({count.toLocaleString()} reviews)</span>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MedicineDetail() {
  const { id }            = useParams();
  const navigate          = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { data: med, loading, error } = useMedicine(id);

  const [qty, setQty]     = useState(1);
  const [added, setAdded] = useState(false);
  const { toast } = useToast();

  const inCart    = cartItems.some((i) => i.id === med?.id);
  const inStock   = med?.stock > 0;
  const lowStock  = inStock && med?.stock <= 20;
  const canAdd    = inStock && !med?.requires_prescription;

  const changeQty = (delta) => {
    setQty((q) => Math.max(1, Math.min(med?.stock ?? 1, q + delta)));
  };

  const handleAddToCart = () => {
    if (!canAdd) return;
    const result = addToCart(med, qty);
    if (result === 'capped') {
      toast.warning(`Max stock (${med.stock}) reached for ${med.name}`);
    } else {
      toast.cart(`${qty > 1 ? qty + '× ' : ''}${med.name} added to cart 🛒`, { duration: 2500 });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="detail-loading">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading medicine details…</p>
      </div>
    );
  }

  // ── Error / not found ──────────────────────────────────────────
  if (error || !med) {
    return (
      <div className="detail-error">
        <div className="error-emoji">💊</div>
        <h4>{error || 'Medicine not found'}</h4>
        <Button variant="primary" className="mt-3" onClick={() => navigate('/medicines')}>
          <FaArrowLeft className="me-2" /> Back to Medicines
        </Button>
      </div>
    );
  }

  // ── Stock badge ────────────────────────────────────────────────
  const StockBadge = () => {
    if (!inStock)  return <Badge bg="danger"  className="stock-badge-lg">Out of Stock</Badge>;
    if (lowStock)  return <Badge bg="warning" text="dark" className="stock-badge-lg">Only {med.stock} left — order soon!</Badge>;
    return               <Badge bg="success"  className="stock-badge-lg"><FaCheckCircle className="me-1" />{med.stock} units in stock</Badge>;
  };

  return (
    <div className="medicine-detail-page">
      <Container className="py-4 py-md-5">

        {/* ── Breadcrumb ────────────────────────────────────── */}
        <Breadcrumb className="detail-breadcrumb mb-4">
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Home</Breadcrumb.Item>
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/medicines' }}>Medicines</Breadcrumb.Item>
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/medicines?category=${med.category}` }}>{med.category}</Breadcrumb.Item>
          <Breadcrumb.Item active>{med.name}</Breadcrumb.Item>
        </Breadcrumb>

        <Row className="gy-4 gx-5">

          {/* ── Left: Image panel ─────────────────────────── */}
          <Col md={5} lg={4}>
            <div className="detail-img-panel">
              {/* Discount ribbon */}
              {med.discount_pct > 0 && inStock && (
                <div className="detail-ribbon">-{med.discount_pct}%</div>
              )}

              {/* Emoji "image" */}
              <div className="detail-emoji-box">
                <span className="detail-emoji">{med.image}</span>
              </div>

              {/* Rx alert */}
              {med.requires_prescription && (
                <Alert variant="warning" className="rx-alert mt-3 mb-0 py-2">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Prescription Required.</strong>{' '}
                  <Link to="/prescriptions/upload">Upload yours →</Link>
                </Alert>
              )}
            </div>
          </Col>

          {/* ── Right: Details panel ──────────────────────── */}
          <Col md={7} lg={8}>

            {/* Category + brand */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <Badge bg="primary" className="category-pill">{med.category}</Badge>
              {med.subcategory && (
                <Badge bg="light" text="dark" className="category-pill">{med.subcategory}</Badge>
              )}
            </div>

            <h1 className="detail-name">{med.name}</h1>
            <p className="detail-brand">by <strong>{med.brand}</strong> · {med.manufacturer}</p>

            {/* Stars */}
            <StarRow rating={med.rating} count={med.reviews_count} />

            {/* Price */}
            <div className="detail-price-row my-3">
              <span className="detail-price">Rs. {med.price.toLocaleString()}</span>
              {med.original_price > med.price && (
                <span className="detail-original-price ms-2">
                  Rs. {med.original_price.toLocaleString()}
                </span>
              )}
              {med.discount_pct > 0 && (
                <Badge bg="danger" className="ms-2 save-badge">
                  Save {med.discount_pct}%
                </Badge>
              )}
            </div>

            {/* Stock badge */}
            <div className="mb-3"><StockBadge /></div>

            {/* Description */}
            <p className="detail-description">{med.description}</p>

            {/* ── Add to cart block ─────────────────────────── */}
            {canAdd && (
              <div className="cart-block">
                {/* Quantity selector */}
                <div className="qty-selector">
                  <span className="qty-label">Qty:</span>
                  <div className="qty-controls">
                    <button
                      className="qty-btn"
                      onClick={() => changeQty(-1)}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      <FaMinus />
                    </button>
                    <span className="qty-value">{qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => changeQty(1)}
                      disabled={qty >= med.stock}
                      aria-label="Increase quantity"
                    >
                      <FaPlus />
                    </button>
                  </div>
                  <span className="qty-max">max {med.stock}</span>
                </div>

                {/* Add + cart buttons */}
                <div className="cart-actions">
                  <Button
                    className={`btn-add-cart ${added ? 'added' : ''}`}
                    onClick={handleAddToCart}
                    disabled={added}
                    size="lg"
                  >
                    {added
                      ? <><FaCheckCircle className="me-2" />Added!</>
                      : <><FaShoppingCart className="me-2" />Add to Cart</>
                    }
                  </Button>
                  {inCart && (
                    <Button
                      as={Link}
                      to="/cart"
                      variant="outline-primary"
                      size="lg"
                      className="btn-view-cart"
                    >
                      View Cart
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Prescription CTA */}
            {med.requires_prescription && (
              <div className="rx-cta">
                <FaUpload className="me-2" />
                This medicine requires a valid prescription.{' '}
                <Link to="/prescriptions/upload" className="rx-link">Upload Prescription →</Link>
              </div>
            )}

            {/* Medicine info table */}
            <div className="info-table mt-4">
              <InfoRow label="Category"      value={`${med.category} › ${med.subcategory}`} />
              <InfoRow label="Manufacturer"  value={med.manufacturer} />
              <InfoRow label="Country"       value={med.country_of_origin} />
              <InfoRow label="Prescription"  value={med.requires_prescription ? 'Required' : 'Not required'} />
              <InfoRow label="Stock"         value={inStock ? `${med.stock} units` : 'Out of stock'} />
            </div>
          </Col>
        </Row>

        {/* ── Usage / Side effects / Storage tabs ─────────── */}
        <Row className="mt-5">
          {[
            { title: '📋 Usage & Dosage',    icon: <FaInfoCircle />,          content: med.usage        },
            { title: '⚠️ Side Effects',       icon: <FaExclamationTriangle />,  content: med.side_effects },
            { title: '📦 Storage',            icon: <FaCheckCircle />,          content: med.storage      },
          ].map((tab) => (
            <Col md={4} key={tab.title} className="mb-3">
              <div className="info-card">
                <h6 className="info-card-title">{tab.title}</h6>
                <p className="info-card-body">{tab.content}</p>
              </div>
            </Col>
          ))}
        </Row>

        {/* ── Tags ─────────────────────────────────────────── */}
        {med.tags?.length > 0 && (
          <div className="tags-row mt-3">
            {med.tags.map((tag) => (
              <Badge key={tag} bg="light" text="dark" className="tag-pill">#{tag}</Badge>
            ))}
          </div>
        )}

        {/* ── Back link ─────────────────────────────────────── */}
        <div className="mt-5">
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            <FaArrowLeft className="me-1" /> Back
          </Button>
        </div>

      </Container>
    </div>
  );
}
