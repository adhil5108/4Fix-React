import { useEffect, useState } from 'react';

export function getCurrentLocation() {
  return `${window.location.pathname || '/'}${window.location.search}`;
}

function readLocation() {
  return {
    path: window.location.pathname || '/',
    search: window.location.search,
  };
}

export function navigate(to, { replace = false } = {}) {
  if (getCurrentLocation() === to) {
    return;
  }

  if (replace) {
    window.history.replaceState({}, '', to);
  } else {
    window.history.pushState({}, '', to);
    window.scrollTo(0, 0);
  }

  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute() {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    function handleRouteChange() {
      const next = readLocation();
      setLocation((current) =>
        current.path === next.path && current.search === next.search ? current : next,
      );
    }

    window.addEventListener('popstate', handleRouteChange);
    // Child effects run before this subscription, so a redirect fired during the same
    // commit would otherwise be missed.
    handleRouteChange();
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return location;
}

export function useQueryParam(name) {
  const { search } = useRoute();
  return new URLSearchParams(search).get(name);
}

export function matchPath(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}
