import { useState } from 'react';
import { FiCheckCircle, FiFileText } from 'react-icons/fi';
import { Button, Card, EmptyState, Select, Textarea } from '../../../components/ui';
import { fmtDate } from './doctorShared';

/**
 * Prescription pad. A prescription is always saved on an open appointment
 * (completing it), so the patient receives it and it stays in their record.
 */
export default function PrescribeTab({ apts, handleIssueIndependent, setActive }) {
  const open = apts.filter((a) => a.status === 'scheduled').sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const [aptId, setAptId] = useState('');
  const [notes, setNotes] = useState('');
  const [rx, setRx] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open.length) {
    return (
      <EmptyState
        icon={<FiFileText />}
        title="No open consultations"
        description="Prescriptions are issued from a consultation. When a patient books with you, you can prescribe here or from your schedule."
        action={setActive && <Button variant="secondary" onClick={() => setActive('schedule')}>Open schedule</Button>}
      />
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const apt = open.find((a) => a.id === aptId);
    if (!apt || !rx.trim()) return;
    setSaving(true);
    try {
      await handleIssueIndependent({ appointment: apt, notes: notes.trim(), prescription: rx.trim() });
      setAptId('');
      setNotes('');
      setRx('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="rx-pad-title" className="doc-pad">
      <h2 id="rx-pad-title" className="doc-pad__title"><FiFileText aria-hidden="true" /> Prescription pad</h2>
      <p className="doc-muted">Issuing a prescription completes the consultation and sends it to the patient.</p>
      <form onSubmit={submit}>
        <Select
          label="Consultation"
          required
          placeholder="Choose a patient’s open appointment"
          options={open.map((a) => ({ value: a.id, label: `${a.patientName} — ${fmtDate(a.date)}, ${a.time}${a.reason ? ` (${a.reason})` : ''}` }))}
          value={aptId}
          onChange={(e) => setAptId(e.target.value)}
        />
        <Textarea label="Diagnosis and advice" rows={3} maxLength={5000} placeholder="Findings, diagnosis, lifestyle advice, follow-up…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Textarea
          label="Prescription"
          required
          rows={6}
          maxLength={5000}
          className="doc-pad__rx"
          placeholder={'One medicine per line, e.g.\nAmoxicillin 500 mg — 1 capsule three times daily for 7 days\nParacetamol 500 mg — 1–2 tablets when needed, max 8 a day'}
          value={rx}
          onChange={(e) => setRx(e.target.value)}
        />
        <Button type="submit" loading={saving} disabled={!aptId || !rx.trim()} leftIcon={<FiCheckCircle aria-hidden="true" />}>
          Issue prescription
        </Button>
      </form>
    </Card>
  );
}
