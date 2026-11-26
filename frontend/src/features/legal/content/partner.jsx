import { Link } from 'react-router-dom';
import { BUSINESS, PARTNER_AGREEMENT } from '../../../lib/business';

const pct = `${Math.round(PARTNER_AGREEMENT.commissionRate * 100)}%`;

const partner = {
  title: 'Partner Agreement',
  description: `The terms for doctors and pharmacies working through ${BUSINESS.brand}, including the ${pct} commission.`,
  intro: (
    <p>
      This agreement applies to every doctor and pharmacy that offers services through {BUSINESS.brand} (“you”). You accept it when
      you register as a doctor or pharmacy, or when you confirm it in your dashboard. It sits alongside our{' '}
      <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>. Version {PARTNER_AGREEMENT.version}.
    </p>
  ),
  sections: [
    {
      heading: 'Approval before you start',
      body: (
        <ul>
          <li>Our team checks your details (for doctors, your PMC/PMDC registration; for pharmacies, your store and licence) before your account can take bookings or orders.</li>
          <li>A pharmacist representative you add works under your pharmacy’s agreement and is checked separately.</li>
          <li>You must keep your registration, licences and profile details valid and accurate, and tell us promptly if anything changes.</li>
        </ul>
      ),
    },
    {
      heading: `Our commission: ${pct}`,
      body: (
        <>
          <p>In return for the platform, customers and support, you pay {BUSINESS.brand} a commission of <strong>{pct}</strong>:</p>
          <ul>
            <li><strong>Pharmacies:</strong> {pct} of the medicines total of each order fulfilled through {BUSINESS.brand}. Delivery fees are not included.</li>
            <li><strong>Doctors:</strong> {pct} of the consultation fee of each consultation booked through {BUSINESS.brand}.</li>
            <li>It is calculated on the price at the moment the order is placed or the consultation is booked, and recorded on that order or booking.</li>
            <li>No commission is due on orders or consultations that are cancelled before they are fulfilled. If an order is refunded, its commission is reversed.</li>
          </ul>
        </>
      ),
    },
    {
      heading: 'Statements and payment',
      body: (
        <ul>
          <li>We send you a monthly statement listing each order or consultation and its commission.</li>
          <li>Where you collect the customer’s payment (for example cash on delivery or payment at the clinic), you pay the commission shown on the statement within 15 days.</li>
          <li>If you believe a statement is wrong, tell us within 15 days and we will review it with you.</li>
          <li>Amounts are exclusive of taxes; each party is responsible for its own taxes.</li>
        </ul>
      ),
    },
    {
      heading: 'Fair dealing',
      body: (
        <ul>
          <li>Do not move customers you met through {BUSINESS.brand} off the platform to avoid the commission.</li>
          <li>Follow the law and professional rules that apply to you, including DRAP and PMDC requirements, and dispense only against valid prescriptions where one is needed.</li>
          <li>Keep patient information confidential and use it only to provide your service.</li>
        </ul>
      ),
    },
    {
      heading: 'Suspension and ending the agreement',
      body: (
        <ul>
          <li>We may suspend an account that breaks this agreement, puts patients at risk, or leaves commission unpaid after a reminder.</li>
          <li>Either side may end the agreement with 30 days’ written notice. Commission for work already done remains payable.</li>
        </ul>
      ),
    },
    {
      heading: 'Changes',
      body: (
        <p>
          We will give you at least 30 days’ notice of any change to the commission or these terms. You will be asked to accept the new
          version in your dashboard before you can continue working through {BUSINESS.brand}.
        </p>
      ),
    },
    {
      heading: 'Questions',
      body: (
        <p>
          Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call <a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a>.
        </p>
      ),
    },
  ],
};

export default partner;
