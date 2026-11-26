import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { Alert, Button, Checkbox, Modal } from '../../../components/ui';
import { BUSINESS, PARTNER_AGREEMENT } from '../../../lib/business';
import './PartnerAgreementGate.css';

const COMMISSION = `${Math.round(PARTNER_AGREEMENT.commissionRate * 100)}%`;

/**
 * Doctors and pharmacy owners must have accepted the current Partner Agreement to use their dashboard.
 * Partners who joined before it existed (or before a new version) see this once; it can't be dismissed.
 * Pharmacist representatives work under their pharmacy's agreement, so they never see it.
 */
export default function PartnerAgreementGate() {
  const { user, userRole, acceptPartnerAgreement, logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isPartner = userRole === 'doctor' || userRole === 'pharmacy';
  const accepted = user?.partnerAgreement?.version === PARTNER_AGREEMENT.version;
  if (!isPartner || accepted) return null;

  const accept = async () => {
    setSaving(true);
    setError('');
    try {
      await acceptPartnerAgreement(PARTNER_AGREEMENT.version);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updated = Boolean(user?.partnerAgreement?.version);

  return (
    <Modal
      show
      backdrop="static"
      keyboard={false}
      title={updated ? 'Our Partner Agreement has changed' : 'Please review our Partner Agreement'}
      description={`To keep working through ${BUSINESS.brand}, please read and accept the agreement.`}
      footer={
        <>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
          <Button onClick={accept} disabled={!checked} loading={saving}>Accept and continue</Button>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}
      <ul className="partner-gate__points">
        <li>
          <strong>{COMMISSION} commission</strong> on{' '}
          {userRole === 'pharmacy' ? 'the medicines total of each order you fulfil (delivery fees excluded)' : 'the fee of each consultation booked through us'}.
        </li>
        <li>No commission on cancelled orders or consultations; refunded orders are reversed.</li>
        <li>A monthly statement of every order or booking; payment within 15 days.</li>
        <li>At least 30 days’ notice before any change to these terms.</li>
      </ul>
      <p className="partner-gate__link">
        <FiFileText aria-hidden="true" />{' '}
        <Link to="/partner-agreement" target="_blank" rel="noopener">Read the full Partner Agreement</Link> (opens in a new tab)
      </p>
      <Checkbox
        name="acceptPartnerAgreement"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        label={`I have read and agree to the Partner Agreement, including the ${COMMISSION} commission.`}
      />
    </Modal>
  );
}
