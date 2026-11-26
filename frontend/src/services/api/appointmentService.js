/** Appointment and doctor API calls. */
import api from './client';

/** Bookable times until doctors can set their own. */
const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00'];

/* ── Doctors ─────────────────────────────────────────────────── */
export async function fetchDoctors() {
  const { data } = await api.get('/doctors/');
  const list = data.results ?? data;
  // Only real profile data: no invented ratings or experience, and a fee of 0 means free.
  return list.map((d) => ({
    ...d,
    id: d._id || d.id,
    fee: d.consultationFee ?? 0,
    experience: d.experience ?? null,
    slots: d.slots || DEFAULT_SLOTS,
    avatar: d.profileImage || '👨‍⚕️',
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
