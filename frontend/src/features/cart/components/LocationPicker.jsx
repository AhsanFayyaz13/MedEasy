import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiCrosshair, FiMapPin, FiSearch } from 'react-icons/fi';
import { Alert, Button, Modal } from '../../../components/ui';
import {
  CITY_CENTERS,
  PAKISTAN_VIEW,
  PK_BOUNDS,
  PRECISE_ZOOM,
  TILE_ATTRIBUTION,
  TILE_URL,
  formatPin,
  hasPin,
  insidePakistan,
  searchPlaces,
} from '../../../lib/geo';
import './LocationPicker.css';

const startView = (initial, city) => {
  if (hasPin(initial)) return { center: [initial.lat, initial.lng], zoom: 18 };
  if (CITY_CENTERS[city]) return { center: CITY_CENTERS[city], zoom: 13 };
  return PAKISTAN_VIEW;
};

/**
 * The map itself. Mounted only while the dialog is open, so Leaflet is created on open
 * and destroyed on close. The pin is fixed in the middle; the customer moves the map under it
 * (easier on phones than dragging a small marker, and works with the keyboard's arrow keys).
 */
function PickerBody({ initial, city, onConfirm, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Where the map opens; fixed for the life of the dialog.
  const [start] = useState(() => startView(initial, city));
  const [view, setView] = useState({ lat: start.center[0], lng: start.center[1], zoom: start.zoom });
  const [status, setStatus] = useState(null); // { tone, text }
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchAbort = useRef(null);

  useEffect(() => {
    const { center, zoom } = start;
    const pad = 2; // let people pan a little past the border, not across the world
    const map = L.map(containerRef.current, {
      center,
      zoom,
      minZoom: 5,
      maxBounds: [
        [PK_BOUNDS.minLat - pad, PK_BOUNDS.minLng - pad],
        [PK_BOUNDS.maxLat + pad, PK_BOUNDS.maxLng + pad],
      ],
      keyboard: true,
    });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    const sync = () => {
      const c = map.getCenter();
      setView({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    map.on('move zoomend', sync);
    mapRef.current = map;

    // The dialog animates in; re-measure once it has its final size.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      searchAbort.current?.abort();
      map.remove();
      mapRef.current = null;
    };
  }, [start]);

  const flyTo = (lat, lng, zoom = 18) => mapRef.current?.setView([lat, lng], zoom);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setStatus({ tone: 'warning', text: 'Your browser can’t share its location. Move the map to your door instead.' });
      return;
    }
    setLocating(true);
    setStatus(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const here = { lat: coords.latitude, lng: coords.longitude };
        if (!insidePakistan(here)) {
          setStatus({ tone: 'warning', text: 'You seem to be outside Pakistan. Move the map to the delivery address instead.' });
          return;
        }
        flyTo(here.lat, here.lng);
        if (coords.accuracy > 60) {
          setStatus({ tone: 'info', text: `Your location is approximate (about ${Math.round(coords.accuracy)} m). Move the map so the pin sits on your door.` });
        }
      },
      (err) => {
        setLocating(false);
        setStatus({
          tone: 'warning',
          text:
            err.code === err.PERMISSION_DENIED
              ? 'Location access is blocked. Allow it in your browser settings, or move the map yourself.'
              : 'We couldn’t find your location. Move the map to your door instead.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const search = async (e) => {
    e.preventDefault();
    // The dialog is portalled, but React still bubbles submit to the checkout form: stop it here.
    e.stopPropagation();
    const q = query.trim();
    if (q.length < 3) return;
    searchAbort.current?.abort();
    searchAbort.current = new AbortController();
    setSearching(true);
    setStatus(null);
    try {
      const found = await searchPlaces(city && !q.toLowerCase().includes(city.toLowerCase()) ? `${q}, ${city}` : q, { signal: searchAbort.current.signal });
      setResults(found);
      if (!found.length) setStatus({ tone: 'info', text: 'No places found. Try a nearby landmark or sector, or move the map yourself.' });
    } catch (err) {
      if (err.name !== 'AbortError') setStatus({ tone: 'warning', text: 'Search isn’t available right now. Move the map to your door instead.' });
    } finally {
      setSearching(false);
    }
  };

  const pick = (place) => {
    setResults(null);
    flyTo(place.lat, place.lng, 17);
    setStatus({ tone: 'info', text: 'Now move the map so the pin sits exactly on your door.' });
  };

  const precise = view.zoom >= PRECISE_ZOOM;
  const confirm = () => {
    if (!insidePakistan(view)) {
      setStatus({ tone: 'warning', text: 'We only deliver in Pakistan. Move the pin to the delivery address.' });
      return;
    }
    if (!precise) {
      // A pin dropped from a city-wide view could be streets away: zoom in and let them check.
      flyTo(view.lat, view.lng, PRECISE_ZOOM + 1);
      setStatus({ tone: 'info', text: 'Zoomed in so you can check the pin. Move the map if needed, then confirm.' });
      return;
    }
    onConfirm({ lat: Number(view.lat.toFixed(6)), lng: Number(view.lng.toFixed(6)) });
  };

  return (
    <div className="lp">
      <div className="lp__tools">
        <Button variant="secondary" size="sm" leftIcon={<FiCrosshair aria-hidden="true" />} onClick={locate} loading={locating}>
          Use my current location
        </Button>
        <form className="lp__search" role="search" onSubmit={search}>
          <label htmlFor="lp-search" className="sr-only">Search for an area or landmark</label>
          <input
            id="lp-search"
            type="search"
            placeholder={`Area or landmark${city ? `, e.g. a sector in ${city}` : ''}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          <Button type="submit" size="sm" variant="ghost" loading={searching} aria-label="Search">
            <FiSearch aria-hidden="true" />
          </Button>
        </form>
      </div>

      {results?.length > 0 && (
        <ul className="lp__results" aria-label="Search results">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => pick(r)}>
                <FiMapPin aria-hidden="true" /> <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {status && <Alert tone={status.tone} onClose={() => setStatus(null)}>{status.text}</Alert>}

      <div className="lp__map-wrap">
        <div
          ref={containerRef}
          className="lp__map"
          role="application"
          aria-label="Map. Use the arrow keys to move it and + or − to zoom; the pin marks the centre."
        />
        <span className="lp__pin" aria-hidden="true">
          <svg viewBox="0 0 24 36" width="34" height="50">
            <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 36 12 36s12-15.2 12-24.1C24 5.3 18.6 0 12 0z" />
            <circle cx="12" cy="12" r="4.5" />
          </svg>
        </span>
        <span className="lp__pin-shadow" aria-hidden="true" />
      </div>

      <p className="lp__coords" aria-live="polite">
        {precise ? <>Pin: {formatPin(view)}</> : 'Zoom in and move the map so the pin sits on your door.'}
      </p>

      <div className="lp__actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={confirm} leftIcon={<FiMapPin aria-hidden="true" />}>Use this location</Button>
      </div>
    </div>
  );
}

/** Dialog for choosing a precise delivery point. Loaded on demand (Leaflet is only fetched when opened). */
export default function LocationPicker({ show, initial, city, onConfirm, onClose }) {
  return (
    <Modal
      show={show}
      onClose={onClose}
      size="lg"
      title="Pin your delivery location"
      description="Move the map so the pin sits on your door. The rider gets a link straight to it."
      className="lp-modal"
    >
      {show && <PickerBody initial={initial} city={city} onConfirm={onConfirm} onClose={onClose} />}
    </Modal>
  );
}
