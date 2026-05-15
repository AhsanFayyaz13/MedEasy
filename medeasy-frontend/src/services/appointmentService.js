/**
 * appointmentService.js
 * All appointment + doctor API calls with mock fallbacks.
 */
import api from './api';
import MOCK_DOCTORS       from '../data/mockDoctors';
import MOCK_APPOINTMENTS  from '../data/mockAppointments';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';
const delay    = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Doctors ─────────────────────────────────────────────────── */
export async function fetchDoctors() {
  if (USE_MOCK) { await delay(400); return [...MOCK_DOCTORS]; }
  const { data } = await api.get('/doctors/');
  return data.results ?? data;
}

/* ── Appointments ────────────────────────────────────────────── */

/** Patient: fetch their own appointments */
export async function fetchMyAppointments() {
  if (USE_MOCK) {
    await delay(500);
    return [...MOCK_APPOINTMENTS].sort(
      (a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)
    );
  }
  const { data } = await api.get('/appointments/');
  return data.results ?? data;
}

/** Doctor: fetch appointments assigned to them */
export async function fetchDoctorAppointments(doctorId) {
  if (USE_MOCK) {
    await delay(500);
    return MOCK_APPOINTMENTS
      .filter(a => a.doctorId === doctorId)
      .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
  }
  const { data } = await api.get('/appointments/', { params: { doctor: doctorId } });
  return data.results ?? data;
}

/** Book a new appointment */
export async function bookAppointment({ doctorId, date, time, reason }) {
  if (USE_MOCK) {
    await delay(800);
    const newAppt = {
      id:          'APT-' + Math.random().toString(36).slice(2,6).toUpperCase(),
      doctorId,
      doctorName:  MOCK_DOCTORS.find(d => d.id === doctorId)?.name ?? 'Unknown',
      specialty:   MOCK_DOCTORS.find(d => d.id === doctorId)?.specialty ?? '',
      patientId:   99, patientName: 'Ahmed Khan', patientEmail: 'patient@medeasy.pk',
      date, time, status: 'scheduled',
      reason: reason || '', notes: '', prescription: '',
    };
    MOCK_APPOINTMENTS.unshift(newAppt);
    return newAppt;
  }
  const { data } = await api.post('/appointments/book/', { doctor: doctorId, date, time, reason });
  return data;
}

/** Cancel an appointment */
export async function cancelAppointment(id) {
  if (USE_MOCK) {
    await delay(500);
    const a = MOCK_APPOINTMENTS.find(a => a.id === id);
    if (a) a.status = 'cancelled';
    return a;
  }
  const { data } = await api.patch(`/appointments/${id}/`, { status: 'cancelled' });
  return data;
}

/** Doctor: complete an appointment + save notes + prescription */
export async function completeAppointment(id, { notes, prescription }) {
  if (USE_MOCK) {
    await delay(600);
    const a = MOCK_APPOINTMENTS.find(a => a.id === id);
    if (a) { a.status = 'completed'; a.notes = notes; a.prescription = prescription; }
    return a;
  }
  const { data } = await api.patch(`/appointments/${id}/`, {
    status: 'completed', notes, prescription,
  });
  return data;
}
