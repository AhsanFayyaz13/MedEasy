import { Link } from 'react-router-dom';
import { BUSINESS } from '../../../lib/business';

/** Rows are only shown when the value has been filled in lib/business.js. */
const rows = () =>
  [
    ['Trading name', BUSINESS.brand],
    ['Operated by', BUSINESS.legalName],
    ['Registration no.', BUSINESS.registrationNo],
    ['Drug sale licence', BUSINESS.drapLicence],
    ['Pharmacist in charge', BUSINESS.pharmacistInCharge],
    ['Address', BUSINESS.address],
    ['Email', <a key="e" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>],
    ['Phone', <a key="p" href={`tel:${BUSINESS.phoneHref}`}>{BUSINESS.phone}</a>],
    ['Website', <a key="w" href={BUSINESS.website}>{BUSINESS.website.replace('https://', '')}</a>],
  ].filter(([, v]) => v);

const notice = {
  title: 'Legal Notice',
  description: 'Company and contact information for MedEasy.',
  sections: [
    {
      heading: 'Service provider',
      body: (
        <table>
          <tbody>
            {rows().map(([k, v]) => (
              <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      heading: 'Intellectual property',
      body: (
        <p>
          The {BUSINESS.brand} name, logo, website design and original content are owned by {BUSINESS.legalName || BUSINESS.brand}. Product
          names, brands and packaging images belong to their respective manufacturers and are shown for identification only.
        </p>
      ),
    },
    {
      heading: 'Related policies',
      body: (
        <ul>
          <li><Link to="/terms">Terms of Service</Link></li>
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/cookies">Cookie Policy</Link></li>
          <li><Link to="/refund-policy">Refund &amp; Returns Policy</Link></li>
          <li><Link to="/medical-disclaimer">Medical Disclaimer</Link></li>
        </ul>
      ),
    },
    {
      heading: 'Complaints',
      body: (
        <p>
          We take complaints seriously. Contact <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we will respond within two working
          days. Complaints about a doctor or pharmacy on the platform can also be filed from your account.
        </p>
      ),
    },
  ],
};

export default notice;
