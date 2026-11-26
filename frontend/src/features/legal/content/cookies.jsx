import { BUSINESS } from '../../../lib/business';

/* Keep this table in sync with the keys the app actually reads/writes. */
const STORAGE = [
  ['medeasy_access_token, medeasy_user', 'Session storage', 'Keeps you signed in on this browser tab.', 'Until you close the tab or log out'],
  ['medeasy_cart_v2', 'Local storage', 'Remembers the items in your cart.', 'Until checkout, logout or you clear it'],
  ['medeasy_theme', 'Local storage', 'Remembers light or dark mode.', 'Until you change it'],
  ['medeasy_feedbacks, medeasy_*_reports, medeasy_pharmacy_reviews', 'Local storage', 'Feedback and complaints you submit on this device.', 'Until cleared'],
];

const cookies = {
  title: 'Cookie Policy',
  description: 'MedEasy does not use advertising or analytics cookies. Here is exactly what we store in your browser and why.',
  intro: (
    <p>
      <strong>Short version:</strong> {BUSINESS.brand} does not set advertising, analytics or third-party tracking cookies. We only use
      your browser’s storage for things the site needs to work, so no cookie consent banner is required.
    </p>
  ),
  sections: [
    {
      heading: 'What we store and why',
      body: (
        <>
          <p>Instead of cookies, we use your browser’s session and local storage for these strictly necessary purposes:</p>
          <div className="table-responsive">
            <table>
              <thead>
                <tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Purpose</th><th scope="col">Duration</th></tr>
              </thead>
              <tbody>
                {STORAGE.map(([name, type, purpose, duration]) => (
                  <tr key={name}><td><code>{name}</code></td><td>{type}</td><td>{purpose}</td><td>{duration}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>This information stays on your device and is not used to track you across other websites.</p>
        </>
      ),
    },
    {
      heading: 'Third parties',
      body: (
        <p>
          Our fonts are hosted on our own servers. Images you upload are delivered from Cloudinary, which may log standard technical request
          data (such as IP address) to deliver them securely. We do not embed social-media widgets, advertising networks or analytics tools.
        </p>
      ),
    },
    {
      heading: 'Managing storage',
      body: (
        <p>
          You can clear this data at any time through your browser settings (“Clear site data”). Doing so will sign you out, empty your cart
          and reset your preferences. Blocking storage entirely will prevent you from signing in.
        </p>
      ),
    },
    {
      heading: 'Changes',
      body: (
        <p>
          If we ever introduce optional cookies (for example analytics), we will update this page and ask for your consent first.
          Questions: <a href={`mailto:${BUSINESS.privacyEmail}`}>{BUSINESS.privacyEmail}</a>.
        </p>
      ),
    },
  ],
};

export default cookies;
