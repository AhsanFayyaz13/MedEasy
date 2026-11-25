/**
 * mockAppointments.js – Mock appointments dataset
 * Statuses: 'scheduled' | 'completed' | 'cancelled'
 */
const MOCK_APPOINTMENTS = [
  {
    id: 'APT-001', doctorId: 1, doctorName: 'Dr. Sara Ali', specialty: 'Cardiologist',
    patientId: 10, patientName: 'Ahmed Khan',   patientEmail: 'ahmed@example.com',
    date: '2026-05-16', time: '09:00', status: 'scheduled',
    reason: 'Chest pain and shortness of breath.',
    notes: '', prescription: '',
  },
  {
    id: 'APT-002', doctorId: 1, doctorName: 'Dr. Sara Ali', specialty: 'Cardiologist',
    patientId: 11, patientName: 'Fatima Siddiqui', patientEmail: 'fatima@example.com',
    date: '2026-05-16', time: '10:00', status: 'scheduled',
    reason: 'Routine cardiac check-up.',
    notes: '', prescription: '',
  },
  {
    id: 'APT-003', doctorId: 1, doctorName: 'Dr. Sara Ali', specialty: 'Cardiologist',
    patientId: 12, patientName: 'Bilal Raza',      patientEmail: 'bilal@example.com',
    date: '2026-05-14', time: '14:00', status: 'completed',
    reason: 'High blood pressure follow-up.',
    notes: 'BP stabilised at 130/85. Continue current medication.',
    prescription: 'Amlodipine 5mg – once daily\nBisoprolol 2.5mg – once daily',
  },
  {
    id: 'APT-004', doctorId: 1, doctorName: 'Dr. Sara Ali', specialty: 'Cardiologist',
    patientId: 13, patientName: 'Umar Farooq', patientEmail: 'umar@example.com',
    date: '2026-05-13', time: '11:00', status: 'cancelled',
    reason: 'Palpitations.',
    notes: '', prescription: '',
  },
  {
    id: 'APT-005', doctorId: 2, doctorName: 'Dr. Usman Tariq', specialty: 'General Physician',
    patientId: 14, patientName: 'Sara Ali',    patientEmail: 'sara@example.com',
    date: '2026-05-17', time: '09:30', status: 'scheduled',
    reason: 'Fever and body aches for 3 days.',
    notes: '', prescription: '',
  },
];

export default MOCK_APPOINTMENTS;
