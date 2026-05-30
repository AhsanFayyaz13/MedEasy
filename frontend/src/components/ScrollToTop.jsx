import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - Resets the window scroll position to the top
 * on every route navigation.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
