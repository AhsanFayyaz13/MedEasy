import { lazy, Suspense, useState } from 'react';
import { FiCheckCircle, FiExternalLink, FiMapPin } from 'react-icons/fi';
import { Button, Spinner } from '../../../components/ui';
import { formatPin, hasPin, mapsLink } from '../../../lib/geo';
import { cx } from '../../../lib/cx';

// Leaflet (~45 KB) is only downloaded when the customer opens the map.
const LocationPicker = lazy(() => import('./LocationPicker'));

/** Optional map pin for the delivery address. The written address stays the required part. */
export default function DeliveryPinField({ value, city, onChange }) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const pinned = hasPin(value);

  const openMap = () => {
    setRequested(true);
    setOpen(true);
  };

  return (
    <div className={cx('chk-pin', pinned && 'is-set')}>
      <span className="chk-pin__icon" aria-hidden="true">{pinned ? <FiCheckCircle /> : <FiMapPin />}</span>
      <div className="chk-pin__text">
        <strong>
          {pinned ? 'Delivery pin set' : 'Pin your door on the map'} <span className="chk-pin__optional">Optional</span>
        </strong>
        <p>
          {pinned ? (
            <>
              {formatPin(value)} ·{' '}
              <a href={mapsLink(value)} target="_blank" rel="noopener noreferrer">
                Check it in Google Maps <FiExternalLink aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </>
          ) : (
            'Our rider gets a link straight to your door, so they won’t need to call for directions.'
          )}
        </p>
      </div>
      <div className="chk-pin__actions">
        <Button variant="secondary" size="sm" leftIcon={<FiMapPin aria-hidden="true" />} onClick={openMap}>
          {pinned ? 'Change pin' : 'Open map'}
        </Button>
        {pinned && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>

      {requested && (
        <Suspense
          fallback={
            <p className="chk-pin__loading" role="status">
              <Spinner size="sm" label="" /> Loading map…
            </p>
          }
        >
          <LocationPicker
            show={open}
            initial={value}
            city={city}
            onClose={() => setOpen(false)}
            onConfirm={(pin) => {
              onChange(pin);
              setOpen(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
