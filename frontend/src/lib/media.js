import { API_ORIGIN } from './env';

/**
 * Resolve an uploaded asset reference to a usable URL:
 * absolute (Cloudinary/https) and data: URIs pass through; legacy relative
 * paths like "/uploads/x.png" are served by the API.
 */
export function assetUrl(path) {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
