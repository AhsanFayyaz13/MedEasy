import { Link, useNavigate } from 'react-router-dom';
import { FiCheck, FiFileText, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useAuthModal } from '../../../context/AuthModalContext';
import { Badge, Button } from '../../../components/ui';
import { formatPrice } from '../../../lib/format';
import MedicalIcon from './MedicalIcon';
import StarRating from './StarRating';
import './MedicineCard.css';

/**
 * Product card for one medicine. Handles add-to-cart (with toast feedback),
 * the login prompt for guests, and the Rx → upload-prescription flow.
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
    brand = '',
    image,
    imageUrl,
    price,
    original_price,
    discount_pct = 0,
    category = '',
    stock = 0,
    rating = 0,
    reviews_count = 0,
    requires_prescription = false,
  } = medicine;

  const title = brand || name;
  const subtitle = brand ? name : category;
  const inStock = stock > 0;
  const inCart = isInCart(id);
  const href = `/medicines/${id}`;

  const handleAdd = () => {
    if (requires_prescription) {
      // Prescription medicines need an account (the prescription is linked to it).
      if (!isAuthenticated) openLoginModal();
      else navigate('/prescriptions/upload', { state: { requiredForMedicine: name } });
      return;
    }
    if (!inStock) return;
    const result = addToCart(medicine, 1);
    const viewCart = { label: 'View cart', onClick: () => navigate('/cart') };
    if (result === 'capped') toast.warning(`You already have all ${stock} available ${title} in your cart.`);
    else if (result === 'updated') toast.cart(`Another ${title} added to your cart.`, { action: viewCart });
    else toast.cart(`${title} added to your cart.`, { action: viewCart });
  };

  let action;
  if (!inStock) {
    action = (
      <Button variant="secondary" block disabled>
        Out of stock
      </Button>
    );
  } else if (requires_prescription) {
    action = (
      <Button variant="outline" block leftIcon={<FiFileText aria-hidden="true" />} onClick={handleAdd}>
        Upload prescription
      </Button>
    );
  } else {
    action = (
      <Button
        variant={inCart ? 'secondary' : 'primary'}
        block
        leftIcon={inCart ? <FiCheck aria-hidden="true" /> : <FiShoppingCart aria-hidden="true" />}
        onClick={handleAdd}
        aria-label={inCart ? `${title} is in your cart — add one more` : `Add ${title} to cart`}
      >
        {inCart ? 'In cart · add more' : 'Add to cart'}
      </Button>
    );
  }

  return (
    <article className={`med-card${inStock ? '' : ' is-oos'}`}>
      <Link to={href} className="med-card__media" tabIndex={-1} aria-hidden="true">
        <MedicalIcon emoji={image || imageUrl || '💊'} category={category} alt="" size={40} />
        <div className="med-card__flags">
          {requires_prescription ? (
            <Badge tone="warning" icon={<FiFileText />}>Rx</Badge>
          ) : (
            <Badge tone="success">OTC</Badge>
          )}
          {discount_pct > 0 && inStock && <Badge tone="error" solid>-{discount_pct}%</Badge>}
        </div>
      </Link>

      <div className="med-card__body">
        <h2 className="med-card__title">
          <Link to={href}>{title}</Link>
        </h2>
        <p className="med-card__subtitle">{subtitle}</p>

        <StarRating value={rating} count={reviews_count} />

        <div className="med-card__price">
          <span className="med-card__price-now">{formatPrice(price)}</span>
          {original_price > price && (
            <span className="med-card__price-was">
              <span className="sr-only">Was </span>
              {formatPrice(original_price)}
            </span>
          )}
        </div>

        <div className="med-card__action">{action}</div>
      </div>
    </article>
  );
}
