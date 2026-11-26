import { Modal } from '../../../components/ui';
import ChatThread from '../../../components/chat/ChatThread';
import useMessageThread from '../../../hooks/useMessageThread';
import { fetchRxMessages, sendRxMessage } from '../../../services/api/prescriptionService';
import { rxLabel } from '../lib/offer';

/**
 * Conversation between a patient and the pharmacy about one prescription: questions about
 * availability, quantities or alternatives. Open while the prescription can still be ordered from.
 *
 * @param {object|null} rx  open when set
 * @param {'patient'|'pharmacy'} role  the current user's side
 * @param {string} [patientName]  shown to the pharmacy
 */
export default function PrescriptionChat({ rx, role, patientName, onClose }) {
  const thread = useMessageThread(rx?.id ?? null, fetchRxMessages, sendRxMessage);
  const isPharmacy = role === 'pharmacy';
  return (
    <Modal
      show={!!rx}
      onClose={onClose}
      title={isPharmacy ? `Message ${patientName || 'the patient'}` : 'Message the pharmacy'}
      description={rx ? `About prescription ${rxLabel(rx)}` : undefined}
      className="chat-modal"
    >
      <ChatThread
        thread={thread}
        role={role}
        otherName={isPharmacy ? patientName || 'Patient' : 'Pharmacy'}
        emptyText={isPharmacy
          ? 'Ask about the prescription or explain what you can supply.'
          : 'Ask the pharmacist about availability, quantities or alternatives.'}
        closedText="This prescription has expired, so the conversation is closed."
      />
    </Modal>
  );
}
