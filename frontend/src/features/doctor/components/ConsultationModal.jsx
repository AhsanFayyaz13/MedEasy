import { useState } from 'react';
import { FiCheckCircle, FiEdit3, FiFileText } from 'react-icons/fi';
import { Avatar, Button, Modal, Textarea } from '../../../components/ui';
import { fmtDate } from './doctorShared';

/**
 * Doctor writes consultation notes + e-prescription and completes the case.
 * Remount with a `key` per appointment so the form starts from its saved values.
 */
export default function ConsultationModal({ appointment, onClose, onSave }) {
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [rx, setRx] = useState(appointment?.prescription || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!notes.trim()) next.notes = 'Please add consultation notes.';
    if (!rx.trim()) next.rx = 'Please write the prescription (one medicine per line).';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSave({ notes: notes.trim(), prescription: rx.trim() });
    } finally {
      setSaving(false);
    }
  };

  const editing = appointment?.status === 'completed';

  return (
    <Modal
      show={!!appointment}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit consultation notes' : 'Complete appointment'}
      description={appointment ? `#APT-${String(appointment.id).slice(-6)} · ${fmtDate(appointment.date)} at ${appointment.time}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="consultation-form" variant="success" loading={saving} leftIcon={<FiCheckCircle aria-hidden="true" />}>
            Save & complete
          </Button>
        </>
      }
    >
      {appointment && (
        <form id="consultation-form" onSubmit={submit} noValidate>
          <div className="consult-patient">
            <Avatar name={appointment.patientName || 'Patient'} size={44} />
            <div>
              <strong>{appointment.patientName}</strong>
              {appointment.reason && <p>“{appointment.reason}”</p>}
            </div>
          </div>

          <Textarea
            label={<><FiEdit3 aria-hidden="true" /> Consultation notes</>}
            required
            rows={4}
            placeholder="Diagnosis, examination findings and treatment plan…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            error={errors.notes}
          />
          <Textarea
            label={<><FiFileText aria-hidden="true" /> E-prescription</>}
            required
            rows={5}
            className="rx-pad-field"
            placeholder={'e.g.\nAmoxicillin 500mg — 3x/day for 7 days\nParacetamol 500mg — as needed for pain'}
            hint="One medicine per line."
            value={rx}
            onChange={(e) => setRx(e.target.value)}
            error={errors.rx}
          />
        </form>
      )}
    </Modal>
  );
}

/** Read-only view of an issued prescription. */
export function PrescriptionViewModal({ appointment, onClose }) {
  return (
    <Modal
      show={!!appointment}
      onClose={onClose}
      title={`Prescription — ${appointment?.patientName || ''}`}
      description={appointment ? fmtDate(appointment.date) : undefined}
    >
      {appointment && (
        <>
          <pre className="rx-view">{appointment.prescription}</pre>
          {appointment.notes && (
            <div className="rx-view-notes">
              <strong>Diagnosis & treatment notes</strong>
              <p>{appointment.notes}</p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
