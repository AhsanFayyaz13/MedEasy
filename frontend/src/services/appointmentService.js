/**
 * appointmentService.js
 * All appointment + doctor API calls.
 */
import api from './api';


/* ── Doctors ─────────────────────────────────────────────────── */
export async function fetchDoctors() {
  const { data } = await api.get('/doctors/');
  const list = data.results ?? data;
  return list.map(d => ({
    ...d,
    id: d._id || d.id, // Map Mongoose _id to id key
    fee: d.consultationFee || 1000, // Map consultationFee to fee
    experience: d.experience || 5,
    slots: d.slots || ['09:00', '10:00', '11:00', '14:00', '15:00'], // Default clinical standard slots
    rating: 4.7,
    avatar: d.profileImage || '👨‍⚕️'
  }));
}

/* ── Appointments ────────────────────────────────────────────── */

/** Patient: fetch their own appointments */
export async function fetchMyAppointments() {
  const { data } = await api.get('/appointments/');
  const list = data.results ?? data;
  return list.map(a => ({
    ...a,
    id: a._id || a.id,
    patientName: a.patientId?.name || 'Patient',
    patientEmail: a.patientId?.email || '',
    patientPhone: a.patientId?.phone || '',
    patientId: a.patientId?._id || a.patientId,
    doctorName: a.doctorId?.name || 'Dr. Doctor',
    specialty: a.doctorId?.specialty || 'General Physician',
    doctorId: a.doctorId?._id || a.doctorId
  }));
}

/** Doctor: fetch appointments assigned to them */
export async function fetchDoctorAppointments(doctorId) {
  const { data } = await api.get('/appointments/', { params: { doctor: doctorId } });
  const list = data.results ?? data;
  return list.map(a => ({
    ...a,
    id: a._id || a.id,
    patientName: a.patientId?.name || 'Patient',
    patientEmail: a.patientId?.email || '',
    patientPhone: a.patientId?.phone || '',
    patientId: a.patientId?._id || a.patientId,
    doctorName: a.doctorId?.name || 'Dr. Doctor',
    specialty: a.doctorId?.specialty || 'General Physician',
    doctorId: a.doctorId?._id || a.doctorId
  }));
}

/** Book a new appointment */
export async function bookAppointment({ doctorId, date, time, reason }) {
  const { data } = await api.post('/appointments/book/', { doctor: doctorId, date, time, reason });
  return data;
}

/** Cancel an appointment */
export async function cancelAppointment(id) {
  const { data } = await api.patch(`/appointments/${id}/`, { status: 'cancelled' });
  return data;
}

/** Doctor: complete an appointment + save notes + prescription */
export async function completeAppointment(id, { notes, prescription }) {
  const { data } = await api.patch(`/appointments/${id}/`, {
    status: 'completed', notes, prescription,
  });
  return data;
}
