import { useState } from 'react';
import { Button, Modal, Select, Textarea } from '../../../components/ui';

const ISSUE_TYPES = [
  { value: 'no-show', label: 'No-show / doctor missed the appointment' },
  { value: 'conduct', label: 'Improper professional conduct' },
  { value: 'incorrect-advice', label: 'Inappropriate or harmful clinical advice' },
  { value: 'overcharging', label: 'Overcharging / fee issue' },
  { value: 'other', label: 'Other incident' },
];

/**
 * Patient complaint about a consultation. Calls onSubmit({ issueType, details }).
 * Remount with a `key` per appointment to reset the form.
 */
export default function ReportIssueModal({ appointment, onClose, onSubmit }) {
  const [issueType, setIssueType] = useState('no-show');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (details.trim().length < 10) {
      setError('Please describe what happened (at least 10 characters).');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ issueType, details: details.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={!!appointment}
      onClose={onClose}
      title="Report an issue"
      description={appointment ? `Your report starts an administrative review of ${appointment.doctorName}.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="report-issue-form" variant="danger" loading={saving}>
            Submit report
          </Button>
        </>
      }
    >
      <form id="report-issue-form" onSubmit={submit} noValidate>
        <Select label="Issue category" options={ISSUE_TYPES} value={issueType} onChange={(e) => setIssueType(e.target.value)} />
        <Textarea
          label="What happened?"
          required
          rows={4}
          maxLength={2000}
          placeholder="Times, details and anything that helps us investigate…"
          value={details}
          onChange={(e) => {
            setDetails(e.target.value);
            setError('');
          }}
          error={error}
        />
      </form>
    </Modal>
  );
}
