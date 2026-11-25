import { useLocation } from 'react-router-dom';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import { Button, Modal } from '../../../components/ui';
import './LoginRequiredModal.css';

/**
 * Shown when a guest tries something that needs an account (prescription medicines,
 * checkout with a prescription, reviews). Sign-in returns them to the page they were on.
 */
export default function LoginRequiredModal({ show, onHide }) {
  const location = useLocation();
  const from = { from: location };

  return (
    <Modal
      show={show}
      onClose={onHide}
      title="Sign in to continue"
      description="Prescription medicines, doctor bookings and reviews are linked to your account, so you’ll need to sign in. Over-the-counter medicines can be bought without one."
    >
      <div className="login-req">
        <div className="login-req__option">
          <FiLogIn aria-hidden="true" />
          <h3>Already have an account?</h3>
          <p>Sign in with your phone number or email.</p>
          <Button to="/login" state={from} block onClick={onHide}>Sign in</Button>
        </div>
        <div className="login-req__option">
          <FiUserPlus aria-hidden="true" />
          <h3>New to MedEasy?</h3>
          <p>Create a free account in about a minute.</p>
          <Button to="/register" variant="secondary" block onClick={onHide}>Create account</Button>
        </div>
      </div>
    </Modal>
  );
}
