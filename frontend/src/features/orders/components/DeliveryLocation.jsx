import { FiExternalLink, FiMapPin, FiMessageSquare } from 'react-icons/fi';
import { formatPin, hasPin, mapsLink } from '../../../lib/geo';
import './DeliveryLocation.css';

/**
 * Rider notes and the customer's map pin for an order's delivery address.
 * Staff get a prominent "navigate" link (or a hint to call when there's no pin);
 * customers just see what they shared.
 */
export default function DeliveryLocation({ address = {}, forStaff = false }) {
  const pin = hasPin(address.location) ? address.location : null;
  if (!pin && !address.notes && !forStaff) return null;

  return (
    <div className="dloc">
      {address.notes && (
        <p className="dloc__notes">
          <FiMessageSquare aria-hidden="true" />
          <span><span className="sr-only">Delivery notes: </span>{address.notes}</span>
        </p>
      )}
      {pin ? (
        <a className={forStaff ? 'dloc__nav' : 'dloc__link'} href={mapsLink(pin)} target="_blank" rel="noopener noreferrer">
          <FiMapPin aria-hidden="true" />
          {forStaff ? 'Open delivery pin in Google Maps' : `Map pin ${formatPin(pin)}`}
          <FiExternalLink aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        forStaff && <p className="dloc__none">No map pin. Call the customer if the address is unclear.</p>
      )}
    </div>
  );
}
