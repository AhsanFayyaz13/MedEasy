import { useState } from 'react';
import { Card, Button, Form, Spinner } from 'react-bootstrap';
import { FaCheckCircle, FaFilePrescription } from 'react-icons/fa';


/* ═══════════════════ PRESCRIBE TAB ═════════════════════════════ */
export default function PrescribeTab({ apts, handleIssueIndependent }) {
  const [patientEmail, setPatientEmail] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Extract unique patients from appointments
  const patientsList = Array.from(new Set(apts.map(a => a.patientEmail))).map(email => {
    const apt = apts.find(a => a.patientEmail === email);
    return { email: email, name: apt.patientName };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientEmail) return;
    setSaving(true);
    const selectedPat = patientsList.find(p => p.email === patientEmail);
    await handleIssueIndependent({
      patientName: selectedPat.name,
      patientEmail: selectedPat.email,
      notes: notes,
      prescription: instructions,
    });
    setSaving(false);
    setPatientEmail('');
    setInstructions('');
    setNotes('');
  };

  return (
    <Card className="doc-card shadow-sm border-0">
      <Card.Body className="p-4">
        <h5 className="fw-bold text-dark mb-3"><FaFilePrescription className="text-primary me-2" /> Digital Prescription Pad</h5>
        <p className="text-muted small">Write prescriptions and treatment plans directly to your registered patient's medical history files.</p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="doc-label">Select Patient *</Form.Label>
            <Form.Select required value={patientEmail} onChange={e => setPatientEmail(e.target.value)} className="rounded-10">
              <option value="">-- Select Patient --</option>
              {patientsList.map(p => (
                <option key={p.email} value={p.email}>{p.name} ({p.email})</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="doc-label">Diagnosis / Treatment Notes</Form.Label>
            <Form.Control as="textarea" rows={3} placeholder="Enter diagnosis advice, physical findings, or general recommendations..." value={notes} onChange={e => setNotes(e.target.value)} className="rounded-10" />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="doc-label">Prescription Instructions *</Form.Label>
            <div className="rx-pad">
              <div className="rx-pad-header">
                <FaFilePrescription className="me-2 text-success" />
                <strong>Rx Medications List</strong>
                <span className="rx-pad-date ms-auto">Today</span>
              </div>
              <Form.Control required as="textarea" rows={5} className="rx-textarea" placeholder="e.g.&#10;Amoxicillin 500mg -- 3 times daily x 7 days&#10;Paracetamol 500mg -- as needed for pain&#10;&#10;(Write one medicine per line for clarity)" value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
          </Form.Group>

          <div className="d-flex justify-content-end">
            <Button type="submit" className="btn-doc-action py-2 px-4 rounded-10" disabled={saving || !patientEmail || !instructions.trim()}>
              {saving ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-1" /> Issue E-Prescription</>}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
