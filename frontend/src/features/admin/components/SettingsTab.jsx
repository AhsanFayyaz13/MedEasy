import { FiExternalLink, FiInfo, FiSettings } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Alert } from '../../../components/ui';
import { Panel } from '../../../components/layout/DashboardLayout/widgets';
import { BUSINESS, LEGAL_LAST_UPDATED, LEGAL_LINKS } from '../../../lib/business';
import { formatDate, formatPrice } from '../../../lib/format';
import { DELIVERY_FEE, FREE_THRESHOLD, MAX_FILE_MB } from '../../cart/components/checkoutShared';

const missing = <span className="adm-missing">Not set</span>;

/**
 * Read-only view of how the platform is configured, and where each value lives.
 * (These are set in code / environment variables, not stored in the database.)
 */
export default function SettingsTab() {
  const rows = [
    {
      title: 'Orders & delivery',
      file: 'frontend/src/features/cart/components/checkoutShared.jsx and backend/controllers/orderController.js',
      items: [
        ['Delivery fee', formatPrice(DELIVERY_FEE)],
        ['Free delivery from', formatPrice(FREE_THRESHOLD)],
        ['Payment methods', 'Cash on delivery (wallets and cards not enabled yet)'],
        ['Prescription / upload size limit', `${MAX_FILE_MB} MB`],
      ],
    },
    {
      title: 'Business details (footer and legal pages)',
      file: 'frontend/src/lib/business.js',
      items: [
        ['Brand', BUSINESS.brand],
        ['Support email', BUSINESS.email],
        ['Phone', BUSINESS.phone],
        ['Address', BUSINESS.address],
        ['Legal name', BUSINESS.legalName || missing],
        ['Registration no.', BUSINESS.registrationNo || missing],
        ['DRAP / drug-sale licence', BUSINESS.drapLicence || missing],
        ['Pharmacist in charge', BUSINESS.pharmacistInCharge || missing],
      ],
    },
    {
      title: 'Accounts',
      file: 'backend/controllers/authController.js',
      items: [
        ['Sign-up verification', 'Email code (SMS not enabled)'],
        ['Login attempts', '10 per 15 minutes per IP'],
        ['Doctor and pharmacist accounts', 'Need admin verification (Verifications tab)'],
      ],
    },
  ];

  return (
    <div className="adm-section">
      <Alert tone="info" title={<><FiInfo aria-hidden="true" /> These settings are read-only here</>}>
        They’re set in the code or the server environment. Each section shows the file to change; ask your developer to update and redeploy.
      </Alert>

      {rows.map((section) => (
        <Panel key={section.title} title={section.title} icon={<FiSettings />}>
          <dl className="adm-settings">
            {section.items.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <p className="adm-settings__file">Set in <code>{section.file}</code></p>
        </Panel>
      ))}

      <Panel title="Legal pages" icon={<FiSettings />}>
        <p className="adm-muted">Last updated {formatDate(LEGAL_LAST_UPDATED, { day: 'numeric', month: 'long', year: 'numeric' })}. Have a lawyer review them before launch.</p>
        <ul className="adm-links">
          {LEGAL_LINKS.map((l) => (
            <li key={l.to}><Link to={l.to} target="_blank" rel="noopener">{l.label} <FiExternalLink aria-hidden="true" /></Link></li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
