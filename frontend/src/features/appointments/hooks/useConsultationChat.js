import { fetchMessages, sendMessage } from '../../../services/api/notificationService';
import useMessageThread from '../../../hooks/useMessageThread';

/** Messages of one appointment's chat (see useMessageThread). */
export default function useConsultationChat(appointmentId) {
  return useMessageThread(appointmentId, fetchMessages, sendMessage);
}
