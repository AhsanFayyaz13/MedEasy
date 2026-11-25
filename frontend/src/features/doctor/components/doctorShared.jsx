/* Shared doctor-dashboard helpers. Implementations live in shared modules. */
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';

export { fmtDate, safeFmtTime } from '../../appointments/lib/appointmentUtils';
export { sendNotification } from '../../../lib/notifications';

export const STATUS_CFG = {
  scheduled: { color: 'primary', icon: <FaClock /> },
  completed: { color: 'success', icon: <FaCheckCircle /> },
  cancelled: { color: 'danger', icon: <FaTimesCircle /> },
};
