import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiMessageCircle, FiPackage, FiSlash, FiX } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { declineOffer } from '../../../services/api/prescriptionService';
import { Badge, Button } from '../../../components/ui';
import { formatPrice } from '../../../lib/format';
import { lineTotal, offerTotals, timeLeft } from '../lib/offer';
import AcceptOfferModal from './AcceptOfferModal';
import './OfferCard.css';

const STATE = {
  open: { tone: 'primary', label: 'Waiting for your reply' },
  accepted: { tone: 'success', label: 'Accepted' },
  declined: { tone: 'neutral', label: 'You said no thanks' },
  expired: { tone: 'warning', label: 'Expired' },
  closed: { tone: 'neutral', label: 'Closed' },
};

/**
 * The pharmacy's offer on one of the patient's prescriptions: what it can supply (with its notes,
 * e.g. a smaller quantity), what it can't, and the total. Alternatives to a prescribed medicine are
 * only included if the patient ticks them.
 */
export default function OfferCard({ rx, onChanged, onMessage }) {
  const { toast } = useToast();
  const offer = rx.offer;
  const state = rx.offerState || 'open';
  const open = state === 'open';
  const accepted = state === 'accepted';
  // Open: everything but alternatives starts ticked. Accepted: what was ordered.
  const [chosen, setChosen] = useState(() => new Set(
    (accepted && offer.chosen?.length ? offer.chosen : offer.items.filter((l) => !l.substituteFor).map((l) => l.medicineId)).map(String)
  ));
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const lines = offer.items.filter((l) => chosen.has(String(l.medicineId)));
  const totals = offerTotals(lines);
  const left = open ? timeLeft(offer.expiresAt) : null;
  const cfg = STATE[state] || STATE.closed;

  const toggle = (id) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const noThanks = async () => {
    setDeclining(true);
    try {
      onChanged(await declineOffer(rx.id));
      toast.success('Told the pharmacy. You can still message them.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Couldn’t send your answer.');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <section className="rx-offer" aria-label="The pharmacy’s offer">
      <header className="rx-offer__head">
        <h4><FiPackage aria-hidden="true" /> The pharmacy’s offer</h4>
        <span className="rx-offer__state">
          {left && <span>{left} to reply</span>}
          <Badge tone={cfg.tone}>{cfg.label}</Badge>
        </span>
      </header>

      {offer.message && <p className="rx-offer__message">“{offer.message}”</p>}

      <ul className="rx-offer__lines">
        {offer.items.map((l) => {
          const id = String(l.medicineId);
          const on = chosen.has(id);
          return (
            <li key={id} className={`rx-offer__line${!on && (open || accepted) ? ' is-off' : ''}`}>
              {open ? (
                <input type="checkbox" id={`offer-${rx.id}-${id}`} checked={on} onChange={() => toggle(id)} />
              ) : accepted && on ? (
                <FiCheck aria-hidden="true" className="rx-offer__tick" />
              ) : (
                <span className="rx-offer__tick" aria-hidden="true" />
              )}
              <label htmlFor={`offer-${rx.id}-${id}`} className="rx-offer__what">
                <strong>{l.name}</strong>
                <span>{l.quantity} × {formatPrice(l.price)}{accepted && !on ? ' · not ordered' : ''}</span>
                {l.substituteFor && (
                  <span className="rx-offer__alt">
                    Alternative for <b>{l.substituteFor}</b>{open && !on ? ' · tick to include it' : ''}
                  </span>
                )}
                {l.note && <span className="rx-offer__note">{l.note}</span>}
              </label>
              <span className="rx-offer__price">{formatPrice(lineTotal(l))}</span>
            </li>
          );
        })}
        {offer.unavailable?.map((u) => (
          <li key={`na-${u.name}`} className="rx-offer__line is-na">
            <FiSlash aria-hidden="true" className="rx-offer__tick" />
            <div className="rx-offer__what">
              <strong>{u.name}</strong>
              <span>Not available{u.note ? ` · ${u.note}` : ''}</span>
            </div>
          </li>
        ))}
      </ul>

      {open && (
        <dl className="rx-offer__totals">
          <div><dt>Medicines</dt><dd>{formatPrice(totals.subtotal)}</dd></div>
          <div><dt>Delivery</dt><dd>{totals.delivery ? formatPrice(totals.delivery) : 'Free'}</dd></div>
          <div className="is-total"><dt>Total, cash on delivery</dt><dd>{formatPrice(totals.total)}</dd></div>
        </dl>
      )}

      {state === 'accepted' && offer.orderId && (
        <p className="rx-offer__done">
          Ordered: <Link to={`/orders/${offer.orderId}`}>track your order</Link>.
        </p>
      )}
      {state === 'expired' && <p className="rx-offer__done">This offer has expired. Message the pharmacy to ask for an updated one.</p>}

      <div className="rx-offer__actions">
        {open && (
          <Button size="sm" leftIcon={<FiCheck aria-hidden="true" />} disabled={!lines.length} onClick={() => setAccepting(true)}>
            Accept & order
          </Button>
        )}
        {onMessage && (
          <Button size="sm" variant="secondary" leftIcon={<FiMessageCircle aria-hidden="true" />} onClick={onMessage}>
            Message the pharmacy
          </Button>
        )}
        {open && (
          <Button size="sm" variant="ghost" leftIcon={<FiX aria-hidden="true" />} loading={declining} onClick={noThanks}>
            No thanks
          </Button>
        )}
      </div>

      <AcceptOfferModal
        show={accepting}
        rx={rx}
        lines={lines}
        totals={totals}
        onClose={() => setAccepting(false)}
        onAccepted={() => {
          setAccepting(false);
          onChanged();
        }}
      />
    </section>
  );
}
