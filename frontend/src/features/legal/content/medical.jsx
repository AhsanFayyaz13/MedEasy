import { BUSINESS } from '../../../lib/business';

const medical = {
  title: 'Medical Disclaimer',
  description: 'MedEasy information is not a substitute for professional medical advice, diagnosis or treatment.',
  intro: (
    <div className="legal__callout" role="note">
      <strong>In an emergency, do not use {BUSINESS.brand}.</strong> Call <a href="tel:1122">1122</a> (Rescue) or go to the nearest hospital
      emergency department immediately.
    </div>
  ),
  sections: [
    {
      heading: 'Not a substitute for professional advice',
      body: (
        <p>
          Product descriptions, dosage notes and other information on {BUSINESS.brand} are general information only. They do not replace
          advice from a doctor or pharmacist who knows your medical history. Always read the leaflet supplied with your medicine.
        </p>
      ),
    },
    {
      heading: 'Online consultations',
      body: (
        <p>
          Doctors on the platform are independent, registered practitioners responsible for their own advice. An online consultation can’t
          include a physical examination and may not be appropriate for every condition; your doctor may ask you to visit in person.
        </p>
      ),
    },
    {
      heading: 'Medicines and prescriptions',
      body: (
        <ul>
          <li>Never start, stop or change a prescribed medicine without speaking to your doctor.</li>
          <li>Tell your doctor or our pharmacist about allergies, pregnancy, breastfeeding, other medicines and existing conditions.</li>
          <li>Prescription-only medicines are dispensed only after a licensed pharmacist verifies a valid prescription.</li>
          <li>If you experience a side effect, stop and seek medical advice. Serious reactions need urgent care.</li>
        </ul>
      ),
    },
    {
      heading: 'Accuracy of information',
      body: (
        <p>
          We work to keep product information accurate and up to date, but manufacturers may change formulations or packaging. If anything
          looks different from what you expected, ask our pharmacist before using it: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
        </p>
      ),
    },
  ],
};

export default medical;
