/** Map helpers shared by checkout (pin picker) and the order views (rider links). */

/** Where the map opens for each delivery city (city centre). */
export const CITY_CENTERS = {
  Karachi: [24.8607, 67.0011],
  Lahore: [31.5204, 74.3587],
  Islamabad: [33.6844, 73.0479],
  Rawalpindi: [33.5651, 73.0169],
  Faisalabad: [31.4504, 73.135],
  Multan: [30.1575, 71.5249],
  Quetta: [30.1798, 66.975],
  Peshawar: [34.0151, 71.5249],
  Hyderabad: [25.396, 68.3578],
  Sialkot: [32.4945, 74.5229],
};

/** Whole-country view when no city is chosen yet. */
export const PAKISTAN_VIEW = { center: [30.3753, 69.3451], zoom: 5 };

/** Same box the API enforces (validators: deliveryPin). */
export const PK_BOUNDS = { minLat: 23.5, maxLat: 37.2, minLng: 60.8, maxLng: 77.9 };

export const insidePakistan = ({ lat, lng }) =>
  lat >= PK_BOUNDS.minLat && lat <= PK_BOUNDS.maxLat && lng >= PK_BOUNDS.minLng && lng <= PK_BOUNDS.maxLng;

/** Zoom needed before a pin counts as precise (≈ street/house level). */
export const PRECISE_ZOOM = 16;

export const hasPin = (loc) => Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng);

/** "31.52037, 74.35875" — 5 decimals ≈ 1 m, enough to read out. */
export const formatPin = ({ lat, lng }) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Opens the pin in Google Maps (app on phones, website on desktop); riders can navigate from there. */
export const mapsLink = ({ lat, lng }) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** Map tiles. Defaults to OpenStreetMap; set VITE_MAP_TILE_URL to use a tile provider (update the CSP too). */
export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/**
 * Area search (OpenStreetMap Nominatim). Called only when the user presses Search —
 * never per keystroke — as Nominatim's usage policy requires.
 */
export async function searchPlaces(query, { signal } = {}) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', countrycodes: 'pk', limit: '5', 'accept-language': 'en' });
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Search is unavailable right now.');
  const data = await res.json();
  // OSM often has the same place as a point, a building and an area: show each name once.
  const seen = new Set();
  return data
    .filter((p) => !seen.has(p.display_name) && seen.add(p.display_name))
    .map((p) => ({ id: p.place_id, label: p.display_name, lat: Number(p.lat), lng: Number(p.lon) }));
}
