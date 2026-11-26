import { FiArrowRight, FiShoppingBag, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { useCart } from '../../../context/CartContext';
import { Button, Card, EmptyState, PageHeader, Steps } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { formatPrice } from '../../../lib/format';
import CartItem from '../components/CartItem';
import { DELIVERY_FEE, FREE_THRESHOLD } from '../components/checkoutShared';
import './Checkout.css';
import './Cart.css';

export default function Cart() {
  const { cartItems, cartTotal, cartCount, clearCart, updateQuantity, removeFromCart } = useCart();
  const delivery = cartTotal >= FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = cartTotal + delivery;
  const toFree = Math.max(0, FREE_THRESHOLD - cartTotal);

  if (cartItems.length === 0) {
    return (
      <div className="chk-page">
        <PageMeta title="Your cart" noindex />
        <div className="container">
          <EmptyState
            icon={<FiShoppingBag />}
            titleAs="h1"
            title="Your cart is empty"
            description="Find what you need in our catalogue, or upload a prescription and a pharmacist will help."
            action={
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <Button to="/medicines" rightIcon={<FiArrowRight aria-hidden="true" />}>Shop medicines</Button>
                <Button to="/prescriptions/upload" variant="secondary">Upload a prescription</Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const remove = (item) => {
    removeFromCart(item.medicineId);
  };

  return (
    <div className="chk-page">
      <PageMeta title="Your cart" noindex />
      <div className="container">
        <PageHeader
          title="Your cart"
          subtitle={`${cartCount} item${cartCount === 1 ? '' : 's'} ready for checkout`}
          actions={<Button to="/medicines" variant="secondary" leftIcon={<FiShoppingCart aria-hidden="true" />}>Add more</Button>}
        />
        <Steps steps={['Cart', 'Details', 'Confirm']} current={0} />

        <div className="chk-layout">
          <Card as="section" aria-label="Cart items" padded={false}>
            <ul className="cart-list">
              {cartItems.map((item) => (
                <CartItem key={item.medicineId} item={item} onQuantity={updateQuantity} onRemove={remove} />
              ))}
            </ul>
            <div className="cart-list__footer">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<FiTrash2 aria-hidden="true" />}
                onClick={() => {
                  if (window.confirm('Remove all items from your cart?')) {
                    clearCart();
                  }
                }}
              >
                Clear cart
              </Button>
            </div>
          </Card>

          <Card as="aside" className="chk-summary" aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title" className="chk-title"><FiShoppingCart aria-hidden="true" /> Summary</h2>
            {toFree > 0 && (
              <div className="cart-free" aria-live="polite">
                <p>Add <strong>{formatPrice(toFree)}</strong> more for free delivery</p>
                <div className="cart-free__bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, (cartTotal / FREE_THRESHOLD) * 100)}%` }} />
                </div>
              </div>
            )}
            <dl className="chk-totals">
              <div><dt>Subtotal</dt><dd>{formatPrice(cartTotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{delivery === 0 ? <span className="chk-free">Free</span> : formatPrice(delivery)}</dd></div>
              <div className="chk-totals__grand"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
            </dl>
            <Button to="/checkout" block size="lg" rightIcon={<FiArrowRight aria-hidden="true" />}>
              Proceed to checkout
            </Button>
            <p className="chk-trust">Secure checkout · Cash on delivery · Easy returns</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
