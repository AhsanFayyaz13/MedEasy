import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';
import MedicalIcon from './MedicalIcon';
import './MedicineCard.css';

/**
 * MedicineCard – responsive custom card for a single medicine aligned with Stitch design.
 * Fires a toast notification on "Add to Cart".
 * Shows login modal if unauthenticated user tries to add to cart.
 */
export default function MedicineCard({ medicine }) {
  const { addToCart, isInCart } = useCart();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useAuthModal();
  const navigate = useNavigate();

  const {
    id,
    name,
    brand         = '',
    image,
    imageUrl,
    price,
    original_price,
    discount_pct  = 0,
    category      = '',
    stock         = 0,
    rating        = 0,
    reviews_count = 0,
    requires_prescription = false,
  } = medicine;

  const displayImage = image || imageUrl || '💊';

  const inStock  = stock > 0;
  const inCart   = isInCart(id);
  const canAdd   = inStock && !requires_prescription;

  // ── Star rendering using Material Icons ────────────────────────
  const stars = Array.from({ length: 5 }, (_, i) => {
    const isFilled = i < Math.round(rating);
    return (
      <span 
        key={i} 
        className="material-symbols-outlined card-star-icon" 
        style={isFilled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        star
      </span>
    );
  });

  // ── Add to cart handler ────────────────────────────────────────
  const handleAdd = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    if (requires_prescription) {
      navigate('/prescriptions/upload', { state: { requiredForMedicine: name } });
      return;
    }

    if (!canAdd) return;
    const result = addToCart(medicine, 1);
    if (result === 'capped') {
      toast.warning(`Max stock (${stock}) already in cart for ${name}`);
    } else if (result === 'updated') {
      toast.cart(`Quantity updated – ${name} in cart`, { duration: 2500 });
    } else {
      toast.cart(`${name} added to cart`, { duration: 2500 });
    }
  };

  return (
    <div className={`medicine-card ${!inStock ? 'out-of-stock' : ''}`}>
      {/* Image area */}
      <Link to={`/medicines/${id}`} className="medicine-card-img-link" tabIndex={-1}>
        {/* Floating Rx / OTC badges */}
        {requires_prescription ? (
          <span className="card-floating-badge rx">
            <span className="material-symbols-outlined text-[14px]">prescriptions</span> Rx
          </span>
        ) : (
          <span className="card-floating-badge otc">OTC</span>
        )}

        {/* Discount chip */}
        {discount_pct > 0 && inStock && (
          <span className="card-discount-chip">-{discount_pct}%</span>
        )}

        {/* Product image */}
        <MedicalIcon emoji={displayImage} category={category} size={40} />

        {/* OOS Overlay */}
        {!inStock && <div className="card-oos-overlay">Out of Stock</div>}
      </Link>

      <div className="medicine-card-body">
        {/* Title */}
        <Link to={`/medicines/${id}`} className="medicine-card-title">
          {brand || name}
        </Link>
        
        {/* Subtitle */}
        <div className="medicine-card-subtitle">
          {brand ? name : category}
        </div>

        {/* Stars review */}
        <div className="card-stars-row">
          {stars}
          <span className="card-reviews-count">({reviews_count})</span>
        </div>

        {/* Price row */}
        <div className="card-price-row">
          <span className="card-price-active">Rs. {Number(price).toFixed(0)}</span>
          {original_price && original_price > price && (
            <span className="card-price-original">Rs. {Number(original_price).toFixed(0)}</span>
          )}
        </div>

        {/* Add to Cart button */}
        <button
          className={`card-action-button ${requires_prescription ? 'rx-button' : ''} ${inCart ? 'in-cart' : ''}`}
          onClick={handleAdd}
          disabled={!inStock}
          title={
            !inStock            ? 'Out of stock'
            : requires_prescription ? 'Requires a valid prescription – click to upload'
            : inCart            ? 'Already in cart – click to add more'
            : 'Add to cart'
          }
        >
          {requires_prescription ? (
            <>
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Rx Only
            </>
          ) : !inStock ? (
            'Unavailable'
          ) : inCart ? (
            <>
              <span className="material-symbols-outlined text-[18px]">check</span>
              In Cart ✓
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}
