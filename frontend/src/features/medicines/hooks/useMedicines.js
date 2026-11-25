import { useCallback, useEffect, useState } from 'react';
import api from '../../../services/api/client';
import normalizeMedicine from '../lib/normalizeMedicine';

/**
 * Fetch the medicine catalogue.
 * Returns { medicines, loading, error, retry }.
 */
export default function useMedicines({ limit = 100 } = {}) {
  const [state, setState] = useState({ medicines: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get('/medicines', { params: { limit }, signal: controller.signal })
      .then(({ data }) => {
        const list = data.medicines ?? data.results ?? data;
        setState({ medicines: Array.isArray(list) ? list.map(normalizeMedicine) : [], loading: false, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load medicines:', err);
        setState({ medicines: [], loading: false, error: 'We couldn’t load medicines right now.' });
      });
    return () => controller.abort();
  }, [limit, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setAttempt((a) => a + 1);
  }, []);

  return { ...state, retry };
}
