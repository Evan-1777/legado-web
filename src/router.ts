import { useEffect, useState } from 'react';

export type AppRoute =
  | { view: 'bookshelf' }
  | { view: 'reader'; bookUrl: string };

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

export function parseLocation(loc: Pick<Location, 'pathname' | 'search'> = window.location): AppRoute {
  const relPath =
    BASE_PATH && loc.pathname.startsWith(BASE_PATH)
      ? loc.pathname.slice(BASE_PATH.length)
      : loc.pathname;
  const normalized = relPath.replace(/\/+$/, '') || '/';

  if (normalized === '/read') {
    const params = new URLSearchParams(loc.search);
    const bookUrl = params.get('url');
    if (bookUrl) {
      return { view: 'reader', bookUrl };
    }
  }
  return { view: 'bookshelf' };
}

export function buildRouteUrl(route: AppRoute): string {
  if (route.view === 'reader') {
    const params = new URLSearchParams({ url: route.bookUrl });
    return `${BASE_PATH}/read?${params.toString()}`;
  }
  return `${BASE_PATH}/`;
}

export function navigate(route: AppRoute, options?: { replace?: boolean }) {
  const nextUrl = buildRouteUrl(route);
  if (options?.replace) {
    window.history.replaceState(null, '', nextUrl);
  } else {
    window.history.pushState(null, '', nextUrl);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useAppRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => parseLocation());

  useEffect(() => {
    const onPop = () => setRoute(parseLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return route;
}
