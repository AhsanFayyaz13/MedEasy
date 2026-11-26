import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { acceptOffer } from '../../../services/api/prescriptionService';
import { Alert, Button, Input, Modal, Select, Textarea } from '../../../components/ui';
import { formatPhone, formatPrice } from '../../../lib/format';
import { CITIES, validateAddress } from '../../cart/components/checkoutShared';

/** Where the accepted offer goes: delivery details, then a confirmed cash-on-delivery order. */
export default function AcceptOfferModal({ show, rx, lines, totals, onClose, onAccepted }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [addr, setAddr] = useState(() => ({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    address: user?.address || '',
    city: '',
    phone: formatPhone(user?.phone).replace(' ', ''),
    notes: '',
  }));
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const field = (name) => ({
    name,
    value: addr[name],
    error: errors[name],
    onChange: (e) => {
      setAddr((a) => ({ ...a, [name]: e.target.value }));
      setErrors((x) => ({ ...x, [name]: undefined }));
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    const err = validateAddress(addr);
    setErrors(err);
    if (Object.keys(err).length) return;
    setSubmitting(true);
    setFailure('');
    try {
      const { order } = await acceptOffer(rx.id, {
        version: rx.offer.version,
        items: lines.map((l) => String(l.medicineId)),
        shippingAddress: {
          firstName: addr.firstName.trim(),
          lastName: addr.lastName.trim(),
          address: addr.address.trim(),
          city: addr.city,
          phone: addr.phone.trim(),
          notes: addr.notes.trim() || undefined,
        },
      });
      toast.success(`Order ${order.orderNumber} is confirmed. The pharmacy is preparing it.`);
      onAccepted(order);
      navigate(`/orders/${order.id}`);
    } catch (e2) {
      setFailure(e2.response?.data?.message || 'Couldn’t place the order. Please try again.');
      if (['OFFER_CHANGED', 'OFFER_CLOSED', 'OFFER_EXPIRED'].includes(e2.response?.data?.error?.code)) onAccepted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Accept & order"
      description={`${lines.length} medicine${lines.length > 1 ? 's' : ''} · ${formatPrice(totals.total)}, cash on delivery`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button type="submit" form="accept-offer-form" loading={submitting}>Place order · {formatPrice(totals.total)}</Button>
        </>
      }
    >
      <form id="accept-offer-form" onSubmit={submit} noValidate className="row g-3">
        {failure && <div className="col-12"><Alert tone="error">{failure}</Alert></div>}
        <div className="col-sm-6"><Input label="First name" required autoComplete="given-name" {...field('firstName')} /></div>
        <div className="col-sm-6"><Input label="Last name" required autoComplete="family-name" {...field('lastName')} /></div>
        <div className="col-12"><Input label="Street address" required autoComplete="street-address" placeholder="House #42, Block B, DHA Phase 5" {...field('address')} /></div>
        <div className="col-sm-6"><Select label="City" required placeholder="Select a city" options={CITIES} {...field('city')} /></div>
        <div className="col-sm-6"><Input label="Phone number" required type="tel" autoComplete="tel" placeholder="03001234567" {...field('phone')} /></div>
        <div className="col-12"><Textarea label="Delivery notes" hint="Optional" rows={2} maxLength={500} {...field('notes')} /></div>
        <p className="col-12 rx-offer__fine">
          The pharmacist has already checked this prescription, so the order is confirmed straight away. You pay the rider when it arrives.
        </p>
      </form>
    </Modal>
  );
}
