import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useAuthModal } from '../../../context/AuthModalContext';
import { uploadPrescription, placeOrder } from '../../../services/api/orderService';
import { fetchPrescriptions } from '../../../services/api/prescriptionService';
import { Alert, Button, EmptyState, PageHeader, Steps } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { formatPhone } from '../../../lib/format';
import { DELIVERY_FEE, FREE_THRESHOLD, validateAddress, validateFile } from '../components/checkoutShared';
import { AddressSection, OrderSummary, PaymentSection, PrescriptionSection } from '../components/CheckoutSections';
import OrderSuccess from '../components/OrderSuccess';
import './Checkout.css';

const STEPS = ['Cart', 'Details', 'Confirm'];

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useAuthModal();
  const isGuest = !isAuthenticated;
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();

  const [addr, setAddr] = useState(() => ({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    address: user?.address || '',
    city: '',
    postalCode: '',
    phone: formatPhone(user?.phone).replace(' ', ''), // 03001234567, like the placeholder
    notes: '',
    email: '',
    location: null, // optional map pin { lat, lng }
  }));
  const [payment, setPayment] = useState('cod');
  const [rxFile, setRxFile] = useState(null);
  const [savedRx, setSavedRx] = useState([]); // the patient's prescriptions that can still be used
  const [rxChoice, setRxChoice] = useState('new'); // a saved prescription id, or 'new' to upload
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [placed, setPlaced] = useState(null); // { orderId, needsRx }

  const needsRx = useMemo(() => cartItems.some((i) => i.requires_prescription), [cartItems]);
  const delivery = cartTotal >= FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = cartTotal + delivery;

  // Offer prescriptions the patient already sent (approved first) instead of asking for a new upload.
  useEffect(() => {
    if (!needsRx || isGuest) return undefined;
    let alive = true;
    fetchPrescriptions()
      .then((list) => {
        if (!alive) return;
        const usable = list.filter((rx) => rx.usable).sort((a, b) => (a.status === 'verified' ? 0 : 1) - (b.status === 'verified' ? 0 : 1));
        setSavedRx(usable);
        if (usable.length) setRxChoice((c) => (c === 'new' ? usable[0].id : c));
      })
      .catch(() => { /* fall back to uploading a new one */ });
    return () => {
      alive = false;
    };
  }, [needsRx, isGuest]);
  const chosenRx = savedRx.find((rx) => rx.id === rxChoice);

  if (placed) {
    return (
      <div className="chk-page">
        <PageMeta title="Order placed" noindex />
        <div className="container">
          <Steps steps={STEPS} current={3} />
          <OrderSuccess {...placed} />
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
            titleAs="h1"
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
    if (isGuest && needsRx) {
      openLoginModal();
      return;
    }
    const aErr = validateAddress(addr);
    if (isGuest && addr.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr.email.trim())) aErr.email = 'Please enter a valid email address.';
    const fErr = chosenRx ? null : validateFile(rxFile, needsRx);
    setErrors(aErr);
    setFileError(fErr);
    if (Object.keys(aErr).length || fErr) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      let prescriptionId = needsRx && chosenRx ? chosenRx.id : undefined;
      if (needsRx && !chosenRx && rxFile) {
        const rx = await uploadPrescription(rxFile, addr.notes);
        prescriptionId = rx.prescriptionId; // orderService.uploadPrescription returns { prescriptionId }
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
          notes: addr.notes.trim() || undefined,
          location: addr.location || undefined,
        },
        paymentMethod: payment,
        prescriptionId,
        guestEmail: isGuest ? addr.email.trim() || undefined : undefined,
      });

      clearCart();
      setPlaced({ orderId: result.orderId, orderNumber: result.orderNumber, phone: addr.phone.trim(), needsRx, guest: isGuest });
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      setSubmitError(msg);
      // The chosen prescription can't be used any more (used, expired): drop it and ask for a new one.
      if (err?.response?.data?.error?.code === 'PRESCRIPTION_UNUSABLE' && chosenRx) {
        setSavedRx((list) => list.filter((rx) => rx.id !== chosenRx.id));
        setRxChoice('new');
      }
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
            <AddressSection addr={addr} errors={errors} onChange={onChange} onPin={(location) => setAddr((a) => ({ ...a, location }))} guest={isGuest} onSignIn={openLoginModal} />
            {needsRx && isGuest && (
              <Alert tone="warning" title="Sign in to order prescription medicines">
                Your cart has a prescription medicine, which needs an account so a pharmacist can check your prescription.{' '}
                <Button variant="link" onClick={openLoginModal}>Sign in or create an account</Button>
              </Alert>
            )}
            {needsRx && !isGuest && (
              <PrescriptionSection
                saved={savedRx}
                choice={chosenRx ? rxChoice : 'new'}
                onChoice={(id) => { setRxChoice(id); setFileError(null); }}
                file={rxFile}
                onFile={(f) => { setRxFile(f); setFileError(validateFile(f, false)); }}
                error={fileError}
              />
            )}
            <PaymentSection value={payment} onChange={setPayment} />
          </form>

          <OrderSummary
            items={cartItems}
            count={cartCount}
            subtotal={cartTotal}
            delivery={delivery}
            total={total}
            needsRx={needsRx}
            rxReady={chosenRx ? `#RX-${String(chosenRx.id).slice(-6).toUpperCase()} (already sent)` : rxFile?.name}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
