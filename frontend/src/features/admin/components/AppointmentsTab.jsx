import { useState } from 'react';
import { Card, Table, Badge, Button, Form, Modal } from 'react-bootstrap';
import { FaClock, FaCalendarCheck } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';
import { STATUS_COLOR, fmtDate } from './adminShared';


/* ═══════════════ TAB 3 – APPOINTMENT OVERSIGHT ═══════════════ */
export default function AppointmentsTab({ apts, setApts }) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00 AM');

  const handleCancelOverride = (id) => {
    if (!window.confirm('Force cancel this appointment? This sends a notification to the patient and doctor.')) return;
    setApts(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    toast.success('Appointment cancelled by Administrator Override');
  };

  const openRescheduleModal = (apt) => {
    setSelectedApt(apt);
    setNewDate(apt.date);
    setNewTime(apt.time);
    setShowModal(true);
  };

  const handleRescheduleSave = (e) => {
    e.preventDefault();
    if (!selectedApt) return;
    setApts(prev => prev.map(a => a.id === selectedApt.id ? { ...a, date: newDate, time: newTime } : a));
    toast.success(`Appointment #APT-${selectedApt.id} rescheduled to ${newDate} at ${newTime}`);
    setShowModal(false);
    setSelectedApt(null);
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaCalendarCheck className="me-2 text-primary" /> Hospital-wide Appointment Oversight</h5>
      </div>

      <Card className="adm-table-card border-0 shadow-sm">
        <div className="adm-table-wrap">
          <Table hover className="adm-table">
            <thead>
              <tr><th>#ID</th><th>Patient</th><th>Assigned Doctor</th><th>Date & Time</th><th>Reason</th><th>Status</th><th>Oversight Actions</th></tr>
            </thead>
            <tbody>
              {apts.length === 0 && <tr><td colSpan={7} className="text-center py-4">No active appointments found.</td></tr>}
              {apts.map(a => (
                <tr key={a.id}>
                  <td className="text-muted small">#APT-{a.id}</td>
                  <td className="fw-bold">{a.patientName}</td>
                  <td>{a.doctorName}</td>
                  <td>{fmtDate(a.date)} at <Badge bg="light" text="dark">{a.time}</Badge></td>
                  <td className="text-muted small">{a.reason || 'General Follow-up'}</td>
                  <td>
                    <Badge bg={STATUS_COLOR[a.status] || 'secondary'} text={a.status === 'scheduled' ? 'dark' : undefined}>
                      {a.status}
                    </Badge>
                  </td>
                  <td>
                    {a.status === 'scheduled' ? (
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" onClick={() => openRescheduleModal(a)}>Reschedule</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleCancelOverride(a.id)}>Force Cancel</Button>
                      </div>
                    ) : (
                      <span className="text-muted extra-small">No action available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Reschedule Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title className="fw-bold"><FaClock className="me-2 text-primary" /> Reschedule Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleRescheduleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Patient: <strong>{selectedApt?.patientName}</strong></Form.Label>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Consultation Date</Form.Label>
              <Form.Control type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Consultation Time Slot</Form.Label>
              <Form.Select value={newTime} onChange={e => setNewTime(e.target.value)}>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:30 PM">03:30 PM</option>
              </Form.Select>
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="btn-adm-save">Update Appointment</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}
