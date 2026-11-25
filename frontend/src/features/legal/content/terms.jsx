import { Link } from 'react-router-dom';
import { BUSINESS } from '../../../lib/business';

const terms = {
  title: 'Terms of Service',
  description: 'The rules for using MedEasy to order medicines, upload prescriptions and book doctors.',
  intro: (
    <p>
      These terms form an agreement between you and {BUSINESS.brand}. By creating an account or placing an order you accept them. Please
      also read our <Link to="/privacy">Privacy Policy</Link>, <Link to="/refund-policy">Refund &amp; Returns Policy</Link> and{' '}
      <Link to="/medical-disclaimer">Medical Disclaimer</Link>.
    </p>
  ),
  sections: [
    {
      heading: 'Eligibility and accounts',
      body: (
        <ul>
          <li>You must be at least 18 years old and able to enter into a binding agreement.</li>
          <li>Give accurate information and keep it up to date. One account per person; don’t share your login or verification codes.</li>
          <li>You are responsible for activity on your account. Tell us immediately if you suspect unauthorised use.</li>
          <li>Doctor and pharmacy accounts are subject to credential verification and may be suspended if information is false or lapses.</li>
        </ul>
      ),
    },
    {
      heading: 'Ordering medicines',
      body: (
        <ul>
          <li>Prices are shown in Pakistani Rupees and confirmed at checkout. If an obvious pricing error occurs, we may cancel the order and tell you.</li>
          <li>An order is accepted only when the pharmacy confirms it. Stock is limited and items may become unavailable.</li>
          <li>Delivery times are estimates and can vary by city, stock and verification time.</li>
          <li>Payment is currently cash on delivery; other methods will be offered as they become available.</li>
        </ul>
      ),
    },
    {
      heading: 'Prescription medicines',
      body: (
        <ul>
          <li>Medicines marked “Rx” are dispensed only against a valid prescription from a registered medical practitioner.</li>
          <li>Uploaded prescriptions are checked by a licensed pharmacist. We may refuse or cancel an order if a prescription is unclear, invalid, expired or altered, or if dispensing would be unsafe.</li>
          <li>Uploading a forged or altered prescription is prohibited and may be reported to the authorities.</li>
        </ul>
      ),
    },
    {
      heading: 'Doctor consultations',
      body: (
        <ul>
          <li>Doctors on {BUSINESS.brand} are independent registered practitioners. Medical advice and prescriptions are their professional responsibility.</li>
          <li>Online consultations have limits and are not suitable for emergencies — see the <Link to="/medical-disclaimer">Medical Disclaimer</Link>.</li>
          <li>Please cancel appointments you can’t attend as early as possible.</li>
        </ul>
      ),
    },
    {
      heading: 'Acceptable use',
      body: (
        <p>
          Don’t misuse the service: no fraudulent orders, reselling of prescription medicines, harassment of doctors or staff, attempts to
          access other people’s data, automated scraping, or interference with the platform’s security. We may suspend or close accounts
          that break these terms.
        </p>
      ),
    },
    {
      heading: 'Reviews and content you post',
      body: (
        <p>
          Reviews and messages must be honest and lawful and must not include other people’s personal health information. You keep ownership
          of your content but allow us to display it on the service. We may remove content that breaks these terms.
        </p>
      ),
    },
    {
      heading: 'Liability',
      body: (
        <p>
          We take care to provide an accurate and reliable service, but to the extent permitted by law we are not liable for indirect or
          consequential losses, or for delays caused by events outside our reasonable control. Nothing in these terms limits liability that
          cannot be limited under the law of Pakistan.
        </p>
      ),
    },
    {
      heading: 'Changes and termination',
      body: (
        <p>
          We may update these terms; the version on this page applies to new orders. You may close your account at any time by contacting
          us. We may suspend access where needed to protect patients, the platform or to comply with the law.
        </p>
      ),
    },
    {
      heading: 'Governing law',
      body: (
        <p>
          These terms are governed by the laws of Pakistan. Disputes will first be handled through our support team; if unresolved, the
          courts at {BUSINESS.city} will have jurisdiction.
        </p>
      ),
    },
    {
      heading: 'Contact',
      body: (
        <p>
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · <a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a> · {BUSINESS.address}
        </p>
      ),
    },
  ],
};

export default terms;
