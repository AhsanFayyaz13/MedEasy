import { useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '../../ui';
import { useToast } from '../../../context/ToastContext';
import { feedbackError, submitFeedback } from '../../../services/api/feedbackService';

const TYPES = [
  { value: 'suggestion', label: 'Platform suggestion / idea' },
  { value: 'bug', label: 'Report a bug / issue' },
  { value: 'compliment', label: 'Praise / compliment' },
  { value: 'other', label: 'Other' },
];

const RATINGS = [
  { value: '5', label: '5 stars — Excellent' },
  { value: '4', label: '4 stars — Very good' },
  { value: '3', label: '3 stars — Good' },
  { value: '2', label: '2 stars — Fair' },
  { value: '1', label: '1 star — Poor' },
];

const EMPTY = { type: 'suggestion', rating: '5', subject: '', message: '' };

/** Feedback form: sent to the MedEasy team and shown to admins in the Audits tab. */
export default function FeedbackModal({ show, onClose }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.subject.trim()) next.subject = 'Please add a short subject.';
    if (form.message.trim().length < 10) next.message = 'Please describe your feedback (at least 10 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await submitFeedback({
        kind: 'site',
        category: form.type,
        subject: form.subject.trim(),
        text: form.message.trim(),
        rating: Number(form.rating),
      });
      toast.success('Thank you! Your feedback has been sent to our team.');
      setForm(EMPTY);
      onClose();
    } catch (err) {
      toast.error(feedbackError(err, 'Your feedback wasn’t sent. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Suggestions & feedback"
      description="Help us improve MedEasy — every message is read by our team."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="feedback-form" loading={saving}>
            Submit feedback
          </Button>
        </>
      }
    >
      <form id="feedback-form" onSubmit={submit} noValidate>
        <div className="row g-3">
          <div className="col-sm-7">
            <Select label="Feedback type" options={TYPES} value={form.type} onChange={set('type')} />
          </div>
          <div className="col-sm-5">
            <Select label="Rating" options={RATINGS} value={form.rating} onChange={set('rating')} />
          </div>
        </div>
        <Input
          label="Subject"
          required
          placeholder="e.g. Add online payment support"
          value={form.subject}
          onChange={set('subject')}
          error={errors.subject}
          maxLength={120}
        />
        <Textarea
          label="Details"
          required
          placeholder="Describe your idea or the issue you ran into…"
          value={form.message}
          onChange={set('message')}
          error={errors.message}
          maxLength={2000}
        />
      </form>
    </Modal>
  );
}
