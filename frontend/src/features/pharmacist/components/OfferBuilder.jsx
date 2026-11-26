import { useEffect, useMemo, useState } from 'react';
import { FiExternalLink, FiPlus, FiSend, FiSlash, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { fetchAllMedicines, sendPrescriptionOffer } from '../../../services/api/pharmacistService';
import { Alert, Button, Checkbox, Input, Modal, SearchInput, Spinner, Textarea } from '../../../components/ui';
import useRxFile from '../../prescriptions/lib/useRxFile';
import { formatPrice } from '../../../lib/format';
import { OFFER_HOURS, offerTotals, rxLabel } from '../../prescriptions/lib/offer';

const blankMissing = () => ({ key: Math.random().toString(36).slice(2), name: '', note: '' });

/**
 * The pharmacist reads the prescription and says what the pharmacy can supply: catalogue
 * medicines with quantity and an optional note (e.g. 15 days' supply instead of 20), alternatives
 * for prescribed medicines it doesn't stock, and what it can't supply at all. The patient gets
 * the offer, with prices, and accepts it within 48 hours.
 */
export default function OfferBuilder({ rx, onClose, onSent }) {
  const { toast } = useToast();
  const [catalogue, setCatalogue] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState([]);
  const [missing, setMissing] = useState([]);
  const [message, setMessage] = useState('');
  const [refillable, setRefillable] = useState(false);
  const [failure, setFailure] = useState('');
  const [sending, setSending] = useState(false);

  // Start from the current offer when revising one.
  useEffect(() => {
    if (!rx) return;
    const t = setTimeout(() => {
      setLines((rx.offer?.items || []).map((l) => ({ medicineId: String(l.medicineId), name: l.name, price: l.price, quantity: l.quantity, note: l.note || '', substituteFor: l.substituteFor || '' })));
      setMissing((rx.offer?.unavailable || []).map((u) => ({ ...blankMissing(), name: u.name, note: u.note || '' })));
      setMessage(rx.offer?.message || '');
      setRefillable(Boolean(rx.refillable));
      setQuery('');
      setFailure('');
    }, 0);
    return () => clearTimeout(t);
  }, [rx]);

  useEffect(() => {
    if (!rx || catalogue) return;
    fetchAllMedicines()
      .then(setCatalogue)
      .catch((e) => setLoadError(e.response?.data?.message || 'Couldn’t load the inventory.'));
  }, [rx, catalogue]);

  const stockOf = useMemo(() => new Map((catalogue || []).map((m) => [String(m.id), m.stock])), [catalogue]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !catalogue) return [];
    const taken = new Set(lines.map((l) => l.medicineId));
    return catalogue
      .filter((m) => !taken.has(String(m.id)) && `${m.name} ${m.brand || ''} ${m.category || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, catalogue, lines]);

  const add = (m) => {
    setLines((prev) => [...prev, { medicineId: String(m.id), name: m.brand && m.brand !== m.name ? `${m.name} (${m.brand})` : m.name, price: m.price, quantity: 1, note: '', substituteFor: '' }]);
    setQuery('');
  };
  const update = (id, patch) => setLines((prev) => prev.map((l) => (l.medicineId === id ? { ...l, ...patch } : l)));
  const remove = (id) => setLines((prev) => prev.filter((l) => l.medicineId !== id));
  const updateMissing = (key, patch) => setMissing((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));

  const totals = offerTotals(lines.map((l) => ({ ...l, quantity: Number(l.quantity) || 0 })));

  const submit = async () => {
    setFailure('');
    if (!lines.length) return setFailure('Add at least one medicine you can supply. If you can’t supply anything, decline the prescription instead.');
    const bad = lines.find((l) => !(Number(l.quantity) >= 1));
    if (bad) return setFailure(`Enter a quantity for ${bad.name}.`);
    const over = lines.find((l) => stockOf.has(l.medicineId) && Number(l.quantity) > stockOf.get(l.medicineId));
    if (over) return setFailure(`Only ${stockOf.get(over.medicineId)} of ${over.name} in stock. Lower the quantity and say so in its note.`);

    setSending(true);
    try {
      const updated = await sendPrescriptionOffer(rx.id, {
        items: lines.map((l) => ({ medicineId: l.medicineId, quantity: Number(l.quantity), note: l.note.trim() || undefined, substituteFor: l.substituteFor.trim() || undefined })),
        unavailable: missing.filter((u) => u.name.trim()).map((u) => ({ name: u.name.trim(), note: u.note.trim() || undefined })),
        message: message.trim() || undefined,
        refillable,
      });
      toast.success(`Offer sent for ${rxLabel(rx)}. The patient has ${OFFER_HOURS} hours to accept it.`);
      onSent(updated);
    } catch (e) {
      setFailure(e.response?.data?.message || 'Couldn’t send the offer.');
    } finally {
      setSending(false);
    }
  };

  const file = useRxFile(rx);
  const href = file.href;
  const patient = rx?.userId && typeof rx.userId === 'object' ? rx.userId : {};

  return (
    <Modal
      show={!!rx}
      onClose={onClose}
      size="xl"
      title={rx?.offer?.sentAt ? `Revise offer · ${rxLabel(rx)}` : `Prepare offer · ${rxLabel(rx)}`}
      description={rx ? `For ${patient.name || 'the patient'}. They see the prices and accept within ${OFFER_HOURS} hours.` : undefined}
      footer={
        <>
          <span className="ph-offer__total">Total {formatPrice(totals.total)}{totals.delivery ? ` incl. ${formatPrice(totals.delivery)} delivery` : ''}</span>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button leftIcon={<FiSend aria-hidden="true" />} loading={sending} onClick={submit}>
            {rx?.offer?.sentAt ? 'Send updated offer' : 'Send offer'}
          </Button>
        </>
      }
    >
      {rx && (
        <div className="ph-offer">
          <aside className="ph-offer__rx" aria-label="The prescription">
            {rx.source === 'consultation' ? (
              <>
                <strong>Written by a MedEasy doctor</strong>
                <pre>{rx.doctorText}</pre>
              </>
            ) : href && !file.isPdf ? (
              <a href={href} target="_blank" rel="noreferrer" title="Open full size"><img src={href} alt={`Prescription ${rxLabel(rx)}`} /></a>
            ) : (
              <Button variant="secondary" href={href} target="_blank" rel="noreferrer" rightIcon={<FiExternalLink aria-hidden="true" />}>Open the PDF</Button>
            )}
            {rx.notes && <p className="ph-rx__note">Patient’s note: “{rx.notes}”</p>}
          </aside>

          <div className="ph-offer__form">
            {failure && <Alert tone="error">{failure}</Alert>}

            <section aria-labelledby="ph-offer-supply">
              <h3 id="ph-offer-supply" className="ph-offer__h">What you can supply</h3>
              {loadError && <Alert tone="error">{loadError}</Alert>}
              {!catalogue && !loadError ? (
                <Spinner label="Loading inventory" />
              ) : (
                <div className="ph-offer__search">
                  <SearchInput value={query} onChange={setQuery} label="Find a medicine in your inventory" placeholder="Search your inventory by name or brand…" />
                  {matches.length > 0 && (
                    <ul className="ph-offer__matches">
                      {matches.map((m) => (
                        <li key={m.id}>
                          <button type="button" onClick={() => add(m)} disabled={m.stock < 1}>
                            <span><strong>{m.name}</strong>{m.brand && m.brand !== m.name ? ` · ${m.brand}` : ''}</span>
                            <span>{formatPrice(m.price)} · {m.stock < 1 ? 'out of stock' : `${m.stock} in stock`}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {query.trim() && catalogue && !matches.length && <p className="ph-muted">Nothing matches. Add it below as something you can’t supply.</p>}
                </div>
              )}

              {lines.length > 0 && (
                <ul className="ph-offer__lines">
                  {lines.map((l) => (
                    <li key={l.medicineId}>
                      <div className="ph-offer__line-head">
                        <strong>{l.name}</strong>
                        <span>{formatPrice(l.price)} each{stockOf.has(l.medicineId) ? ` · ${stockOf.get(l.medicineId)} in stock` : ''}</span>
                        <Button size="sm" variant="ghost" className="ph-danger" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={() => remove(l.medicineId)} aria-label={`Remove ${l.name}`} />
                      </div>
                      <div className="ph-offer__line-fields">
                        <Input label="Quantity" type="number" min={1} max={100} inputMode="numeric" value={l.quantity} onChange={(e) => update(l.medicineId, { quantity: e.target.value })} />
                        <Input label="Note for the patient" hint="Optional" maxLength={300} placeholder="Written for 20 days, we have 15 days" value={l.note} onChange={(e) => update(l.medicineId, { note: e.target.value })} />
                        <Input label="Alternative for" hint="Only if it replaces a prescribed medicine" maxLength={120} placeholder="Prescribed medicine’s name" value={l.substituteFor} onChange={(e) => update(l.medicineId, { substituteFor: e.target.value })} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="ph-offer-missing">
              <h3 id="ph-offer-missing" className="ph-offer__h"><FiSlash aria-hidden="true" /> What you can’t supply</h3>
              {missing.map((u) => (
                <div key={u.key} className="ph-offer__missing">
                  <Input label="Medicine" maxLength={120} value={u.name} onChange={(e) => updateMissing(u.key, { name: e.target.value })} />
                  <Input label="Note" hint="Optional" maxLength={300} placeholder="Out of stock until Monday" value={u.note} onChange={(e) => updateMissing(u.key, { note: e.target.value })} />
                  <Button size="sm" variant="ghost" className="ph-danger" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={() => setMissing((prev) => prev.filter((x) => x.key !== u.key))} aria-label="Remove" />
                </div>
              ))}
              <Button size="sm" variant="secondary" leftIcon={<FiPlus aria-hidden="true" />} onClick={() => setMissing((prev) => [...prev, blankMissing()])}>
                Add a medicine you can’t supply
              </Button>
            </section>

            <Textarea label="Message to the patient" hint="Optional" rows={2} maxLength={1000} placeholder="Anything they should know before accepting." value={message} onChange={(e) => setMessage(e.target.value)} />
            <Checkbox
              label="Allows repeat orders"
              hint="Tick if the prescription permits refills. It can then be reused for 6 months."
              checked={refillable}
              onChange={(e) => setRefillable(e.target.checked)}
            />
            <p className="ph-muted">Alternatives are only included if the patient ticks them. Sending the offer approves the prescription.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
