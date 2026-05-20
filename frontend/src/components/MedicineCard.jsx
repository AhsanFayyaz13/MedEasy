import { Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import './MedicineCard.css';

/**
 * MedicineCard – responsive Bootstrap card for a single medicine.
 * Fires a toast notification on "Add to Cart".
 */
export default function MedicineCard({ medicine }) {
  const { addToCart, isInCart } = useCart();
  const { toast } = useToast();

  const {
    id,
    name,
    brand         = '',
    image         = '💊',
    price,
    original_price,
    discount_pct  = 0,
    category      = '',
    stock         = 0,
    rating        = 0,
    reviews_count = 0,
    requires_prescription = false,
  } = medicine;

  const inStock  = stock > 0;
  const lowStock = inStock && stock <= 20;
  const inCart   = isInCart(id);
  const canAdd   = inStock && !requires_prescription;

  // ── Half-star rendering ────────────────────────────────────────
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) return <FaStar        key={i} className="star filled" />;
    if (i < rating)             return <FaStarHalfAlt key={i} className="star filled" />;
    return                             <FaRegStar      key={i} className="star"        />;
  });

  // ── Stock badge ────────────────────────────────────────────────
  let stockBadge;
  if (!inStock)       stockBadge = <Badge bg="danger"  className="stock-badge">Out of Stock</Badge>;
  else if (lowStock)  stockBadge = <Badge bg="warning" text="dark" className="stock-badge">Only {stock} left</Badge>;
  else                stockBadge = <Badge bg="success" className="stock-badge">In Stock</Badge>;

  // ── Add to cart handler ────────────────────────────────────────
  const handleAdd = () => {
    if (!canAdd) return;
    const result = addToCart(medicine, 1);
    if (result === 'capped') {
      toast.warning(`Max stock (${stock}) already in cart for ${name}`);
    } else if (result === 'updated') {
      toast.cart(`Quantity updated – ${name} in cart`, { duration: 2500 });
    } else {
      toast.cart(`${name} added to cart 🛒`, { duration: 2500 });
    }
  };

  return (
    <Card className={`medicine-card h-100 ${!inStock ? 'out-of-stock' : ''}`}>
      {/* Discount chip */}
      {discount_pct > 0 && inStock && (
        <span className="discount-chip">-{discount_pct}%</span>
      )}

      {/* Image area */}
      <Link to={`/medicines/${id}`} className="card-img-link" tabIndex={-1}>
        <div className="medicine-img-box">
          <span className="medicine-emoji">{image}</span>
        </div>
        {requires_prescription && (
          <Badge bg="warning" text="dark" className="rx-badge">Rx Required</Badge>
        )}
        {!inStock && <div className="oos-overlay">Out of Stock</div>}
      </Link>

      <Card.Body className="d-flex flex-column p-3">
        <span className="med-category-label">{category}</span>

        <Card.Title as={Link} to={`/medicines/${id}`} className="medicine-name mt-1 mb-0">
          {name}
        </Card.Title>
        {brand && <span className="medicine-brand">{brand}</span>}

        <div className="stars-row my-1">
          {stars}
          <span className="review-count ms-1">({reviews_count})</span>
        </div>

        <div className="price-row mb-2">
          <span className="price">Rs. {Number(price).toFixed(0)}</span>
          {original_price && original_price > price && (
            <span className="original-price ms-2">Rs. {Number(original_price).toFixed(0)}</span>
          )}
        </div>

        <div className="mb-2">{stockBadge}</div>

        <Button
          className={`add-to-cart-btn mt-auto w-100 ${inCart ? 'in-cart' : ''}`}
          onClick={handleAdd}
          disabled={!canAdd}
          title={
            !inStock            ? 'Out of stock'
            : requires_prescription ? 'Requires a valid prescription'
            : inCart            ? 'Already in cart – click to add more'
            : 'Add to cart'
          }
        >
          <FaShoppingCart className="me-1" />
          {requires_prescription ? 'Rx Only'
            : !inStock           ? 'Unavailable'
            : inCart             ? 'In Cart ✓'
            : 'Add to Cart'}
        </Button>
      </Card.Body>
    </Card>
  );
}
