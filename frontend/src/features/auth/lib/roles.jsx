import { FaHospital, FaPills, FaStethoscope } from 'react-icons/fa';

/** Account types offered at self-registration (admins/pharmacists are created by admins). */
export const ROLES = [
  {
    value: 'patient',
    icon: <FaPills />,
    tone: 'primary',
    title: 'I’m a patient',
    desc: 'Order medicines, upload prescriptions, book doctors and track your orders.',
  },
  {
    value: 'doctor',
    icon: <FaStethoscope />,
    tone: 'accent',
    title: 'I’m a doctor',
    desc: 'Offer consultations, manage appointments and issue e-prescriptions. Requires admin verification.',
  },
  {
    value: 'pharmacy',
    icon: <FaHospital />,
    tone: 'rose',
    title: 'I run a pharmacy',
    desc: 'List your store, manage inventory and fulfil patient orders.',
  },
];
