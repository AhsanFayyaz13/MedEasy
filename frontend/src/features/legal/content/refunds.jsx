import { Link } from 'react-router-dom';
import { BUSINESS } from '../../../lib/business';

const refunds = {
  title: 'Refund & Returns Policy',
  description: 'When you can return medicines ordered from MedEasy, how cancellations work and how refunds are paid.',
  intro: (
    <p>
      For your safety, medicines can’t be resold once they leave the pharmacy, so returns are limited to problems with your order. If
      something is wrong, contact us — we’ll make it right.
    </p>
  ),
  sections: [
    {
      heading: 'Cancelling an order',
      body: (
        <ul>
          <li>You can cancel free of charge from <Link to="/orders">My Orders</Link> while the order is <em>pending</em> or <em>confirmed</em>.</li>
          <li>Once an order is dispatched it can’t be cancelled, but you may refuse delivery of a cash-on-delivery order at the door.</li>
          <li>The pharmacy may cancel an order if items are out of stock or a required prescription can’t be verified. You won’t be charged.</li>
        </ul>
      ),
    },
    {
      heading: 'When we accept returns',
      body: (
        <>
          <p>Please inspect your order on delivery and contact us within <strong>48 hours</strong> if you received:</p>
          <ul>
            <li>the wrong item, strength or quantity;</li>
            <li>a damaged, leaking or tampered package;</li>
            <li>a product that is expired or expires sooner than reasonably expected.</li>
          </ul>
          <p>Keep the item in its original packaging with the invoice, and share a photo when you contact us.</p>
        </>
      ),
    },
    {
      heading: 'Items we can’t take back',
      body: (
        <ul>
          <li>Medicines that were delivered correctly and in good condition, including if you no longer need them or your prescription changed.</li>
          <li>Opened or partially used medicines, refrigerated (cold-chain) products and injectables, unless faulty.</li>
          <li>Personal-care items whose seal has been broken.</li>
        </ul>
      ),
    },
    {
      heading: 'Refunds',
      body: (
        <ul>
          <li>For approved returns we will, at your choice, replace the item or refund it.</li>
          <li>Cash-on-delivery refunds are paid by bank transfer or mobile wallet (JazzCash/EasyPaisa) to an account in your name.</li>
          <li>Refunds are processed within 7–10 working days after the return is approved. Delivery fees are refunded when the error was ours.</li>
        </ul>
      ),
    },
    {
      heading: 'Doctor consultations',
      body: (
        <p>
          Consultation fees are settled between you and the doctor. If a doctor misses a confirmed appointment, report it from your{' '}
          <Link to="/appointments/book">appointments</Link> page and our team will follow up.
        </p>
      ),
    },
    {
      heading: 'How to request a return',
      body: (
        <p>
          Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call <a href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a> with
          your order ID, what went wrong and a photo. We aim to reply within one working day.
        </p>
      ),
    },
  ],
};

export default refunds;
