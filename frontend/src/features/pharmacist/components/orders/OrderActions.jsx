import { useState } from 'react';
import { FiCheck, FiPackage, FiTruck, FiX } from 'react-icons/fi';
import { Button, Modal, Textarea } from '../../../../components/ui';
import { NEXT_STATUSES } from '../../../../services/api/pharmacistService';

const ACTIONS = {
  confirmed: { label: 'Confirm', icon: <FiCheck />, variant: 'success' },
  dispatched: { label: 'Dispatch', icon: <FiTruck />, variant: 'primary' },
  delivered: { label: 'Mark delivered', icon: <FiPackage />, variant: 'success' },
};

/** Next-step buttons for an order row. Cancellation goes through onCancel (reason dialog). */
export default function OrderActions({ order, busy, onAdvance, onCancel }) {
  const next = NEXT_STATUSES[order.status] || [];
  if (!next.length) return <span className="text-muted small">No actions</span>;

  return (
    <div className="ph-actions">
      {next
        .filter((s) => ACTIONS[s])
        .map((s) => (
          <Button
            key={s}
            size="sm"
            variant={ACTIONS[s].variant}
            loading={busy}
            leftIcon={ACTIONS[s].icon}
            onClick={() => onAdvance(order, s)}
          >
            {ACTIONS[s].label}
          </Button>
        ))}
      {next.includes('cancelled') && (
        <Button size="sm" variant="ghost" disabled={busy} leftIcon={<FiX />} onClick={() => onCancel(order)} aria-label={`Cancel order ${order.id}`}>
          Cancel
        </Button>
      )}
    </div>
  );
}

/** Asks for a cancellation reason (shown to the patient). Remount per order via key. */
export function CancelOrderModal({ order, onClose, onConfirm }) {
  const [reason, setReason] = useState('Some items are out of stock.');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={!!order}
      onClose={onClose}
      title="Cancel this order?"
      description="The patient will be notified with the reason below and the stock will be restored."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep order
          </Button>
          <Button type="submit" form="cancel-order-form" variant="danger" loading={saving}>
            Cancel order
          </Button>
        </>
      }
    >
      <form id="cancel-order-form" onSubmit={submit}>
        <Textarea label="Reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} required />
      </form>
    </Modal>
  );
}
