import { FiCheckCircle, FiCreditCard, FiDollarSign, FiFileText, FiLock, FiMapPin, FiShoppingBag, FiSmartphone } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, FileDropzone, Input, Select, Textarea } from '../../../components/ui';
import { formatPrice } from '../../../lib/format';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { CITIES, FREE_THRESHOLD, MAX_FILE_MB, PAYMENT_METHODS } from './checkoutShared';
import DeliveryPinField from './DeliveryPinField';

const PAY_ICON = { cod: <FiDollarSign />, jazz: <FiSmartphone />, easy: <FiSmartphone />, card: <FiCreditCard /> };

export function AddressSection({ addr, errors, onChange, onPin, guest = false, onSignIn }) {
  const field = (name) => ({ name, value: addr[name], onChange, error: errors[name] });
  return (
    <Card as="section" aria-labelledby="chk-address-title">
      <h2 id="chk-address-title" className="chk-title"><FiMapPin aria-hidden="true" /> Delivery details</h2>
      {guest && (
        <p className="chk-muted">
          Checking out as a guest. Have an account? <Button variant="link" onClick={onSignIn}>Sign in</Button> to see your orders in one place.
        </p>
      )}
      <div className="row g-3">
        <div className="col-sm-6"><Input label="First name" required autoComplete="given-name" {...field('firstName')} /></div>
        <div className="col-sm-6"><Input label="Last name" required autoComplete="family-name" {...field('lastName')} /></div>
        <div className="col-12"><Input label="Street address" required placeholder="House #42, Block B, DHA Phase 5" autoComplete="street-address" {...field('address')} /></div>
        <div className="col-sm-6"><Select label="City" required placeholder="Select a city" options={CITIES} {...field('city')} /></div>
        <div className="col-sm-6"><Input label="Postal code" hint="Optional" inputMode="numeric" autoComplete="postal-code" {...field('postalCode')} /></div>
        <div className="col-12"><DeliveryPinField value={addr.location} city={addr.city} onChange={onPin} /></div>
        <div className={guest ? 'col-sm-6' : 'col-12'}>
          <Input label="Phone number" required type="tel" placeholder="03001234567" autoComplete="tel" hint={guest ? 'We’ll call to confirm, and you’ll use it to track your order.' : undefined} {...field('phone')} />
        </div>
        {guest && (
          <div className="col-sm-6">
            <Input label="Email" type="email" hint="Optional, for your order confirmation." autoComplete="email" {...field('email')} />
          </div>
        )}
        <div className="col-12"><Textarea label="Delivery notes" hint="Optional" rows={2} maxLength={500} placeholder="Gate code, landmark, preferred time…" {...field('notes')} /></div>
      </div>
    </Card>
  );
}

export function PrescriptionSection({ file, onFile, error }) {
  return (
    <Card as="section" aria-labelledby="chk-rx-title" className="chk-rx">
      <h2 id="chk-rx-title" className="chk-title"><FiFileText aria-hidden="true" /> Prescription required</h2>
      <p className="chk-muted">
        One or more items need a valid prescription. Our pharmacist will verify it before your order is confirmed.
      </p>
      <FileDropzone file={file} onFile={onFile} error={error} label="Drag & drop your prescription" hint={`JPG, PNG, WebP or PDF · max ${MAX_FILE_MB} MB`} />
    </Card>
  );
}

export function PaymentSection({ value, onChange }) {
  return (
    <Card as="section" aria-labelledby="chk-pay-title">
      <h2 id="chk-pay-title" className="chk-title"><FiCreditCard aria-hidden="true" /> Payment method</h2>
      <div className="chk-pay" role="radiogroup" aria-labelledby="chk-pay-title">
        {PAYMENT_METHODS.map((m) => (
          <label key={m.id} className={`chk-pay__option${value === m.id ? ' is-selected' : ''}${m.disabled ? ' is-disabled' : ''}`}>
            <input type="radio" name="payment" value={m.id} checked={value === m.id} disabled={m.disabled} onChange={() => onChange(m.id)} />
            <span className="chk-pay__icon" aria-hidden="true">{PAY_ICON[m.id]}</span>
            <span className="chk-pay__text">
              <strong>{m.label}</strong>
              <span>{m.disabled ? 'Coming soon' : m.desc}</span>
            </span>
            {value === m.id && <FiCheckCircle className="chk-pay__check" aria-hidden="true" />}
          </label>
        ))}
      </div>
    </Card>
  );
}

export function OrderSummary({ items, count, subtotal, delivery, total, needsRx, rxFile, submitting }) {
  return (
    <Card as="aside" className="chk-summary" aria-labelledby="chk-summary-title">
      <h2 id="chk-summary-title" className="chk-title">
        <FiShoppingBag aria-hidden="true" /> Order summary <Badge>{count}</Badge>
      </h2>
      <ul className="chk-items">
        {items.map((item) => (
          <li key={item.medicineId}>
            <MedicalIcon emoji={item.image} category={item.category} alt="" size={16} />
            <div className="chk-items__info">
              <strong>{item.brand || item.name}</strong>
              <span>
                × {item.quantity}
                {item.requires_prescription && <Badge tone="warning">Rx</Badge>}
              </span>
            </div>
            <span className="chk-items__price">{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="chk-totals">
        <div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
        <div><dt>Delivery</dt><dd>{delivery === 0 ? <span className="chk-free">Free</span> : formatPrice(delivery)}</dd></div>
        {delivery > 0 && <p className="chk-hint">Add {formatPrice(FREE_THRESHOLD - subtotal)} more for free delivery.</p>}
        <div className="chk-totals__grand"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
      </dl>

      {needsRx && (
        <Alert tone={rxFile ? 'success' : 'warning'}>
          {rxFile ? <>Prescription attached: <em>{rxFile.name}</em></> : 'Please attach your prescription.'}
        </Alert>
      )}

      <Button type="submit" form="checkout-form" block size="lg" loading={submitting} leftIcon={<FiLock aria-hidden="true" />} id="place-order-btn">
        Place order · {formatPrice(total)}
      </Button>
      <p className="chk-legal">
        By placing your order you agree to our <Link to="/terms" target="_blank" rel="noopener">Terms</Link> and{' '}
        <Link to="/refund-policy" target="_blank" rel="noopener">Refund Policy</Link>.
      </p>
      <p className="chk-trust">Secure checkout · Cash on delivery · Easy returns</p>
    </Card>
  );
}
