import { useEffect, useState } from 'react';

function normalizePath(path) {
  return path || '/';
}

export function getCurrentRoute() {
  return normalizePath(window.location.pathname);
}

export function navigate(path) {
  if (window.location.pathname === path) {
    return;
  }

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute() {
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    function handleRouteChange() {
      setRoute(getCurrentRoute());
    }

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return route;
}
