import { Link } from 'react-router-dom';
import { BUSINESS } from '../../../lib/business';

const privacy = {
  title: 'Privacy Policy',
  description: 'How MedEasy collects, uses, shares and protects your personal and health information.',
  intro: (
    <p>
      Your health information is sensitive. This policy explains what we collect when you use {BUSINESS.brand}, why we
      collect it, who can see it, and the choices you have. We only collect what we need to deliver medicines, verify
      prescriptions and connect you with doctors.
    </p>
  ),
  sections: [
    {
      heading: 'Who we are',
      body: (
        <p>
          {BUSINESS.brand}{BUSINESS.legalName ? ` (operated by ${BUSINESS.legalName})` : ''} runs the website at{' '}
          <a href={BUSINESS.website}>{BUSINESS.website.replace('https://', '')}</a>, an online pharmacy and appointment
          platform based in {BUSINESS.address}. We are responsible for the personal information described in this policy.
        </p>
      ),
    },
    {
      heading: 'Information we collect',
      body: (
        <>
          <h3>Information you give us</h3>
          <ul>
            <li><strong>Account details:</strong> name, phone number, email address (optional), postal address and password (stored only as a secure hash).</li>
            <li><strong>Health information:</strong> prescriptions you upload, medicines you order, the reason for an appointment, and consultation notes or e-prescriptions written by your doctor.</li>
            <li><strong>Orders and delivery:</strong> items, delivery address, delivery notes, phone number, payment method and order history.</li>
            <li>
              <strong>Delivery map pin (optional):</strong> if you pin your door on the map at checkout, we store that point with your order
              so the rider can navigate to it. If you tap “Use my current location”, your browser first asks your permission; your position is
              only used to centre the map, and we keep only the pin you confirm.
            </li>
            <li><strong>Messages and feedback:</strong> chats with your doctor, contact-form messages, reviews and complaints.</li>
            <li><strong>Professional accounts:</strong> for doctors and pharmacies — PMC/PMDC or licence numbers, degrees, clinic or store address, storefront photos and availability.</li>
          </ul>
          <h3>Information collected automatically</h3>
          <ul>
            <li>Technical data needed to run the service, such as IP address, browser type and request logs (used for security and rate limiting).</li>
            <li>Information kept in your browser’s storage — see our <Link to="/cookies">Cookie Policy</Link>. We do not use advertising or analytics trackers.</li>
          </ul>
        </>
      ),
    },
    {
      heading: 'How we use your information',
      body: (
        <ul>
          <li>To create and secure your account, including one-time verification codes sent to your email address.</li>
          <li>To process, verify, dispense and deliver orders — including checking that prescription medicines are backed by a valid prescription.</li>
          <li>To book and manage doctor appointments and let you and your doctor communicate.</li>
          <li>To send service messages about your orders, appointments and account (we do not send marketing without your consent).</li>
          <li>To verify healthcare professionals before they can offer services on the platform.</li>
          <li>To prevent fraud and abuse, keep the platform secure, and meet legal and regulatory obligations.</li>
        </ul>
      ),
    },
    {
      heading: 'Who can see your information',
      body: (
        <>
          <ul>
            <li><strong>Pharmacists and pharmacies</strong> fulfilling your order see the items, your prescription and delivery details.</li>
            <li><strong>Doctors</strong> you book with see your name, contact details, appointment reason and your consultation history with them.</li>
            <li><strong>Our administrators</strong> may access records to resolve complaints, verify professionals and keep the service safe.</li>
            <li>
              <strong>Service providers</strong> that process data on our behalf: cloud hosting and database providers, Cloudinary (storage of
              uploaded images and documents) and Resend (sending verification and service emails). They may only use your data to provide
              their service to us.
            </li>
            <li>
              <strong>OpenStreetMap</strong> provides the map and area search at checkout. When you open the map, your browser loads map images
              for the area you view from OpenStreetMap, and any place you search for is sent to its search service. Like any website, they
              receive your IP address with these requests. Your name, phone number and order are not shared with them.
            </li>
            <li><strong>Authorities</strong>, when required by law, a court order, or to protect someone’s life or safety.</li>
          </ul>
          <p>We do not sell your personal or health information.</p>
        </>
      ),
    },
    {
      heading: 'How long we keep it',
      body: (
        <ul>
          <li>Unverified sign-ups are deleted automatically after 15 minutes.</li>
          <li>Messages with your doctor are kept with the appointment as part of your consultation record. In-app notifications are deleted automatically after 90 days.</li>
          <li>Account, order and prescription records are kept while your account is active and afterwards for as long as needed to meet legal, tax and pharmacy record-keeping requirements.</li>
          <li>Verification and password-reset codes expire after 15 minutes and are stored only in hashed form.</li>
        </ul>
      ),
    },
    {
      heading: 'How we protect it',
      body: (
        <p>
          Connections are encrypted (HTTPS); passwords and one-time codes are hashed; access to records is limited by role; and login,
          verification and upload endpoints are rate-limited. No system is perfectly secure — please use a strong, unique password and
          never share your verification codes.
        </p>
      ),
    },
    {
      heading: 'Your rights and choices',
      body: (
        <>
          <p>You can:</p>
          <ul>
            <li>View and update your details on your <Link to="/profile">profile page</Link>.</li>
            <li>Ask for a copy of your information, ask us to correct it, or ask us to delete your account.</li>
            <li>Withdraw consent for optional processing at any time.</li>
          </ul>
          <p>
            Email <a href={`mailto:${BUSINESS.privacyEmail}`}>{BUSINESS.privacyEmail}</a> from the address or phone linked to your account.
            Some records (for example dispensed prescription medicines) may need to be retained to comply with the law.
          </p>
        </>
      ),
    },
    {
      heading: 'Children',
      body: (
        <p>
          {BUSINESS.brand} is intended for adults. Medicines and appointments for anyone under 18 must be arranged by a parent or legal
          guardian using their own account.
        </p>
      ),
    },
    {
      heading: 'Changes to this policy',
      body: (
        <p>
          We may update this policy as the service changes. The “last updated” date above shows the latest version; significant changes
          will be announced on the website or by email.
        </p>
      ),
    },
    {
      heading: 'Contact us',
      body: (
        <p>
          Questions or complaints about privacy: <a href={`mailto:${BUSINESS.privacyEmail}`}>{BUSINESS.privacyEmail}</a> ·{' '}
          <a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a> · {BUSINESS.address}.
        </p>
      ),
    },
  ],
};

export default privacy;
