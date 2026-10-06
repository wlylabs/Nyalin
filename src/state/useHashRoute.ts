import { useCallback, useEffect, useState } from 'react';

export type Route = 'home' | 'history';

function parse(hash: string): Route {
  return hash.replace(/^#\/?/, '') === 'riwayat' ? 'history' : 'home';
}

/** Routing ringan berbasis hash: tombol kembali di ponsel tetap bekerja tanpa server config. */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = next === 'history' ? '#/riwayat' : '#/';
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(next);
    window.scrollTo({ top: 0 });
  }, []);

  return { route, navigate };
}
