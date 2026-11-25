import { useMemo, useState } from 'react';
import { FiArrowLeft, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { uploadPrescription, placeOrder } from '../../../services/api/orderService';
import { Alert, Button, EmptyState, PageHeader, Steps } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { formatPrice } from '../../../lib/format';
import { notifySelf, sendNotification } from '../../../lib/notifications';
import { DELIVERY_FEE, FREE_THRESHOLD, validateAddress, validateFile } from '../components/checkoutShared';
import { AddressSection, OrderSummary, PaymentSection, PrescriptionSection } from '../components/CheckoutSections';
import OrderSuccess from '../components/OrderSuccess';
import './Checkout.css';

const STEPS = ['Cart', 'Details', 'Confirm'];

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { toast } = useToast();

  const [addr, setAddr] = useState(() => ({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    address: user?.address || '',
    city: '',
    postalCode: '',
    phone: user?.phone || '',
    notes: '',
  }));
  const [payment, setPayment] = useState('cod');
  const [rxFile, setRxFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [placed, setPlaced] = useState(null); // { orderId, needsRx }

  const needsRx = useMemo(() => cartItems.some((i) => i.requires_prescription), [cartItems]);
  const delivery = cartTotal >= FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = cartTotal + delivery;

  if (placed) {
    return (
      <div className="chk-page">
        <PageMeta title="Order placed" noindex />
        <div className="container">
          <Steps steps={STEPS} current={3} />
          <OrderSuccess orderId={placed.orderId} needsRx={placed.needsRx} />
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="chk-page">
        <PageMeta title="Checkout" noindex />
        <div className="container">
          <EmptyState
            icon={<FiShoppingCart />}
            title="Your cart is empty"
            description="Add some medicines before checking out."
            action={<Button to="/medicines">Browse medicines</Button>}
          />
        </div>
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setAddr((a) => ({ ...a, [name]: value }));
    if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    const aErr = validateAddress(addr);
    const fErr = validateFile(rxFile, needsRx);
    setErrors(aErr);
    setFileError(fErr);
    if (Object.keys(aErr).length || fErr) {
      toast.warning('Please fix the highlighted fields.');
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      let prescriptionId;
      if (needsRx && rxFile) {
        const rx = await uploadPrescription(rxFile, addr.notes);
        prescriptionId = rx.prescriptionId;
      }
      const result = await placeOrder({
        items: cartItems.map((i) => ({ medicineId: i.medicineId, quantity: i.quantity })),
        shippingAddress: {
          firstName: addr.firstName.trim(),
          lastName: addr.lastName.trim(),
          address: addr.address.trim(),
          city: addr.city,
          postalCode: addr.postalCode.trim(),
          phone: addr.phone.trim(),
        },
        paymentMethod: payment,
        prescriptionId,
        notes: addr.notes.trim() || undefined,
      });

      clearCart();
      setPlaced({ orderId: result.orderId, needsRx });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Order placed successfully!');

      const shortId = String(result.orderId).slice(-8).toUpperCase();
      notifySelf(user, { text: `Order placed: #${shortId} for ${formatPrice(total)}.`, emoji: 'booking', link: `/orders/${result.orderId}` });
      sendNotification('admin', null, { text: `New order #${shortId} from ${user?.name || 'a patient'} (${formatPrice(total)}).`, emoji: 'system', link: '/admin?tab=orders' });
      sendNotification('pharmacist', null, { text: `New order #${shortId} awaiting fulfilment${needsRx ? ' (prescription to verify)' : ''}.`, emoji: 'booking', link: '/pharmacist?tab=orders' });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chk-page">
      <PageMeta title="Checkout" noindex />
      <div className="container">
        <Button to="/cart" variant="ghost" size="sm" leftIcon={<FiArrowLeft aria-hidden="true" />} className="chk-back">
          Back to cart
        </Button>
        <PageHeader title="Checkout" subtitle="Confirm your delivery details and place your order." />
        <Steps steps={STEPS} current={1} />

        {submitError && <Alert tone="error" title="We couldn’t place your order" onClose={() => setSubmitError(null)}>{submitError}</Alert>}

        <div className="chk-layout">
          <form id="checkout-form" noValidate onSubmit={submit} className="chk-main">
            <AddressSection addr={addr} errors={errors} onChange={onChange} />
            {needsRx && <PrescriptionSection file={rxFile} onFile={(f) => { setRxFile(f); setFileError(validateFile(f, false)); }} error={fileError} />}
            <PaymentSection value={payment} onChange={setPayment} />
          </form>

          <OrderSummary
            items={cartItems}
            count={cartCount}
            subtotal={cartTotal}
            delivery={delivery}
            total={total}
            needsRx={needsRx}
            rxFile={rxFile}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
