import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import { Button, Modal } from '../../../components/ui';
import './LoginRequiredModal.css';

/**
 * Shown when a guest tries to do something that needs an account
 * (add to cart, upload a prescription, book a doctor).
 */
export default function LoginRequiredModal({ show, onHide }) {
  return (
    <Modal show={show} onClose={onHide} title="Sign in to continue" description="You need a MedEasy account to order medicines, upload prescriptions and book doctors.">
      <div className="login-req">
        <div className="login-req__option">
          <FiLogIn aria-hidden="true" />
          <h3>Already have an account?</h3>
          <p>Sign in with your phone number or email.</p>
          <Button to="/login" block onClick={onHide}>Sign in</Button>
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
