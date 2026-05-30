import { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button,
  Badge, Spinner, Alert, ProgressBar,
} from 'react-bootstrap';
import {
  FaShoppingCart, FaMapMarkerAlt, FaCreditCard,
  FaFileUpload, FaCheckCircle, FaArrowRight,
  FaArrowLeft, FaExclamationTriangle, FaLock,
  FaFileImage, FaFilePdf, FaTimes,
  FaMoneyBillWave,
  FaMobileAlt,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadPrescription, placeOrder } from '../services/orderService';
import MedicalIcon from '../components/MedicalIcon';
import './Checkout.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const DELIVERY_FEE    = 120;
const FREE_THRESHOLD  = 1000;
const PAYMENT_METHODS = [
  { id: 'cod',   label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives', disabled: false },
  { id: 'jazz',  label: 'JazzCash',          icon: '📱', desc: 'Pay via JazzCash mobile wallet', disabled: true },
  { id: 'easy',  label: 'EasyPaisa',         icon: '📲', desc: 'Pay via EasyPaisa mobile wallet', disabled: true },
  { id: 'card',  label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, UnionPay', disabled: true },
];
const CITIES = ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan','Quetta','Peshawar','Hyderabad','Sialkot'];
const ALLOWED_FILE_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
const MAX_FILE_MB = 10;

// ─── Validation ───────────────────────────────────────────────────────────────
function validateAddress(fields) {
  const err = {};
  if (!fields.firstName.trim())  err.firstName  = 'First name is required.';
  if (!fields.lastName.trim())   err.lastName   = 'Last name is required.';
  if (!fields.address.trim())    err.address    = 'Street address is required.';
  if (!fields.city)              err.city       = 'Please select a city.';
  if (!fields.phone.trim())      err.phone      = 'Phone number is required.';
  else if (!/^[+]?[\d\s\-().]{7,15}$/.test(fields.phone))
                                 err.phone      = 'Enter a valid phone number.';
  return err;
}

function validateFile(file, required) {
  if (!file && required) return 'Prescription file is required for Rx items.';
  if (!file)             return null;
  if (!ALLOWED_FILE_TYPES.includes(file.type))
    return 'Only JPG, PNG, WebP, or PDF files are accepted.';
  if (file.size > MAX_FILE_MB * 1024 * 1024)
    return `File must be smaller than ${MAX_FILE_MB} MB.`;
  return null;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Cart', 'Shipping', 'Payment', 'Confirm'];
  const pct   = Math.round(((step + 1) / steps.length) * 100);
  return (
    <div className="step-bar mb-4">
      <ProgressBar now={pct} className="step-progress" />
      <div className="step-labels">
        {steps.map((s, i) => (
          <span key={s} className={`step-label ${i <= step ? 'active' : ''}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ─── File drop zone ───────────────────────────────────────────────────────────
function PrescriptionUpload({ file, onFile, error, required }) {
  const fileRef  = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  const isPdf = file?.type === 'application/pdf';
  const icon  = isPdf ? <FaFilePdf className="file-type-icon pdf" /> : <FaFileImage className="file-type-icon img" />;

  return (
    <div className={`rx-upload-section ${error ? 'has-error' : ''}`}>
      <div className="rx-upload-header">
        <FaFileUpload className="rx-header-icon" />
        <div>
          <h6 className="rx-upload-title">
            Prescription Required {required && <span className="required-star">*</span>}
          </h6>
          <p className="rx-upload-hint">
            One or more items in your order require a valid prescription.
            Upload a clear image or PDF of your prescription.
          </p>
        </div>
      </div>

      {file ? (
        /* File preview */
        <div className="file-preview">
          {icon}
          <div className="file-preview-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
          <button className="file-remove-btn" onClick={() => onFile(null)} type="button">
            <FaTimes />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          className={`drop-zone ${drag ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        >
          <div className="drop-zone-inner">
            <span className="drop-zone-icon"><FaFileUpload size={28} className="text-secondary mb-2" /></span>
            <p className="drop-zone-text">Drag & drop your prescription here</p>
            <p className="drop-zone-sub">or <span className="drop-zone-link">click to browse</span></p>
            <p className="drop-zone-types">JPG · PNG · PDF · Max {MAX_FILE_MB} MB</p>
          </div>
        </div>
      )}

      <Form.Control
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="d-none"
        onChange={(e) => onFile(e.target.files[0] || null)}
        id="prescription-file-input"
      />
      {error && <div className="field-error mt-2"><FaExclamationTriangle className="me-1" />{error}</div>}
    </div>
  );
}

// ─── Order item row ───────────────────────────────────────────────────────────
function OrderItemRow({ item }) {
  return (
    <div className="checkout-item-row" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="checkout-item-icon-wrap me-2">
        <MedicalIcon emoji={item.image} size={18} />
      </div>
      <div className="checkout-item-info">
        <span className="checkout-item-name">{item.name}</span>
        <span className="checkout-item-meta">
          {item.brand && `${item.brand} · `}×{item.quantity}
          {item.requires_prescription && (
            <Badge bg="warning" text="dark" className="rx-pill ms-1">Rx</Badge>
          )}
        </span>
      </div>
      <span className="checkout-item-subtotal">
        Rs. {(item.price * item.quantity).toLocaleString()}
      </span>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function OrderSuccess({ orderId, onViewOrders }) {
  return (
    <div className="order-success">
      <div className="success-icon-wrap">
        <FaCheckCircle className="success-icon" />
      </div>
      <h2 className="success-title">Order Confirmed!</h2>
      <p className="success-subtitle">
        Your order has been placed successfully. We'll notify you once it's dispatched.
      </p>
      <div className="order-id-badge">
        Order ID: <strong>{orderId}</strong>
      </div>
      <div className="success-actions">
        <Button className="btn-view-order" onClick={onViewOrders}>
          Track My Order <FaArrowRight className="ms-2" />
        </Button>
        <Button as={Link} to="/medicines" variant="outline-secondary" className="btn-shop-more">
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ADDR_INIT = { firstName: '', lastName: '', address: '', city: '', postalCode: '', phone: '', notes: '' };

export default function Checkout() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { toast } = useToast();

  // ── Form state ─────────────────────────────────────────────────
  const [addr,         setAddr]         = useState({
    ...ADDR_INIT,
    firstName: user?.name?.split(' ')[0] || '',
    lastName:  user?.name?.split(' ').slice(1).join(' ') || '',
  });
  const [payment,      setPayment]      = useState('cod');
  const [rxFile,       setRxFile]       = useState(null);
  const [addrErrors,   setAddrErrors]   = useState({});
  const [fileError,    setFileError]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState(null);
  const [orderId,      setOrderId]      = useState(null);  // null = not placed yet

  // ── Derived ───────────────────────────────────────────────────
  const needsRx = useMemo(
    () => cartItems.some((i) => i.requires_prescription),
    [cartItems]
  );
  const delivery   = cartTotal >= FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const grandTotal = cartTotal + delivery;

  // ── Redirect if cart empty (and order not just placed) ────────
  if (cartItems.length === 0 && !orderId) {
    return (
      <div className="checkout-empty">
        <div className="checkout-empty-icon text-muted mb-3"><FaShoppingCart size={48} /></div>
        <h3>Your cart is empty</h3>
        <p>Add some medicines before checking out.</p>
        <Button as={Link} to="/medicines" className="btn-shop-medicines">
          Browse Medicines
        </Button>
      </div>
    );
  }

  // ── Field change handler ──────────────────────────────────────
  const handleAddr = (e) => {
    const { name, value } = e.target;
    setAddr((prev) => ({ ...prev, [name]: value }));
    if (addrErrors[name]) setAddrErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // ── Place order ───────────────────────────────────────────────
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate address
    const aErr = validateAddress(addr);
    setAddrErrors(aErr);

    // Validate file
    const fErr = validateFile(rxFile, needsRx);
    setFileError(fErr);

    if (Object.keys(aErr).length > 0 || fErr) {
      toast.warning('Please fix the errors before placing your order.');
      // Scroll to first error
      document.querySelector('.field-error, .is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: upload prescription if needed
      let prescriptionId = null;
      if (needsRx && rxFile) {
        toast.info('Uploading prescription…', { duration: 10000 });
        const rx = await uploadPrescription(rxFile, addr.notes);
        prescriptionId = rx.prescriptionId;
        toast.success(`Prescription uploaded (${prescriptionId})`);
      }

      // Step 2: place order
      toast.info('Placing your order…', { duration: 10000 });
      const result = await placeOrder({
        items: cartItems.map((i) => ({
          medicineId: i.medicineId,
          name:       i.name,
          price:      i.price,
          quantity:   i.quantity,
        })),
        shippingAddress: {
          firstName:  addr.firstName,
          lastName:   addr.lastName,
          address:    addr.address,
          city:       addr.city,
          postalCode: addr.postalCode,
          phone:      addr.phone,
        },
        paymentMethod:  payment,
        prescriptionId: prescriptionId ?? undefined,
        totalAmount:    grandTotal,
      });

      // Step 3: success
      clearCart();
      setOrderId(result.orderId);
      toast.success(`Order ${result.orderId} confirmed! 🎉`, { duration: 5000 });

      // Create notification
      try {
        // 1. Patient Alert
        const pKey = 'medeasy_notifications_' + (user?._id || user?.id || 'patient');
        const pRaw = localStorage.getItem(pKey) || '[]';
        const pAlerts = JSON.parse(pRaw);
        pAlerts.unshift({
          id: 'alert-' + Date.now(),
          text: `Order Placed: Your order #${result.orderId} of Rs. ${grandTotal.toLocaleString()} has been placed successfully! 🛍️`,
          time: Date.now(),
          emoji: '🛍️',
          unread: true,
          link: `/orders/${result.orderId}`
        });
        localStorage.setItem(pKey, JSON.stringify(pAlerts));

        // 2. Admin Alert
        const aKey = 'medeasy_notifications_admin';
        const aRaw = localStorage.getItem(aKey) || '[]';
        const aAlerts = JSON.parse(aRaw);
        aAlerts.unshift({
          id: 'alert-' + Date.now() + '-admin',
          text: `New Order Placed: Patient ${user?.name || 'Patient'} placed a new order #${result.orderId} of Rs. ${grandTotal.toLocaleString()}.`,
          time: Date.now(),
          emoji: '💰',
          unread: true,
          link: '/admin'
        });
        localStorage.setItem(aKey, JSON.stringify(aAlerts));

        // 3. Pharmacist Alert
        const phKey = 'medeasy_notifications_pharmacist';
        const phRaw = localStorage.getItem(phKey) || '[]';
        const phAlerts = JSON.parse(phRaw);
        phAlerts.unshift({
          id: 'alert-' + Date.now() + '-pharm',
          text: `New Order Broadcast: Store has a new order #${result.orderId} of Rs. ${grandTotal.toLocaleString()} awaiting fulfillment! 🏪`,
          time: Date.now(),
          emoji: '📦',
          unread: true,
          link: '/pharmacist'
        });
        localStorage.setItem(phKey, JSON.stringify(phAlerts));
      } catch (err) {
        console.error(err);
      }

    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Something went wrong. Please try again.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────
  if (orderId) {
    return (
      <div className="checkout-page">
        <Container className="py-5">
          <OrderSuccess
            orderId={orderId}
            onViewOrders={() => navigate(`/orders/${orderId}`)}
          />
        </Container>
      </div>
    );
  }

  // ── Main checkout form ─────────────────────────────────────────
  const field = (name) => ({
    name,
    value:       addr[name],
    onChange:    handleAddr,
    isInvalid:   !!addrErrors[name],
    className:   addrErrors[name] ? 'is-invalid' : '',
  });

  return (
    <div className="checkout-page">
      <Container className="py-4 py-md-5">

        {/* Header */}
        <div className="checkout-header">
          <Button variant="link" className="btn-back-link" onClick={() => navigate('/cart')}>
            <FaArrowLeft className="me-1" /> Back to Cart
          </Button>
          <h1 className="page-title">Checkout</h1>
          <div className="secure-badge"><FaLock className="me-1" /> Secure Checkout</div>
        </div>

        <StepBar step={1} />

        {/* Global submit error */}
        {submitError && (
          <Alert variant="danger" className="submit-error-alert" dismissible onClose={() => setSubmitError(null)}>
            <FaExclamationTriangle className="me-2" />
            <strong>Order failed:</strong> {submitError}
          </Alert>
        )}

        <Form noValidate onSubmit={handlePlaceOrder}>
          <Row className="gx-4 gy-4">

            {/* ═══ LEFT COLUMN ════════════════════════════════════ */}
            <Col lg={7}>

              {/* ── Shipping address ───────────────────────────── */}
              <Card className="checkout-card mb-4">
                <Card.Body>
                  <h5 className="section-heading">
                    <FaMapMarkerAlt className="section-icon" /> Delivery Information
                  </h5>

                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="chk-firstName">
                        <Form.Label>First Name <span className="required-star">*</span></Form.Label>
                        <Form.Control placeholder="Ahmed" {...field('firstName')} />
                        <Form.Control.Feedback type="invalid">{addrErrors.firstName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="chk-lastName">
                        <Form.Label>Last Name <span className="required-star">*</span></Form.Label>
                        <Form.Control placeholder="Khan" {...field('lastName')} />
                        <Form.Control.Feedback type="invalid">{addrErrors.lastName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group controlId="chk-address">
                        <Form.Label>Street Address <span className="required-star">*</span></Form.Label>
                        <Form.Control placeholder="House # 42, Block B, DHA Phase 5" {...field('address')} />
                        <Form.Control.Feedback type="invalid">{addrErrors.address}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="chk-city">
                        <Form.Label>City <span className="required-star">*</span></Form.Label>
                        <Form.Select name="city" value={addr.city} onChange={handleAddr} isInvalid={!!addrErrors.city}>
                          <option value="">Select city…</option>
                          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{addrErrors.city}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="chk-postalCode">
                        <Form.Label>Postal Code <span className="optional-label">(optional)</span></Form.Label>
                        <Form.Control placeholder="75500" name="postalCode" value={addr.postalCode} onChange={handleAddr} />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group controlId="chk-phone">
                        <Form.Label>Phone Number <span className="required-star">*</span></Form.Label>
                        <Form.Control placeholder="+92 300 1234567" {...field('phone')} />
                        <Form.Control.Feedback type="invalid">{addrErrors.phone}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group controlId="chk-notes">
                        <Form.Label>Order Notes <span className="optional-label">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder="Any special delivery instructions…"
                          name="notes"
                          value={addr.notes}
                          onChange={handleAddr}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* ── Prescription upload (conditional) ──────────── */}
              {needsRx && (
                <Card className="checkout-card rx-card mb-4">
                  <Card.Body>
                    <PrescriptionUpload
                      file={rxFile}
                      onFile={setRxFile}
                      error={fileError}
                      required={needsRx}
                    />
                  </Card.Body>
                </Card>
              )}

              {/* ── Payment method ─────────────────────────────── */}
              <Card className="checkout-card mb-4">
                <Card.Body>
                  <h5 className="section-heading">
                    <FaCreditCard className="section-icon" /> Payment Method
                  </h5>
                  <div className="payment-grid">
                    {PAYMENT_METHODS.map((m) => (
                      <label
                        key={m.id}
                        className={`payment-option ${payment === m.id ? 'selected' : ''} ${m.disabled ? 'disabled-option' : ''}`}
                        htmlFor={m.disabled ? undefined : `pay-${m.id}`}
                        onClick={() => {
                          if (!m.disabled) {
                            setPayment(m.id);
                          }
                        }}
                      >
                        <input
                          type="radio"
                          id={`pay-${m.id}`}
                          name="payment"
                          value={m.id}
                          checked={payment === m.id}
                          disabled={m.disabled}
                          onChange={() => {
                            if (!m.disabled) {
                              setPayment(m.id);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <span className="pay-icon" style={{ fontSize: '1.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {m.id === 'cod' && <FaMoneyBillWave className="text-success" />}
                          {m.id === 'jazz' && <FaMobileAlt className="text-danger" />}
                          {m.id === 'easy' && <FaMobileAlt className="text-success" />}
                          {m.id === 'card' && <FaCreditCard className="text-primary" />}
                        </span>
                        <div>
                          <span className="pay-label">
                            {m.label}
                            {m.disabled && (
                              <Badge bg="secondary" className="ms-2 coming-soon-badge">Coming Soon</Badge>
                            )}
                          </span>
                          <span className="pay-desc">{m.disabled ? 'Coming Soon - Under Integration' : m.desc}</span>
                        </div>
                        {payment === m.id && <FaCheckCircle className="pay-check" />}
                      </label>
                    ))}
                  </div>
                </Card.Body>
              </Card>

            </Col>

            {/* ═══ RIGHT COLUMN ════════════════════════════════════ */}
            <Col lg={5}>
              <Card className="checkout-card summary-sticky">
                <Card.Body>
                  <h5 className="section-heading">
                    <FaShoppingCart className="section-icon" />
                    Order Summary
                    <Badge bg="secondary" className="ms-2 item-count-badge">{cartCount}</Badge>
                  </h5>

                  {/* Item list */}
                  <div className="checkout-items-list">
                    {cartItems.map((item) => (
                      <OrderItemRow key={item.medicineId} item={item} />
                    ))}
                  </div>

                  <hr className="summary-hr" />

                  {/* Totals */}
                  <div className="summary-line">
                    <span>Subtotal</span>
                    <span>Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="summary-line">
                    <span>Delivery</span>
                    {delivery === 0
                      ? <span className="free-delivery">Free ✓</span>
                      : <span>Rs. {delivery}</span>}
                  </div>
                  {delivery > 0 && (
                    <div className="free-hint">
                      Add Rs. {(FREE_THRESHOLD - cartTotal).toLocaleString()} more for free delivery
                    </div>
                  )}

                  <hr className="summary-hr" />

                  <div className="summary-line total-line">
                    <span>Total</span>
                    <span>Rs. {grandTotal.toLocaleString()}</span>
                  </div>

                  {/* Rx warning in summary */}
                  {needsRx && !rxFile && (
                    <Alert variant="warning" className="rx-reminder py-2">
                      <FaExclamationTriangle className="me-1" />
                      Please upload your prescription above.
                    </Alert>
                  )}
                  {needsRx && rxFile && (
                    <Alert variant="success" className="rx-reminder py-2">
                      <FaCheckCircle className="me-1" />
                      Prescription attached: <em>{rxFile.name}</em>
                    </Alert>
                  )}

                  {/* Place Order */}
                  <Button
                    type="submit"
                    className="btn-place-order w-100 mt-3"
                    disabled={submitting}
                    id="place-order-btn"
                  >
                    {submitting ? (
                      <><Spinner animation="border" size="sm" className="me-2" />Processing…</>
                    ) : (
                      <><FaLock className="me-2" />Place Order · Rs. {grandTotal.toLocaleString()}</>
                    )}
                  </Button>

                  <p className="trust-note">
                    🔒 Secure · 🚚 Cash on delivery · 🔄 Easy returns
                  </p>
                </Card.Body>
              </Card>
            </Col>

          </Row>
        </Form>
      </Container>
    </div>
  );
}
