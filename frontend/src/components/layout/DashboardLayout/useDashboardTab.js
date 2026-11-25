import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps the active dashboard section in the URL (?tab=…), so sections are
 * linkable, survive refresh and work with the browser back button.
 */
export default function useDashboardTab(sections, fallback = sections[0]?.key) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const active = sections.some((s) => s.key === requested) ? requested : fallback;

  const setActive = useCallback(
    (key) => {
      const next = new URLSearchParams(params);
      if (key === fallback) next.delete('tab');
      else next.set('tab', key);
      setParams(next, { replace: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [params, setParams, fallback]
  );

  return [active, setActive];
}
