/**
 * mockDoctors.js – Mock doctor profiles for AppointmentBooking
 */
const MOCK_DOCTORS = [
  { id:1, name:'Dr. Sara Ali',      specialty:'Cardiologist',       fee:2000, rating:4.8, experience:12, avatar:'👩‍⚕️', slots:['09:00','10:00','11:00','14:00','15:00'] },
  { id:2, name:'Dr. Usman Tariq',   specialty:'General Physician',  fee:1000, rating:4.5, experience:8,  avatar:'👨‍⚕️', slots:['09:30','11:00','12:00','15:00','16:00'] },
  { id:3, name:'Dr. Hina Malik',    specialty:'Dermatologist',      fee:1500, rating:4.7, experience:10, avatar:'👩‍⚕️', slots:['10:00','11:00','14:00','15:00','16:30'] },
  { id:4, name:'Dr. Zubair Ahmed',  specialty:'Orthopedic',         fee:2500, rating:4.6, experience:15, avatar:'👨‍⚕️', slots:['09:00','10:30','14:00','15:30'] },
  { id:5, name:'Dr. Nadia Hussain', specialty:'Pediatrician',       fee:1200, rating:4.9, experience:9,  avatar:'👩‍⚕️', slots:['09:00','10:00','11:30','14:00','16:00'] },
  { id:6, name:'Dr. Fahad Khan',    specialty:'Neurologist',        fee:3000, rating:4.7, experience:18, avatar:'👨‍⚕️', slots:['10:00','11:00','15:00','16:00'] },
];

export default MOCK_DOCTORS;
export const SPECIALTIES = [...new Set(MOCK_DOCTORS.map(d => d.specialty))].sort();
