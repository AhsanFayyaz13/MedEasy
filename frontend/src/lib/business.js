/**
 * Public business details used by the footer and legal pages.
 * Fields left empty ('') are hidden on the site — fill them in before launch.
 */
export const BUSINESS = {
  brand: 'MedEasy',
  website: 'https://medeasy.systems',
  email: 'support@medeasy.systems',
  privacyEmail: 'support@medeasy.systems',
  phone: '+92 301 9476165',
  phoneHref: '+923019476165',
  address: 'Sector H-10, Islamabad Capital Territory, Pakistan',
  city: 'Islamabad',

  // ── To be completed by the owner (shown only when filled) ─────────────
  legalName: '', // registered company / sole-proprietor name
  registrationNo: '', // SECP / NTN registration number
  drapLicence: '', // DRAP / provincial drug-sale licence number of the dispensing pharmacy
  pharmacistInCharge: '', // name + registration of the responsible pharmacist
};

/**
 * Partner Agreement for doctors and pharmacies. Keep in sync with backend/config/partner.js;
 * bumping the version asks every partner to accept it again in their dashboard.
 */
export const PARTNER_AGREEMENT = { version: '2026-11-26', commissionRate: 0.1 };

/** Date the legal documents were last revised (update when you change them). */
export const LEGAL_LAST_UPDATED = '2026-11-26';

export const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/cookies', label: 'Cookie Policy' },
  { to: '/refund-policy', label: 'Refund & Returns' },
  { to: '/medical-disclaimer', label: 'Medical Disclaimer' },
  { to: '/legal', label: 'Legal Notice' },
  { to: '/partner-agreement', label: 'Partner Agreement' },
];
