import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaShoppingBag, FaArrowRight, FaTrash, FaMinus, FaPlus,
  FaShoppingCart, FaArrowLeft,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import MedicalIcon from '../components/MedicalIcon';
import './Cart.css';

// ─── Cart Item Row ────────────────────────────────────────────────────────────
function CartRow({ item }) {
  const { updateQuantity, removeFromCart } = useCart();
  const { toast } = useToast();

  const { medicineId, name, brand, image, price, quantity, stock } = item;
  const subtotal = Number(price) * quantity;
  const atStockMax = stock && quantity >= stock;

  const handleRemove = () => {
    removeFromCart(medicineId);
    toast.info(`${name} removed from cart`, { duration: 2200 });
  };

  return (
    <div className="cart-row">
      {/* Emoji image replaced with MedicalIcon */}
      <div className="cart-row-img" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <MedicalIcon emoji={image} size={22} />
      </div>

      {/* Info */}
      <div className="cart-row-info">
        <Link to={`/medicines/${medicineId}`} className="cart-item-name">{name}</Link>
        {brand && <span className="cart-item-brand">{brand}</span>}
        <span className="cart-unit-price">Rs. {Number(price).toFixed(0)} / unit</span>
        {atStockMax && (
          <Badge bg="warning" text="dark" className="cart-stock-warn">Max stock reached</Badge>
        )}
      </div>

      {/* Qty controls */}
      <div className="cart-qty-wrap">
        <button
          className="qty-btn-sm"
          onClick={() => updateQuantity(medicineId, quantity - 1)}
          aria-label="Decrease"
        >
          <FaMinus />
        </button>
        <span className="qty-display">{quantity}</span>
        <button
          className="qty-btn-sm"
          onClick={() => updateQuantity(medicineId, quantity + 1)}
          disabled={atStockMax}
          aria-label="Increase"
        >
          <FaPlus />
        </button>
      </div>

      {/* Subtotal */}
      <div className="cart-subtotal">
        Rs. {subtotal.toLocaleString()}
      </div>

      {/* Remove */}
      <button className="cart-remove-btn" onClick={handleRemove} aria-label="Remove item">
        <FaTrash />
      </button>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <div className="cart-empty">
      <div className="cart-empty-icon">
        <FaShoppingBag />
      </div>
      <h2>Your cart is empty</h2>
      <p>Browse our medicines and add items to get started.</p>
      <Button as={Link} to="/medicines" className="btn-shop">
        Shop Medicines <FaArrowRight className="ms-2" />
      </Button>
    </div>
  );
}

// ─── Cart Page ────────────────────────────────────────────────────────────────
const DELIVERY_THRESHOLD = 500;

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { toast } = useToast();

  const delivery   = cartTotal >= DELIVERY_THRESHOLD ? 0 : 120;
  const grandTotal = cartTotal + delivery;

  const handleClear = () => {
    clearCart();
    toast.info('Cart cleared');
  };

  if (cartItems.length === 0) return <EmptyCart />;

  return (
    <div className="cart-page">
      <Container className="py-5">

        {/* Header */}
        <div className="cart-header">
          <div>
            <h1 className="page-title">Shopping Cart</h1>
            <p className="cart-subtitle">{cartCount} item{cartCount !== 1 ? 's' : ''} in your cart</p>
          </div>
          <button className="btn-back" onClick={() => navigate(-1)}>
            <FaArrowLeft className="me-1" /> Continue Shopping
          </button>
        </div>

        <Row className="gx-4 gy-4">

          {/* ── Items list ─────────────────────────────────── */}
          <Col lg={8}>
            <div className="cart-items-card">
              {/* Column headers */}
              <div className="cart-col-heads">
                <span style={{ flex: 1 }}>Product</span>
                <span className="text-center" style={{ width: 110 }}>Qty</span>
                <span className="text-end"   style={{ width: 100 }}>Subtotal</span>
                <span style={{ width: 36 }}></span>
              </div>

              {/* Rows */}
              {cartItems.map((item) => (
                <CartRow key={item.medicineId} item={item} />
              ))}

              {/* Clear cart */}
              <div className="cart-footer-actions">
                <Button variant="outline-danger" size="sm" onClick={handleClear}>
                  <FaTrash className="me-1" /> Clear Cart
                </Button>
                <Button as={Link} to="/medicines" variant="outline-secondary" size="sm">
                  <FaShoppingCart className="me-1" /> Add More
                </Button>
              </div>
            </div>
          </Col>

          {/* ── Order summary ──────────────────────────────── */}
          <Col lg={4}>
            <Card className="summary-card">
              <Card.Body>
                <h5 className="summary-title">
                  <FaShoppingCart className="me-2 text-primary" />
                  Order Summary
                </h5>

                {/* Item breakdown */}
                <div className="summary-items-list">
                  {cartItems.map((item) => (
                    <div key={item.medicineId} className="summary-item-row">
                      <span className="summary-item-name">
                        {item.name}
                        <span className="summary-item-qty"> × {item.quantity}</span>
                      </span>
                      <span>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <hr className="summary-divider" />

                {/* Totals */}
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  {delivery === 0
                    ? <span className="text-success fw-600">Free ✓</span>
                    : <span>Rs. {delivery}</span>}
                </div>
                {delivery > 0 && (
                  <div className="free-delivery-hint">
                    Add Rs. {(DELIVERY_THRESHOLD - cartTotal).toLocaleString()} more for free delivery
                  </div>
                )}

                <hr className="summary-divider" />

                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>Rs. {grandTotal.toLocaleString()}</span>
                </div>

                {/* Checkout CTA */}
                <Button
                  as={Link}
                  to="/checkout"
                  className="btn-checkout w-100 mt-3"
                  disabled={cartItems.length === 0}
                >
                  Proceed to Checkout <FaArrowRight className="ms-2" />
                </Button>

                <p className="checkout-note">
                  🔒 Secure checkout · Free returns · Cash on delivery available
                </p>
              </Card.Body>
            </Card>
          </Col>

        </Row>
      </Container>
    </div>
  );
}
