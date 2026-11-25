import { useState } from 'react';
import { Button, Modal, Select, Textarea } from '../../../components/ui';
import { RATING_OPTIONS, REPORT_TYPES, shortOrderId } from '../lib/orderFeedback';

/**
 * Small form-in-a-modal used by the three patient order dialogs.
 * Remount per order (key={order.id}) so each dialog starts with fresh fields.
 */
function FormDialog({ order, onClose, title, description, formId, submitLabel, submitVariant = 'primary', cancelLabel = 'Cancel', onSubmit, children }) {
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={!!order}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button type="submit" form={formId} variant={submitVariant} loading={saving}>{submitLabel}</Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>{children}</form>
    </Modal>
  );
}

export function CancelOrderDialog({ order, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <FormDialog
      order={order}
      onClose={onClose}
      title={`Cancel order #${shortOrderId(order?.id)}?`}
      description="The pharmacy will be told straight away and nothing will be charged."
      formId="patient-cancel-form"
      submitLabel="Cancel order"
      submitVariant="danger"
      cancelLabel="Keep order"
      onSubmit={() => onConfirm(reason.trim())}
    >
      <Textarea
        label="Reason (optional)"
        rows={3}
        maxLength={500}
        placeholder="e.g. Ordered by mistake, found it elsewhere…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </FormDialog>
  );
}

export function RateOrderDialog({ order, onClose, onSubmit }) {
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  return (
    <FormDialog
      order={order}
      onClose={onClose}
      title="Rate this order"
      description="Tell us about the packaging, the pharmacist and the delivery. Reviews help us reward good pharmacy partners."
      formId="rate-order-form"
      submitLabel="Submit review"
      onSubmit={() => onSubmit({ rating, comment: comment.trim() })}
    >
      <Select label="Rating" options={RATING_OPTIONS} value={rating} onChange={(e) => setRating(e.target.value)} />
      <Textarea
        label="Your review"
        required
        rows={4}
        maxLength={1000}
        placeholder="How was your experience?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
    </FormDialog>
  );
}

export function ReportOrderDialog({ order, onClose, onSubmit }) {
  const [issueType, setIssueType] = useState('delay');
  const [details, setDetails] = useState('');
  return (
    <FormDialog
      order={order}
      onClose={onClose}
      title="Report a problem"
      description="Our support team reviews every report with the pharmacy and courier."
      formId="report-order-form"
      submitLabel="Send report"
      onSubmit={() => onSubmit({ issueType, details: details.trim() })}
    >
      <Select label="What went wrong?" options={REPORT_TYPES} value={issueType} onChange={(e) => setIssueType(e.target.value)} />
      <Textarea
        label="Details"
        required
        rows={4}
        maxLength={1000}
        placeholder="Which medicines, what happened, and any amounts involved."
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
    </FormDialog>
  );
}
