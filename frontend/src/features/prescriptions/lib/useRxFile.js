import { useEffect, useState } from 'react';
import { fetchPrescriptionFile } from '../../../services/api/prescriptionService';
import { assetUrl } from '../../../lib/media';

/** A data: URL as a blob: URL, so it can be opened in a new tab (browsers block opening data: URLs). */
function toBlobUrl(dataUrl) {
  const [head, body = ''] = dataUrl.split(',');
  const type = head.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const bytes = head.includes(';base64') ? Uint8Array.from(atob(body), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(body));
  return { href: URL.createObjectURL(new Blob([bytes], { type })), isPdf: type === 'application/pdf' };
}

/**
 * Where to show or open a prescription's file. Lists leave out files stored inside the record
 * (`fileInline`, or a prescription without `fileUrl` such as one attached to an order); those are
 * fetched here only when the prescription is actually shown.
 * @param {object|null} rx  pass null to skip
 * @returns {{ href: string|undefined, isPdf: boolean, loading: boolean }}
 */
export default function useRxFile(rx) {
  const id = rx?.id || rx?._id;
  const direct = rx?.fileUrl && !rx.fileUrl.startsWith('data:') ? rx.fileUrl : null;
  const needsFetch = Boolean(rx && id && !direct && rx.source !== 'consultation');
  const [fetched, setFetched] = useState({ id: null, href: undefined, isPdf: false });

  useEffect(() => {
    if (!needsFetch) return undefined;
    let cancelled = false;
    let blobUrl;
    const load = rx.fileUrl ? Promise.resolve(rx.fileUrl) : fetchPrescriptionFile(id);
    load
      .then((url) => {
        if (cancelled) return;
        if (url?.startsWith('data:')) {
          const blob = toBlobUrl(url);
          blobUrl = blob.href;
          setFetched({ id, ...blob });
        } else {
          setFetched({ id, href: assetUrl(url), isPdf: /\.pdf$/i.test(url || '') });
        }
      })
      .catch(() => !cancelled && setFetched({ id, href: undefined, isPdf: false }));
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [id, needsFetch, rx?.fileUrl]);

  if (direct) return { href: assetUrl(direct), isPdf: /\.pdf$/i.test(direct) || rx.fileType === 'application/pdf', loading: false };
  if (!needsFetch) return { href: undefined, isPdf: false, loading: false };
  const ready = fetched.id === id;
  return { href: ready ? fetched.href : undefined, isPdf: ready && fetched.isPdf, loading: !ready };
}
