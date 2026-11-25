import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_URL } from '../../lib/env';

const SITE_NAME = 'MedEasy';
export const DEFAULT_DESCRIPTION =
  'Order authentic medicines online, upload prescriptions and book verified doctors across Pakistan — fast delivery with MedEasy.';

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Per-page <title> + canonical (hoisted by React 19) and description / social
 * tags (updated in place so the static defaults in index.html aren't duplicated).
 */
export default function PageMeta({ title, description = DEFAULT_DESCRIPTION, noindex = false }) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Online Pharmacy & Doctor Appointments in Pakistan`;
  const url = `${SITE_URL}${pathname}`;

  useEffect(() => {
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [description, fullTitle, url, noindex]);

  return (
    <>
      <title>{fullTitle}</title>
      <link rel="canonical" href={url} />
    </>
  );
}
